import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, Form, isRouteErrorResponse, useLoaderData, useRouteError, useRevalidator, useFetcher } from "@remix-run/react";
import invariant from "tiny-invariant";
import { useEffect } from "react";

import { getChannel } from "~/models/channel.server";
import { createMessage, getChannelMessages, updateMessage, deleteMessage } from "~/models/message.server";
import { requireUserId } from "~/session.server";
import { Avatar } from "~/components/shared/Avatar";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { StarIcon } from "~/components/icons/star-icon";
import { useUser } from "~/utils";
import type { Channel, Message } from "~/types";
import { MessageList } from "~/components/chat/MessageList";
import { MessageInput } from "~/components/chat/MessageInput";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

type LoaderData = {
  channel: Channel;
  messages: Message[];
  isOwner: boolean;
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.name, "Channel name not found");

  const channel = await getChannel(params.name);
  if (!channel) {
    throw new Response("Not Found", { status: 404 });
  }

  const messages = await getChannelMessages(channel.id);
  console.log("Loaded messages:", messages);
  const isOwner = channel.createdBy === userId;
  
  return json<LoaderData>({ channel, messages, isOwner });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.name, "Channel name not found");

  const channel = await getChannel(params.name);
  if (!channel) {
    throw new Response("Not Found", { status: 404 });
  }

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "editMessage") {
    const messageId = formData.get("messageId");
    const content = formData.get("content");

    if (typeof messageId !== "string" || typeof content !== "string" || content.length === 0) {
      return json(
        { errors: { content: "Message content cannot be empty" } },
        { status: 400 }
      );
    }

    await updateMessage({
      id: messageId,
      content,
      userId,
    });

    return json({ ok: true });
  }

  if (action === "deleteMessage") {
    const messageId = formData.get("messageId");

    if (typeof messageId !== "string") {
      return json(
        { errors: { messageId: "Message ID is required" } },
        { status: 400 }
      );
    }

    await deleteMessage({
      id: messageId,
      userId,
    });

    return json({ ok: true });
  }

  // Handle regular message creation
  const content = formData.get("content");
  const fileIds = formData.getAll("fileIds[]") as string[];

  if (typeof content !== "string" || content.length === 0) {
    return json(
      { errors: { content: "Message cannot be empty" } },
      { status: 400 }
    );
  }

  await createMessage({
    content,
    userId,
    channelId: channel.id,
    fileIds,
  });

  return json({ ok: true });
};

export default function ChannelPage() {
  const { channel, messages, isOwner } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const user = useUser();
  const fetcher = useFetcher();

  const isFavorite = channel.members.some(m => m.userId === user.id && m.isFavorite);

  useEffect(() => {
    // Connect to SSE endpoint for messages
    const messageSource = new EventSource(`/app/c/${channel.name}/messages/subscribe`);
    // Connect to SSE endpoint for system events
    const systemSource = new EventSource(`/app/c/${channel.name}/events`);
    
    messageSource.addEventListener("message", () => {
      revalidator.revalidate();
    });

    systemSource.addEventListener("system", () => {
      revalidator.revalidate();
    });

    return () => {
      messageSource.close();
      systemSource.close();
    };
  }, [channel.name, revalidator]);

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">#</span>
            <div>
              <h2 className="text-lg font-semibold">{channel.name}</h2>
              {channel.description && (
                <p className="text-sm text-muted-foreground">
                  {channel.description}
                </p>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner ? (
                <DropdownMenuItem asChild>
                  <Link to="settings">Channel Settings</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Form action="leave" method="post">
                    <button type="submit" className="w-full text-left text-red-600">
                      Leave Channel
                    </button>
                  </Form>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
        <MessageList messages={messages} currentUserId={user.id} channelName={channel.name} />
      </div>

      {/* Message Input */}
      <MessageInput placeholder={`Message #${channel.name}`} />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (error instanceof Error) {
    return <div>An unexpected error occurred: {error.message}</div>;
  }

  if (!isRouteErrorResponse(error)) {
    return <h1>Unknown Error</h1>;
  }

  if (error.status === 404) {
    return <div>Channel not found</div>;
  }

  return <div>An unexpected error occurred: {error.statusText}</div>;
} 
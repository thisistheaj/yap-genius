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

  if (typeof content !== "string" || content.length === 0) {
    return json(
      { errors: { content: "Message cannot be empty" } },
      { status: 400 }
    );
  }

  await createMessage({
    content,
    userId,
    channelId: channel.id
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
    // Connect to SSE endpoint
    const eventSource = new EventSource(`/messages/subscribe?channelId=${channel.id}`);
    
    // Listen for message events
    eventSource.addEventListener("message", () => {
      // Refresh data when message received
      revalidator.revalidate();
    });

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [channel.id, revalidator]);

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-muted-foreground">#</span>
              {channel.name}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              onClick={() => {
                fetcher.submit(
                  { channelId: channel.id },
                  { method: "post", action: "/app/c/favorite" }
                );
              }}
            >
              <StarIcon className="h-4 w-4" filled={isFavorite} />
            </Button>
            {channel.description && (
              <p className="text-sm text-muted-foreground">{channel.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {isOwner ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/app/c/${channel.name}/settings`}>
                  Settings
                </Link>
              </Button>
            ) : (
              <Form method="post" action={`/app/c/${channel.name}/leave`}>
                <Button variant="outline" size="sm" type="submit">
                  Leave Channel
                </Button>
              </Form>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
        <MessageList messages={messages} currentUserId={user.id} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4">
        <Form method="post">
          <div className="flex gap-2">
            <Textarea
              name="content"
              placeholder={`Message #${channel.name}`}
              className="min-h-[2.5rem] max-h-[10rem]"
            />
            <Button type="submit">Send</Button>
          </div>
        </Form>
      </div>
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
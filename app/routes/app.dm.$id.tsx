import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useRevalidator, Form } from "@remix-run/react";
import invariant from "tiny-invariant";
import { useEffect } from "react";

import { getChannelById } from "~/models/channel.server";
import { createMessage, getChannelMessages, updateMessage, deleteMessage } from "~/models/message.server";
import { requireUserId } from "~/session.server";
import { MessageList } from "~/components/chat/MessageList";
import { MessageInput } from "~/components/chat/MessageInput";
import { Avatar } from "~/components/shared/Avatar";
import { useUser } from "~/utils";
import { Button } from "~/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { Message } from "~/types";

interface Channel {
  id: string;
  type: "DM" | "GROUP_DM";
  members: Array<{
    userId: string;
    user: {
      id: string;
      email: string;
      displayName?: string | null;
      avatarUrl?: string | null;
    };
  }>;
}

type LoaderData = {
  channel: Channel;
  messages: Message[];
  otherMembers: Channel["members"];
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.id, "Channel ID not found");

  const channel = await getChannelById(params.id);
  if (!channel || !channel.members.some(m => m.userId === userId)) {
    throw new Response("Not Found", { status: 404 });
  }

  if (channel.type !== "DM" && channel.type !== "GROUP_DM") {
    throw new Response("Not a DM channel", { status: 400 });
  }

  const messages = await getChannelMessages(channel.id);
  const otherMembers = channel.members.filter(m => m.userId !== userId);
  
  return json({ channel, messages, otherMembers });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.id, "Channel ID not found");

  const channel = await getChannelById(params.id);
  if (!channel || !channel.members.some(m => m.userId === userId)) {
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

export default function DMPage() {
  const { channel, messages, otherMembers } = useLoaderData<typeof loader>();
  const user = useUser();
  const revalidator = useRevalidator();

  const title = channel.type === "DM" 
    ? otherMembers[0].user.displayName || otherMembers[0].user.email
    : `Group DM with ${otherMembers.map(m => m.user.displayName || m.user.email).join(", ")}`;

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
      {/* DM Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {channel.type === "DM" ? (
              <Avatar user={otherMembers[0].user} />
            ) : (
              <div className="flex -space-x-2">
                {otherMembers.slice(0, 3).map(member => (
                  <Avatar key={member.userId} user={member.user} className="border-2 border-background" />
                ))}
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">
                {channel.type === "DM" ? "Direct Message" : `${otherMembers.length + 1} members`}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Form action="leave" method="post">
                  <button type="submit" className="w-full text-left text-red-600">
                    Leave Conversation
                  </button>
                </Form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
        <MessageList messages={messages} currentUserId={user.id} channelName={channel.id} />
      </div>

      {/* Message Input */}
      <MessageInput placeholder={`Message ${title}`} />
    </div>
  );
} 
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useRevalidator, Link } from "@remix-run/react";
import invariant from "tiny-invariant";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

import { getChannelById } from "~/models/channel.server";
import { createMessage, getChannelMessages } from "~/models/message.server";
import { requireUserId } from "~/session.server";
import { MessageList } from "~/components/chat/MessageList";
import { MessageInput } from "~/components/chat/MessageInput";
import { useUser } from "~/utils";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.id, "Channel ID not found");
  invariant(params.messageId, "Message ID not found");

  const channel = await getChannelById(params.id);
  if (!channel || !channel.members.some(m => m.userId === userId)) {
    throw new Response("Not Found", { status: 404 });
  }

  // Get parent message and its replies
  const [parentMessage, replies] = await Promise.all([
    getChannelMessages(channel.id, null).then(messages => 
      messages.find(m => m.id === params.messageId)
    ),
    getChannelMessages(channel.id, params.messageId)
  ]);

  if (!parentMessage) {
    throw new Response("Thread not found", { status: 404 });
  }

  const otherMembers = channel.members.filter(m => m.userId !== userId);
  const title = channel.type === "DM" 
    ? otherMembers[0].user.displayName || otherMembers[0].user.email
    : `Group DM with ${otherMembers.map(m => m.user.displayName || m.user.email).join(", ")}`;

  return json({ channel, parentMessage, replies, title });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.id, "Channel ID not found");
  invariant(params.messageId, "Message ID not found");

  const channel = await getChannelById(params.id);
  if (!channel || !channel.members.some(m => m.userId === userId)) {
    throw new Response("Not Found", { status: 404 });
  }

  const formData = await request.formData();
  const content = formData.get("content");
  const fileIds = formData.getAll("fileIds[]") as string[];

  if (typeof content !== "string" || (content.length === 0 && fileIds.length === 0)) {
    return json(
      { errors: { content: "Must provide either a message or a file" } },
      { status: 400 }
    );
  }

  await createMessage({
    content,
    userId,
    channelId: channel.id,
    fileIds,
    parentId: params.messageId,
  });

  return json({ ok: true });
};

export default function ThreadPage() {
  const { channel, parentMessage, replies, title } = useLoaderData<typeof loader>();
  const user = useUser();
  const revalidator = useRevalidator();

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
      <div className="border-b p-4">
        <div className="flex items-center gap-4">
          <Link
            to={`/app/dm/${channel.id}`}
            className="hover:text-foreground text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold">Thread</h2>
            <p className="text-sm text-muted-foreground">
              with {title}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Parent Message */}
        <div className="mb-4 pb-4 border-b">
          <MessageList messages={[parentMessage]} currentUserId={user.id} hideThreads channelName={channel.id} />
        </div>

        {/* Replies */}
        <div className="space-y-4">
          <MessageList messages={replies} currentUserId={user.id} hideThreads channelName={channel.id} />
        </div>
      </div>

      {/* Message Input */}
      <MessageInput placeholder="Reply to thread..." />
    </div>
  );
} 
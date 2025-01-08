import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import { getChannelById } from "~/models/channel.server";
import { createMessage, getChannelMessages } from "~/models/message.server";
import { requireUserId } from "~/session.server";
import { MessageList } from "~/components/chat/MessageList";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { useUser } from "~/utils";
import { Avatar } from "~/components/shared/Avatar";

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

export default function DMPage() {
  const { channel, messages, otherMembers } = useLoaderData<typeof loader>();
  const user = useUser();

  const title = channel.type === "DM" 
    ? otherMembers[0].user.displayName || otherMembers[0].user.email
    : `Group DM with ${otherMembers.map(m => m.user.displayName || m.user.email).join(", ")}`;

  return (
    <div className="flex flex-col h-full">
      {/* DM Header */}
      <div className="border-b p-4">
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
              placeholder={`Message ${title}`}
              className="min-h-[2.5rem] max-h-[10rem]"
            />
            <Button type="submit">Send</Button>
          </div>
        </Form>
      </div>
    </div>
  );
} 
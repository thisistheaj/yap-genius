import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, isRouteErrorResponse, useLoaderData, useRouteError, useRevalidator } from "@remix-run/react";
import invariant from "tiny-invariant";
import { useEffect } from "react";

import { getChannel } from "~/models/channel.server";
import { createMessage, getChannelMessages } from "~/models/message.server";
import { requireUserId } from "~/session.server";
import { Avatar } from "~/components/shared/Avatar";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import type { Channel, Message } from "~/types";

type LoaderData = {
  channel: Channel;
  messages: Message[];
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.name, "Channel name not found");

  const channel = await getChannel(params.name);
  if (!channel) {
    throw new Response("Not Found", { status: 404 });
  }

  const messages = await getChannelMessages(channel.id);
  return json<LoaderData>({ channel, messages });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.name, "Channel name not found");

  const channel = await getChannel(params.name);
  if (!channel) {
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

export default function ChannelPage() {
  const { channel, messages } = useLoaderData<typeof loader>();
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
      {/* Channel Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-muted-foreground">#</span>
              {channel.name}
            </h2>
            {channel.description && (
              <p className="text-sm text-muted-foreground">{channel.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <Avatar user={message.user} size="sm" />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm">
                    {message.user.name || message.user.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))}
        </div>
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
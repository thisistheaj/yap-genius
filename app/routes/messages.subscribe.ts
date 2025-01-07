import type { LoaderFunctionArgs } from "@remix-run/node";
import { eventStream } from "~/utils.server";
import { requireUserId } from "~/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  const url = new URL(request.url);
  const channelId = url.searchParams.get("channelId");

  if (!channelId) {
    throw new Response("Channel ID is required", { status: 400 });
  }

  return eventStream(request.signal, function setup(send) {
    // Handler for message events
    function handle({ channelId: eventChannelId, message }: { channelId: string; message: any }) {
      // Only send messages for the subscribed channel
      if (eventChannelId === channelId) {
        send({ event: "message", data: message });
      }
    }

    // Subscribe to message events
    globalThis.messageEmitter?.on("message", handle);

    // Cleanup function
    return function cleanup() {
      globalThis.messageEmitter?.off("message", handle);
    };
  });
} 
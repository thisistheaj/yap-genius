import type { LoaderFunctionArgs } from "@remix-run/node";
import { eventStream } from "../utils.server";
import { requireUserId } from "../session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  return eventStream(request.signal, function setup(send) {
    // Handler for presence events
    function handle({ userId: eventUserId, data }: { userId: string; data: any }) {
      // Send all presence events to everyone
      send({ event: "presence", data: { userId: eventUserId, ...data } });
    }

    // Subscribe to presence events
    globalThis.presenceEmitter?.on("presence", handle);

    // Cleanup function
    return function cleanup() {
      globalThis.presenceEmitter?.off("presence", handle);
    };
  });
} 
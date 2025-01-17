import type { LoaderFunctionArgs } from "@remix-run/node";
import { EventEmitter } from "events";
import { eventStream } from "~/utils.server";
import { requireUserId } from "~/session.server";

declare global {
  var readStateEmitter: EventEmitter | undefined;
}

// Initialize singleton event emitter if not exists
if (!global.readStateEmitter) {
  global.readStateEmitter = new EventEmitter();
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  return eventStream(request.signal, function setup(send) {
    function handleReadState(data: { userId: string; channelId: string }) {
      // Only send events for the current user
      if (data.userId === userId) {
        send({ event: "readstate", data });
      }
    }

    // Subscribe to read state events
    global.readStateEmitter?.on("readstate", handleReadState);

    // Cleanup function
    return function cleanup() {
      global.readStateEmitter?.off("readstate", handleReadState);
    };
  });
}

// Helper to emit read state events
export function emitReadStateEvent(data: { userId: string; channelId: string }) {
  global.readStateEmitter?.emit("readstate", data);
} 
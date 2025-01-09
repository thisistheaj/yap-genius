import { LoaderFunctionArgs } from "@remix-run/node";
import { EventEmitter } from "events";
import { eventStream } from "~/utils.server";
import { requireUserId } from "~/session.server";

declare global {
  var channelEmitter: EventEmitter | undefined;
}

// Initialize singleton event emitter if not exists
if (!global.channelEmitter) {
  global.channelEmitter = new EventEmitter();
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const channelName = params.name;

  return eventStream(request.signal, function setup(send) {
    function handleSystemEvent(data: any) {
      if (data.channelName === channelName) {
        send({ event: "system", data });
      }
    }

    // Subscribe to system events
    global.channelEmitter?.on("system", handleSystemEvent);

    // Cleanup function
    return function cleanup() {
      global.channelEmitter?.off("system", handleSystemEvent);
    };
  });
}

// Helper to emit system events
export function emitSystemEvent(data: {
  type: "join" | "leave" | "update_name" | "update_description";
  channelName: string;
  userId: string;
  user: {
    email: string;
    displayName?: string | null;
  };
  newValue?: string;
}) {
  global.channelEmitter?.emit("system", data);
} 
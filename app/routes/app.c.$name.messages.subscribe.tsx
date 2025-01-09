import { LoaderFunctionArgs } from "@remix-run/node";
import { EventEmitter } from "events";
import { eventStream } from "~/utils.server";
import { requireUserId } from "~/session.server";

declare global {
  var messageEmitter: EventEmitter | undefined;
}

// Initialize singleton event emitter if not exists
if (!global.messageEmitter) {
  global.messageEmitter = new EventEmitter();
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const channelName = params.name;

  return eventStream(request.signal, function setup(send) {
    function handleMessage(data: any) {
      if (data.channelName === channelName) {
        send({ event: "message", data });
      }
    }

    // Subscribe to message events
    global.messageEmitter?.on("message", handleMessage);

    // Cleanup function
    return function cleanup() {
      global.messageEmitter?.off("message", handleMessage);
    };
  });
}

// Helper to emit message events
export function emitMessageEvent(data: {
  channelName: string;
  messageId: string;
  type: "create" | "update" | "delete";
}) {
  global.messageEmitter?.emit("message", data);
} 
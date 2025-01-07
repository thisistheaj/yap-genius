import { EventEmitter } from "events";

// Add type definition for global event emitter
declare global {
  var messageEmitter: EventEmitter | undefined;
}

// Initialize singleton event emitter
if (!global.messageEmitter) {
  global.messageEmitter = new EventEmitter();
}

// Helper function to create SSE streams
export function eventStream(signal: AbortSignal, setup: (send: (event: { event: string; data: any }) => void) => () => void): Response {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = ({ event, data }: { event: string; data: any }) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const cleanup = setup(send);
      
      signal.addEventListener("abort", () => {
        cleanup();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Helper to emit message events
export function emitMessageEvent(channelId: string, message: any) {
  global.messageEmitter?.emit("message", { channelId, message });
} 
# Real-time Updates with Server-Sent Events in Remix

This document outlines how to implement real-time updates using Server-Sent Events (SSE) in a Remix application.

## 1. Server Event Emitter Setup

First, create a global event emitter (utils.server.ts):

```ts
import { EventEmitter } from "events";

// Add type definition for global event emitter
declare global {
  var noteEmitter: EventEmitter | undefined;
}

// Initialize singleton event emitter
if (!global.noteEmitter) {
  global.noteEmitter = new EventEmitter();
}

// Helper function to create SSE streams
export function eventStream(signal: AbortSignal, setup: EmitterFunction): Response {
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

// Helper to emit events
export function emitEvent(data: any) {
  global.noteEmitter?.emit("note", data);
}
```

## 2. SSE Endpoint

Create a route to handle SSE connections (routes/resource.subscribe.ts):

```ts
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  
  return eventStream(request.signal, function setup(send) {
    // Handler for events
    function handle(data: any) {
      if (data.userId === userId) {
        send({ event: "note", data });
      }
    }
    
    // Subscribe to events
    globalThis.noteEmitter?.on("note", handle);
    
    // Cleanup function
    return function cleanup() {
      globalThis.noteEmitter?.off("note", handle);
    };
  });
}
```

## 3. Event Emission

Emit events when data changes (routes/resource.new.ts):

```ts
export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  
  // Your data mutation logic here
  const item = await createItem(data);

  // Emit event for real-time updates
  emitEvent({ type: 'create', item, userId });

  return json(item);
};
```

## 4. Client-side Connection

Subscribe to events in your component (routes/resource.tsx):

```ts
export default function ResourcePage() {
  const data = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  useEffect(() => {
    // Connect to SSE endpoint
    const eventSource = new EventSource("/resource/subscribe");
    
    // Listen for events
    eventSource.addEventListener("note", (event) => {
      // Refresh data when event received
      revalidator.revalidate();
    });

    // Cleanup on unmount
    return () => eventSource.close();
  }, [revalidator]);

  return (
    // Your UI here
  );
}
```

## Key Features

- Real-time Updates: Changes are pushed to clients immediately
- User-Specific Events: Events are filtered by userId
- Efficient Updates: Uses Remix's revalidator for smart re-rendering
- Cleanup: Proper cleanup of event listeners and connections
- Type Safety: TypeScript support throughout

## Implementation Notes

- Uses standard EventSource API (no WebSocket needed)
- Leverages Remix's built-in data loading patterns
- Maintains one SSE connection per client
- Automatically reconnects if connection is lost
- Works with server-side rendering

This pattern can be adapted for any real-time feature that doesn't require bidirectional communication (notifications, live updates, etc.).

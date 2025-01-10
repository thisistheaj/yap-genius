import type { LoaderFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { eventStream } from "~/utils.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  
  return eventStream(request.signal, function setup(send) {
    // Handler for read state events
    function handle(data: any) {
      if (data.userId === userId) {
        send({ event: "readState", data });
      }
    }
    
    // Subscribe to events
    globalThis.readStateEmitter?.on("readState", handle);
    
    // Cleanup function
    return function cleanup() {
      globalThis.readStateEmitter?.off("readState", handle);
    };
  });
} 
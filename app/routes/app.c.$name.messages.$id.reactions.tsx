import { json, type ActionFunctionArgs } from "@remix-run/node";
import { EventEmitter } from "events";
import { requireUserId } from "~/session.server";
import { addReaction, removeReaction } from "~/models/reaction.server";

// Add type definition for global event emitter
declare global {
  var messageEmitter: EventEmitter | undefined;
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const messageId = params.id;
  
  if (!messageId) {
    return json({ error: "Message ID is required" }, { status: 400 });
  }

  if (request.method === "POST") {
    const formData = await request.formData();
    const emoji = formData.get("emoji");

    if (typeof emoji !== "string") {
      return json({ error: "Emoji is required" }, { status: 400 });
    }

    const reaction = await addReaction({ messageId, userId, emoji });
    
    // Emit reaction event
    global.messageEmitter?.emit("message", {
      channelName: params.name,
      type: "reaction_added",
      messageId,
      reaction: {
        ...reaction,
        user: reaction.user,
      },
    });

    return json({ success: true });
  }

  if (request.method === "DELETE") {
    const formData = await request.formData();
    const emoji = formData.get("emoji");

    if (typeof emoji !== "string") {
      return json({ error: "Emoji is required" }, { status: 400 });
    }

    await removeReaction({ messageId, userId, emoji });

    // Emit reaction removal event
    global.messageEmitter?.emit("message", {
      channelName: params.name,
      type: "reaction_removed",
      messageId,
      reaction: {
        emoji,
        userId,
      },
    });

    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
} 
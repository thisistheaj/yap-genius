import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { leaveChannel } from "~/models/channel.server";
import { requireUserId } from "~/session.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  const channelId = params.id;

  if (!channelId) {
    return json({ error: "Channel ID is required" }, { status: 400 });
  }

  try {
    await leaveChannel(userId, channelId);
    return redirect("/app");
  } catch (error) {
    if (error instanceof Error) {
      return json({ error: error.message }, { status: 400 });
    }
    return json({ error: "Failed to leave conversation" }, { status: 500 });
  }
}; 
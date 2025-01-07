import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { joinChannel } from "~/models/channel.server";
import { requireUserId } from "~/session.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const channelName = formData.get("channelName");

  if (typeof channelName !== "string") {
    return json({ error: "Invalid channel name" }, { status: 400 });
  }

  try {
    await joinChannel(userId, channelName);
    return redirect(`/app/c/${channelName}`);
  } catch (error) {
    if (error instanceof Error) {
      return json({ error: error.message }, { status: 400 });
    }
    return json({ error: "Failed to join channel" }, { status: 500 });
  }
}; 
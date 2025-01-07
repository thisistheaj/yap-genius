import { json, type ActionFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { toggleChannelFavorite } from "~/models/channel.server";

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const channelId = formData.get("channelId");

  if (typeof channelId !== "string") {
    return json(
      { errors: { channelId: "Channel ID is required" } },
      { status: 400 }
    );
  }

  await toggleChannelFavorite(userId, channelId);
  return json({ success: true });
} 
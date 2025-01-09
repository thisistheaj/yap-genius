import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { prisma } from "~/db.server";
import { emitSystemEvent } from "~/routes/app.c.$name.events";
import { createSystemMessage } from "~/models/message.server";
import { Prisma } from "@prisma/client";

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const channelName = formData.get("channelName");

  if (typeof channelName !== "string") {
    return json({ error: "Invalid channel name" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true }
  });

  if (!user) {
    throw new Error("User not found");
  }

  const channel = await prisma.channel.findUnique({
    where: { name: channelName },
  });

  if (!channel) {
    throw new Error("Channel not found");
  }

  try {
    // Create system message first
    await createSystemMessage({
      type: "join",
      userId,
      channelId: channel.id,
      newValue: channelName
    });

    // Then try to create the member
    try {
      await prisma.channelMember.create({
        data: {
          channelId: channel.id,
          userId: userId,
          isMuted: false,
          isFavorite: false,
          joinedAt: new Date()
        }
      });
    } catch (memberError) {
      if (memberError instanceof Prisma.PrismaClientKnownRequestError && memberError.code === 'P2002') {
        // Continue with the redirect even if member already exists
      } else {
        throw memberError;
      }
    }

    // Emit system event for user joining
    emitSystemEvent({
      type: "join",
      channelName,
      userId,
      user: {
        email: user.email,
        displayName: user.displayName
      }
    });

    return redirect(`/app/c/${channelName}`);
  } catch (error) {
    if (error instanceof Error) {
      return json({ error: error.message }, { status: 400 });
    }
    return json({ error: "Failed to join channel" }, { status: 500 });
  }
}; 
import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { prisma } from "~/db.server";
import { emitSystemEvent } from "~/routes/app.c.$name.events";

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const channelName = params.name;

  if (!channelName) {
    throw new Error("Channel name is required");
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
    // Start a transaction to ensure both operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Delete channel member
      await tx.channelMember.delete({
        where: {
          channelId_userId: {
            channelId: channel.id,
            userId: userId
          }
        }
      });

      // Create system message
      console.log("Creating system message for leave...");
      const systemMessage = await tx.message.create({
        data: {
          messageType: "system",
          content: "",
          userId,
          channelId: channel.id,
          systemData: JSON.stringify({
            type: "leave",
            channelName,
            newValue: channelName
          }),
        },
        include: {
          user: true,
        },
      });
      console.log("Created system message:", systemMessage);
    });

    // Emit system event for user leaving
    console.log("Emitting system event...");
    emitSystemEvent({
      type: "leave",
      channelName,
      userId,
      user: {
        email: user.email,
        displayName: user.displayName
      }
    });
    console.log("System event emitted");

    return redirect("/app");
  } catch (error) {
    console.error("Error leaving channel:", error);
    throw error;
  }
} 
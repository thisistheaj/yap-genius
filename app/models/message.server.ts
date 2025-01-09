import { prisma } from "~/db.server";
import type { User } from "@prisma/client";
import { emitMessageEvent } from "~/utils.server";

export async function createMessage({
  content,
  userId,
  channelId,
  fileIds = [],
}: {
  content: string;
  userId: User["id"];
  channelId: string;
  fileIds?: string[];
}) {
  // Create message and connect files
  const message = await prisma.message.create({
    data: {
      content,
      userId,
      channelId,
      files: fileIds.length > 0 ? {
        connect: fileIds.map(id => ({ id })),
      } : undefined,
    },
    include: {
      user: true,
      files: true,
    },
  });

  // Update channel's lastActivity
  await prisma.channel.update({
    where: { id: channelId },
    data: { lastActivity: new Date() },
  });

  // Emit message event
  emitMessageEvent(channelId, message);

  return message;
}

export async function getChannelMessages(channelId: string) {
  return prisma.message.findMany({
    where: {
      channelId,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    include: {
      user: true,
      files: true,
    },
  });
}

export async function updateMessage({
  id,
  content,
  userId,
}: {
  id: string;
  content: string;
  userId: string;
}) {
  const message = await prisma.message.findFirst({
    where: { id, userId },
  });

  if (!message) {
    throw new Error("Message not found or user not authorized");
  }

  return prisma.message.update({
    where: { id },
    data: {
      content,
      editedAt: new Date(),
    },
    include: {
      user: true,
      files: true,
    },
  });
}

export async function deleteMessage({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const message = await prisma.message.findFirst({
    where: { id, userId },
  });

  if (!message) {
    throw new Error("Message not found or user not authorized");
  }

  return prisma.message.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });
}
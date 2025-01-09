import { prisma } from "~/db.server";
import type { User } from "@prisma/client";
import { emitMessageEvent } from "~/utils.server";

export async function createMessage({
  content,
  userId,
  channelId,
  fileIds = [],
  parentId,
}: {
  content: string;
  userId: User["id"];
  channelId: string;
  fileIds?: string[];
  parentId?: string;
}) {
  // Create message and connect files
  const message = await prisma.message.create({
    data: {
      content,
      userId,
      channelId,
      parentId,
      files: fileIds.length > 0 ? {
        connect: fileIds.map(id => ({ id })),
      } : undefined,
    },
    include: {
      user: true,
      files: true,
      parent: true,
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

export async function getChannelMessages(channelId: string, parentId?: string | null) {
  return prisma.message.findMany({
    where: {
      channelId,
      deletedAt: null,
      parentId: parentId ?? null, // Only get top-level messages or specific thread
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      messageType: true,
      systemData: true,
      createdAt: true,
      editedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
        }
      },
      files: {
        select: {
          id: true,
          name: true,
          url: true,
          size: true,
          mimeType: true,
        }
      },
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              displayName: true,
            }
          }
        }
      },
      _count: {
        select: {
          replies: {
            where: { deletedAt: null }
          },
        },
      },
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

export async function createSystemMessage({
  type,
  userId,
  channelId,
  newValue,
}: {
  type: "join" | "leave" | "update_name" | "update_description";
  userId: User["id"];
  channelId: string;
  newValue?: string;
}) {
  try {
    const message = await prisma.message.create({
      data: {
        messageType: "system",
        content: "", // System messages don't need content
        userId,
        channelId,
        systemData: JSON.stringify({
          type,
          channelName: newValue, // Use newValue as channelName for join/leave
          newValue: type === "update_name" || type === "update_description" ? newValue : undefined
        }),
      },
      include: {
        user: true,
      },
    });

    // Update channel's lastActivity
    await prisma.channel.update({
      where: { id: channelId },
      data: { lastActivity: new Date() },
    });

    return message;
  } catch (error) {
    throw error;
  }
}
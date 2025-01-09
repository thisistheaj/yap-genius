import { prisma } from "~/db.server";
import { Prisma } from "@prisma/client";
import type { User, Message as PrismaMessage } from "@prisma/client";
import { emitMessageEvent } from "~/utils.server";
import type { Message } from "~/types";

type MessageWithUser = PrismaMessage & {
  user: User;
};

type ReactionWithUser = {
  messageId: string;
  emoji: string;
  userId: string;
  userEmail: string;
  userUsername: string | null;
  userDisplayName: string | null;
  userAvatarUrl: string | null;
};

export async function getChannelMessages(channelId: string, parentId?: string | null): Promise<Message[]> {
  const messages = await prisma.$transaction(async (tx) => {
    const msgs = await tx.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        parentId: parentId ?? null,
      },
      orderBy: { createdAt: "asc" },
      include: {
        user: true,
        files: true,
      },
    });

    // If no messages, return empty array early
    if (msgs.length === 0) {
      return [];
    }

    const messageIds = msgs.map(m => m.id);
    
    // Use raw query for reactions since messageReaction is not recognized
    const reactions = await tx.$queryRaw<ReactionWithUser[]>`
      SELECT 
        mr.messageId,
        mr.emoji,
        u.id as "userId",
        u.email as "userEmail",
        u.username as "userUsername",
        u.displayName as "userDisplayName",
        u.avatarUrl as "userAvatarUrl"
      FROM MessageReaction mr
      JOIN User u ON mr.userId = u.id
      WHERE mr.messageId IN (${Prisma.join(messageIds)})
    `;

    const replies = await tx.message.findMany({
      where: {
        parentId: { in: messageIds },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
      },
    });

    return msgs.map(message => {
      const messageReactions = reactions
        .filter((r) => r.messageId === message.id)
        .reduce<NonNullable<Message["reactions"]>>((acc, reaction) => {
          const existing = acc.find((r) => r.emoji === reaction.emoji);
          if (existing) {
            existing.users.push({
              id: reaction.userId,
              username: reaction.userUsername || null,
              displayName: reaction.userDisplayName,
              avatarUrl: reaction.userAvatarUrl,
            });
            existing.count++;
          } else {
            acc.push({
              emoji: reaction.emoji,
              users: [{
                id: reaction.userId,
                username: reaction.userUsername || null,
                displayName: reaction.userDisplayName,
                avatarUrl: reaction.userAvatarUrl,
              }],
              count: 1,
            });
          }
          return acc;
        }, []);

      const messageReplies = replies
        .filter((r: MessageWithUser) => r.parentId === message.id)
        .map((reply: MessageWithUser) => ({
          id: reply.id,
          createdAt: reply.createdAt,
          user: {
            email: reply.user.email,
            displayName: reply.user.displayName,
          },
        }));

      return {
        id: message.id,
        content: message.content,
        messageType: message.messageType as "system" | "message",
        systemData: message.systemData,
        createdAt: message.createdAt,
        editedAt: message.editedAt,
        user: {
          id: message.user.id,
          email: message.user.email,
          displayName: message.user.displayName,
          avatarUrl: message.user.avatarUrl,
        },
        files: message.files.map(file => ({
          id: file.id,
          name: file.name,
          url: file.url,
          size: file.size,
          mimeType: file.mimeType,
        })),
        reactions: messageReactions,
        replies: messageReplies,
      };
    });
  });

  return messages;
}

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
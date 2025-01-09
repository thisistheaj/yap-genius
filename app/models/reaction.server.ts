import type { User, MessageReaction } from "@prisma/client";
import { prisma } from "~/db.server";

export async function addReaction({
  messageId,
  userId,
  emoji,
}: {
  messageId: string;
  userId: string;
  emoji: string;
}) {
  return prisma.messageReaction.create({
    data: {
      messageId,
      userId,
      emoji,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });
}

export async function removeReaction({
  messageId,
  userId,
  emoji,
}: {
  messageId: string;
  userId: string;
  emoji: string;
}) {
  return prisma.messageReaction.deleteMany({
    where: {
      messageId,
      userId,
      emoji,
    },
  });
}

export async function getMessageReactions(messageId: string) {
  return prisma.messageReaction.findMany({
    where: {
      messageId,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

type ReactionWithUser = MessageReaction & {
  user: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
};

// Helper to get grouped reactions with users who reacted
export async function getGroupedReactions(messageId: string) {
  const reactions = await getMessageReactions(messageId);
  
  // Group reactions by emoji
  const grouped = reactions.reduce((acc: Map<string, { emoji: string; users: Pick<User, "id" | "username" | "displayName" | "avatarUrl">[]; count: number }>, reaction: ReactionWithUser) => {
    const existing = acc.get(reaction.emoji) || { emoji: reaction.emoji, users: [], count: 0 };
    existing.users.push(reaction.user);
    existing.count++;
    acc.set(reaction.emoji, existing);
    return acc;
  }, new Map());

  return Array.from(grouped.values());
} 
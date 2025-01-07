import { prisma } from "~/db.server";
import type { Message } from "~/types";

export type { Message } from "~/types";

export async function createMessage({
  content,
  userId,
  channelId,
}: {
  content: string;
  userId: string;
  channelId: string;
}): Promise<Message> {
  // @ts-ignore - Prisma types not recognizing message model
  return prisma.message.create({
    data: {
      content,
      userId,
      channelId,
    },
    include: {
      user: true,
      channel: {
        include: {
          members: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });
}

export async function getChannelMessages(channelId: string): Promise<Message[]> {
  // @ts-ignore - Prisma types not recognizing message model
  return prisma.message.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: true,
      channel: {
        include: {
          members: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });
}
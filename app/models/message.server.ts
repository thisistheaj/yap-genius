import { prisma } from "~/db.server";
import type { Message } from "~/types";
import { emitMessageEvent } from "~/utils.server";

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
  const message = await prisma.message.create({
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

  // Emit event for real-time updates
  emitMessageEvent(channelId, message);

  return message;
}

export async function getChannelMessages(channelId: string): Promise<Message[]> {
  // @ts-ignore - Prisma types not recognizing message model
  return prisma.message.findMany({
    where: { channelId },
    orderBy: { createdAt: "asc" },
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

export async function updateMessage({
  id,
  content,
  userId,
}: {
  id: string;
  content: string;
  userId: string;
}): Promise<Message> {
  // @ts-ignore - Prisma types not recognizing message model
  const message = await prisma.message.update({
    where: { 
      id,
      userId // Ensure user owns the message
    },
    data: { 
      content,
      editedAt: new Date()
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

  // Emit event for real-time updates
  emitMessageEvent(message.channelId, message);

  return message;
}

export async function deleteMessage({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<Message> {
  // @ts-ignore - Prisma types not recognizing message model
  const message = await prisma.message.update({
    where: { 
      id,
      userId // Ensure user owns the message
    },
    data: {
      deletedAt: new Date()
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

  // Emit event for real-time updates
  emitMessageEvent(message.channelId, message);

  return message;
}
import { prisma } from "~/db.server";
import type { Channel } from "~/types";
export type { Channel };

// @ts-ignore - Prisma types not recognizing channel model
export async function createChannel({ 
  name, 
  type = "public",
  description,
  createdBy 
}: { 
  name: string;
  description?: string;
  type?: Channel["type"];
  createdBy: string;
}): Promise<Channel> {
  // @ts-ignore - Prisma types not recognizing channel model
  return prisma.channel.create({
    data: { 
      name, 
      type, 
      description,
      createdBy,
      members: {
        create: {
          userId: createdBy,
        },
      },
    },
    include: {
      members: {
        include: {
          user: true
        }
      }
    }
  });
}

// @ts-ignore - Prisma types not recognizing channel model
export async function getChannels(): Promise<Channel[]> {
  // @ts-ignore - Prisma types not recognizing channel model
  return prisma.channel.findMany({
    where: { type: "public" },
    orderBy: { lastActivity: "desc" },
    include: {
      members: {
        include: {
          user: true
        },
      },
    },
  });
}

// @ts-ignore - Prisma types not recognizing channel model
export async function getChannel(name: string): Promise<Channel | null> {
  // @ts-ignore - Prisma types not recognizing channel model
  return prisma.channel.findUnique({
    where: { name },
    include: {
      members: {
        include: {
          user: true
        }
      }
    }
  });
}

// Seed function that creates default channels if they don't exist
export async function ensureDefaultChannels(userId: string) {
  const defaults = [
    { name: "general", description: "General discussion" },
    { name: "random", description: "Random conversations" },
    { name: "introductions", description: "Introduce yourself!" },
  ];

  for (const channel of defaults) {
    // @ts-ignore - Prisma types not recognizing channel model
    await prisma.channel.upsert({
      where: { name: channel.name },
      update: {},
      create: {
        name: channel.name,
        type: "public",
        createdBy: userId,
        description: channel.description,
        members: {
          create: {
            userId,
          },
        },
      },
    });
  }
} 
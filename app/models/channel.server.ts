import { prisma } from "~/db.server";
import type { Channel, User } from "~/types";
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
export async function getChannels(userId: string): Promise<Channel[]> {
  // @ts-ignore - Prisma types not recognizing channel model
  return prisma.channel.findMany({
    where: {
      members: {
        some: {
          userId
        }
      }
    },
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

export async function getPublicChannels(userId: string): Promise<Channel[]> {
  // @ts-ignore - Prisma types not recognizing channel model
  return prisma.channel.findMany({
    where: {
      type: "public",
      members: {
        none: {
          userId
        }
      }
    },
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

export async function joinChannel(userId: string, channelName: string): Promise<Channel> {
  const channel = await getChannel(channelName);
  if (!channel) throw new Error("Channel not found");
  if (channel.type !== "public") throw new Error("Cannot join private channel");

  // @ts-ignore - Prisma types not recognizing channel model
  return prisma.channel.update({
    where: { name: channelName },
    data: {
      members: {
        create: {
          userId
        }
      }
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

export async function leaveChannel(userId: string, channelName: string): Promise<Channel> {
  const channel = await getChannel(channelName);
  if (!channel) throw new Error("Channel not found");
  if (channel.createdBy === userId) throw new Error("Channel creator cannot leave channel");

  // @ts-ignore - Prisma types not recognizing channel model
  return prisma.channel.update({
    where: { name: channelName },
    data: {
      members: {
        deleteMany: {
          userId
        }
      }
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

export async function searchUsers(query: string, excludeUserIds: string[] = []): Promise<User[]> {
  // @ts-ignore - Prisma types not recognizing user model
  console.log('query', query);
  console.log('excludeUserIds', excludeUserIds);
  const users = await prisma.user.findMany({
    where: {
      id: {
        notIn: excludeUserIds
      },
      ...(query ? {
        email: { contains: query }
      } : {})
    },
    orderBy: {
      email: 'asc'
    },
    take: 5,
  });
  console.log('users', users);
  return users;
}

export async function addChannelMember(channelId: string, userId: string) {
  // @ts-ignore - Prisma types not recognizing channel model
  return prisma.channelMember.create({
    data: {
      channelId,
      userId,
    },
    include: {
      user: true,
    },
  });
}

export async function removeChannelMember(channelId: string, userId: string) {
  // @ts-ignore - Prisma types not recognizing channel model
  return prisma.channelMember.delete({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
  });
} 
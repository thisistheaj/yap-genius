import { prisma } from "~/db.server";
import type { Channel, User } from "~/types";
export type { Channel };

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
  const channel = await prisma.channel.create({
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
  return channel as unknown as Channel;
}

export async function getChannels(userId: string): Promise<Channel[]> {
  const channels = await prisma.channel.findMany({
    where: {
      type: { in: ["public", "private"] },
      members: {
        some: {
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
    },
    orderBy: {
      lastActivity: "desc"
    }
  });

  // Sort channels with favorites first
  return (channels as unknown as Channel[]).sort((a, b) => {
    const aIsFavorite = a.members.some(m => m.userId === userId && m.isFavorite);
    const bIsFavorite = b.members.some(m => m.userId === userId && m.isFavorite);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0;
  });
}

export async function getPublicChannels(userId: string): Promise<Channel[]> {
  const channels = await prisma.channel.findMany({
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
  return channels as unknown as Channel[];
}

export async function getChannel(name: string): Promise<Channel | null> {
  const channel = await prisma.channel.findUnique({
    where: { name },
    include: {
      members: {
        include: {
          user: true
        }
      }
    }
  });
  return channel as unknown as Channel | null;
}

export async function getChannelById(id: string): Promise<Channel | null> {
  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: true
        }
      }
    }
  });
  return channel as unknown as Channel | null;
}

// Seed function that creates default channels if they don't exist
export async function ensureDefaultChannels(userId: string) {
  const defaults = [
    { name: "general", description: "General discussion" },
    { name: "random", description: "Random conversations" },
    { name: "introductions", description: "Introduce yourself!" },
  ];

  for (const channel of defaults) {
    await prisma.channel.upsert({
      where: { name: channel.name },
      update: {},
      create: {
        name: channel.name,
        type: "public" as const,
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

  const updatedChannel = await prisma.channel.update({
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
  return updatedChannel as unknown as Channel;
}

export async function leaveChannel(userId: string, channelName: string): Promise<Channel> {
  const channel = await getChannel(channelName);
  if (!channel) throw new Error("Channel not found");
  if (channel.createdBy === userId) throw new Error("Channel creator cannot leave channel");

  const updatedChannel = await prisma.channel.update({
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
  return updatedChannel as unknown as Channel;
}

export async function searchUsers(query: string, excludeUserIds: string[] = []): Promise<User[]> {
  const searchQuery = query.toLowerCase();
  const users = await prisma.user.findMany({
    where: {
      id: {
        notIn: excludeUserIds
      },
      OR: [
        { email: { contains: searchQuery } },
        { username: { contains: searchQuery } },
        { displayName: { contains: searchQuery } }
      ]
    },
    orderBy: {
      email: 'asc'
    },
    take: 5,
  });
  return users as unknown as User[];
}

export async function addChannelMember(channelId: string, userId: string) {
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
  return prisma.channelMember.delete({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
  });
}

export async function toggleChannelFavorite(userId: string, channelId: string): Promise<void> {
  const member = await prisma.channelMember.findUnique({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
  }) as { isFavorite: boolean } | null;

  if (!member) {
    throw new Error("User is not a member of this channel");
  }

  await prisma.channelMember.update({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
    data: {
      isFavorite: !member.isFavorite,
    } as any,
  });
}

export async function createDM({
  userId,
  otherUserId,
}: {
  userId: string;
  otherUserId: string;
}): Promise<Channel> {
  // Check if DM already exists
  const existingDM = await prisma.channel.findFirst({
    where: {
      type: "DM",
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: otherUserId } } }
      ],
      members: {
        every: {
          userId: { in: [userId, otherUserId] }
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

  if (existingDM) {
    return existingDM as unknown as Channel;
  }

  // Create new DM
  const channel = await prisma.channel.create({
    data: {
      type: "DM",
      name: `dm-${userId}-${otherUserId}`, // Internal name, not shown to users
      createdBy: userId,
      members: {
        create: [
          { userId },
          { userId: otherUserId }
        ]
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

  return channel as unknown as Channel;
}

export async function createGroupDM({
  userId,
  memberIds,
}: {
  userId: string;
  memberIds: string[];
}): Promise<Channel> {
  const channel = await prisma.channel.create({
    data: {
      type: "GROUP_DM",
      name: `group-dm-${Date.now()}`, // Internal name, not shown to users
      createdBy: userId,
      members: {
        create: [
          { userId },
          ...memberIds.map(memberId => ({ userId: memberId }))
        ]
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

  return channel as unknown as Channel;
}

export async function getDMs(userId: string): Promise<Channel[]> {
  const dms = await prisma.channel.findMany({
    where: {
      type: { in: ["DM", "GROUP_DM"] },
      members: {
        some: {
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
    },
    orderBy: {
      lastActivity: "desc"
    }
  });

  return dms as unknown as Channel[];
} 
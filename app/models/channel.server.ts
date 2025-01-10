import { prisma } from "~/db.server";
import type { Channel as PrismaChannel, ChannelMember, User } from "@prisma/client";
import { emitReadStateEvent } from "~/utils.server";

export type ChannelType = "PUBLIC" | "PRIVATE" | "DM" | "GROUP_DM";
export type ChannelRole = "OWNER" | "ADMIN" | "MEMBER";

export type Channel = {
  id: string;
  name: string;
  type: ChannelType;
  description?: string | null;
  createdAt: Date;
  createdBy: string;
  lastActivity: Date;
  members: Array<{
    userId: string;
    role: ChannelRole;
    isFavorite: boolean;
    isMuted: boolean;
    user: User;
  }>;
  readStates?: Array<{
    userId: string;
    lastReadAt: Date;
  }>;
};

export type SerializedChannel = Omit<Channel, 'createdAt' | 'lastActivity' | 'members' | 'readStates'> & {
  createdAt: string;
  lastActivity: string;
  members: Array<{
    userId: string;
    role: ChannelRole;
    isFavorite: boolean;
    isMuted: boolean;
    user: Omit<User, 'lastSeen' | 'createdAt' | 'updatedAt'> & {
      lastSeen: string | null;
      createdAt: string;
      updatedAt: string;
    };
  }>;
  readStates?: Array<{
    userId: string;
    lastReadAt: string;
  }>;
};

export type ChannelWithUnread = Channel & { unreadCount?: number };
export type SerializedChannelWithUnread = SerializedChannel & { unreadCount?: number };

export async function createChannel({ 
  name,
  type = "PUBLIC",
  description,
  userId,
}: {
  name: string;
  type?: ChannelType;
  description?: string;
  userId: string;
}) {
  const channel = await prisma.channel.create({
    data: {
      name,
      type: type.toString(),
      description,
      createdBy: userId,
      members: {
        create: {
          userId,
        },
      },
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  return channel as unknown as Channel;
}

export async function getChannels(userId: string) {
  const channels = await prisma.channel.findMany({
    where: {
      type: {
        in: ["PUBLIC", "PRIVATE"],
      },
      members: {
        some: {
          userId,
        },
      },
    },
    orderBy: { lastActivity: "desc" },
    include: {
      members: {
        include: {
          user: true,
        },
      },
      readStates: {
        where: {
          userId,
        },
      },
    },
  });

  return channels as unknown as Channel[];
}

export async function getPublicChannels(userId: string) {
  const channels = await prisma.channel.findMany({
    where: {
      type: "PUBLIC",
      members: {
        none: {
          userId,
        },
      },
    },
    include: {
      members: {
        include: {
          user: true,
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
  if (channel.type !== "PUBLIC") throw new Error("Cannot join private channel");

  const updatedChannel = await prisma.channel.update({
    where: { name: channelName },
    data: {
      members: {
        create: {
          userId,
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
  console.log("Search params:", { query, excludeUserIds }); // Debug log
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
  console.log("Found users:", users); // Debug log
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
      },
      readStates: {
        where: {
          userId,
        },
      },
    },
    orderBy: {
      lastActivity: "desc"
    }
  });

  return dms as unknown as Channel[];
}

export async function updateChannelReadState(channelId: string, userId: string) {
  // Get the last message in the channel
  const lastMessage = await prisma.message.findFirst({
    where: { channelId },
    orderBy: { createdAt: 'desc' },
  });

  if (!lastMessage) return;

  // Update the read state
  await prisma.channelReadState.upsert({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
    create: {
      channelId,
      userId,
      lastReadAt: lastMessage.createdAt,
    },
    update: {
      lastReadAt: lastMessage.createdAt,
    },
  });

  // Get new unread count
  const unreadCount = await getUnreadCount(channelId, userId);
  
  // Emit read state event
  emitReadStateEvent({ channelId, userId, unreadCount });
}

export async function getUnreadCount(channelId: string, userId: string) {
  const [member, readState] = await Promise.all([
    prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
      select: {
        isMuted: true,
      },
    }),
    prisma.channelReadState.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
    }),
  ]);

  if (!member || member.isMuted) {
    return 0;
  }

  const unreadCount = await prisma.message.count({
    where: {
      channelId,
      createdAt: {
        gt: readState?.lastReadAt || new Date(0),
      },
      userId: {
        not: userId, // Don't count user's own messages
      },
      deletedAt: null,
    },
  });

  return unreadCount;
}

export async function toggleChannelMute(channelId: string, userId: string) {
  const member = await prisma.channelMember.findUnique({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
    select: {
      isMuted: true,
    },
  });

  if (!member) {
    throw new Error("Channel member not found");
  }

  return prisma.channelMember.update({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
    data: {
      isMuted: !member.isMuted,
    },
  });
} 
export interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  status?: string;
  lastSeen?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Channel {
  id: string;
  name: string;
  type: "public" | "private" | "DM" | "GROUP_DM";
  description?: string;
  createdBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  lastActivity: string | Date;
  members: ChannelMember[];
}

export interface ChannelMember {
  id: string;
  userId: string;
  channelId: string;
  user: User;
  isMuted: boolean;
  isFavorite: boolean;
  lastRead?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  channelId: string;
  user: User;
  channel: Channel;
  parentId?: string;
  editedAt?: string | Date;
  deletedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
} 
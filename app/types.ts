export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Channel {
  id: string;
  name: string;
  type: "public" | "private";
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
  createdAt: string | Date;
  updatedAt: string | Date;
} 
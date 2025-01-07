export interface User {
  id: string;
  email: string;
  name?: string | null;
}

export interface Channel {
  id: string;
  name: string;
  type: "public" | "private" | "dm";
  description?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  members: ChannelMember[];
}

export interface ChannelMember {
  channelId: string;
  userId: string;
  user: User;
  lastRead?: Date | null;
  isMuted: boolean;
  joinedAt: Date;
  leftAt?: Date | null;
}

export interface Message {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  user: User;
  channelId: string;
  channel: Channel;
} 
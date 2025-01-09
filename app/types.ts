export interface User {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface Channel {
  id: string;
  name: string;
  description?: string | null;
  type: "PUBLIC" | "PRIVATE" | "DM" | "GROUP_DM";
  createdAt: Date;
  createdBy: string;
  lastActivity: Date;
  members: Array<{
    userId: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    isFavorite: boolean;
    user: User;
  }>;
}

export interface Message {
  id: string;
  content: string;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  user: User;
  channel: Channel;
  files: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    mimeType: string;
  }>;
} 
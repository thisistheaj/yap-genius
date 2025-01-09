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
  messageType: "system" | "message";
  content: string;
  createdAt: string | Date;
  editedAt: string | Date | null;
  systemData: string | null;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  files: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    mimeType: string;
  }>;
  replies?: Array<{
    id: string;
    createdAt: string | Date;
    user: {
      displayName: string | null;
      email: string;
    };
  }>;
  reactions?: Array<{
    emoji: string;
    users: Array<{
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    }>;
    count: number;
  }>;
} 
import { formatLastSeen } from "~/utils";
import { Info } from "lucide-react";

interface SystemMessageProps {
  type: "join" | "leave" | "update_name" | "update_description";
  timestamp: string | Date;
  user: {
    displayName?: string | null;
    email: string;
  };
  channelName?: string;
  newValue?: string;
}

export function SystemMessage({ type, timestamp, user, channelName, newValue }: SystemMessageProps) {
  const getMessage = () => {
    const userName = user.displayName || user.email;
    switch (type) {
      case "join":
        return `${userName} joined the channel`;
      case "leave":
        return `${userName} left the channel`;
      case "update_name":
        return `${userName} renamed the channel to "${newValue}"`;
      case "update_description":
        return `${userName} updated the channel description`;
      default:
        return "";
    }
  };

  return (
    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
      <Info className="h-4 w-4" />
      <span>{getMessage()}</span>
      <span className="text-xs">• {formatLastSeen(timestamp)}</span>
    </div>
  );
} 
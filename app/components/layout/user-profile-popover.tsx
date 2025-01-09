import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import type { User } from "~/models/user.server";
import { formatLastSeen } from "~/utils";

interface UserProfileViewProps {
  user: User;
  children: React.ReactNode;
  lastSeen?: string;
  status?: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserProfileView({ user, children, lastSeen, status }: UserProfileViewProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  let timeout: NodeJS.Timeout;

  const handleMouseEnter = () => {
    clearTimeout(timeout);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeout = setTimeout(() => setIsOpen(false), 200);
  };

  React.useEffect(() => {
    return () => clearTimeout(timeout);
  }, []);

  const displayName = user.displayName || user.email;
  const initials = getInitials(displayName);

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-medium">{displayName}</h4>
                {lastSeen && (
                  <p className="text-sm text-muted-foreground">
                    {formatLastSeen(new Date(lastSeen))}
                  </p>
                )}
                {status && (
                  <p className="text-sm text-muted-foreground">
                    {status}
                  </p>
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 
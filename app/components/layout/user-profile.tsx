import * as React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Form, useFetcher, Link } from "@remix-run/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { User } from "~/models/user.server";
import { cn } from "~/lib/utils";
import { LogOut, Settings } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Separator } from "~/components/ui/separator";

interface UserProfileProps extends React.HTMLAttributes<HTMLDivElement> {
  user: User;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserProfile({ user, className }: UserProfileProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const fetcher = useFetcher();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const status = inputRef.current?.value;
    fetcher.submit(
      { status: status || "" },
      { method: "post", action: "/presence/status" }
    );
    setIsEditing(false);
  };

  const displayName = user.displayName || user.email;
  const initials = getInitials(displayName);

  return (
    <div className={cn("p-4", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Avatar className="h-8 w-8">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={displayName} />
              ) : (
                <AvatarFallback>{initials}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-col items-start flex-1 min-w-0">
              <span className="truncate text-sm font-medium w-full">
                {displayName}
              </span>
              {user.status && (
                <span className="text-xs text-muted-foreground truncate w-full">
                  {user.status}
                </span>
              )}
            </div>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={displayName} />
                ) : (
                  <AvatarFallback>{initials}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{displayName}</h4>
                <p className="text-sm text-muted-foreground">Online</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Status</p>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    {user.status ? "Edit" : "Set status"}
                  </Button>
                )}
              </div>
              {isEditing ? (
                <form onSubmit={handleStatusSubmit} className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="What's your status?"
                    defaultValue={user.status || ""}
                    maxLength={50}
                  />
                  <Button type="submit" size="sm">Set</Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {user.status || "No status set"}
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                asChild
              >
                <Link to="/app/settings">
                  <Settings className="h-4 w-4" />
                  Edit Profile
                </Link>
              </Button>

              <Form action="/logout" method="post">
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  className="w-full justify-start gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </Form>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 
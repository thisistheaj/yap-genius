import * as React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Form, useFetcher } from "@remix-run/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { User } from "~/models/user.server";
import { cn } from "~/lib/utils";
import { LogOut } from "lucide-react";

interface UserProfileProps extends React.HTMLAttributes<HTMLDivElement> {
  user: User;
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

  return (
    <div className={cn("p-4", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="flex-1 truncate text-left">
              {user.displayName || user.email}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">{user.displayName || user.email}</h4>
              <p className="text-sm text-muted-foreground">Online</p>
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

            <Form action="/logout" method="post">
              <Button variant="ghost" size="sm" type="submit" className="w-full justify-start gap-2">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </Form>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 
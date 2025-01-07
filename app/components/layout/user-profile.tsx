import { Form } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Avatar } from "~/components/shared/Avatar";

interface UserProfileProps {
  user: {
    email: string;
    name?: string | null;
  };
}

export function UserProfile({ user }: UserProfileProps) {
  return (
    <div className="border-t p-4">
      <div className="flex items-center gap-3">
        <Avatar user={user} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {user.name || user.email}
          </p>
          <p className="text-xs text-muted-foreground">Online</p>
        </div>
        <Form action="/logout" method="post">
          <Button variant="ghost" size="icon" type="submit" title="Sign out">
            <LogOutIcon className="h-4 w-4" />
          </Button>
        </Form>
      </div>
    </div>
  );
}

function LogOutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
} 
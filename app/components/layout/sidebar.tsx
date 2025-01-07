import { Link } from "@remix-run/react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { useUser } from "~/utils";
import { UserProfile } from "~/components/layout/user-profile";
import { useParams } from "@remix-run/react";
import type { Channel } from "~/models/channel.server";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed?: boolean;
  channels: Channel[];
}

export function Sidebar({ className, isCollapsed, channels }: SidebarProps) {
  const user = useUser();
  const params = useParams();
  const currentChannelId = params.id;
  
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <ScrollArea className="flex-1">
        <div className="space-y-4 py-4">
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold">YapGenius</h2>
            <div className="space-y-1">
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link to="/app">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2 h-4 w-4"
                  >
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  Home
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link to="/app/c/new">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2 h-4 w-4"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  New Channel
                </Link>
              </Button>
            </div>
          </div>
          <Separator />
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold">Channels</h2>
            <div className="space-y-1">
              {channels?.map((channel) => (
                <Button
                  key={channel.id}
                  asChild
                  variant="ghost"
                  className={cn(
                    "w-full justify-start",
                    currentChannelId === channel.id && "bg-muted"
                  )}
                >
                  <Link to={`/app/c/${channel.name}`}>
                    <span className="mr-2 text-muted-foreground">#</span>
                    {channel.name}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
          <Separator />
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold">Direct Messages</h2>
            <div className="space-y-1">
              {/* We'll populate this with actual DMs later */}
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link to="/app/dm/example">
                  <div className="mr-2 h-2 w-2 rounded-full bg-green-500" />
                  John Doe
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
      <UserProfile user={user} />
    </div>
  );
} 
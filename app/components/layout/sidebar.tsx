import { Link, useFetcher, useRevalidator } from "@remix-run/react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { useUser } from "~/utils";
import { UserProfile } from "~/components/layout/user-profile";
import { UserProfileView } from "~/components/layout/user-profile-popover";
import { useParams } from "@remix-run/react";
import type { Channel } from "~/models/channel.server";
import { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { StarIcon } from "~/components/icons/star-icon";
import { Lock } from "lucide-react";
import type { loader as presenceLoader } from "~/routes/presence.ping";
import type { User } from "~/models/user.server";

function formatLastSeen(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed?: boolean;
  channels: Channel[];
  publicChannels: Channel[];
  dms: Channel[];
}

export function Sidebar({ className, isCollapsed, channels, publicChannels, dms }: SidebarProps) {
  const user = useUser();
  const params = useParams();
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();
  const presenceFetcher = useFetcher<typeof presenceLoader>();
  const revalidator = useRevalidator();
  const [presenceData, setPresenceData] = useState<Record<string, { lastSeen: string; status?: string }>>({});

  // Poll for presence updates
  useEffect(() => {
    let mounted = true;

    // Function to fetch presence data
    const fetchPresence = () => {
      if (mounted) {
        presenceFetcher.load("/presence/ping");
      }
    };

    // Initial fetch
    fetchPresence();

    // Set up interval
    const intervalId = setInterval(fetchPresence, 60 * 1000);

    // Cleanup
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []); // Empty deps since we only want this to run once on mount

  // Listen for read state events
  useEffect(() => {
    const eventSource = new EventSource("/readstate/subscribe");
    
    eventSource.addEventListener("readstate", () => {
      revalidator.revalidate();
    });

    return () => {
      eventSource.close();
    };
  }, [revalidator]);

  // Update presence data when we get new data
  useEffect(() => {
    if (presenceFetcher.data) {
      const { users } = presenceFetcher.data as { users: Array<{ id: string; lastSeen: string; status?: string }> };
      const newPresenceData = users.reduce((acc, user) => {
        acc[user.id] = {
          lastSeen: user.lastSeen,
          status: user.status
        };
        return acc;
      }, {} as Record<string, { lastSeen: string; status?: string }>);
      setPresenceData(newPresenceData);
    }
  }, [presenceFetcher.data]);

  // Sort channels by activity and favorites
  const sortedChannels = [...channels].sort((a, b) => {
    const aIsFavorite = a.members.some(m => m.userId === user.id && m.isFavorite);
    const bIsFavorite = b.members.some(m => m.userId === user.id && m.isFavorite);
    
    // First sort by favorites
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    
    // Then sort by activity
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });

  // Sort DMs by activity
  const sortedDMs = [...dms].sort((a, b) => {
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });

  const handleToggleFavorite = (channelId: string) => {
    fetcher.submit(
      { channelId },
      { method: "post", action: "/app/c/favorite" }
    );
  };

  const getDMDisplayName = (channel: Channel) => {
    const otherMembers = channel.members.filter(m => m.userId !== user.id);
    if (channel.type === "DM") {
      const otherUser = otherMembers[0].user;
      return otherUser.displayName || otherUser.email;
    }
    return `Group: ${otherMembers.map(m => m.user.displayName || m.user.email).join(", ")}`;
  };

  const isUnread = (channel: Channel) => {
    const member = channel.members.find(m => m.userId === user.id);
    console.log(member);
    if (!member?.lastRead) return true;
    return new Date(channel.lastActivity).getTime() > new Date(member.lastRead).getTime();
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <ScrollArea className="flex-1">
        <div className="py-4">
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
            <div className="flex items-center justify-between mb-2 px-4">
              <h2 className="text-lg font-semibold">Channels</h2>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">Browse</Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search channels..." />
                    <CommandList>
                      <CommandEmpty>No channels found.</CommandEmpty>
                      <CommandGroup heading="Available Channels">
                        {publicChannels?.map((channel) => (
                          <CommandItem
                            key={channel.id}
                            value={channel.name}
                            onSelect={(value) => {
                              fetcher.submit(
                                { channelName: value },
                                { method: "post", action: "/app/c/join" }
                              );
                              setOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">#</span>
                              {channel.name}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              {sortedChannels?.map((channel) => {
                const isActive = channel.name === params.name;
                const isFavorite = channel.members.some(m => m.userId === user.id && m.isFavorite);
                const hasUnread = !isActive && isUnread(channel);
                
                return (
                  <div key={channel.id} className="flex items-center">
                    <Button
                      asChild
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        hasUnread && "font-semibold"
                      )}
                    >
                      <Link to={`/app/c/${channel.name}`}>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-muted-foreground",
                            hasUnread && "text-foreground"
                          )}>#</span>
                          {channel.name}
                          {channel.type.toUpperCase() === "PRIVATE" && (
                            <Lock className="inline-block ml-2 h-3 w-3 text-muted-foreground" />
                          )}
                          {hasUnread && (
                            <div className="ml-auto h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      onClick={() => handleToggleFavorite(channel.id)}
                    >
                      <StarIcon className="h-4 w-4" filled={isFavorite} />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          <Separator />
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-2 px-4">
              <h2 className="text-lg font-semibold truncate">Direct Messages</h2>
              <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                <Link to="/app/dm/new">New</Link>
              </Button>
            </div>
            <div className="space-y-1">
              {sortedDMs?.map((dm) => {
                const isActive = dm.id === params.id;
                const otherMembers = dm.members.filter(m => m.userId !== user.id);
                const displayName = getDMDisplayName(dm);
                const otherUser = dm.type === "DM" ? otherMembers[0].user : null;
                const presence = otherUser ? presenceData[otherUser.id] : null;
                const lastSeenTime = presence?.lastSeen ? new Date(presence.lastSeen).getTime() : null;
                const now = Date.now();
                const oneMinuteAgo = now - 60 * 1000;
                const isOnline = lastSeenTime && lastSeenTime > oneMinuteAgo;
                const hasUnread = !isActive && isUnread(dm);

                const button = (
                  <Button
                    key={dm.id}
                    asChild
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start relative group",
                      hasUnread && "font-semibold"
                    )}
                  >
                    <Link to={`/app/dm/${dm.id}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        {dm.type === "DM" && (
                          <div className={cn(
                            "h-2 w-2 flex-shrink-0 rounded-full",
                            isOnline ? "bg-green-500" : "bg-slate-500"
                          )} />
                        )}
                        <span className="truncate">{displayName}</span>
                        {presence?.status && (
                          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                            • {presence.status}
                          </span>
                        )}
                        {hasUnread && (
                          <div className="ml-auto h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                    </Link>
                  </Button>
                );

                return dm.type === "DM" && otherUser ? (
                  <UserProfileView
                    key={dm.id}
                    user={otherUser as User}
                    lastSeen={presence?.lastSeen}
                    status={presence?.status}
                  >
                    {button}
                  </UserProfileView>
                ) : button;
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
      <UserProfile user={user} className="border-t" />
    </div>
  );
} 
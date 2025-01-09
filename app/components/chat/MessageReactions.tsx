import { useFetcher } from "@remix-run/react";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { Smile } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { cn } from "~/lib/utils";
import Picker from "@emoji-mart/react";

interface User {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

interface Reaction {
  emoji: string;
  users: User[];
  count: number;
}

interface MessageReactionsProps {
  messageId: string;
  channelName: string;
  reactions: Reaction[];
  currentUserId: string;
}

export function MessageReactions({ messageId, channelName, reactions, currentUserId }: MessageReactionsProps) {
  const fetcher = useFetcher();

  const handleEmojiSelect = (emoji: string) => {
    const hasReacted = reactions.some(
      (r) => r.emoji === emoji && r.users.some((u) => u.id === currentUserId)
    );

    const formData = new FormData();
    formData.append("emoji", emoji);

    fetcher.submit(formData, {
      method: hasReacted ? "DELETE" : "POST",
      action: `/app/c/${channelName}/messages/${messageId}/reactions`,
    });
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {reactions.map((reaction) => {
        const hasReacted = reaction.users.some((u) => u.id === currentUserId);
        
        return (
          <HoverCard key={reaction.emoji} openDelay={200}>
            <HoverCardTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEmojiSelect(reaction.emoji)}
                className={cn(
                  "h-7 px-2 gap-1 hover:bg-muted",
                  hasReacted && "bg-muted"
                )}
              >
                <span>{reaction.emoji}</span>
                <span className="text-xs text-muted-foreground">
                  {reaction.count}
                </span>
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-fit p-2">
              <p className="text-sm">
                {reaction.users
                  .map((u) => u.displayName || u.username || "Unknown")
                  .join(", ")}
              </p>
            </HoverCardContent>
          </HoverCard>
        );
      })}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
          >
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-fit p-0" align="end">
          <Picker 
            data={async () => {
              const response = await fetch(
                'https://cdn.jsdelivr.net/npm/@emoji-mart/data'
              )
              return response.json()
            }}
            onEmojiSelect={(emoji: any) => handleEmojiSelect(emoji.native)}
            theme="light"
            perLine={8}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
} 
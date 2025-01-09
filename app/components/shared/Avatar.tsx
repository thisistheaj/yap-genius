import { cn } from "~/lib/utils";
import { Avatar as BaseAvatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  user: {
    email: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ user, size = "md", className, ...props }: AvatarProps) {
  const displayName = user.displayName || user.email;
  const initials = getInitials(displayName);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  } as const;

  return (
    <BaseAvatar className={cn(sizeClasses[size], className)} {...props}>
      {user.avatarUrl ? (
        <AvatarImage src={user.avatarUrl} alt={displayName} />
      ) : (
        <AvatarFallback>{initials}</AvatarFallback>
      )}
    </BaseAvatar>
  );
} 
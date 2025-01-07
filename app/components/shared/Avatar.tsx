import { cn } from "~/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  user: {
    email: string;
    name?: string | null;
  };
}

export function Avatar({ user, size = "md", className, ...props }: AvatarProps) {
  const initials = user.name 
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : user.email[0].toUpperCase();

  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
  };

  return (
    <div
      className={cn(
        "rounded-full bg-primary/10 flex items-center justify-center font-semibold",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {initials}
    </div>
  );
} 
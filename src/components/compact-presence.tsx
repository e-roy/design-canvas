import React from "react";
import { usePresence } from "@/hooks/use-presence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserPresence } from "@/types";
import { cn } from "@/lib/utils";

interface CompactPresenceProps {
  projectId?: string;
  maxUsers?: number;
  showCount?: boolean;
  className?: string;
}

export function CompactPresence({
  projectId,
  maxUsers = 20,
  className,
}: CompactPresenceProps) {
  const { users, projectUsers, isOnline } = usePresence(projectId);

  const displayUsers = projectId ? projectUsers : users;
  const currentUserCount = displayUsers.length;

  // Show users if any are online, or show current user status
  if (currentUserCount === 0 && !isOnline) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Online user avatars */}
      <div className="flex items-center -space-x-2">
        {displayUsers.length > 0
          ? displayUsers.slice(0, maxUsers).map((user: UserPresence) => (
              <TooltipProvider key={user.uid}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarImage
                          src={user.photoURL || undefined}
                          alt={user.displayName || "User"}
                        />
                        <AvatarFallback className="text-xs bg-primary/10">
                          {(user.displayName || "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 border-2 border-background rounded-full"></div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="mb-2">
                    <div className="text-sm">
                      <p className="font-medium">
                        {user.displayName || "Anonymous"}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))
          : /* Show current user if no other users but user is online */
            isOnline && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-xs bg-primary/10">
                          You
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 border-2 border-background rounded-full"></div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="mb-2">
                    <div className="text-sm">
                      <p className="font-medium">You are online</p>
                      <p className="text-xs text-muted-foreground">
                        Viewing this project
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
      </div>
    </div>
  );
}

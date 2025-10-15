import React from "react";
import { useCursorStore } from "@/store/cursor-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserCursor } from "@/types";
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
  const { cursors } = useCursorStore();

  // Filter cursors by project if projectId is provided
  const displayUsers = projectId
    ? Object.values(cursors).filter(
        (cursor) => cursor.currentProject === projectId
      )
    : Object.values(cursors);

  const currentUserCount = displayUsers.length;

  // Show users if any are online
  if (currentUserCount === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Online user avatars */}
      <div className="flex items-center -space-x-2">
        {displayUsers.slice(0, maxUsers).map((user: UserCursor) => (
          <TooltipProvider key={user.userId}>
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
        ))}
      </div>
    </div>
  );
}

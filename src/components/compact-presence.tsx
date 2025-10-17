import React, { memo, useMemo } from "react";
import { useCursorStore } from "@/store/cursor-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
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

export const CompactPresence = memo(function CompactPresence({
  projectId,
  maxUsers = 20,
  className,
}: CompactPresenceProps) {
  const { cursors } = useCursorStore();

  // Memoize filtered users to prevent unnecessary recalculations
  const displayUsers = useMemo(() => {
    return projectId
      ? Object.values(cursors).filter(
          (cursor) => cursor.currentProject === projectId
        )
      : Object.values(cursors);
  }, [cursors, projectId]);

  const currentUserCount = displayUsers.length;

  // Show users if any are online
  if (currentUserCount === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Online user avatars */}
      <div className="flex items-center -space-x-1">
        {displayUsers.slice(0, maxUsers).map((user: UserCursor) => (
          <Tooltip key={user.userId}>
            <TooltipTrigger asChild>
              <div className="relative">
                <Avatar
                  className="h-6 w-6 border-2 bg-white dark:bg-gray-800"
                  style={{ borderColor: user.color }}
                >
                  <AvatarImage
                    src={user.photoURL || undefined}
                    alt={user.displayName || "User"}
                  />
                  <AvatarFallback
                    className="text-xs font-semibold"
                    style={{
                      backgroundColor: `${user.color}20`,
                      color: user.color,
                    }}
                  >
                    {(user.displayName || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="mb-2">
              <div className="text-sm">
                <p className="font-medium">{user.displayName || "Anonymous"}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
});

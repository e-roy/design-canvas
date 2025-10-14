"use client";

import React from "react";
import { UserCursor } from "@/types";
import { MousePointer2 } from "lucide-react";

interface CursorProps {
  cursor: UserCursor;
  viewport?: { x: number; y: number; scale: number };
}

export function Cursor({ cursor, viewport }: CursorProps) {
  const { x, y, displayName, color } = cursor;

  // Convert virtual coordinates to screen coordinates
  const screenX = (x - (viewport?.x || 0)) * (viewport?.scale || 1);
  const screenY = (y - (viewport?.y || 0)) * (viewport?.scale || 1);

  // Use a fixed scale for consistent cursor size across zoom levels
  const cursorScale = 1;

  return (
    <div
      className="absolute pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ease-out"
      style={{
        left: screenX,
        top: screenY,
        transform: `translate(-50%, -50%) scale(${cursorScale})`,
      }}
    >
      {/* Cursor pointer */}
      <div
        className="drop-shadow-lg"
        style={{
          filter: `drop-shadow(0 0 3px ${color}40)`,
        }}
      >
        <MousePointer2
          size={24}
          color={color}
          strokeWidth={2}
          className="drop-shadow-sm"
        />
      </div>

      {/* User name label */}
      <div
        className="absolute top-5 left-2 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-md"
        style={{
          backgroundColor: color,
          transform: `scale(${cursorScale})`,
          transformOrigin: "top left",
        }}
      >
        {displayName}
      </div>
    </div>
  );
}

interface CursorsOverlayProps {
  cursors: Record<string, UserCursor>;
  currentUserId?: string;
  viewport?: { x: number; y: number; scale: number };
}

export function CursorsOverlay({
  cursors,
  currentUserId,
  viewport,
}: CursorsOverlayProps) {
  // Don't show current user's own cursor
  const otherUsersCursors = Object.values(cursors).filter(
    (cursor) => cursor.userId !== currentUserId
  );

  if (otherUsersCursors.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {otherUsersCursors.map((cursor) => (
        <Cursor key={cursor.userId} cursor={cursor} viewport={viewport} />
      ))}
    </div>
  );
}

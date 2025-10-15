"use client";

import React from "react";
import { UserCursor } from "@/types";
import { MousePointer2 } from "lucide-react";
import { useCursorStore } from "@/store/cursor-store";

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

  // Fine-tune cursor positioning to align the icon's tip with the actual mouse position
  // These values can be adjusted to perfectly align the cursor tip
  const cursorTipOffsetX = 3; // Adjust this value to fine-tune horizontal alignment
  const cursorTipOffsetY = 3; // Adjust this value to fine-tune vertical alignment

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: screenX - cursorTipOffsetX,
        top: screenY - cursorTipOffsetY,
        transform: `scale(${cursorScale})`,
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
        className="absolute top-6 left-4 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-md"
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
  currentUserId?: string;
  viewport?: { x: number; y: number; scale: number };
}

export function CursorsOverlay({
  currentUserId,
  viewport,
}: CursorsOverlayProps) {
  const { cursors } = useCursorStore();

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

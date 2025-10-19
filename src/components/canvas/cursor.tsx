"use client";

import React, { useMemo } from "react";
import { UserCursor } from "@/types";
import { MousePointer2 } from "lucide-react";
import { useCursorStore } from "@/store/cursor-store";

interface CursorProps {
  cursor: UserCursor;
  viewport?: { x: number; y: number; scale: number };
}

export function Cursor({ cursor, viewport }: CursorProps) {
  const { x, y, displayName, color } = cursor;

  // Memoize screen coordinate calculation to prevent flickering during viewport changes
  const screenPosition = useMemo(() => {
    // The cursor owner's viewport shows what zoom/pan they had when moving their cursor
    // We need to "undo" their viewport transformation and apply our viewport transformation

    if (!cursor.viewport || !viewport) {
      // Fallback: use simple conversion if viewport data is missing
      const screenX = (x - (viewport?.x || 0)) * (viewport?.scale || 1);
      const screenY = (y - (viewport?.y || 0)) * (viewport?.scale || 1);
      return { screenX, screenY };
    }

    // The cursor position (x, y) is in absolute canvas coordinates
    // But it may have been calculated with a different viewport than what they currently have
    // We need to render it on OUR screen using OUR viewport

    // Convert from absolute canvas coordinates to our screen coordinates
    const screenX = (x - viewport.x) * viewport.scale;
    const screenY = (y - viewport.y) * viewport.scale;

    return { screenX, screenY };
  }, [
    x,
    y,
    viewport?.x,
    viewport?.y,
    viewport?.scale,
    cursor.viewport?.x,
    cursor.viewport?.y,
    cursor.viewport?.scale,
  ]);

  const { screenX, screenY } = screenPosition;

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
        willChange: "transform, left, top",
        // Disable transitions to prevent flickering during viewport changes
        transition: "none",
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

export const CursorsOverlay = React.memo(function CursorsOverlay({
  currentUserId,
  viewport,
}: CursorsOverlayProps) {
  const { cursors } = useCursorStore();

  // Memoize filtered cursors to prevent unnecessary re-renders
  const otherUsersCursors = useMemo(
    () =>
      Object.values(cursors).filter(
        (cursor) => cursor.userId !== currentUserId
      ),
    [cursors, currentUserId]
  );

  if (otherUsersCursors.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {otherUsersCursors.map((cursor) => (
        <MemoizedCursor
          key={cursor.userId}
          cursor={cursor}
          viewport={viewport}
        />
      ))}
    </div>
  );
});

// Memoized cursor component to prevent re-renders when viewport changes but cursor position doesn't
const MemoizedCursor = React.memo(Cursor, (prevProps, nextProps) => {
  // Only re-render if cursor position or viewport actually changed
  return (
    prevProps.cursor.x === nextProps.cursor.x &&
    prevProps.cursor.y === nextProps.cursor.y &&
    prevProps.cursor.timestamp === nextProps.cursor.timestamp &&
    prevProps.cursor.displayName === nextProps.cursor.displayName &&
    prevProps.cursor.color === nextProps.cursor.color &&
    prevProps.viewport?.x === nextProps.viewport?.x &&
    prevProps.viewport?.y === nextProps.viewport?.y &&
    prevProps.viewport?.scale === nextProps.viewport?.scale
  );
});

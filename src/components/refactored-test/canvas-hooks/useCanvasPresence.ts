import { useState, useEffect, useMemo } from "react";
import type { Shape } from "@/types";
import { generateUserColor } from "@/utils/color";
import { GHOST_SHAPE_PROPS } from "../canvas-lib/constants";

interface UseCanvasPresenceProps {
  user: { uid: string; displayName?: string; email?: string } | null;
  externalShapes: Shape[];
  localDragState: Record<string, { x: number; y: number }>;
  presence: {
    subscribePeers: (
      callback: (peers: Record<string, Peer>) => void
    ) => () => void;
  };
}

interface Peer {
  name: string;
  color: string;
  cursor: { x: number; y: number };
  selection: string[];
  gesture: unknown;
  lastSeen: number;
}

interface GestureData {
  type: string;
  shapeId: string;
  draft: Record<string, unknown>;
}

const isGestureData = (gesture: unknown): gesture is GestureData => {
  return (
    gesture !== null &&
    typeof gesture === "object" &&
    "type" in gesture &&
    "shapeId" in gesture &&
    "draft" in gesture &&
    typeof (gesture as Record<string, unknown>).type === "string" &&
    typeof (gesture as Record<string, unknown>).shapeId === "string" &&
    typeof (gesture as Record<string, unknown>).draft === "object"
  );
};

export const useCanvasPresence = ({
  user,
  externalShapes,
  localDragState,
  presence,
}: UseCanvasPresenceProps) => {
  // Memoize presence object to prevent unnecessary re-renders
  const presenceConfig = useMemo(
    () => ({
      uid: user?.uid || "anonymous",
      name: user?.displayName || user?.email || "Anonymous",
      color: user?.uid ? generateUserColor(user.uid) : "#3b82f6",
    }),
    [user?.uid, user?.displayName, user?.email]
  );

  // Subscribe to peer presence for ghost rendering
  const [peerPresence, setPeerPresence] = useState<
    Record<
      string,
      {
        name: string;
        color: string;
        cursor: { x: number; y: number };
        selection: string[];
        gesture: unknown;
        lastSeen: number;
      }
    >
  >({});

  // Subscribe to peer presence updates
  useEffect(() => {
    const unsubscribe = presence.subscribePeers((peers) => {
      const now = Date.now();
      const cleanedPeers: Record<
        string,
        {
          name: string;
          color: string;
          cursor: { x: number; y: number };
          selection: string[];
          gesture: unknown;
          lastSeen: number;
        }
      > = {};

      // Filter out stale peer data (older than 10 seconds)
      Object.entries(peers).forEach(([peerId, peer]) => {
        if (peer && peer.lastSeen && now - peer.lastSeen < 10000) {
          cleanedPeers[peerId] = {
            ...peer,
            gesture: peer.gesture,
          };
        }
      });

      setPeerPresence(cleanedPeers);
    });
    return unsubscribe;
  }, [presence]);

  // Memoize ghost shapes to prevent unnecessary re-creation
  const ghostShapes = useMemo(() => {
    const ghosts: Shape[] = [];
    Object.entries(peerPresence).forEach(([peerId, peer]) => {
      if (peerId === user?.uid || !peer.gesture) return;

      const gesture = peer.gesture;
      if (isGestureData(gesture) && gesture.type === "move") {
        // Find the original shape to create a ghost
        const originalShape = externalShapes.find(
          (s) => s.id === gesture.shapeId
        );
        if (originalShape) {
          // Check if this shape is being dragged locally by the current user
          // If so, don't show a ghost to prevent visual conflicts
          const isLocallyDragging = localDragState[gesture.shapeId];
          if (isLocallyDragging) {
            return; // Skip creating ghost for locally dragged shapes
          }

          // Only show ghost if the gesture data is recent (within last 2 seconds)
          const gestureAge = Date.now() - peer.lastSeen;
          if (gestureAge > 2000) {
            return; // Skip stale gestures
          }

          ghosts.push({
            ...originalShape,
            id: `ghost-${peerId}-${gesture.shapeId}`,
            x: (gesture.draft.x as number) || originalShape.x,
            y: (gesture.draft.y as number) || originalShape.y,
            width: (gesture.draft.width as number) || originalShape.width,
            height: (gesture.draft.height as number) || originalShape.height,
            rotation:
              (gesture.draft.rotation as number) || originalShape.rotation,
            // Make ghost visually distinct
            ...GHOST_SHAPE_PROPS,
            stroke: peer.color || "#3b82f6",
          });
        }
      }
    });
    return ghosts;
  }, [peerPresence, externalShapes, user?.uid, localDragState]);

  return {
    presenceConfig,
    peerPresence,
    setPeerPresence,
    ghostShapes,
  };
};

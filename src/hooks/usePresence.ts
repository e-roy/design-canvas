import { ref, onDisconnect, set, update, onValue } from "firebase/database";
import { useEffect, useRef, useCallback } from "react";
import { realtimeDb } from "@/lib/firebase";

export function usePresence(
  canvasId: string,
  user: { uid: string; name: string; color: string },
  currentPageId?: string
) {
  const baseRef = ref(realtimeDb, `presence/${canvasId}/${user.uid}`);
  const initialized = useRef(false);
  const lastCursorUpdate = useRef(0);
  const lastSelectionUpdate = useRef(0);
  const lastGestureUpdate = useRef(0);
  const lastViewportUpdate = useRef(0);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Only initialize presence if user is authenticated (not anonymous)
    if (user.uid && user.uid !== "anonymous") {
      set(baseRef, {
        name: user.name,
        color: user.color,
        cursor: { x: 0, y: 0 },
        selection: [],
        gesture: null,
        pageId: currentPageId || null,
        viewport: { x: 0, y: 0, scale: 1 }, // Store user's viewport for follow feature
        lastSeen: Date.now(),
      });

      onDisconnect(baseRef).remove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Throttled cursor updates to reduce Firebase writes
  const updateCursor = useCallback(
    (x: number, y: number) => {
      if (user.uid && user.uid !== "anonymous") {
        const now = Date.now();
        // Simple throttling: only update every 50ms to match cursor manager
        if (now - lastCursorUpdate.current > 50) {
          lastCursorUpdate.current = now;
          update(baseRef, {
            cursor: { x, y },
            lastSeen: now,
          });
        }
      }
    },
    [baseRef, user.uid]
  );

  // Throttled selection updates
  const updateSelection = useCallback(
    (ids: string[]) => {
      if (user.uid && user.uid !== "anonymous") {
        const now = Date.now();
        // Throttle selection updates to max 5 per second
        if (now - lastSelectionUpdate.current > 200) {
          lastSelectionUpdate.current = now;
          update(baseRef, { selection: ids, lastSeen: now });
        }
      }
    },
    [baseRef, user.uid]
  );

  // Throttled gesture updates
  const updateGesture = useCallback(
    (
      gesture: {
        type: string;
        shapeId: string;
        draft: Record<string, unknown>;
      } | null
    ) => {
      if (user.uid && user.uid !== "anonymous") {
        const now = Date.now();
        // For null gestures (clearing), update immediately to prevent ghost objects
        // For active gestures, throttle to 50ms for smooth real-time updates (20 FPS)
        if (gesture === null || now - lastGestureUpdate.current > 50) {
          lastGestureUpdate.current = now;
          update(baseRef, { gesture, lastSeen: now });
        }
      }
    },
    [baseRef, user.uid]
  );

  // Update current page in presence
  const updatePage = useCallback(
    (pageId: string | null) => {
      if (user.uid && user.uid !== "anonymous") {
        update(baseRef, {
          pageId,
          lastSeen: Date.now(),
        });
      }
    },
    [baseRef, user.uid]
  );

  // Update viewport in presence (for follow feature and accurate cursor positioning)
  const updateViewport = useCallback(
    (viewport: { x: number; y: number; scale: number }) => {
      if (user.uid && user.uid !== "anonymous") {
        const now = Date.now();
        // Throttle viewport updates to max 5 per second to reduce bandwidth
        if (now - lastViewportUpdate.current > 200) {
          lastViewportUpdate.current = now;
          update(baseRef, {
            viewport: {
              x: Math.round(viewport.x * 100) / 100,
              y: Math.round(viewport.y * 100) / 100,
              scale: Math.round(viewport.scale * 1000) / 1000,
            },
            lastSeen: now,
          });
        }
      }
    },
    [baseRef, user.uid]
  );

  const subscribePeers = useCallback(
    (
      cb: (
        peers: Record<
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
      ) => void
    ) => {
      return onValue(ref(realtimeDb, `presence/${canvasId}`), (snap) =>
        cb(snap.val() ?? {})
      );
    },
    [canvasId]
  );

  return {
    updateCursor,
    updateSelection,
    updateGesture,
    updatePage,
    updateViewport,
    subscribePeers,
  };
}

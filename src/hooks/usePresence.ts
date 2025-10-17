import {
  getDatabase,
  ref,
  onDisconnect,
  set,
  update,
  onValue,
} from "firebase/database";
import { useEffect, useRef, useCallback } from "react";

const rtdb = getDatabase();

export function usePresence(
  canvasId: string,
  user: { uid: string; name: string; color: string }
) {
  const baseRef = ref(rtdb, `presence/${canvasId}/${user.uid}`);
  const initialized = useRef(false);
  const lastCursorUpdate = useRef(0);
  const lastSelectionUpdate = useRef(0);
  const lastGestureUpdate = useRef(0);

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
        // Throttle gesture updates to max 5 per second
        if (now - lastGestureUpdate.current > 200) {
          lastGestureUpdate.current = now;
          update(baseRef, { gesture, lastSeen: now });
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
      return onValue(ref(rtdb, `presence/${canvasId}`), (snap) =>
        cb(snap.val() ?? {})
      );
    },
    [canvasId]
  );

  return { updateCursor, updateSelection, updateGesture, subscribePeers };
}

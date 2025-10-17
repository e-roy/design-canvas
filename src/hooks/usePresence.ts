import {
  getDatabase,
  ref,
  onDisconnect,
  set,
  update,
  onValue,
} from "firebase/database";
import { useEffect, useRef } from "react";

const rtdb = getDatabase();

export function usePresence(
  canvasId: string,
  user: { uid: string; name: string; color: string }
) {
  const baseRef = ref(rtdb, `presence/${canvasId}/${user.uid}`);
  const initialized = useRef(false);

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

  function updateCursor(x: number, y: number) {
    if (user.uid && user.uid !== "anonymous") {
      update(baseRef, { cursor: { x, y }, lastSeen: Date.now() });
    }
  }

  function updateSelection(ids: string[]) {
    if (user.uid && user.uid !== "anonymous") {
      update(baseRef, { selection: ids, lastSeen: Date.now() });
    }
  }

  function updateGesture(
    gesture: {
      type: string;
      shapeId: string;
      draft: Record<string, unknown>;
    } | null
  ) {
    if (user.uid && user.uid !== "anonymous") {
      update(baseRef, { gesture, lastSeen: Date.now() });
    }
  }

  function subscribePeers(
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
  ) {
    return onValue(ref(rtdb, `presence/${canvasId}`), (snap) =>
      cb(snap.val() ?? {})
    );
  }

  return { updateCursor, updateSelection, updateGesture, subscribePeers };
}

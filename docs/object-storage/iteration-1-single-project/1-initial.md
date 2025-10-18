# Migration Plan — Realtime Canvas (Aggressive Implementation Steps)

**Context:** Existing app uses Firestore for shapes and user cursors, Zustand for client state, Konva for rendering. No production users yet — we can refactor aggressively.

**Objective:** Move to an authoritative-in-Firestore, ephemeral-in-RTDB architecture with versioned transactions, throttled commits during drags, and presence/gestures in RTDB. Rooms/pages will be deferred, but we’ll add `canvasId` for forward compatibility.

---

## 1) Data Model Updates

### 1.1 Update TypeScript interfaces

**Edit:** `types/shape.ts` (or equivalent)

```ts
export interface StoredShape {
  id: string;
  canvasId: string; // NEW: future rooms/pages compatibility
  type: "rectangle" | "circle" | "text" | "line";
  x: number;
  y: number;
  width?: number;
  height?: number; // rect
  radius?: number; // circle
  text?: string;
  fontSize?: number; // text
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number; // line
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rotation?: number;
  zIndex: number;
  createdBy: string;
  createdAt: Date | any;
  updatedAt: Date | any;
  updatedBy: string;
  version: number; // NEW: optimistic concurrency
}

export interface Shape
  extends Omit<
    StoredShape,
    "createdBy" | "createdAt" | "updatedAt" | "updatedBy" | "version"
  > {}
```

### 1.2 Backfill script (one-off)

**Add:** `scripts/backfill-version-and-canvasId.ts`

```ts
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";

// TODO: fill with your env config
const app = initializeApp({
  /* ... */
});
const db = getFirestore(app);

const CURRENT_CANVAS_ID = "default";

async function run() {
  const col = collection(db, "canvas_shapes");
  const snap = await getDocs(col);
  const batch = writeBatch(db);
  let count = 0;

  snap.forEach((d) => {
    const data: any = d.data();
    const needsVersion = typeof data.version !== "number";
    const needsCanvas = !data.canvasId;
    if (needsVersion || needsCanvas) {
      batch.update(doc(db, "canvas_shapes", d.id), {
        version: needsVersion ? 1 : data.version,
        canvasId: needsCanvas ? CURRENT_CANVAS_ID : data.canvasId,
      });
      count++;
    }
  });

  if (count) await batch.commit();
  console.log(`Backfilled ${count} docs.`);
}
run();
```

**Run:** `ts-node scripts/backfill-version-and-canvasId.ts`

---

## 2) Firestore Transaction Utilities (authoritative updates)

**Add:** `services/shapeTransactions.ts`

```ts
import {
  doc,
  runTransaction,
  serverTimestamp,
  getFirestore,
} from "firebase/firestore";
const db = getFirestore();

export async function updateShapeTx(
  shapeId: string,
  patch: Partial<any>,
  uid: string
) {
  const ref = doc(db, "canvas_shapes", shapeId);
  await runTransaction(db, async (tx) => {
    const curSnap = await tx.get(ref);
    if (!curSnap.exists()) return;
    const cur = curSnap.data() as any;
    const next = {
      ...patch,
      version: (cur.version ?? 0) + 1,
      updatedAt: serverTimestamp() as any,
      updatedBy: uid,
    };
    tx.update(ref, next);
  });
}

export async function createShape(docData: any) {
  // Expect caller to provide id via addDoc elsewhere if needed
  // Ensure version, timestamps, and canvasId defaulting
  return {
    ...docData,
    canvasId: docData.canvasId ?? "default",
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}
```

**Replace all direct updates** to `canvas_shapes` with `updateShapeTx` in services.

---

## 3) Realtime Database Presence & Gestures

### 3.1 Presence hook

**Add:** `hooks/usePresence.ts`

```ts
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
    set(baseRef, {
      name: user.name,
      color: user.color,
      cursor: { x: 0, y: 0 },
      selection: [],
      gesture: null,
      lastSeen: Date.now(),
    });
    onDisconnect(baseRef).remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateCursor(x: number, y: number) {
    update(baseRef, { cursor: { x, y }, lastSeen: Date.now() });
  }
  function updateSelection(ids: string[]) {
    update(baseRef, { selection: ids, lastSeen: Date.now() });
  }
  function updateGesture(gesture: any | null) {
    update(baseRef, { gesture, lastSeen: Date.now() });
  }
  function subscribePeers(cb: (peers: Record<string, any>) => void) {
    return onValue(ref(rtdb, `presence/${canvasId}`), (snap) =>
      cb(snap.val() ?? {})
    );
  }

  return { updateCursor, updateSelection, updateGesture, subscribePeers };
}
```

### 3.2 Replace Firestore cursors

- Remove Firestore writes to `user_cursors`.
- Wire cursor movement & selection broadcasts to `usePresence`.

---

## 4) Drag/Transform Flow (ghost + throttled commits)

**Edit:** shape interaction handlers (e.g., `components/shapes/*Shape.tsx`)

- On **drag start**: set presence gesture `{ type: 'move', shapeId, draft: { x,y,width,height,rotation } }`.
- On **drag move**: update presence gesture `draft` every frame; **also** call a **150ms throttled** `updateShapeTx` with current geometry.
- On **drag end**: final `updateShapeTx` commit; clear presence gesture.

**Add:** `utils/throttle.ts` (or use lodash.throttle)

```ts
export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  wait: number
) {
  let last = 0;
  let timeout: any;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      clearTimeout(timeout);
      timeout = null;
      last = now;
      fn(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        last = Date.now();
        timeout = null;
        fn(...args);
      }, remaining);
    }
  };
}
```

**Snippet inside a shape component:**

```ts
const commitThrottled = useMemo(
  () =>
    throttle((patch: Partial<StoredShape>) => {
      updateShapeTx(shape.id, patch, user.uid);
    }, 150),
  [shape.id, user.uid]
);

function onDragMove(e: any) {
  const { x, y } = e.target.position();
  presence.updateGesture({
    type: "move",
    shapeId: shape.id,
    draft: {
      x,
      y,
      width: shape.width,
      height: shape.height,
      rotation: shape.rotation || 0,
    },
  });
  commitThrottled({ x, y });
}

function onDragEnd(e: any) {
  const { x, y } = e.target.position();
  updateShapeTx(shape.id, { x, y }, user.uid);
  presence.updateGesture(null);
}
```

---

## 5) Firestore & RTDB Security Rules

### 5.1 Firestore rules

**Edit/Replace:** `firestore.rules`

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isAuthed() { return request.auth != null; }

    match /canvas_shapes/{shapeId} {
      allow read: if isAuthed();
      allow create, update: if isAuthed() &&
        request.resource.data.keys().hasOnly([
          'id','canvasId','type','x','y','width','height','radius','text','fontSize','startX','startY','endX','endY','fill','stroke','strokeWidth','rotation','zIndex','createdBy','createdAt','updatedAt','updatedBy','version'
        ]) &&
        (request.resource.data.version is int) &&
        (request.resource.data.version >= (resource.data.version || 0) + 1) &&
        (request.resource.data.updatedBy == request.auth.uid) &&
        (request.resource.data.opacity == null || (request.resource.data.opacity >= 0 && request.resource.data.opacity <= 1));
    }
  }
}
```

### 5.2 RTDB rules

**Edit/Replace:** `database.rules.json`

```json
{
  "rules": {
    "presence": {
      "$canvasId": {
        ".read": "auth != null",
        "$uid": { ".write": "$uid === auth.uid" }
      }
    },
    "locks": {
      // optional feature - see section 7
      "$canvasId": {
        ".read": "auth != null",
        "$shapeId": {
          ".write": "(!data.exists() && newData.child('userId').val() === auth.uid) || (data.child('userId').val() === auth.uid)"
        }
      }
    }
  }
}
```

**Deploy rules:** `firebase deploy --only firestore:rules,database`.

---

## 6) Query Narrowing (future-proofing without rooms/pages)

- **Write path:** When creating shapes, set `canvasId: 'default'`.
- **Read path:** Update listeners to `where('canvasId','==','default')`.
- This isolates state now and eases future multi-canvas migration.

---

## 7) Optional: Soft Locks (UX hint)

**RTDB path:** `/locks/{canvasId}/{shapeId} = { userId, startedAt }`

- On drag start: if lock absent, create; on end: remove; also `onDisconnect().remove()`.
- UI: display “Editing by {name}”.

---

## 8) Cleanup & Removal

- Remove any remaining Firestore writes to `user_cursors` and delete related code.
- Keep Firestore presence collection only if needed for auditing (otherwise, delete collection).

---

## 9) Acceptance Tests (manual + scripted)

1. **Conflict test:** Open two tabs, drag the same shape simultaneously → no flicker; final position reflects last commit; losing tab replays motion cleanly.
2. **Performance test:** Drag continuously for 20 seconds → Firestore writes occur ~every 150ms; observers see smooth motion via ghosts; CPU steady; no listener floods.
3. **Disconnect test:** While dragging, close a tab → presence entry disappears within seconds; no dangling locks (if locks enabled).
4. **Rules test:** Attempt to write illegal field or skip `version` → reject with permission error.
5. **Regression test:** Creation, update, delete still functional; zIndex and styling intact.

---

## 10) Deliverables Checklist (Agent MUST)

- [ ] Update interfaces with `version` and `canvasId`.
- [ ] Implement `scripts/backfill-version-and-canvasId.ts` and run it.
- [ ] Create `services/shapeTransactions.ts` and refactor all updates to use `updateShapeTx`.
- [ ] Add `hooks/usePresence.ts` and replace Firestore cursor writes with RTDB presence/gestures.
- [ ] Wire ghost updates on drag; throttle commits at 150ms; final commit on end.
- [ ] Tighten Firestore & RTDB rules as provided; deploy.
- [ ] Adjust shape queries to filter by `canvasId = 'default'`.
- [ ] (Optional) Implement soft locks via `/locks`.
- [ ] Remove legacy `user_cursors` Firestore writes and dead code.
- [ ] Pass all acceptance tests.

---

## 11) Notes

- If the project uses SSR or Node for scripts, prefer `ts-node` for backfill; otherwise compile with `tsc` and run with `node`.
- For drag throttling, keep 50–150ms window; 100ms is a safe default.
- Keep `version` bump strictly in transactions; never in client-side state only.

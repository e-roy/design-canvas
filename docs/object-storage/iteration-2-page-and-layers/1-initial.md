# Implementation Guide — Pages → Frames → Nesting (Final, Agent‑Ready)

**Stack assumptions:** React + TypeScript + Konva, Zustand store, Firebase (Firestore + RTDB), throttled authoritative commits (Firestore transactions), presence/ghosts (RTDB). No production data → **no migration required**. We will add new data model alongside the old, then switch queries.

**Execution order (must follow):**

1. **Pages** → 2) **Frames** → 3) **Nesting (groups + reparent + reorder)**.

---

## Global Invariants (do not change)

- **Authoritative state** in Firestore. One doc per entity. All geometry/order/parent changes use **transactions** with `version++`, `updatedAt = serverTimestamp()`, `updatedBy = uid`.
- **Ephemeral high‑frequency state** in RTDB presence. Ghosts/cursors/selection/active page only. No per‑shape/node authoritative data in RTDB.
- **Throttling**: geometry commits at **150–200 ms** during interaction + **final commit on pointer‑up**.
- **Rendering**: Observers see **ghost** movement from RTDB (every frame) + stepped authoritative updates from Firestore (throttled).

---

## SHARED: New Firestore Structure & Indexes

### Paths

```
/canvases/{canvasId}
/canvases/{canvasId}/pages/{pageId}
/canvases/{canvasId}/nodes/{nodeId}
```

### Page doc (authoritative)

```ts
// /canvases/{canvasId}/pages/{pageId}
{
  name: string,            // e.g., "Page 1"
  index: number,           // tab order
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: string,
  updatedBy: string,
  version: number
}
```

### Node doc (authoritative)

```ts
// /canvases/{canvasId}/nodes/{nodeId}
{
  pageId: string,                      // FK to pages/{pageId}
  parentId: string | null,             // null = root on page
  type: "frame" | "group" | "rectangle" | "circle" | "text" | "line" | "triangle",
  name?: string,

  // sibling order within parent
  orderKey: number,                    // e.g., 1000, 2000... use midpoints on reorder

  // local transform (relative to parent)
  x: number, y: number,
  width?: number, height?: number,
  radius?: number,                     // circle
  rotation?: number,                   // deg
  opacity?: number,                    // 0..1

  // text/line props
  text?: string, fontSize?: number,
  startX?: number, startY?: number, endX?: number, endY?: number,

  // style
  fill?: string, stroke?: string, strokeWidth?: number,

  // visibility & locking
  isVisible: boolean,
  isLocked: boolean,

  // legacy compat (prefer orderKey for render)
  zIndex?: number,

  createdBy: string, createdAt: Timestamp,
  updatedBy: string, updatedAt: Timestamp,
  version: number
}
```

### Firestore indexes (deploy)

```json
{
  "indexes": [
    {
      "collectionGroup": "pages",
      "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "index", "order": "ASCENDING" }]
    },
    {
      "collectionGroup": "nodes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "pageId", "order": "ASCENDING" },
        { "fieldPath": "parentId", "order": "ASCENDING" },
        { "fieldPath": "orderKey", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### Firestore rules (replace/augment)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function authed() { return request.auth != null; }
    function uid() { return request.auth.uid; }

    match /canvases/{canvasId} {
      allow read: if authed();
      allow write: if false; // keep metadata server-managed if desired

      match /pages/{pageId} {
        allow read: if authed();
        allow create, update: if authed()
          && request.resource.data.version is int
          && request.resource.data.version >= (resource.data.version || 0) + 1
          && request.resource.data.name is string
          && request.resource.data.index is number
          && request.resource.data.updatedBy == uid();
        allow delete: if authed();
      }

      match /nodes/{nodeId} {
        allow read: if authed();
        allow create, update: if authed()
          && request.resource.data.pageId is string
          && (request.resource.data.parentId == null || request.resource.data.parentId is string)
          && request.resource.data.orderKey is number
          && request.resource.data.type in ['frame','group','rectangle','circle','text','line','triangle']
          && (request.resource.data.opacity == null || (request.resource.data.opacity >= 0 && request.resource.data.opacity <= 1))
          && (request.resource.data.x == null || request.resource.data.x is number)
          && (request.resource.data.y == null || request.resource.data.y is number)
          && (request.resource.data.width == null || request.resource.data.width is number)
          && (request.resource.data.height == null || request.resource.data.height is number)
          && (request.resource.data.radius == null || request.resource.data.radius is number)
          && (request.resource.data.rotation == null || request.resource.data.rotation is number)
          && (request.resource.data.text == null || request.resource.data.text is string)
          && (request.resource.data.fontSize == null || request.resource.data.fontSize is number)
          && (request.resource.data.startX == null || request.resource.data.startX is number)
          && (request.resource.data.startY == null || request.resource.data.startY is number)
          && (request.resource.data.endX == null || request.resource.data.endX is number)
          && (request.resource.data.endY == null || request.resource.data.endY is number)
          && (request.resource.data.fill == null || request.resource.data.fill is string)
          && (request.resource.data.stroke == null || request.resource.data.stroke is string)
          && (request.resource.data.strokeWidth == null || request.resource.data.strokeWidth is number)
          && (request.resource.data.isVisible == null || request.resource.data.isVisible is bool)
          && (request.resource.data.isLocked == null || request.resource.data.isLocked is bool)
          && request.resource.data.version is int
          && request.resource.data.version >= (resource.data.version || 0) + 1
          && request.resource.data.updatedBy == uid()
          && request.resource.data.keys().hasOnly([
            'pageId','parentId','type','name','orderKey',
            'x','y','width','height','radius','rotation','opacity',
            'text','fontSize','startX','startY','endX','endY',
            'fill','stroke','strokeWidth',
            'isVisible','isLocked','constraints',
            'zIndex','createdBy','createdAt','updatedBy','updatedAt','version'
          ]);
        allow delete: if authed();
      }
    }

    // Legacy collections become read-only (optional)
    match /canvas_shapes/{shapeId} { allow read: if authed(); allow write: if false; }
    match /canvas_documents/{docId} { allow read, write: if authed(); }

    match /{document=**} { allow read, write: if false; }
  }
}
```

### RTDB rules (presence unchanged except adding pageId in payload)

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

---

# PHASE 1 — PAGES (build first)

## 1.1 Types & Hooks

**Add** `types/page.ts`

```ts
export interface PageDoc {
  id: string; // doc id (runtime only)
  name: string;
  index: number;
  createdAt: any; // Timestamp
  updatedAt: any;
  createdBy: string;
  updatedBy: string;
  version: number;
}
```

**Add** `hooks/usePages.ts`

- `listPages(canvasId)` subscribe ordered by `index ASC`
- `createPage(canvasId, name)` → set `index = max+1`, `version=1`
- `renamePage(pageId, name)` → tx `version++`
- `reorderPages(idsInOrder)` → batch write new `index` values
- `deletePage(pageId)` (only if no nodes yet — v1)

## 1.2 Presence includes pageId

**Update** `usePresence` to set/update `/presence/{canvasId}/{uid}.pageId` on page switch.

## 1.3 UI

- Add Page Tabs (list from `usePages`); selecting a tab updates current `pageId` in state **and** presence.
- Update existing shape queries to the new nodes collection scoped by `pageId` (root only for now):

  ```ts
  // root nodes only (no nesting yet)
  where("pageId", "==", currentPageId),
    where("parentId", "==", null),
    orderBy("orderKey", "asc");
  ```

## 1.4 Acceptance

- Can create/rename/reorder pages; switching tabs updates presence and node query scope.

---

# PHASE 2 — FRAMES (as container nodes, no nesting yet)

## 2.1 Node creation helpers (transactional)

**Add** `services/nodes.ts`

```ts
import {
  runTransaction,
  serverTimestamp,
  doc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

export async function createNodeTx(
  canvasId: string,
  nodeId: string,
  data: Partial<any>,
  uid: string
) {
  const ref = doc(db, `canvases/${canvasId}/nodes/${nodeId}`);
  await runTransaction(db, async (tx) => {
    const now = serverTimestamp() as any;
    tx.set(ref, {
      type: data.type,
      pageId: data.pageId,
      parentId: data.parentId ?? null,
      orderKey: data.orderKey ?? 1000,
      x: data.x ?? 0,
      y: data.y ?? 0,
      width: data.width,
      height: data.height,
      radius: data.radius,
      rotation: data.rotation ?? 0,
      opacity: data.opacity ?? 1,
      text: data.text,
      fontSize: data.fontSize,
      startX: data.startX,
      startY: data.startY,
      endX: data.endX,
      endY: data.endY,
      fill: data.fill,
      stroke: data.stroke,
      strokeWidth: data.strokeWidth,
      isVisible: true,
      isLocked: false,
      createdBy: uid,
      createdAt: now,
      updatedBy: uid,
      updatedAt: now,
      version: 1,
    });
  });
}

export async function updateNodeTx(
  canvasId: string,
  nodeId: string,
  patch: Partial<any>,
  uid: string
) {
  const ref = doc(db, `canvases/${canvasId}/nodes/${nodeId}`);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const now = serverTimestamp() as any;
    const cur = snap.data() as any;
    tx.update(ref, {
      ...patch,
      version: (cur.version ?? 0) + 1,
      updatedAt: now,
      updatedBy: uid,
    });
  });
}
```

## 2.2 Frame tool

- Add a **Frame** tool in the toolbar. On create:

  - `type:'frame'`, `parentId:null`, `pageId: currentPageId`
  - `orderKey = lastRootOrder + 1000`
  - Initialize `x,y,width,height,rotation=0,opacity=1`

## 2.3 Rendering frames

- Treat frames like shapes visually (rect with header outline optional).
- No children yet; still render only root nodes.

## 2.4 Presence / drag

- During frame drag/resize, publish **ghost** to presence (`gesture.draft`).
- Throttled commits via `updateNodeTx` every 150–200 ms + final on end.

## 2.5 Acceptance

- Users can create/drag/resize frames on a page; observers see ghost motion + throttled authoritative movement.

---

# PHASE 3 — NESTING (groups + children under frames/groups)

## 3.1 Queries & hooks

- **Root**: `useNodes(canvasId, pageId, null)` → root nodes
- **Children**: `useNodes(canvasId, pageId, parentId)` → children of any parent
- Subscribe **per expanded parent** (layer panel). Unsubscribe when collapsed.

## 3.2 Transform utilities (no scale in v3)

**Add** `utils/transform.ts`

```ts
type Mat = [number, number, number, number, number, number]; // [a,b,c,d,tx,ty]
const D2R = (d: number) => (d * Math.PI) / 180;
const R2D = (r: number) => (r * 180) / Math.PI;
export const makeTR = (x: number, y: number, rotDeg: number): Mat => {
  const t = D2R(rotDeg || 0),
    c = Math.cos(t),
    s = Math.sin(t);
  return [c, s, -s, c, x, y];
};
export const mul = (A: Mat, B: Mat): Mat => {
  const [a1, b1, c1, d1, tx1, ty1] = A,
    [a2, b2, c2, d2, tx2, ty2] = B;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * tx2 + c1 * ty2 + tx1,
    b1 * tx2 + d1 * ty2 + ty1,
  ];
};
export const inv = (M: Mat): Mat => {
  const [a, b, c, d, tx, ty] = M,
    det = a * d - b * c || 1e-12,
    ia = d / det,
    ib = -b / det,
    ic = -c / det,
    id = a / det,
    itx = -(ia * tx + ic * ty),
    ity = -(ib * tx + id * ty);
  return [ia, ib, ic, id, itx, ity];
};
export const extractTR = (M: Mat) => ({
  x: M[4],
  y: M[5],
  rotation: R2D(Math.atan2(M[1], M[0])),
});
```

**Build world transform** for any node by walking ancestors root→node multiplying `makeTR(x,y,rotation)`.

**Reparent local conversion**

```ts
import { makeTR, mul, inv, extractTR } from "./utils/transform";
export function computeLocalForNewParent(
  WparentA: Mat,
  nodeLocal: { x: number; y: number; rotation: number },
  WparentB: Mat
) {
  const Wnode = mul(
    WparentA,
    makeTR(nodeLocal.x, nodeLocal.y, nodeLocal.rotation)
  );
  const localB = mul(inv(WparentB), Wnode);
  return extractTR(localB);
}
```

## 3.3 Ordering helpers

**Add** `utils/orderKey.ts`

```ts
export function midpoint(a: number | null, b: number | null) {
  if (a == null && b == null) return 1000;
  if (a == null) return b! - 1000;
  if (b == null) return a + 1000;
  const m = (a + b) / 2;
  if (Math.abs(m - a) < 1e-6 || Math.abs(b - m) < 1e-6) return null;
  return m;
}
```

## 3.4 Transactions

**Add** to `services/nodes.ts`:

### a) Reorder among siblings

```ts
export async function reorderSiblingTx(
  canvasId: string,
  nodeId: string,
  beforeId: string | null,
  afterId: string | null,
  uid: string
) {
  const nodeRef = doc(db, `canvases/${canvasId}/nodes/${nodeId}`);
  await runTransaction(db, async (tx) => {
    const nodeSnap = await tx.get(nodeRef);
    if (!nodeSnap.exists()) return;
    const node = nodeSnap.data() as any;
    const parentId = node.parentId ?? null;
    const pageId = node.pageId;
    // fetch neighbor keys (use small queries in your impl)
    const prevKey = await readOrderKey(
      tx,
      canvasId,
      pageId,
      parentId,
      beforeId
    ); // helper
    const nextKey = await readOrderKey(tx, canvasId, pageId, parentId, afterId);
    let key = midpoint(prevKey, nextKey);
    if (key == null) {
      await reindexParentTx(tx, canvasId, pageId, parentId);
      key = midpoint(prevKey, nextKey) ?? 1000;
    }
    tx.update(nodeRef, {
      orderKey: key,
      version: (node.version ?? 0) + 1,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
  });
}
```

### b) Reparent (move under new parent, keep world pose)

```ts
export async function reparentTx(
  canvasId: string,
  nodeId: string,
  newParentId: string | null,
  insertBeforeId: string | null,
  insertAfterId: string | null,
  uid: string
) {
  await runTransaction(db, async (tx) => {
    const nodeRef = doc(db, `canvases/${canvasId}/nodes/${nodeId}`);
    const nodeSnap = await tx.get(nodeRef);
    if (!nodeSnap.exists()) return;
    const node = nodeSnap.data() as any;

    const parentAId = node.parentId ?? null;
    const pageId = node.pageId;
    const parentBId = newParentId; // may be null (root)

    // Build W(parentA) & W(parentB) by walking ancestor chains (implement helpers that tx.get() each ancestor and compose)
    const WparentA = await buildWorldOfParentTx(
      tx,
      canvasId,
      pageId,
      parentAId
    );
    const WparentB = await buildWorldOfParentTx(
      tx,
      canvasId,
      pageId,
      parentBId
    );

    const localB = computeLocalForNewParent(
      WparentA,
      { x: node.x, y: node.y, rotation: node.rotation || 0 },
      WparentB
    );

    const prevKey = await readOrderKey(
      tx,
      canvasId,
      pageId,
      parentBId,
      insertBeforeId
    );
    const nextKey = await readOrderKey(
      tx,
      canvasId,
      pageId,
      parentBId,
      insertAfterId
    );
    let key = midpoint(prevKey, nextKey);
    if (key == null) {
      await reindexParentTx(tx, canvasId, pageId, parentBId);
      key = midpoint(prevKey, nextKey) ?? 1000;
    }

    tx.update(nodeRef, {
      parentId: parentBId,
      pageId,
      x: localB.x,
      y: localB.y,
      rotation: localB.rotation,
      orderKey: key,
      version: (node.version ?? 0) + 1,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
  });
}
```

### c) Group / Ungroup

```ts
export async function groupNodesTx(
  canvasId: string,
  pageId: string,
  parentId: string | null,
  nodeIds: string[],
  groupId: string,
  uid: string
) {
  await runTransaction(db, async (tx) => {
    // create group at anchor position (top-most selected by orderKey)
    const anchorKey = await computeAnchorKey(
      tx,
      canvasId,
      pageId,
      parentId,
      nodeIds
    );
    const groupRef = doc(db, `canvases/${canvasId}/nodes/${groupId}`);
    const now = serverTimestamp() as any;
    tx.set(groupRef, {
      type: "group",
      pageId,
      parentId,
      orderKey: anchorKey,
      x: 0,
      y: 0,
      rotation: 0,
      opacity: 1,
      isVisible: true,
      isLocked: false,
      createdBy: uid,
      createdAt: now,
      updatedBy: uid,
      updatedAt: now,
      version: 1,
    });

    // compute W(group) once
    const Wparent = await buildWorldOfParentTx(tx, canvasId, pageId, parentId);
    const Wgroup = mul(Wparent, makeTR(0, 0, 0));

    // reparent children → group, preserving world pose
    let k = anchorKey - 500; // ensure they appear just under the group header visually
    for (const nid of nodeIds) {
      const nref = doc(db, `canvases/${canvasId}/nodes/${nid}`);
      const ns = await tx.get(nref);
      if (!ns.exists()) continue;
      const n = ns.data() as any;
      const WparentA = await buildWorldOfParentTx(
        tx,
        canvasId,
        pageId,
        n.parentId ?? null
      );
      const localToGroup = computeLocalForNewParent(
        WparentA,
        { x: n.x, y: n.y, rotation: n.rotation || 0 },
        Wgroup
      );
      k += 1; // stable increment
      tx.update(nref, {
        parentId: groupId,
        pageId,
        x: localToGroup.x,
        y: localToGroup.y,
        rotation: localToGroup.rotation,
        orderKey: k,
        version: (n.version ?? 0) + 1,
        updatedAt: now,
        updatedBy: uid,
      });
    }
  });
}

export async function ungroupTx(
  canvasId: string,
  groupId: string,
  uid: string
) {
  await runTransaction(db, async (tx) => {
    const gref = doc(db, `canvases/${canvasId}/nodes/${groupId}`);
    const gs = await tx.get(gref);
    if (!gs.exists()) return;
    const g = gs.data() as any;
    const pageId = g.pageId;
    const parentId = g.parentId ?? null;
    const Wparent = await buildWorldOfParentTx(tx, canvasId, pageId, parentId);

    const children = await listChildrenTx(tx, canvasId, pageId, groupId); // sorted by orderKey
    let anchor = g.orderKey;
    for (const c of children) {
      const Wgroup = await buildWorldOfParentTx(tx, canvasId, pageId, groupId);
      const localToParent = computeLocalForNewParent(
        Wgroup,
        { x: c.x, y: c.y, rotation: c.rotation || 0 },
        Wparent
      );
      anchor += 1;
      const cref = doc(db, `canvases/${canvasId}/nodes/${c.id}`);
      tx.update(cref, {
        parentId,
        pageId,
        x: localToParent.x,
        y: localToParent.y,
        rotation: localToParent.rotation,
        orderKey: anchor,
        version: (c.version ?? 0) + 1,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
    }
    tx.delete(gref);
  });
}
```

> Implement tiny helpers used above: `readOrderKey`, `reindexParentTx`, `buildWorldOfParentTx`, `listChildrenTx`, `computeAnchorKey`. Keep each query narrow (by `pageId` & `parentId`).

## 3.5 UI updates

- **Layer panel**: tree view sourced from `(pageId,parentId)` queries; drag‑and‑drop calls `reorderSiblingTx` or `reparentTx`.
- **Renderer**: recursive render of root → children, composing transforms per parent (world matrix multiply). Ghost overlays from presence `gesture`.

## 3.6 Acceptance (nesting)

- Create frames and groups; add children under them.
- Reorder siblings; reparent nodes between roots/frames/groups; world pose preserved.
- Group selection → becomes a group; ungroup restores children to parent.
- Conflicts (two tabs reorder same area) resolve via transactions; no corruption.

---

# PHASE 4 — Throttled Interaction Pattern (apply across phases)

- On drag start → set presence `gesture`
- On move → update `gesture.draft` each frame; call **throttled** `updateNodeTx` every 150–200 ms
- On end → final `updateNodeTx`; clear `gesture`

---

# Deliverables Checklist (tick all before merging)

- [ ] Firestore structure `/canvases/{canvasId}/{pages,nodes}` created; rules + indexes deployed
- [ ] `usePages` hook and page tabs wired; presence carries `pageId`
- [ ] `createNodeTx`, `updateNodeTx` implemented; frame tool added
- [ ] Queries switched to nodes: root `(pageId, parentId:null)`
- [ ] Transform & orderKey utilities added; renderer composes transforms
- [ ] `reorderSiblingTx`, `reparentTx`, `groupNodesTx`, `ungroupTx`, `reindexParentTx` implemented
- [ ] Layer panel supports drag‑drop reorder/reparent; ghost overlays working
- [ ] Throttled commits + final commit pattern verified
- [ ] Acceptance tests for pages, frames, nesting passed

---

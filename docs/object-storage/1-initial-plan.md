# Multiplayer Canvas Data & Sync Spec (React + Firebase)

**Goal:** Implement a Figma‑like, real‑time collaborative canvas in React using Firebase. This spec defines data structures, where to store them, conflict‑resolution rules, and performance guardrails so multiple users can edit the same canvas smoothly and safely.

---

## 1) Design Principles

- **Single source of truth** for persistent canvas state → **Firestore**.
- **Ephemeral, high‑frequency signals** (cursor, in‑progress drags) → **Realtime Database (RTDB)**.
- **Avoid hot documents** by sharding state (one doc per shape or small chunk).
- **Optimistic UI** with server reconciliation using **transactions + versioning**.
- **CRDTs where contention is complex** (text editing, path points). Persist CRDT snapshots in Firestore.
- **Security‑first**: field‑level validation in rules; per‑user presence writes.
- **Performance**: throttle Firestore writes, stream RTDB freely; subscribe narrowly (by page / viewport).

---

## 2) Data Model

### 2.1 Firestore (authoritative)

```
/rooms/{roomId}
  name: string
  createdBy: uid
  createdAt: serverTimestamp
  visibility: "private" | "link" | "org" (optional)

/rooms/{roomId}/pages/{pageId}
  name: string
  index: number
  createdAt: serverTimestamp
  updatedAt: serverTimestamp

/rooms/{roomId}/shapes/{shapeId}
  type: "rect" | "ellipse" | "line" | "path" | "text" | ...
  pageId: string       // FK to pages/{pageId}
  x: number            // top-left, canvas coordinates
  y: number
  w: number
  h: number
  rotation: number     // degrees
  z: number            // stacking
  fill: string         // hex or rgba
  stroke: string
  opacity: number      // 0..1
  locked: boolean
  meta: map            // arbitrary small metadata (tags, constraints)
  version: number      // optimistic concurrency counter
  updatedAt: serverTimestamp
  updatedBy: uid

/rooms/{roomId}/ops/{opId}           // optional audit/undo log
  opType: "create" | "update" | "delete" | "reorder" | ...
  shapeId: string
  before: map           // minimal diff or snapshot subset
  after: map
  actor: uid
  at: serverTimestamp

/rooms/{roomId}/members/{userId}
  role: "viewer" | "editor" | "owner"
  displayName: string
  color: string

// Optional CRDT persistence (e.g., Yjs) per page or per text layer
/rooms/{roomId}/crdt/{docId}
  type: "yjs"
  pageId: string | null
  layerId: string | null
  snapshot: bytes | string   // encoded state vector/snapshot
  updatedAt: serverTimestamp
  updatedBy: uid
```

> **Rationale:** Each shape is a separate doc so only changed shapes stream, avoiding contention on a giant canvas doc. A monotonic `version` supports conflict detection.

### 2.2 Realtime Database (ephemeral)

```
/presence/{roomId}/{userId}
  name: string
  color: string
  cursor: { x: number, y: number }
  selection: string[]          // shape IDs
  camera: { x: number, y: number, zoom: number }
  tool: "select" | "rect" | "ellipse" | "text" | "path" | ...
  gesture: {
    type: "move" | "resize" | "rotate" | "draw" | null,
    shapeId: string | null,
    draft: { x: number, y: number, w: number, h: number, rotation: number }
  }
  lastSeen: number             // Date.now()

/locks/{roomId}/{shapeId}      // optional soft lock
  userId: string
  startedAt: number

/typing/{roomId}/{shapeId}     // optional per-text caret ranges
  { userId: { from: number, to: number } }
```

> **Rationale:** RTDB values can update 10–60×/sec without burdening Firestore; if a packet is lost, it’s harmless. This drives smooth cursors and “ghost” previews while dragging.

---

## 3) Write Patterns & Frequencies

### 3.1 Creating a shape (authoritative)

- **Firestore**: `addDoc(/shapes)` with initial geometry and `version = 1`.
- Add an `/ops` entry (optional) for undo.
- All clients subscribed to the page see the new shape.

### 3.2 Moving / Resizing

- **During interaction:**

  - Update `presence/{roomId}/{userId}.gesture` in **RTDB** at **high frequency** (e.g., 30–60 Hz) to show a “ghost” box and cursor.

- **Authoritative updates:**

  - Either **commit at drag end only**, or **throttle Firestore** updates to **5–10 Hz (100–200 ms)** during long drags **plus a final commit** on end.
  - Use a **Firestore transaction** to enforce `version` advancement.

### 3.3 Deleting / Reordering

- Firestore batch/transaction when affecting multiple shapes (e.g., z‑order changes for a selection).
- Optional `/ops` log entries for undo/redo.

### 3.4 Text / Path Editing (high contention)

- Use a **CRDT** (e.g., Yjs) for concurrent edits.
- Transport CRDT updates via WebRTC/WebSocket; **periodically persist** a snapshot to Firestore (`/crdt/{docId}`) or on unload.
- On join, hydrate CRDT from latest snapshot; apply any recent updates.

> **Guardrail:** Avoid writing the **same Firestore document** at very high frequency; prefer RTDB for continuous motion and throttle Firestore to human‑perceptible cadence.

---

## 4) Conflict Resolution

### 4.1 Geometry & Style (non‑CRDT shapes)

- **Optimistic concurrency** with `version`:

  1. Client reads shape `version` locally.
  2. On update, run **transaction**:

     - Re‑read doc; if `version` unchanged → apply patch, `version++`, update timestamps.
     - If `version` changed → compute **rebase** (merge fields that don’t conflict; for conflicting fields, prefer latest server state or apply deterministic priority like server‑timestamp‑wins) and retry once.

- **Merge policy** examples:

  - Independent fields (e.g., `fill` vs `x`) merge naturally.
  - If two users move the same shape concurrently, prefer **last write by `updatedAt`** (server time). The losing client replays its local intent against the new base and resubmits.

### 4.2 Text & Paths

- CRDT ensures **commutative, idempotent, associative** merges → no conflicts.
- Persist snapshots so reconnecting clients converge fast.

### 4.3 Soft Locks (optional)

- When a user begins a move/resize, set `/locks/{roomId}/{shapeId}`. Other clients may show a “locked by X” badge and avoid edits, but they can still attempt (no hard lock). Clean up via `onDisconnect()`.

---

## 5) Subscriptions & Queries

- Subscribe **per page**: query `/shapes` where `pageId == currentPage`.
- Optional **viewport windowing** later: store `bbox` on shapes and query by range (requires Cloud Function to maintain indexes or use in‑memory filtering after fetch).
- Keep doc size small (< ~10–50 KB). Store images/binary in Cloud Storage.

---

## 6) Security Rules (high‑level)

### 6.1 Firestore Rules (outline)

- Room membership gates read/write.
- Shape writes can only modify allowed fields; validate types & ranges.
- Enforce `version` as integer and increment by ≥1.
- Limit `z` range, `opacity` 0–1, string length caps, `meta` size.
- Owners can manage `/members`.

**Sketch:**

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isMember(roomId) {
      return exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid));
    }

    match /rooms/{roomId} {
      allow read: if isMember(roomId);
      allow write: if false; // room doc immutable from clients

      match /members/{userId} {
        allow read: if isMember(roomId);
        allow write: if request.auth.uid == userId || // self join metadata
                      // OR owner check on parent room
                      get(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid)).data.role == 'owner';
      }

      match /pages/{pageId} {
        allow read: if isMember(roomId);
        allow write: if isMember(roomId) && request.resource.data.keys().hasOnly(['name','index','createdAt','updatedAt']);
      }

      match /shapes/{shapeId} {
        allow read: if isMember(roomId);
        allow write: if isMember(roomId) &&
          // Validate field whitelist
          request.resource.data.diff(resource.data).changedKeys().hasOnly([
            'x','y','w','h','rotation','z','fill','stroke','opacity','locked','meta','version','updatedAt','updatedBy','pageId','type'
          ]) &&
          // Type/range checks (examples):
          request.resource.data.opacity >= 0 && request.resource.data.opacity <= 1 &&
          request.resource.data.version is int && request.resource.data.version >= (resource.data.version || 0) + 1 &&
          request.resource.data.updatedBy == request.auth.uid;
      }

      match /ops/{opId} {
        allow read: if isMember(roomId);
        allow create: if isMember(roomId);
        allow update, delete: if false; // append-only
      }

      match /crdt/{docId} {
        allow read: if isMember(roomId);
        allow write: if isMember(roomId);
      }
    }
  }
}
```

### 6.2 RTDB Rules (outline)

- Users can **read** room presence if member; can **write only** their own node.
- Locks: writer can create/remove only if they are the locker.

**Sketch:**

```json
{
  "rules": {
    "presence": {
      "$roomId": {
        ".read": "root.child('members').child($roomId).child(auth.uid).exists()",
        "$uid": {
          ".write": "$uid === auth.uid"
        }
      }
    },
    "locks": {
      "$roomId": {
        ".read": "root.child('members').child($roomId).child(auth.uid).exists()",
        "$shapeId": {
          ".write": "(!data.exists() && newData.child('userId').val() === auth.uid) || (data.child('userId').val() === auth.uid)"
        }
      }
    }
  }
}
```

> **Note:** Adjust membership checks to mirror Firestore membership or duplicate a minimal membership map in RTDB for performant rules.

---

## 7) Performance Guardrails

- **Throttle Firestore geometry writes** to **≥100–200 ms** during drags. Always do a **final commit** on drag end.
- **RTDB update rate** for cursors/ghosts: **30–60 Hz** typical; clamp to viewport changes to avoid redundant writes.
- **Batch writes** (Firestore `writeBatch`) for multi‑shape operations (move a selection, align, distribute).
- **Unsubscribe** listeners when a page or room is not visible.
- **Doc size limits:** keep shapes lean; store large text or blobs elsewhere (Cloud Storage or CRDT snapshots).
- **Indexing:** add a composite index on `(pageId ASC, z ASC)` if you sort by z; rely on single‑field index for `where('pageId','==',...)`.
- **Avoid N+1 listeners**: one query per page, not per shape.

---

## 8) Undo/Redo Strategy (optional but recommended)

- Append minimal diffs in `/ops` for each user action.
- Client maintains a cursor per user; **redo** if the last op belongs to the user and is still valid; otherwise compute inverse based on `before` snapshot.
- Garbage‑collect old ops (Cloud Function) after snapshotting stable states.

---

## 9) Offline & Reconnect

- Firestore has offline cache → local edits queue; upon reconnect, transactions reconcile with server `version`.
- RTDB presence drops; UI should mark peers as offline after `lastSeen` > threshold.
- On reconnect, re‑emit current selection/cursor and **rehydrate CRDT** from snapshot.

---

## 10) Implementation Steps (Agent Checklist)

1. **Initialize Firebase** (Firestore + RTDB). Enable offline persistence for Firestore.
2. **Implement membership** subcollection; seed owner as first member.
3. **Write Firestore & RTDB rules** per outlines; deploy.
4. **React hooks**:

   - `useShapes(roomId, pageId)` → Firestore query, returns map `{[shapeId]: Shape}`; exposes `createShape`, `updateShapeTx`, `deleteShapeBatch`.
   - `usePresence(roomId)` → RTDB listeners; exposes `updateCursor`, `updateSelection`, `updateGesture`, `setTool`, with `onDisconnect` cleanup.

5. **Move/resize handlers**:

   - On pointer move: update `presence.gesture.draft` at 30–60 Hz.
   - Throttled (100–200 ms): call `updateShapeTx({ x,y,w,h,rotation })`.
   - On pointer up: final `updateShapeTx` and clear gesture.

6. **Transactions**:

   - Read doc; compare `version`; if changed, rebase local patch and retry **once**.

7. **CRDT integration (phase 2)**:

   - Add Yjs per page or per text layer; wire y-webrtc or y-websocket.
   - Persist snapshot to `/crdt/{docId}` every N seconds or on blur/unload.

8. **Ops log (phase 2)**: append minimal diffs for undo; create GC Cloud Function.
9. **Indexing**: add `(pageId,z)` composite if needed; verify query plans in console.
10. **QA & load test**:

- Simulate 10–30 concurrent users moving shapes; verify no hot docs.
- Verify geometry updates stay ≤ 10 Hz; cursors ≥ 30 Hz.
- Kill tabs; confirm `onDisconnect` removes presence/locks.
- Throttle/packet‑loss tests for RTDB updates (visual continuity maintained).

---

## 11) Field Validation (Agent Must Enforce Client‑Side)

- Clamp numbers: `w,h ≥ 0`, `opacity ∈ [0,1]`, `rotation ∈ [0,360)`.
- Sanitize strings: color hex length ≤ 9, text length limits per layer.
- Limit `meta` to small keys (< 2–4 KB) and deny unknown top‑level fields before sending to Firestore.

---

## 12) Telemetry (optional)

- Record client metrics: average latency of Firestore commit, RTDB RTT, dropped frames.
- Count conflicts per minute and retries; alert if spikes indicate hot docs.

---

## 13) Alternatives (if pivoting later)

- **Liveblocks**: built‑in presence/CRDT; store exports in your DB.
- **Convex**: realtime stateful functions; simpler undo/redo server‑side.
- **Supabase Realtime**: Postgres + logical replication; great if you prefer SQL.

---

## 14) Summary Rules of Thumb

- **Authoritative state → Firestore.**
- **Fast, lossy, in‑progress → RTDB.**
- **Use CRDTs** for truly concurrent text/path edits.
- **One doc per shape**, throttle commits, subscribe narrowly.
- **Validate in rules** and with client clamps; use transactions with `version`.

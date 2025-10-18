Here’s a tight planning brief you can hand straight to the agent.

# What the system **must be**

1. **Single source of truth for shapes = Firestore**

   - Every shape is one Firestore doc.
   - Authoritative geometry & style live here: `x,y,width,height,radius,rotation,zIndex,fill,stroke,strokeWidth,text,fontSize,opacity?`
   - Concurrency via `version` (int) and transaction-based updates; `updatedAt` (serverTimestamp), `updatedBy`.

2. **Ephemeral, high-frequency signals = RTDB**

   - No per-shape RTDB state.
   - RTDB holds **per-user presence** & **in-progress gestures** only:

     ```
     /presence/{canvasId}/{userId} = {
       name, color,
       cursor: {x,y},
       selection: string[],
       tool?: "select"|"rect"|"circle"|"text"|"line",
       gesture: {
         type: "move"|"resize"|"rotate"|"draw"|null,
         shapeId: string|null,
         draft?: { x?,y?,width?,height?,rotation? }
       },
       lastSeen: number
     }
     ```

   - Presence updates at 30–60 Hz; authoritative commits to Firestore at ~150 ms throttle + final on pointer-up.

3. **(Future-proof) Canvas scoping**

   - Keep a `canvasId` on each Firestore shape doc (e.g., `"default"` for now).
   - Query shapes with `where('canvasId','==','default')`.

---

# Why (the reasons)

- **Consistency & conflict safety:** One authoritative store (Firestore) + `version` + transactions prevents shape stomping and enables deterministic merges.
- **Performance:** RTDB handles frequent, lossy updates (cursors/ghosts) cheaply; Firestore writes are throttled, avoiding hot documents and costs.
- **Simplicity & security:** Per-user RTDB nodes mean no writer contention and simple rules (“user can write only their presence”). Firestore rules can strictly validate allowed fields & version increments.
- **Future scalability:** One-doc-per-shape sharding + `canvasId` enables paging, indexing, and later multi-canvas/rooms without rewrites.

---

# Exact schemas (final)

## Firestore: `canvas_shapes` (authoritative; doc ID = `shapeId`)

```ts
{
  canvasId: "default",
  type: "rectangle" | "circle" | "text" | "line",
  x: number, y: number,
  zIndex: number,
  width?: number, height?: number,
  radius?: number,
  text?: string, fontSize?: number,
  startX?: number, startY?: number, endX?: number, endY?: number,
  fill?: string, stroke?: string, strokeWidth?: number,
  rotation?: number,
  opacity?: number,              // optional but recommended (0..1)
  createdBy: string, createdAt: Timestamp,
  updatedBy: string, updatedAt: Timestamp,
  version: number
}
```

> Note: Do **not** store `id` inside the doc; use the doc ID. Use **either** `canvasId` **or** `documentId`—prefer `canvasId` and remove the other.

## RTDB: `presence`

```
/presence/{canvasId}/{userId} = {
  name, color,
  cursor: { x, y },
  selection: [shapeId, ...],
  tool?: "select"|"rect"|"circle"|"text"|"line",
  gesture: { type, shapeId, draft? },
  lastSeen: number
}
```

---

# Behavioral rules (agent must implement)

**Drag/resize flow**

- On drag start: write `gesture` in RTDB.
- On drag move: update `gesture.draft` every frame (RTDB, 30–60 Hz) and **throttled** Firestore transaction every ~150 ms with the latest geometry.
- On drag end: final Firestore transaction commit, then clear `gesture`.

**Transactions**

- All shape updates go through a Firestore **transaction** that re-reads doc, validates `version`, applies patch, sets `version++`, `updatedAt`, `updatedBy`.
- On version mismatch, rebase and retry once.

**Security rules**

- **Firestore:** authenticated only; allowed keys whitelist; `version` must be int and increase by ≥1; `updatedBy == request.auth.uid`; numeric clamps (e.g., `opacity` in `[0,1]`).
- **RTDB:** `presence/{canvasId}/{uid}` writeable only by `{uid}`; readable by authed users.

---

# Migration changes (from current PR)

- ✅ Firestore schema is fine; **remove one of** `documentId`/`canvasId` (keep `canvasId`) and **drop `id` field** in doc body.
- ❌ RTDB per-shape path `/shapes/{canvasId}/{shapeId}` should be **removed**.
- ✅ Replace with per-user `/presence/{canvasId}/{userId}` as above; update handlers to write ghosts here.
- ✅ Ensure shape listeners read from Firestore (filtered by `canvasId`).

---

# Acceptance criteria

1. **No split truth:** Geometry only persists in Firestore; RTDB has presence/gestures only.
2. **Smooth observers:** Other clients see live ghost motion from RTDB and steady authoritative shape movement from throttled Firestore commits.
3. **Conflict safe:** Two tabs moving the same shape do not corrupt data; losers rebase and finalize correctly.
4. **Rules enforced:** Invalid field writes or version skips are rejected.
5. **Perf:** During a 20s drag, Firestore writes occur at ~100–200 ms cadence; RTDB updates remain >30 Hz without UI jank.

---

# Deliverables checklist (for the agent)

- [ ] Remove RTDB `/shapes/{canvasId}/{shapeId}` writes and code paths.
- [ ] Implement `/presence/{canvasId}/{userId}` with cursor/selection/gesture.
- [ ] Wrap **all** shape updates in Firestore transactions with `version++`.
- [ ] Throttle Firestore geometry commits to ~150 ms; always final commit on pointer-up.
- [ ] Firestore rules: whitelist + version increment + `updatedBy` checks + clamps.
- [ ] RTDB rules: user-only writes to their presence node.
- [ ] Use `canvasId: "default"` on all shape docs and query by it.
- [ ] Remove redundant `id` field in doc; drop `documentId` if `canvasId` exists.

Hand this directly to your AI implementer and you’ll land exactly on the target architecture.

# 🔧 Course-Correction & Completion Plan

You’ve done most of the heavy lifting—nice work. Two critical deviations remain:

1. **Authoritative shape updates are not using Firestore transactions** (currently plain `updateDoc`).
2. **Observers are rendering in-progress motion from Firestore** instead of **RTDB presence/gesture ghosts**.

Below are the exact changes to make.

---

## 1) Reinstate Firestore transactions for _authoritative_ shape updates

**Why:** We require conflict detection (via `version`) and deterministic merges. Transactions + versioning run **only at a throttled cadence (≈150–200 ms)** and on final commit, so performance remains smooth.

### Actions

- [ ] Restore and use `updateShapeTx(shapeId, patch, uid)` everywhere geometry or zIndex is changed.
- [ ] `updateShapeTx` must:

  - Read current doc
  - Compare/increment `version`
  - Apply patch
  - Set `updatedAt = serverTimestamp()` and `updatedBy = uid`
  - **Retry once** on conflict (re-read → rebase → write)

**Skeleton**

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

  // one retry max
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const cur = snap.data() as any;

        // OPTIONAL: rebase local patch here if you store deltas
        const next = {
          ...patch,
          version: (cur.version ?? 0) + 1,
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        };

        tx.update(ref, next);
      });
      return;
    } catch (e) {
      if (attempt === 1) throw e; // fail after one retry
      // fallthrough to retry once
    }
  }
}
```

- [ ] Replace **all** geometry/zIndex `updateDoc` calls with `updateShapeTx`.
- [ ] Keep throttling at **150–200 ms** during drag + **always final commit** on pointer-up.
- [ ] Style-only edits (e.g., `fill`, `stroke`) may use transactions **or** `updateDoc`; geometry **must** use transactions.

---

## 2) Render in-progress motion from **RTDB presence**, not Firestore

**Why:** Firestore is authoritative and throttled (5–10 Hz), while RTDB is high-frequency (30–60 Hz). Observers should see smooth **ghosts** from RTDB and periodic authoritative shape updates from Firestore.

### Actions

- [ ] Ensure the canvas **subscribes to** `/presence/{canvasId}` and reads each peer’s:

  - `cursor`
  - `gesture.type`, `gesture.shapeId`, `gesture.draft`

- [ ] When `gesture.shapeId` matches a shape you render:

  - Draw a **ghost overlay** using `gesture.draft` (do **not** mutate the Firestore shape state)
  - Ghost should be visually distinct (e.g., translucent outline in peer color)

- [ ] **Remove** any logic that tries to derive live motion from Firestore deltas during drag.

**UI rule of thumb**

- Authoritative layer = Firestore shapes
- Overlay layer = per-user RTDB ghosts (discard on gesture end)

---

## 3) Tighten rules to force the intended flow

- [ ] **Firestore rules** already whitelist fields and require `version` increments—keep that.
      Add a guard to disallow geometry updates without `version`:

  ```js
  // in /canvas_shapes/{shapeId} write rule:
  // If x/y/width/height/rotation/zIndex change, require version increment >= prev+1
  ```

- [ ] **RTDB rules** remain: user can write only to `/presence/{canvasId}/{uid}`.

---

## 4) Throttle & commit behavior (final check)

- [ ] Throttle geometry commits at **150–200 ms** (keep your 200 ms if preferred).
- [ ] Always do a **final transaction commit** on pointer-up.
- [ ] **Coalesce**: if the next throttled patch equals last committed state, skip the write.

---

## 5) File-level edits to complete

- [ ] **`services/shapeTransactions.ts`**

  - Ensure it exports `updateShapeTx` (transactional) and it’s used by all geometry/zIndex writes.

- [ ] **Shape components / interaction handlers**

  - On drag move:

    - `presence.updateGesture({ type:'move', shapeId, draft: { x,y,width,height,rotation } })` **every frame**
    - `commitThrottled(() => updateShapeTx(shape.id, { x,y,width,height,rotation }, uid))`

  - On drag end:

    - `updateShapeTx(...)` **final**
    - `presence.updateGesture(null)`

- [ ] **`hooks/usePresence.ts`**

  - Confirm subscribe API feeds the canvas a map of `{ userId: presence }` and you render ghosts from it.

- [ ] **Remove/disable** any listeners that try to animate with Firestore deltas during drag.

---

## 6) QA checklist (must pass)

1. **Two-tab conflict:** both drag the same shape → no corrupt state; one wins, the other replays smoothly after its single retry.
2. **Smooth observers:** third tab sees continuous motion from RTDB ghosts + stepped authoritative movement (≈5–10 Hz) from Firestore.
3. **Rules enforcement:** geometry writes without `version` bump or to disallowed fields are rejected.
4. **Perf:** 20-second drag = Firestore writes every ~150–200 ms; CPU/jank acceptable; no listener floods.
5. **Disconnect:** closing a tab removes its presence and any ghost immediately.

---

## 7) Notes on “transactions vs performance”

- Transactions were only “slow” when they were called **too frequently**. With the **presence-ghost + throttled-commit** pattern, transaction frequency is low and UX remains smooth.
- If a transaction collides, we **retry once**. With throttling, collisions are rare.

---

## 8) Optional (keep for later)

- Soft locks at `/locks/{canvasId}/{shapeId}` for “Editing by …” badges (not required for correctness).
- Add `opacity` to Firestore schema (0..1) if needed by UI.

---

**Deliverables to mark complete:**

- [ ] All geometry/zIndex updates go through `updateShapeTx` (transactional).
- [ ] Canvas renders in-progress motion from **RTDB presence ghosts**, not Firestore deltas.
- [ ] Throttled commits (150–200 ms) + final commit on pointer-up.
- [ ] Rules enforce versioned geometry writes.
- [ ] QA checklist passes.

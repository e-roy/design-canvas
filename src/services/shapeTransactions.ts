import {
  doc,
  runTransaction,
  serverTimestamp,
  getFirestore,
  updateDoc,
} from "firebase/firestore";
import { StoredShape } from "@/types";

const db = getFirestore();

// Regular update function for frequent operations (like drag)
export async function updateShape(
  shapeId: string,
  patch: Partial<StoredShape>,
  uid: string
) {
  const ref = doc(db, "canvas_shapes", shapeId);

  try {
    // Use updateDoc without version checking for better performance
    // Version conflicts are rare with regular updates
    await updateDoc(ref, {
      ...patch,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    if (firebaseError.code === "failed-precondition") {
      console.warn(`Update conflict for shape ${shapeId}, skipping update`);
      return; // Skip this update rather than retry
    }
    throw error;
  }
}

// Transaction-based update for critical operations
export async function updateShapeTx(
  shapeId: string,
  patch: Partial<StoredShape>,
  uid: string,
  maxRetries: number = 3
) {
  const ref = doc(db, "canvas_shapes", shapeId);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await runTransaction(db, async (tx) => {
        const curSnap = await tx.get(ref);
        if (!curSnap.exists()) return;
        const cur = curSnap.data() as StoredShape;
        const next = {
          ...patch,
          version: (cur.version ?? 0) + 1,
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        };
        tx.update(ref, next);
      });
      return; // Success, exit retry loop
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (
        firebaseError.code === "failed-precondition" &&
        attempt < maxRetries - 1
      ) {
        // Transaction conflict, wait a bit and retry
        console.log(
          `Transaction conflict for shape ${shapeId}, retrying... (attempt ${
            attempt + 1
          })`
        );
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        continue;
      }
      throw error; // Re-throw if not a retryable error or max retries reached
    }
  }
}

export async function createShape(docData: Partial<StoredShape>) {
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

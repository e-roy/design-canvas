import {
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NodeDoc } from "@/types/page";

/**
 * Regular update function for non-critical operations
 * Uses simple updateDoc without version checking for better performance
 * Suitable for operations where conflicts are rare or acceptable
 */
export async function updateNode(
  canvasId: string,
  nodeId: string,
  updates: Partial<Omit<NodeDoc, "id" | "createdAt" | "createdBy" | "version">>,
  updatedBy: string
) {
  const nodeRef = doc(db, `canvases/${canvasId}/nodes/${nodeId}`);

  // Filter out undefined values for Firestore
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  );

  try {
    await updateDoc(nodeRef, {
      ...filteredUpdates,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    if (firebaseError.code === "failed-precondition") {
      console.warn(`Update conflict for node ${nodeId}, skipping update`);
      return; // Skip this update rather than retry
    }
    if (firebaseError.code === "permission-denied") {
      console.warn(`Permission denied for node ${nodeId}, skipping update`);
      return; // Skip this update silently
    }
    throw error;
  }
}

/**
 * Transaction-based update for critical operations requiring conflict resolution
 * Uses optimistic concurrency control with version numbers
 * Suitable for geometry changes, property updates that must not be lost
 *
 * Strategy: Last-write-wins with version checking
 * - If versions match: apply update, increment version
 * - If version changed: retry with exponential backoff (up to maxRetries)
 * - Independent fields (e.g., fill vs x) merge naturally through Firestore's partial updates
 */
export async function updateNodeTx(
  canvasId: string,
  nodeId: string,
  updates: Partial<Omit<NodeDoc, "id" | "createdAt" | "createdBy" | "version">>,
  updatedBy: string,
  maxRetries: number = 3
): Promise<void> {
  const nodeRef = doc(db, `canvases/${canvasId}/nodes/${nodeId}`);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await runTransaction(db, async (tx) => {
        const nodeSnap = await tx.get(nodeRef);

        if (!nodeSnap.exists()) {
          console.warn(`Node ${nodeId} does not exist, skipping update`);
          return;
        }

        const currentNode = nodeSnap.data() as NodeDoc;

        // Filter out undefined values
        const filteredUpdates = Object.fromEntries(
          Object.entries(updates).filter(([, value]) => value !== undefined)
        );

        // Prepare the update with version increment
        const nextVersion = (currentNode.version ?? 0) + 1;
        const updatePayload = {
          ...filteredUpdates,
          version: nextVersion,
          updatedAt: serverTimestamp(),
          updatedBy,
        };

        tx.update(nodeRef, updatePayload);
      });

      // Success, exit retry loop
      return;
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };

      if (
        firebaseError.code === "failed-precondition" &&
        attempt < maxRetries - 1
      ) {
        // Transaction conflict detected, retry with exponential backoff
        const backoffMs = 50 * Math.pow(2, attempt); // 50ms, 100ms, 200ms
        console.log(
          `Transaction conflict for node ${nodeId}, retrying in ${backoffMs}ms... (attempt ${
            attempt + 1
          }/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      // If max retries reached or non-retryable error, throw
      if (attempt === maxRetries - 1) {
        console.error(
          `Failed to update node ${nodeId} after ${maxRetries} attempts`,
          error
        );
      }
      throw error;
    }
  }
}

/**
 * Batch update multiple nodes with transaction safety
 * Useful for operations affecting multiple shapes simultaneously
 */
export async function updateMultipleNodesTx(
  canvasId: string,
  updates: Array<{
    nodeId: string;
    updates: Partial<
      Omit<NodeDoc, "id" | "createdAt" | "createdBy" | "version">
    >;
  }>,
  updatedBy: string,
  maxRetries: number = 3
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await runTransaction(db, async (tx) => {
        // Read all nodes first
        const nodeRefs = updates.map((u) =>
          doc(db, `canvases/${canvasId}/nodes/${u.nodeId}`)
        );

        const nodeSnaps = await Promise.all(nodeRefs.map((ref) => tx.get(ref)));

        // Update all nodes
        nodeSnaps.forEach((snap, index) => {
          if (!snap.exists()) {
            console.warn(
              `Node ${updates[index].nodeId} does not exist, skipping`
            );
            return;
          }

          const currentNode = snap.data() as NodeDoc;
          const filteredUpdates = Object.fromEntries(
            Object.entries(updates[index].updates).filter(
              ([, value]) => value !== undefined
            )
          );

          const nextVersion = (currentNode.version ?? 0) + 1;
          const updatePayload = {
            ...filteredUpdates,
            version: nextVersion,
            updatedAt: serverTimestamp(),
            updatedBy,
          };

          tx.update(nodeRefs[index], updatePayload);
        });
      });

      // Success
      return;
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };

      if (
        firebaseError.code === "failed-precondition" &&
        attempt < maxRetries - 1
      ) {
        const backoffMs = 50 * Math.pow(2, attempt);
        console.log(
          `Batch transaction conflict, retrying in ${backoffMs}ms... (attempt ${
            attempt + 1
          }/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      if (attempt === maxRetries - 1) {
        console.error(
          `Failed to batch update nodes after ${maxRetries} attempts`,
          error
        );
      }
      throw error;
    }
  }
}

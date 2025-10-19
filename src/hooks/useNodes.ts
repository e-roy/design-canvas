import { useEffect, useCallback } from "react";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NodeDoc } from "@/types/page";
import { useCanvasSetNodes } from "@/store/canvas-store";
import { updateNode, updateNodeTx } from "@/services/nodeTransactions";

/**
 * Hook to manage nodes for a canvas page
 * Handles subscription and CRUD operations
 */
export function useNodes(canvasId: string | null, pageId: string | null) {
  const setNodes = useCanvasSetNodes();

  // Subscribe to nodes changes for the current page
  useEffect(() => {
    if (!canvasId || !pageId) {
      // Clear nodes if no page is selected
      setNodes([]);
      return;
    }

    const nodesQuery = query(
      collection(db, `canvases/${canvasId}/nodes`),
      where("pageId", "==", pageId),
      orderBy("orderKey", "asc")
    );

    const unsubscribe = onSnapshot(
      nodesQuery,
      (snapshot) => {
        const nodes = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as NodeDoc)
        );
        setNodes(nodes);
      },
      (error) => {
        console.error("Error subscribing to nodes:", error);
      }
    );

    // Cleanup subscription on unmount or dependency change
    return () => {
      unsubscribe();
    };
  }, [canvasId, pageId, setNodes]);

  // Create a new node
  const createNode = useCallback(
    async (
      targetPageId: string,
      nodeData: Omit<
        NodeDoc,
        | "id"
        | "pageId"
        | "orderKey"
        | "createdAt"
        | "updatedAt"
        | "createdBy"
        | "updatedBy"
        | "version"
      >,
      createdBy: string
    ): Promise<string> => {
      if (!canvasId) throw new Error("No canvas ID");

      // Get the highest orderKey for this page
      const nodesQuery = query(
        collection(db, `canvases/${canvasId}/nodes`),
        where("pageId", "==", targetPageId),
        orderBy("orderKey", "desc")
      );
      const snapshot = await getDocs(nodesQuery);

      const maxOrderKey = snapshot.empty ? 0 : snapshot.docs[0].data().orderKey;
      const newOrderKey = maxOrderKey + 1;

      const nodeRef = doc(collection(db, `canvases/${canvasId}/nodes`));
      const now = serverTimestamp();

      const fullNodeData = {
        pageId: targetPageId,
        ...nodeData,
        orderKey: newOrderKey,
        createdAt: now,
        updatedAt: now,
        createdBy,
        updatedBy: createdBy,
        version: 1,
      };

      // Filter out undefined values for Firestore
      const filteredNodeData = Object.fromEntries(
        Object.entries(fullNodeData).filter(([, value]) => value !== undefined)
      );

      await setDoc(nodeRef, filteredNodeData);
      return nodeRef.id;
    },
    [canvasId]
  );

  // Update a node with optional transaction-based conflict resolution
  // Strategy: Use simple updates for frequent operations (drag), transactions for critical final commits
  const updateNodeWithTx = useCallback(
    async (
      nodeId: string,
      updates: Partial<
        Omit<NodeDoc, "id" | "createdAt" | "createdBy" | "version">
      >,
      updatedBy: string,
      useTx: boolean = false // Default to simple updates for better performance during drag
    ): Promise<void> => {
      if (!canvasId) throw new Error("No canvas ID");

      // Use transactions only when explicitly requested (e.g., drag end, critical operations)
      // For rapid updates during drag, use simple updateDoc for better performance
      if (useTx) {
        await updateNodeTx(canvasId, nodeId, updates, updatedBy);
      } else {
        // Use simple update for frequent operations (throttled drag, style changes, etc.)
        await updateNode(canvasId, nodeId, updates, updatedBy);
      }
    },
    [canvasId]
  );

  // Delete a node
  const deleteNode = useCallback(
    async (nodeId: string): Promise<void> => {
      if (!canvasId) throw new Error("No canvas ID");

      const nodeRef = doc(db, `canvases/${canvasId}/nodes/${nodeId}`);
      await deleteDoc(nodeRef);
    },
    [canvasId]
  );

  // Reorder nodes
  const reorderNodes = useCallback(
    async (nodeIdsInOrder: string[], updatedBy: string): Promise<void> => {
      if (!canvasId) throw new Error("No canvas ID");

      const batch = writeBatch(db);

      nodeIdsInOrder.forEach((nodeId, index) => {
        const nodeRef = doc(db, `canvases/${canvasId}/nodes/${nodeId}`);
        batch.update(nodeRef, {
          orderKey: index + 1,
          updatedAt: serverTimestamp(),
          updatedBy,
        });
      });

      await batch.commit();
    },
    [canvasId]
  );

  return {
    createNode,
    updateNode: updateNodeWithTx, // Renamed to maintain API compatibility
    deleteNode,
    reorderNodes,
  };
}

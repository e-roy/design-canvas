import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NodeDoc } from "@/types/page";

export function useNodes(canvasId: string) {
  // Subscribe to nodes for a specific page
  const subscribeNodes = (
    pageId: string,
    onUpdate: (nodes: NodeDoc[]) => void
  ): (() => void) => {
    const nodesQuery = query(
      collection(db, `canvases/${canvasId}/nodes`),
      where("pageId", "==", pageId),
      orderBy("orderKey", "asc")
    );

    return onSnapshot(nodesQuery, (snapshot) => {
      const nodes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as NodeDoc[];
      onUpdate(nodes);
    });
  };

  // Create a new node
  const createNode = async (
    pageId: string,
    nodeData: Omit<
      NodeDoc,
      | "id"
      | "pageId"
      | "createdAt"
      | "updatedAt"
      | "createdBy"
      | "updatedBy"
      | "version"
    >,
    createdBy: string
  ): Promise<string> => {
    // Get the highest orderKey for this page
    const nodesQuery = query(
      collection(db, `canvases/${canvasId}/nodes`),
      where("pageId", "==", pageId),
      orderBy("orderKey", "desc")
    );
    const snapshot = await getDocs(nodesQuery);

    const maxOrderKey = snapshot.empty ? 0 : snapshot.docs[0].data().orderKey;
    const newOrderKey = maxOrderKey + 1;

    const nodeRef = doc(collection(db, `canvases/${canvasId}/nodes`));
    const now = serverTimestamp();

    const fullNodeData = {
      pageId,
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
  };

  // Update a node
  const updateNode = async (
    nodeId: string,
    updates: Partial<
      Omit<NodeDoc, "id" | "createdAt" | "createdBy" | "version">
    >,
    updatedBy: string
  ): Promise<void> => {
    const nodeRef = doc(db, `canvases/${canvasId}/nodes/${nodeId}`);

    // Filter out undefined values for Firestore
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await updateDoc(nodeRef, {
      ...filteredUpdates,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  };

  // Delete a node
  const deleteNode = async (nodeId: string): Promise<void> => {
    const nodeRef = doc(db, `canvases/${canvasId}/nodes/${nodeId}`);
    await deleteDoc(nodeRef);
  };

  // Reorder nodes
  const reorderNodes = async (
    nodeIdsInOrder: string[],
    updatedBy: string
  ): Promise<void> => {
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
  };

  return {
    subscribeNodes,
    createNode,
    updateNode,
    deleteNode,
    reorderNodes,
  };
}

import { useEffect, useCallback } from "react";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  getDocs,
  writeBatch,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PageDoc } from "@/types/page";
import { useCanvasSetPages } from "@/store/canvas-store";

/**
 * Hook to manage pages for a canvas document
 * Handles subscription and CRUD operations
 */
export function usePages(canvasId: string | null) {
  const setPages = useCanvasSetPages();

  // Subscribe to pages changes
  useEffect(() => {
    if (!canvasId) return;

    const pagesQuery = query(
      collection(db, `canvases/${canvasId}/pages`),
      orderBy("index", "asc")
    );

    const unsubscribe = onSnapshot(
      pagesQuery,
      (snapshot) => {
        const pages = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as PageDoc)
        );
        setPages(pages);
      },
      (error) => {
        console.error("Error subscribing to pages:", error);
      }
    );

    // Cleanup subscription on unmount or canvasId change
    return () => {
      unsubscribe();
    };
  }, [canvasId, setPages]);

  // Create a new page
  const createPage = useCallback(
    async (name: string, createdBy: string): Promise<string> => {
      if (!canvasId) throw new Error("No canvas ID");

      // Get the highest index first (outside transaction)
      const pagesQuery = query(
        collection(db, `canvases/${canvasId}/pages`),
        orderBy("index", "desc"),
        where("index", ">=", 0)
      );
      const snapshot = await getDocs(pagesQuery);

      const maxIndex = snapshot.empty ? 0 : snapshot.docs[0].data().index;
      const newIndex = maxIndex + 1;

      const pageRef = doc(collection(db, `canvases/${canvasId}/pages`));
      const now = serverTimestamp();

      const pageData = {
        name,
        index: newIndex,
        createdAt: now,
        updatedAt: now,
        createdBy,
        updatedBy: createdBy,
        version: 1,
      };

      await setDoc(pageRef, pageData);
      return pageRef.id;
    },
    [canvasId]
  );

  // Rename a page
  const renamePage = useCallback(
    async (pageId: string, name: string, updatedBy: string): Promise<void> => {
      if (!canvasId) throw new Error("No canvas ID");

      const pageRef = doc(db, `canvases/${canvasId}/pages/${pageId}`);
      await updateDoc(pageRef, {
        name,
        updatedAt: serverTimestamp(),
        updatedBy,
      });
    },
    [canvasId]
  );

  // Reorder pages
  const reorderPages = useCallback(
    async (pageIdsInOrder: string[], updatedBy: string): Promise<void> => {
      if (!canvasId) throw new Error("No canvas ID");

      const batch = writeBatch(db);

      pageIdsInOrder.forEach((pageId, index) => {
        const pageRef = doc(db, `canvases/${canvasId}/pages/${pageId}`);
        batch.update(pageRef, {
          index: index + 1,
          updatedAt: serverTimestamp(),
          updatedBy,
        });
      });

      await batch.commit();
    },
    [canvasId]
  );

  // Delete a page (and all its nodes)
  const deletePage = useCallback(
    async (pageId: string, deletedBy: string): Promise<void> => {
      if (!canvasId) throw new Error("No canvas ID");

      // Get all nodes for this page
      const nodesQuery = query(
        collection(db, `canvases/${canvasId}/nodes`),
        where("pageId", "==", pageId)
      );
      const nodesSnapshot = await getDocs(nodesQuery);

      // Delete all nodes for this page first
      const batch = writeBatch(db);
      nodesSnapshot.docs.forEach((nodeDoc) => {
        batch.delete(nodeDoc.ref);
      });

      // Delete the page itself
      const pageRef = doc(db, `canvases/${canvasId}/pages/${pageId}`);
      batch.delete(pageRef);

      // Commit the batch operation
      await batch.commit();
    },
    [canvasId]
  );

  return {
    createPage,
    renamePage,
    reorderPages,
    deletePage,
  };
}

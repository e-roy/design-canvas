import { useState, useEffect, useCallback } from "react";
import { useUserStore } from "@/store/user-store";
import { canvasService } from "@/lib/canvas-service";
import {
  CanvasDocument,
  StoredShape,
  UserCursor,
  UseCanvasReturn,
} from "@/types";

export function useCanvas(documentId?: string): UseCanvasReturn {
  const { user } = useUserStore();
  const [canvasDocument, setCanvasDocument] = useState<CanvasDocument | null>(
    null
  );
  const [shapes, setShapes] = useState<StoredShape[]>([]);
  const [userCursors, setUserCursors] = useState<UserCursor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load canvas data or create if it doesn't exist
  useEffect(() => {
    if (!documentId || !user) return;

    setIsLoading(true);
    setError(null);

    const loadCanvas = async () => {
      try {
        const result = await canvasService.loadCanvas(documentId);
        if (result) {
          setCanvasDocument(result.document);
          setShapes(result.shapes);
        } else {
          setError(
            "Canvas not found. Please check if the canvas document exists in Firebase."
          );
        }
      } catch (err) {
        console.error("Error loading canvas:", err);
        setError("Failed to load canvas");
      } finally {
        setIsLoading(false);
      }
    };

    loadCanvas();
  }, [documentId, user]);

  // Subscribe to real-time updates (only after canvas document exists)
  useEffect(() => {
    if (!documentId || !user || !canvasDocument) return;

    const unsubscribeCanvas = canvasService.subscribeToCanvas(
      documentId,
      (data) => {
        setCanvasDocument(data.document);
        setShapes(data.shapes);
      }
    );

    const unsubscribeCursors = canvasService.subscribeToUserCursors(
      documentId,
      setUserCursors
    );

    return () => {
      unsubscribeCanvas();
      unsubscribeCursors();
    };
  }, [documentId, user, canvasDocument]);

  // Update shape
  const updateShape = useCallback(
    async (shapeId: string, updates: Partial<StoredShape>) => {
      if (!user || !canvasDocument) return;

      try {
        await canvasService.updateShape(shapeId, updates, user.uid);
      } catch (err) {
        console.error("Error updating shape:", err);
        setError("Failed to update shape");
      }
    },
    [user, canvasDocument]
  );

  // Save new shape
  const saveShape = useCallback(
    async (
      shapeData: Omit<
        StoredShape,
        "id" | "createdAt" | "updatedAt" | "updatedBy"
      >
    ) => {
      if (!user || !canvasDocument) return "";

      try {
        return await canvasService.saveShape(canvasDocument.id, shapeData);
      } catch (err) {
        console.error("Error saving shape:", err);
        setError("Failed to save shape");
        return "";
      }
    },
    [user, canvasDocument]
  );

  // Delete shape
  const deleteShape = useCallback(
    async (shapeId: string) => {
      if (!user || !canvasDocument) return;

      try {
        await canvasService.deleteShape(shapeId, canvasDocument.id, user.uid);
      } catch (err) {
        console.error("Error deleting shape:", err);
        setError("Failed to delete shape");
      }
    },
    [user, canvasDocument]
  );

  // Update viewport
  const updateViewport = useCallback(
    async (viewport: { x: number; y: number; scale: number }) => {
      if (!user || !canvasDocument) return;

      try {
        await canvasService.updateViewport(
          canvasDocument.id,
          viewport,
          user.uid
        );
      } catch (err) {
        console.error("Error updating viewport:", err);
        setError("Failed to update viewport");
      }
    },
    [user, canvasDocument]
  );

  // Add collaborator
  const addCollaborator = useCallback(
    async (userId: string) => {
      if (!canvasDocument) return;

      try {
        await canvasService.addCollaborator(
          canvasDocument.id,
          userId,
          user?.uid || ""
        );
      } catch (err) {
        console.error("Error adding collaborator:", err);
        setError("Failed to add collaborator");
      }
    },
    [canvasDocument, user]
  );

  // Remove collaborator
  const removeCollaborator = useCallback(
    async (userId: string) => {
      if (!canvasDocument) return;

      try {
        await canvasService.removeCollaborator(
          canvasDocument.id,
          userId,
          user?.uid || ""
        );
      } catch (err) {
        console.error("Error removing collaborator:", err);
        setError("Failed to remove collaborator");
      }
    },
    [canvasDocument, user]
  );

  return {
    canvasDocument,
    shapes,
    userCursors,
    isLoading,
    error,
    saveShape,
    updateShape,
    deleteShape,
    updateViewport,
    addCollaborator,
    removeCollaborator,
  };
}

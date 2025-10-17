import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { canvasService } from "@/lib/canvas-service";
import { useUserStore } from "./user-store";
import { CanvasDocument, StoredShape, StoredShapeWithId } from "@/types";

interface CanvasState {
  // Document state
  canvasDocument: CanvasDocument | null;
  documentId: string | null;

  // Shapes state
  shapes: StoredShapeWithId[];

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Viewport state
  viewport: {
    x: number;
    y: number;
    scale: number;
  };

  // UI state
  currentTool: "select" | "pan" | "rectangle" | "circle" | "text" | "line";
  canvasDimensions: {
    width: number;
    height: number;
  };
  selectedShapeIds: string[];

  // Local drag state for performance
  draggingShapes: Record<string, { x: number; y: number }>;

  // Subscription management
  subscriptions: {
    canvas: (() => void) | null;
    cursors: (() => void) | null;
  };
}

interface CanvasActions {
  // Document management
  setDocumentId: (documentId: string | null) => void;
  loadCanvas: (documentId: string) => Promise<void>;

  // Shape management
  saveShape: (
    shapeData: Omit<
      StoredShape,
      "id" | "createdAt" | "updatedAt" | "updatedBy" | "version"
    >
  ) => Promise<string>;
  updateShape: (
    shapeId: string,
    updates: Partial<StoredShape>
  ) => Promise<void>;
  toggleShapeVisibility: (shapeId: string) => Promise<void>;
  deleteShape: (shapeId: string) => Promise<void>;

  // Viewport management
  updateViewport: (viewport: {
    x: number;
    y: number;
    scale: number;
  }) => Promise<void>;
  setViewport: (viewport: { x: number; y: number; scale: number }) => void;

  // Collaboration management
  addCollaborator: (userId: string) => Promise<void>;
  removeCollaborator: (userId: string) => Promise<void>;

  // UI state management
  setCurrentTool: (
    tool: "select" | "pan" | "rectangle" | "circle" | "text" | "line"
  ) => void;
  setCanvasDimensions: (dimensions: { width: number; height: number }) => void;
  setSelectedShapeIds: (ids: string[]) => void;
  addSelectedShapeId: (id: string) => void;
  removeSelectedShapeId: (id: string) => void;
  clearSelectedShapeIds: () => void;

  // Drag state management
  startDrag: (shapeId: string, x: number, y: number) => void;
  updateDrag: (shapeId: string, x: number, y: number) => void;
  endDrag: (shapeId: string) => void;
  clearDragState: () => void;

  // State updates (called by Firebase subscriptions)
  updateCanvasData: (data: {
    document: CanvasDocument;
    shapes: StoredShapeWithId[];
  }) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Subscription management
  setupSubscriptions: (documentId: string) => void;

  // Cleanup
  cleanup: () => void;
  reset: () => void;
}

type CanvasStore = CanvasState & CanvasActions;

const initialState: CanvasState = {
  canvasDocument: null,
  documentId: null,
  shapes: [],
  isLoading: false,
  error: null,
  viewport: { x: 1900, y: 2100, scale: 1 }, // Centered for 5000x5000 virtual canvas
  currentTool: "select",
  canvasDimensions: { width: 1200, height: 800 },
  selectedShapeIds: [],
  draggingShapes: {},
  subscriptions: {
    canvas: null,
    cursors: null,
  },
};

export const useCanvasStore = create<CanvasStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Document management
    setDocumentId: (documentId) => {
      const currentDocumentId = get().documentId;
      if (currentDocumentId !== documentId) {
        // Cleanup existing subscriptions
        get().cleanup();

        set({ documentId });

        // Load new canvas if documentId is provided
        if (documentId) {
          get().loadCanvas(documentId);
        }
      }
    },

    loadCanvas: async (documentId) => {
      const { user } = useUserStore.getState();
      if (!user) {
        set({ error: "User not authenticated" });
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const result = await canvasService.loadCanvas(documentId);
        if (result) {
          set({
            canvasDocument: result.document,
            shapes: result.shapes,
            isLoading: false,
          });

          // Set up real-time subscriptions
          get().setupSubscriptions(documentId);
        } else {
          set({
            error:
              "Canvas not found. Please check if the canvas document exists in Firebase.",
            isLoading: false,
          });
        }
      } catch (err) {
        console.error("Error loading canvas:", err);
        set({
          error: "Failed to load canvas",
          isLoading: false,
        });
      }
    },

    // Shape management
    saveShape: async (shapeData) => {
      const { canvasDocument } = get();
      const { user: currentUser } = useUserStore.getState();

      if (!currentUser || !canvasDocument) {
        throw new Error("User not authenticated or canvas not loaded");
      }

      try {
        const shapeId = await canvasService.saveShape(
          canvasDocument.id,
          shapeData
        );
        return shapeId;
      } catch (err) {
        console.error("Error saving shape:", err);
        set({ error: "Failed to save shape" });
        throw err;
      }
    },

    updateShape: async (shapeId, updates) => {
      const { canvasDocument } = get();
      const { user } = useUserStore.getState();

      if (!user || !canvasDocument) {
        throw new Error("User not authenticated or canvas not loaded");
      }

      try {
        await canvasService.updateShape(shapeId, updates, user.uid);
      } catch (err) {
        console.error("Error updating shape:", err);
        set({ error: "Failed to update shape" });
        throw err;
      }
    },

    toggleShapeVisibility: async (shapeId) => {
      const { canvasDocument, shapes } = get();
      const { user } = useUserStore.getState();

      if (!user || !canvasDocument) {
        throw new Error("User not authenticated or canvas not loaded");
      }

      const shape = shapes.find((s) => s.id === shapeId);
      if (!shape) {
        throw new Error("Shape not found");
      }

      try {
        const newVisibility = !shape.visible;
        await canvasService.updateShape(
          shapeId,
          { visible: newVisibility },
          user.uid
        );
      } catch (err) {
        console.error("Error toggling shape visibility:", err);
        set({ error: "Failed to toggle shape visibility" });
        throw err;
      }
    },

    deleteShape: async (shapeId) => {
      const { canvasDocument } = get();
      const { user } = useUserStore.getState();

      if (!user || !canvasDocument) {
        throw new Error("User not authenticated or canvas not loaded");
      }

      try {
        await canvasService.deleteShape(shapeId, canvasDocument.id, user.uid);
      } catch (err) {
        console.error("Error deleting shape:", err);
        set({ error: "Failed to delete shape" });
        throw err;
      }
    },

    // Viewport management
    updateViewport: async (viewport) => {
      const { canvasDocument } = get();
      const { user } = useUserStore.getState();

      if (!user || !canvasDocument) {
        throw new Error("User not authenticated or canvas not loaded");
      }

      try {
        await canvasService.updateViewport(
          canvasDocument.id,
          viewport,
          user.uid
        );
        set({ viewport });
      } catch (err) {
        console.error("Error updating viewport:", err);
        set({ error: "Failed to update viewport" });
        throw err;
      }
    },

    setViewport: (viewport) => {
      set({ viewport });
    },

    // Collaboration management
    addCollaborator: async (userId) => {
      const { canvasDocument } = get();
      const { user } = useUserStore.getState();

      if (!canvasDocument) {
        throw new Error("Canvas not loaded");
      }

      try {
        await canvasService.addCollaborator(
          canvasDocument.id,
          userId,
          user?.uid || ""
        );
      } catch (err) {
        console.error("Error adding collaborator:", err);
        set({ error: "Failed to add collaborator" });
        throw err;
      }
    },

    removeCollaborator: async (userId) => {
      const { canvasDocument } = get();
      const { user } = useUserStore.getState();

      if (!canvasDocument) {
        throw new Error("Canvas not loaded");
      }

      try {
        await canvasService.removeCollaborator(
          canvasDocument.id,
          userId,
          user?.uid || ""
        );
      } catch (err) {
        console.error("Error removing collaborator:", err);
        set({ error: "Failed to remove collaborator" });
        throw err;
      }
    },

    // UI state management
    setCurrentTool: (tool) => set({ currentTool: tool }),

    setCanvasDimensions: (dimensions) => set({ canvasDimensions: dimensions }),

    setSelectedShapeIds: (ids) => set({ selectedShapeIds: ids }),

    addSelectedShapeId: (id) =>
      set((state) => ({
        selectedShapeIds: state.selectedShapeIds.includes(id)
          ? state.selectedShapeIds
          : [...state.selectedShapeIds, id],
      })),

    removeSelectedShapeId: (id) =>
      set((state) => ({
        selectedShapeIds: state.selectedShapeIds.filter(
          (shapeId) => shapeId !== id
        ),
      })),

    clearSelectedShapeIds: () => set({ selectedShapeIds: [] }),

    // Drag state management
    startDrag: (shapeId, x, y) =>
      set((state) => ({
        draggingShapes: {
          ...state.draggingShapes,
          [shapeId]: { x, y },
        },
      })),

    updateDrag: (shapeId, x, y) =>
      set((state) => ({
        draggingShapes: {
          ...state.draggingShapes,
          [shapeId]: { x, y },
        },
      })),

    endDrag: (shapeId) =>
      set((state) => {
        const { [shapeId]: removed, ...remaining } = state.draggingShapes;
        void removed;
        return { draggingShapes: remaining };
      }),

    clearDragState: () => set({ draggingShapes: {} }),

    // State updates (called by Firebase subscriptions)
    updateCanvasData: (data) => {
      set({
        canvasDocument: data.document,
        shapes: data.shapes,
      });
    },

    // Error handling
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // Setup subscriptions
    setupSubscriptions: (documentId) => {
      const { subscriptions } = get();

      // Cleanup existing subscriptions
      if (subscriptions.canvas) subscriptions.canvas();

      // Subscribe to canvas changes
      const canvasUnsubscribe = canvasService.subscribeToCanvas(
        documentId,
        (data) => {
          get().updateCanvasData(data);
        }
      );

      set({
        subscriptions: {
          canvas: canvasUnsubscribe,
          cursors: null,
        },
      });
    },

    // Cleanup
    cleanup: () => {
      const { subscriptions } = get();

      if (subscriptions.canvas) {
        subscriptions.canvas();
      }

      set({
        subscriptions: {
          canvas: null,
          cursors: null,
        },
      });
    },

    // Reset store to initial state
    reset: () => {
      get().cleanup();
      set(initialState);
    },
  }))
);

// Selectors for optimized component subscriptions
export const useCanvasDocument = () =>
  useCanvasStore((state) => state.canvasDocument);
export const useCanvasShapes = () => useCanvasStore((state) => state.shapes);
export const useCanvasLoading = () =>
  useCanvasStore((state) => state.isLoading);
export const useCanvasError = () => useCanvasStore((state) => state.error);
export const useCanvasViewport = () =>
  useCanvasStore((state) => state.viewport);
export const useCanvasTool = () => useCanvasStore((state) => state.currentTool);
export const useCanvasDimensions = () =>
  useCanvasStore((state) => state.canvasDimensions);
export const useSelectedShapeIds = () =>
  useCanvasStore((state) => state.selectedShapeIds);
export const useDraggingShapes = () =>
  useCanvasStore((state) => state.draggingShapes);

// Individual action selectors to prevent re-renders
export const useCanvasSetDocumentId = () =>
  useCanvasStore((state) => state.setDocumentId);
export const useCanvasLoadCanvas = () =>
  useCanvasStore((state) => state.loadCanvas);
export const useCanvasSaveShape = () =>
  useCanvasStore((state) => state.saveShape);
export const useCanvasUpdateShape = () =>
  useCanvasStore((state) => state.updateShape);
export const useCanvasToggleShapeVisibility = () =>
  useCanvasStore((state) => state.toggleShapeVisibility);
export const useCanvasDeleteShape = () =>
  useCanvasStore((state) => state.deleteShape);
export const useCanvasUpdateViewport = () =>
  useCanvasStore((state) => state.updateViewport);
export const useCanvasSetViewport = () =>
  useCanvasStore((state) => state.setViewport);
export const useCanvasAddCollaborator = () =>
  useCanvasStore((state) => state.addCollaborator);
export const useCanvasRemoveCollaborator = () =>
  useCanvasStore((state) => state.removeCollaborator);
export const useCanvasSetCurrentTool = () =>
  useCanvasStore((state) => state.setCurrentTool);
export const useCanvasSetCanvasDimensions = () =>
  useCanvasStore((state) => state.setCanvasDimensions);
export const useCanvasSetSelectedShapeIds = () =>
  useCanvasStore((state) => state.setSelectedShapeIds);
export const useCanvasAddSelectedShapeId = () =>
  useCanvasStore((state) => state.addSelectedShapeId);
export const useCanvasRemoveSelectedShapeId = () =>
  useCanvasStore((state) => state.removeSelectedShapeId);
export const useCanvasClearSelectedShapeIds = () =>
  useCanvasStore((state) => state.clearSelectedShapeIds);
export const useCanvasStartDrag = () =>
  useCanvasStore((state) => state.startDrag);
export const useCanvasUpdateDrag = () =>
  useCanvasStore((state) => state.updateDrag);
export const useCanvasEndDrag = () => useCanvasStore((state) => state.endDrag);
export const useCanvasClearDragState = () =>
  useCanvasStore((state) => state.clearDragState);
export const useCanvasSetError = () =>
  useCanvasStore((state) => state.setError);
export const useCanvasClearError = () =>
  useCanvasStore((state) => state.clearError);
export const useCanvasCleanup = () => useCanvasStore((state) => state.cleanup);
export const useCanvasReset = () => useCanvasStore((state) => state.reset);

// Combined selectors for common use cases - memoized to prevent infinite re-renders
export const useCanvasData = () => {
  const canvasDocument = useCanvasStore((state) => state.canvasDocument);
  const shapes = useCanvasStore((state) => state.shapes);
  const isLoading = useCanvasStore((state) => state.isLoading);
  const error = useCanvasStore((state) => state.error);

  return {
    canvasDocument,
    shapes,
    isLoading,
    error,
  };
};

export const useCanvasUI = () => {
  const currentTool = useCanvasStore((state) => state.currentTool);
  const canvasDimensions = useCanvasStore((state) => state.canvasDimensions);
  const viewport = useCanvasStore((state) => state.viewport);

  return {
    currentTool,
    canvasDimensions,
    viewport,
  };
};

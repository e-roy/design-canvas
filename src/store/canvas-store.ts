import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { canvasService } from "@/lib/canvas-service";
import { canvasSeeder } from "@/lib/canvas-seeder";
import { useUserStore } from "./user-store";
import { CanvasDocument } from "@/types";
import { PageDoc, NodeDoc } from "@/types/page";

interface CanvasState {
  // Document state
  canvasDocument: CanvasDocument | null;
  documentId: string | null;

  // Pages state
  pages: PageDoc[];
  currentPageId: string | null;

  // Nodes state (replaces shapes)
  nodes: NodeDoc[];

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
  currentTool:
    | "select"
    | "pan"
    | "rectangle"
    | "circle"
    | "text"
    | "line"
    | "triangle"
    | "frame"
    | "ai-chat";
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
    pages: (() => void) | null;
    nodes: (() => void) | null;
  };
}

interface CanvasActions {
  // Document management
  setDocumentId: (documentId: string | null) => void;
  loadCanvas: (documentId: string) => Promise<void>;

  // Page management
  setCurrentPageId: (pageId: string | null) => void;

  // Viewport management
  updateViewport: (viewport: {
    x: number;
    y: number;
    scale: number;
  }) => Promise<void>;
  setViewport: (viewport: { x: number; y: number; scale: number }) => void;
  loadViewportFromStorage: () => void;
  loadPageFromStorage: () => void;
  savePageToStorage: (pageId: string) => void;

  // Collaboration management
  addCollaborator: (userId: string) => Promise<void>;
  removeCollaborator: (userId: string) => Promise<void>;

  // UI state management
  setCurrentTool: (
    tool:
      | "select"
      | "pan"
      | "rectangle"
      | "circle"
      | "text"
      | "line"
      | "triangle"
      | "frame"
      | "ai-chat"
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

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Subscription management
  setupSubscriptions: (_documentId: string) => Promise<void>;
  setPages: (pages: PageDoc[]) => void;
  setNodes: (nodes: NodeDoc[]) => void;
  setSubscriptions: (subscriptions: {
    canvas: (() => void) | null;
    cursors: (() => void) | null;
    pages: (() => void) | null;
    nodes: (() => void) | null;
  }) => void;

  // Cleanup
  cleanup: () => void;
  reset: () => void;
}

type CanvasStore = CanvasState & CanvasActions;

const initialState: CanvasState = {
  canvasDocument: null,
  documentId: null,
  pages: [],
  currentPageId: null,
  nodes: [],
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
    pages: null,
    nodes: null,
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
        // Load the canvas document
        let result = await canvasService.loadCanvas(documentId);

        // If canvas doesn't exist, try to seed it
        if (!result) {
          console.log(`Canvas ${documentId} not found, attempting to seed...`);

          // Special handling for main canvas
          if (documentId === "main-collaborative-canvas") {
            await canvasSeeder.seedMainCanvas(user.uid);
          } else {
            // For other canvases, create with default data
            await canvasSeeder.seedCustomCanvas(
              documentId,
              {
                name: `Canvas ${documentId}`,
                description: "A collaborative canvas",
                isPublic: true,
              },
              user.uid
            );
          }

          // Try loading again after seeding
          result = await canvasService.loadCanvas(documentId);
        }

        if (result) {
          set({
            canvasDocument: result.document,
            isLoading: false,
          });

          // Set up real-time subscriptions for pages and nodes
          await get().setupSubscriptions(documentId);
        } else {
          set({
            error: "Failed to create or load canvas",
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

    // Page management
    setCurrentPageId: (pageId) => {
      set({ currentPageId: pageId });
      // Save to localStorage for persistence
      if (pageId) {
        get().savePageToStorage(pageId);
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

    loadViewportFromStorage: () => {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("design-canvas-viewport");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (
              typeof parsed.x === "number" &&
              typeof parsed.y === "number" &&
              typeof parsed.scale === "number"
            ) {
              set({
                viewport: { x: parsed.x, y: parsed.y, scale: parsed.scale },
              });
            }
          }
        } catch (error) {
          console.warn("Failed to load viewport from localStorage:", error);
        }
      }
    },

    loadPageFromStorage: () => {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("design-canvas-current-page");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (typeof parsed.pageId === "string") {
              set({ currentPageId: parsed.pageId });
            }
          }
        } catch (error) {
          console.warn("Failed to load current page from localStorage:", error);
        }
      }
    },

    savePageToStorage: (pageId: string) => {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            "design-canvas-current-page",
            JSON.stringify({ pageId })
          );
        } catch (error) {
          console.warn("Failed to save current page to localStorage:", error);
        }
      }
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

    // Error handling
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // Setup subscriptions
    setupSubscriptions: async (_documentId) => {
      const { subscriptions } = get();

      // Cleanup existing subscriptions
      if (subscriptions.canvas) subscriptions.canvas();
      if (subscriptions.pages) subscriptions.pages();
      if (subscriptions.nodes) subscriptions.nodes();

      // Note: Subscriptions are now handled at the component level
      // This function is kept for compatibility but doesn't do anything
      // console.log("Subscriptions should be set up at component level");
    },

    // Setter functions for subscriptions
    setPages: (pages) => set({ pages }),
    setNodes: (nodes) => set({ nodes }),
    setSubscriptions: (subscriptions) => set({ subscriptions }),

    // Cleanup
    cleanup: () => {
      const { subscriptions } = get();

      if (subscriptions.canvas) {
        subscriptions.canvas();
      }
      if (subscriptions.pages) {
        subscriptions.pages();
      }
      if (subscriptions.nodes) {
        subscriptions.nodes();
      }

      set({
        subscriptions: {
          canvas: null,
          cursors: null,
          pages: null,
          nodes: null,
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
export const useCanvasNodes = () => useCanvasStore((state) => state.nodes);
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

// Page selectors
export const useCanvasPages = () => useCanvasStore((state) => state.pages);
export const useCanvasCurrentPageId = () =>
  useCanvasStore((state) => state.currentPageId);

// Individual action selectors to prevent re-renders
export const useCanvasSetDocumentId = () =>
  useCanvasStore((state) => state.setDocumentId);
export const useCanvasLoadCanvas = () =>
  useCanvasStore((state) => state.loadCanvas);
export const useCanvasUpdateViewport = () =>
  useCanvasStore((state) => state.updateViewport);
export const useCanvasSetViewport = () =>
  useCanvasStore((state) => state.setViewport);
export const useCanvasLoadViewportFromStorage = () =>
  useCanvasStore((state) => state.loadViewportFromStorage);
export const useCanvasLoadPageFromStorage = () =>
  useCanvasStore((state) => state.loadPageFromStorage);
export const useCanvasSavePageToStorage = () =>
  useCanvasStore((state) => state.savePageToStorage);
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

// Page action selectors
export const useCanvasSetCurrentPageId = () =>
  useCanvasStore((state) => state.setCurrentPageId);
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
export const useCanvasSetPages = () =>
  useCanvasStore((state) => state.setPages);
export const useCanvasSetNodes = () =>
  useCanvasStore((state) => state.setNodes);
export const useCanvasSetSubscriptions = () =>
  useCanvasStore((state) => state.setSubscriptions);

// Combined selectors for common use cases - memoized to prevent infinite re-renders
export const useCanvasData = () => {
  const canvasDocument = useCanvasStore((state) => state.canvasDocument);
  const nodes = useCanvasStore((state) => state.nodes);
  const isLoading = useCanvasStore((state) => state.isLoading);
  const error = useCanvasStore((state) => state.error);

  return {
    canvasDocument,
    nodes,
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

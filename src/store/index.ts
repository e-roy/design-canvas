// Export all store hooks and types
export { useUserStore, type User } from "./user-store";
export { useCursorStore } from "./cursor-store";
export {
  useCanvasStore,
  useCanvasDocument,
  useCanvasShapes,
  useCanvasLoading,
  useCanvasError,
  useCanvasViewport,
  useCanvasTool,
  useCanvasDimensions,
  useSelectedShapeIds,
  useDraggingShapes,
  useCanvasActions,
  useCanvasData,
  useCanvasUI,
} from "./canvas-store";

// Future stores can be added here
// export { useCollaborationStore } from "./collaboration-store";

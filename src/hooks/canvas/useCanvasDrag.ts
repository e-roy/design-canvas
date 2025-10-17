import { useState, useRef, useCallback, useEffect } from "react";
import type { Shape } from "@/types";
import { updateShape } from "@/services/shapeTransactions";
import { CANVAS_CONSTANTS } from "@/lib/canvas/constants";

interface UseCanvasDragProps {
  shapes: Shape[];
  user: { uid: string } | null;
  onShapeUpdate?: (id: string, updates: Partial<Shape>) => void;
  presence: {
    updateGesture: (
      gesture: {
        type: string;
        shapeId: string;
        draft: Record<string, unknown>;
      } | null
    ) => void;
  };
}

export const useCanvasDrag = ({
  shapes,
  user,
  onShapeUpdate,
  presence,
}: UseCanvasDragProps) => {
  // Local drag state for smooth dragging (not persisted to store)
  const [localDragState, setLocalDragState] = useState<
    Record<string, { x: number; y: number }>
  >({});

  // Track pending drag end updates to prevent flicker
  const pendingDragEnds = useRef<Set<string>>(new Set());

  // Track active dragging shapes for more frequent updates
  const activeDraggingShapes = useRef<Set<string>>(new Set());

  // Throttled commit function for shape updates
  const commitThrottled = useCallback(() => {
    let lastCall = 0;
    let timeout: NodeJS.Timeout | null = null;
    let pendingUpdate: { shapeId: string; patch: Partial<Shape> } | null = null;

    return (shapeId: string, patch: Partial<Shape>) => {
      // Store the latest update
      pendingUpdate = { shapeId, patch };

      const now = Date.now();
      const remaining = CANVAS_CONSTANTS.THROTTLE_INTERVAL - (now - lastCall);

      if (remaining <= 0) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        lastCall = now;
        if (user?.uid && onShapeUpdate && pendingUpdate) {
          updateShape(
            pendingUpdate.shapeId,
            pendingUpdate.patch,
            user.uid
          ).catch((error: unknown) => {
            console.warn(
              `Failed to update shape ${pendingUpdate?.shapeId}:`,
              error instanceof Error ? error.message : String(error)
            );
          });
          pendingUpdate = null;
        }
      } else if (!timeout) {
        timeout = setTimeout(() => {
          lastCall = Date.now();
          timeout = null;
          if (user?.uid && onShapeUpdate && pendingUpdate) {
            updateShape(
              pendingUpdate.shapeId,
              pendingUpdate.patch,
              user.uid
            ).catch((error: unknown) => {
              console.warn(
                `Failed to update shape ${pendingUpdate?.shapeId}:`,
                error instanceof Error ? error.message : String(error)
              );
            });
            pendingUpdate = null;
          }
        }, remaining);
      }
    };
  }, [user?.uid, onShapeUpdate]);

  // Throttle RTDB updates to 30 FPS for better performance
  const rtdbUpdateRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const handleShapeDragStart = useCallback(
    (id: string) => {
      // Move shape to front when dragging starts
      if (onShapeUpdate) {
        onShapeUpdate(id, { zIndex: Date.now() });
      }

      // Mark as actively dragging for more frequent updates
      activeDraggingShapes.current.add(id);

      // Update presence gesture
      const shape = shapes.find((s) => s.id === id);
      if (shape) {
        presence.updateGesture({
          type: "move",
          shapeId: id,
          draft: {
            x: shape.x,
            y: shape.y,
            width: shape.width || 100,
            height: shape.height || 100,
            rotation: shape.rotation || 0,
          },
        });
      }
    },
    [onShapeUpdate, shapes, presence]
  );

  const handleShapeDragMove = useCallback(
    (id: string, x: number, y: number) => {
      // Update local drag state for instant visual feedback
      setLocalDragState((prev) => ({
        ...prev,
        [id]: { x, y },
      }));

      // Throttle RTDB updates to 30 FPS (33ms intervals)
      if (rtdbUpdateRef.current[id]) {
        clearTimeout(rtdbUpdateRef.current[id]);
      }

      rtdbUpdateRef.current[id] = setTimeout(() => {
        const shape = shapes.find((s) => s.id === id);
        if (shape) {
          presence.updateGesture({
            type: "move",
            shapeId: id,
            draft: {
              x,
              y,
              width: shape.width || 100,
              height: shape.height || 100,
              rotation: shape.rotation || 0,
            },
          });
        }
        delete rtdbUpdateRef.current[id];
      }, 33); // ~30 FPS - match original canvas timing

      // Use throttled commit for Firestore updates
      commitThrottled()(id, { x, y });
    },
    [shapes, presence, commitThrottled]
  );

  const handleShapeDragEnd = useCallback(
    (id: string, finalX?: number, finalY?: number) => {
      // Remove from active dragging set
      activeDraggingShapes.current.delete(id);

      // Clear any pending RTDB updates
      if (rtdbUpdateRef.current[id]) {
        clearTimeout(rtdbUpdateRef.current[id]);
        delete rtdbUpdateRef.current[id];
      }

      // Clear presence gesture immediately to prevent ghost objects
      presence.updateGesture(null);

      // Final Firebase update with actual position from Konva
      if (finalX !== undefined && finalY !== undefined) {
        // Add a small delay to ensure any pending throttled updates complete first
        setTimeout(() => {
          if (user?.uid) {
            updateShape(id, { x: finalX, y: finalY }, user.uid).catch(
              (error) => {
                console.warn(
                  `Failed to finalize shape ${id} position:`,
                  error instanceof Error ? error.message : String(error)
                );
              }
            );
          }
        }, CANVAS_CONSTANTS.FINAL_POSITION_DELAY);

        // Mark this shape as having a pending drag end
        // Local state will be cleared when Firebase update is confirmed
        pendingDragEnds.current.add(id);
      } else {
        // If no final position, clear immediately
        setLocalDragState((prev) => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      }
    },
    [presence, user?.uid]
  );

  // Monitor Firebase updates to clear local drag state when confirmed
  useEffect(() => {
    if (!shapes) return;

    // Check if any pending drag ends have been confirmed by Firebase
    pendingDragEnds.current.forEach((shapeId) => {
      const externalShape = shapes.find((s) => s.id === shapeId);
      const localDrag = localDragState[shapeId];

      if (externalShape && localDrag) {
        // Check if Firebase position matches our local position (within tolerance)
        const tolerance = CANVAS_CONSTANTS.DRAG_TOLERANCE;
        const xMatch = Math.abs(externalShape.x - localDrag.x) < tolerance;
        const yMatch = Math.abs(externalShape.y - localDrag.y) < tolerance;

        if (xMatch && yMatch) {
          // Firebase update confirmed, clear local state
          setLocalDragState((prev) => {
            const newState = { ...prev };
            delete newState[shapeId];
            return newState;
          });
          pendingDragEnds.current.delete(shapeId);
        }
      }
    });
  }, [shapes, localDragState]);

  // Cleanup effect to handle edge cases
  useEffect(() => {
    const pendingDragEndsRef = pendingDragEnds.current;
    const activeDraggingShapesRef = activeDraggingShapes.current;

    return () => {
      // Clear any pending drag ends on unmount
      pendingDragEndsRef.clear();
      activeDraggingShapesRef.clear();
    };
  }, []);

  return {
    localDragState,
    handleShapeDragStart,
    handleShapeDragMove,
    handleShapeDragEnd,
  };
};

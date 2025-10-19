"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  forwardRef,
} from "react";
import { Stage, Layer, Rect } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Timestamp } from "firebase/firestore";
import { CanvasProps, CanvasViewport, Point, Shape } from "@/types";
import { Viewport } from "./viewport";
import { CanvasGrid } from "./grid";
import {
  RectangleShape,
  CircleShape,
  TextShape,
  LineShape,
  TriangleShape,
  FrameShape,
  GroupShape,
} from "./shapes";
import { CursorsOverlay } from "./cursor";
import { NodeDoc } from "@/types/page";
import { useNodeTree } from "@/hooks/useNodeTree";
import { NodeTreeListRenderer } from "./node-tree-renderer";
import { CursorPosition } from "@/types";
import { generateUserColor } from "@/utils/color";
import {
  useCanvasViewport,
  useCanvasTool,
  useSelectedShapeIds,
  useCanvasSetCurrentTool,
  useCanvasSetViewport,
  useCanvasSetSelectedShapeIds,
} from "@/store/canvas-store";
import { useUserStore } from "@/store/user-store";
import { usePresence } from "@/hooks/usePresence";
import { reparentTx } from "@/services/nodes";

// Canvas constants
const VIRTUAL_WIDTH = 5000;
const VIRTUAL_HEIGHT = 5000;
const MIN_SCALE = 0.05; // Lower minimum scale to allow seeing full canvas
const MAX_SCALE = 5;

export interface CanvasRef {
  setTool: (
    tool:
      | "select"
      | "pan"
      | "rectangle"
      | "circle"
      | "text"
      | "line"
      | "triangle"
      | "frame"
  ) => void;
  getViewport: () => CanvasViewport;
  getShapes: () => Shape[];
  deleteShape: (id: string) => void;
  clearCanvas: () => void;
}

export const Canvas = forwardRef<CanvasRef, CanvasProps>(function Canvas(
  {
    width,
    height,
    virtualWidth = VIRTUAL_WIDTH,
    virtualHeight = VIRTUAL_HEIGHT,
    gridSize = 50,
    showGrid = true,
    className = "",
    shapes: externalShapes = [],
    canvasId = "default",
    currentPageId = null,
    onShapeCreate,
    onShapeUpdate,
    onShapeDelete,
    onToolChange,
    onMouseMove,
    onViewportChange,
    currentUserId,
  },
  ref
) {
  // Use individual store selectors for global state to prevent re-renders
  const viewport = useCanvasViewport();
  const currentTool = useCanvasTool();
  const selectedShapeIds = useSelectedShapeIds();
  const setCurrentTool = useCanvasSetCurrentTool();
  const setViewport = useCanvasSetViewport();
  const setSelectedShapeIds = useCanvasSetSelectedShapeIds();

  // Get user information for presence
  const { user } = useUserStore();

  // Memoize presence object to prevent unnecessary re-renders
  const presenceConfig = useMemo(
    () => ({
      uid: user?.uid || "anonymous",
      name: user?.displayName || user?.email || "Anonymous",
      color: user?.uid ? generateUserColor(user.uid) : "#3b82f6", // Generate color based on user ID
    }),
    [user?.uid, user?.displayName, user?.email]
  );

  // Initialize presence system
  const presence = usePresence(
    canvasId,
    presenceConfig,
    currentPageId || undefined
  );

  // Subscribe to peer presence for ghost rendering
  const [peerPresence, setPeerPresence] = useState<
    Record<
      string,
      {
        name: string;
        color: string;
        cursor: { x: number; y: number };
        selection: string[];
        gesture: {
          type: string;
          shapeId: string;
          draft: Record<string, unknown>;
        } | null;
        lastSeen: number;
      }
    >
  >({});

  // Use ref to store presence object to prevent effect re-runs
  const presenceRef = useRef(presence);
  presenceRef.current = presence;

  // Canvas drag-and-drop state for nesting shapes into frames
  const [_draggedShapeId, setDraggedShapeId] = useState<string | null>(null);
  const [hoveredFrameId, setHoveredFrameId] = useState<string | null>(null);

  // Helper function to convert shape position to world coordinates
  // Uses the shapes array which already has localDragState applied
  const getShapeWorldPosition = useCallback(
    (shape: Shape, allShapes: Shape[]): { x: number; y: number } => {
      // If no parent, coordinates are already in world space
      if (!shape.parentId) {
        return { x: shape.x, y: shape.y };
      }

      // Find the parent frame/group
      // Note: allShapes should already have localDragState applied, so parent.x/y reflects current position
      const parent = allShapes.find((s) => s.id === shape.parentId);
      if (!parent) {
        // Parent not found, assume world coordinates
        return { x: shape.x, y: shape.y };
      }

      // Recursively get parent's world position (in case of nested groups)
      const parentWorld = getShapeWorldPosition(parent, allShapes);

      // Transform local coordinates to world coordinates
      // For now, we only handle translation (x, y) - rotation can be added later if needed
      return {
        x: parentWorld.x + shape.x,
        y: parentWorld.y + shape.y,
      };
    },
    []
  );

  // Helper function to convert world coordinates to local coordinates relative to a parent
  // dragStateOverrides: optional map of shape IDs to their current drag positions (for accurate parent positioning during drag)
  const worldToLocalPosition = useCallback(
    (
      worldX: number,
      worldY: number,
      parentId: string | null,
      allShapes: Shape[],
      dragStateOverrides?: Record<string, { x: number; y: number }>
    ): { x: number; y: number } => {
      // If no parent, world coordinates are the same as local coordinates
      if (!parentId) {
        return { x: worldX, y: worldY };
      }

      // Find the parent frame/group
      const parent = allShapes.find((s) => s.id === parentId);
      if (!parent) {
        // Parent not found, return world coordinates as-is
        return { x: worldX, y: worldY };
      }

      // Get parent's world position, using drag state if available
      const parentWorld = dragStateOverrides?.[parentId]
        ? dragStateOverrides[parentId]
        : getShapeWorldPosition(parent, allShapes);

      // Convert world coordinates to local coordinates relative to parent
      return {
        x: worldX - parentWorld.x,
        y: worldY - parentWorld.y,
      };
    },
    [getShapeWorldPosition]
  );

  // Helper function to check if a point is inside a frame's bounds
  const isPointInFrame = useCallback(
    (x: number, y: number, frame: Shape): boolean => {
      const fx = frame.x;
      const fy = frame.y;
      const fw = frame.width || 300;
      const fh = frame.height || 200;

      return x >= fx && x <= fx + fw && y >= fy && y <= fy + fh;
    },
    []
  );

  // Helper function to check if a shape intersects with selection rectangle
  const doesShapeIntersectRect = useCallback(
    (
      shape: Shape,
      rect: { x: number; y: number; width: number; height: number },
      allShapes: Shape[]
    ): boolean => {
      // Get shape's world position
      const shapeWorld = getShapeWorldPosition(shape, allShapes);
      const shapeX = shapeWorld.x;
      const shapeY = shapeWorld.y;

      // Get shape bounds based on type
      let shapeWidth = 0;
      let shapeHeight = 0;

      if (shape.type === "circle" && shape.radius) {
        // For circles, use radius as bounding box
        shapeWidth = shape.radius * 2;
        shapeHeight = shape.radius * 2;
      } else if (
        shape.type === "line" &&
        shape.startX !== undefined &&
        shape.endX !== undefined &&
        shape.startY !== undefined &&
        shape.endY !== undefined
      ) {
        // For lines, calculate bounding box from endpoints
        shapeWidth = Math.abs(shape.endX - shape.startX);
        shapeHeight = Math.abs(shape.endY - shape.startY);
      } else {
        // For other shapes, use width and height
        shapeWidth = shape.width || 100;
        shapeHeight = shape.height || 100;
      }

      // Check if rectangles intersect (AABB collision detection)
      return !(
        shapeX + shapeWidth < rect.x ||
        shapeX > rect.x + rect.width ||
        shapeY + shapeHeight < rect.y ||
        shapeY > rect.y + rect.height
      );
    },
    [getShapeWorldPosition]
  );

  // Helper function to check if a shape's center is inside a frame
  const isShapeCenterInFrame = useCallback(
    (shape: Shape, frame: Shape, allShapes: Shape[]): boolean => {
      // Get shape's world position
      const worldPos = getShapeWorldPosition(shape, allShapes);
      const centerX = worldPos.x + (shape.width || 50) / 2;
      const centerY = worldPos.y + (shape.height || 50) / 2;

      return isPointInFrame(centerX, centerY, frame);
    },
    [isPointInFrame, getShapeWorldPosition]
  );

  // Find which frame (if any) contains a shape's center
  const findContainingFrame = useCallback(
    (shape: Shape, allShapes: Shape[]): Shape | null => {
      // Get all frames except the shape itself and its current parent
      const frames = allShapes.filter(
        (s) =>
          s.type === "frame" &&
          s.id !== shape.id &&
          s.id !== shape.parentId &&
          s.visible !== false
      );

      // Find the topmost frame (highest z-index) that contains the shape's center
      const containingFrames = frames.filter((frame) =>
        isShapeCenterInFrame(shape, frame, allShapes)
      );

      if (containingFrames.length === 0) return null;

      // Return the frame with highest zIndex (most recently created/moved)
      return containingFrames.reduce((topmost, current) => {
        const topmostZ = topmost.zIndex || 0;
        const currentZ = current.zIndex || 0;
        return currentZ > topmostZ ? current : topmost;
      });
    },
    [isShapeCenterInFrame]
  );

  // Save viewport to localStorage whenever it changes (throttled)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(
            "design-canvas-viewport",
            JSON.stringify({
              x: viewport.x,
              y: viewport.y,
              scale: viewport.scale,
            })
          );
        } catch (error) {
          console.warn("Failed to save viewport to localStorage:", error);
        }
      }, 100); // Throttle saves to avoid excessive localStorage writes

      return () => clearTimeout(timeoutId);
    }
  }, [viewport.x, viewport.y, viewport.scale]);

  useEffect(() => {
    const unsubscribe = presenceRef.current.subscribePeers((peers) => {
      const now = Date.now();
      const cleanedPeers: Record<
        string,
        {
          name: string;
          color: string;
          cursor: { x: number; y: number };
          selection: string[];
          gesture: {
            type: string;
            shapeId: string;
            draft: Record<string, unknown>;
          } | null;
          lastSeen: number;
        }
      > = {};

      // Filter out stale peer data (older than 10 seconds)
      Object.entries(peers).forEach(([peerId, peer]) => {
        if (peer && peer.lastSeen && now - peer.lastSeen < 10000) {
          cleanedPeers[peerId] = {
            ...peer,
            gesture: peer.gesture as {
              type: string;
              shapeId: string;
              draft: Record<string, unknown>;
            } | null,
          };
        }
      });

      setPeerPresence(cleanedPeers);
    });
    return unsubscribe;
  }, []); // Empty dependency array - use ref for current presence

  // Throttled commit function for shape updates
  const commitThrottled = useMemo(() => {
    let lastCall = 0;
    let timeout: NodeJS.Timeout | null = null;
    let pendingUpdate: { shapeId: string; patch: Partial<Shape> } | null = null;

    return (shapeId: string, patch: Partial<Shape>) => {
      // Store the latest update
      pendingUpdate = { shapeId, patch };

      const now = Date.now();
      const remaining = 75 - (now - lastCall); // 75ms for sub-100ms updates to meet Excellent rating

      if (remaining <= 0) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        lastCall = now;
        if (user?.uid && onShapeUpdate && pendingUpdate) {
          // Use the onShapeUpdate callback for throttled drag updates
          onShapeUpdate(pendingUpdate.shapeId, pendingUpdate.patch);
          pendingUpdate = null;
        }
      } else if (!timeout) {
        timeout = setTimeout(() => {
          lastCall = Date.now();
          timeout = null;
          if (user?.uid && onShapeUpdate && pendingUpdate) {
            // Use the onShapeUpdate callback for throttled drag updates
            onShapeUpdate(pendingUpdate.shapeId, pendingUpdate.patch);
            pendingUpdate = null;
          }
        }, remaining);
      }
    };
  }, [user?.uid, onShapeUpdate]);

  // Local drag state for smooth dragging (not persisted to store)
  const [localDragState, setLocalDragState] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [previewShape, setPreviewShape] = useState<Shape | null>(null);

  // Track pending drag end updates to prevent flicker
  const pendingDragEnds = useRef<Set<string>>(new Set());

  // Local UI state (not global)
  const [isPanMode, setIsPanMode] = useState(false);
  const [isCreatingShape, setIsCreatingShape] = useState(false);
  const [creationStartPoint, setCreationStartPoint] = useState<Point | null>(
    null
  );

  // Selection rectangle state for multi-select
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionStartRef = useRef<Point | null>(null);
  const justFinishedSelectingRef = useRef(false);

  // Use external shapes if provided, otherwise use empty array
  // Memoize ghost shapes to prevent unnecessary re-creation
  const ghostShapes = useMemo(() => {
    const ghosts: Shape[] = [];
    Object.entries(peerPresence).forEach(([peerId, peer]) => {
      if (peerId === user?.uid || !peer.gesture) return;

      const gesture = peer.gesture;
      if (gesture.type === "move" && gesture.shapeId && gesture.draft) {
        // Find the original shape to create a ghost
        const originalShape = externalShapes.find(
          (s) => s.id === gesture.shapeId
        );
        if (originalShape) {
          // Check if this shape is being dragged locally by the current user
          // If so, don't show a ghost to prevent visual conflicts
          const isLocallyDragging = localDragState[gesture.shapeId];
          if (isLocallyDragging) {
            return; // Skip creating ghost for locally dragged shapes
          }

          // Only show ghost if the gesture data is recent (within last 2 seconds)
          const gestureAge = Date.now() - peer.lastSeen;
          if (gestureAge > 2000) {
            return; // Skip stale gestures
          }

          ghosts.push({
            ...originalShape,
            id: `ghost-${peerId}-${gesture.shapeId}`,
            x: (gesture.draft.x as number) || originalShape.x,
            y: (gesture.draft.y as number) || originalShape.y,
            width: (gesture.draft.width as number) || originalShape.width,
            height: (gesture.draft.height as number) || originalShape.height,
            rotation:
              (gesture.draft.rotation as number) || originalShape.rotation,
            // Make ghost visually distinct
            fill: "transparent",
            stroke: peer.color || "#3b82f6",
            strokeWidth: 2,
            opacity: 0.5,
          });
        }
      }
    });
    return ghosts;
  }, [peerPresence, externalShapes, user?.uid, localDragState]);

  // Apply local drag positions to real shapes only
  const shapes = useMemo(() => {
    if (!externalShapes || externalShapes.length === 0) {
      return [];
    }

    const baseShapes = externalShapes.map((shape) => {
      const localDrag = localDragState[shape.id];
      if (localDrag) {
        // localDrag stores world coordinates, but if shape has a parent,
        // we need to convert to local coordinates for hierarchical rendering
        if (shape.parentId) {
          // Pass localDragState so parent's drag position is used if parent is being dragged
          const localPos = worldToLocalPosition(
            localDrag.x,
            localDrag.y,
            shape.parentId,
            externalShapes,
            localDragState
          );
          return { ...shape, x: localPos.x, y: localPos.y };
        }
        return { ...shape, x: localDrag.x, y: localDrag.y };
      }
      return shape;
    });

    return baseShapes;
  }, [externalShapes, localDragState, worldToLocalPosition]);

  // Separate ghost shapes for visual rendering only (not interactive)
  const allShapesForRendering = useMemo(() => {
    return [...shapes, ...ghostShapes];
  }, [shapes, ghostShapes]);

  // Convert shapes to NodeDoc format for hierarchical rendering
  const nodesForHierarchy: NodeDoc[] = useMemo(() => {
    return shapes.map((shape) => ({
      id: shape.id,
      pageId: shape.pageId || currentPageId || "",
      parentId: shape.parentId ?? null, // Use actual parentId from shape
      type: shape.type,
      name: shape.name,
      orderKey: shape.orderKey ?? shape.zIndex ?? 0,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      radius: shape.radius,
      rotation: shape.rotation ?? 0,
      opacity: shape.opacity ?? 1,
      text: shape.text,
      fontSize: shape.fontSize,
      startX: shape.startX,
      startY: shape.startY,
      endX: shape.endX,
      endY: shape.endY,
      fill: shape.fill,
      stroke: shape.stroke,
      strokeWidth: shape.strokeWidth,
      isVisible: shape.visible !== false,
      isLocked: false,
      createdBy: "",
      createdAt: null as unknown as Timestamp,
      updatedBy: "",
      updatedAt: null as unknown as Timestamp,
      version: 0,
    }));
  }, [shapes, currentPageId]);

  // Build hierarchical tree for rendering (root nodes only for now)
  const nodeTree = useNodeTree(nodesForHierarchy, null);

  // Feature flag for hierarchical rendering (enable by checking if any node has a parent)
  const useHierarchicalRendering = useMemo(() => {
    return nodesForHierarchy.some((node) => node.parentId !== null);
  }, [nodesForHierarchy]);

  // Monitor Firebase updates to clear local drag state when confirmed
  useEffect(() => {
    if (!externalShapes) return;

    // Check if any pending drag ends have been confirmed by Firebase
    pendingDragEnds.current.forEach((shapeId) => {
      const externalShape = externalShapes.find((s) => s.id === shapeId);
      const localDrag = localDragState[shapeId];

      if (externalShape && localDrag) {
        // Convert localDrag world coordinates to local coordinates for comparison
        // (externalShape stores local coordinates if it has a parent)
        const localDragLocal = externalShape.parentId
          ? worldToLocalPosition(
              localDrag.x,
              localDrag.y,
              externalShape.parentId,
              externalShapes,
              localDragState
            )
          : { x: localDrag.x, y: localDrag.y };

        // Check if Firebase position matches our local position (within tolerance)
        const tolerance = 1; // 1 pixel tolerance
        const xMatch = Math.abs(externalShape.x - localDragLocal.x) < tolerance;
        const yMatch = Math.abs(externalShape.y - localDragLocal.y) < tolerance;

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
  }, [externalShapes, localDragState, worldToLocalPosition]);

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate unique ID for shapes
  const generateId = useCallback(() => {
    return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Helper function to constrain viewport to canvas boundaries
  const constrainViewport = useCallback(
    (newViewport: CanvasViewport) => {
      // Calculate the visible area in virtual coordinates
      const visibleWidth = width / newViewport.scale;
      const visibleHeight = height / newViewport.scale;

      // When zoomed out a lot, ensure the canvas stays visible
      // The viewport should keep the canvas centered or at least partially visible
      let minX, minY, maxX, maxY;

      if (visibleWidth >= virtualWidth && visibleHeight >= virtualHeight) {
        // When we can see the full canvas, center it
        const centerX = virtualWidth / 2 - visibleWidth / 2;
        const centerY = virtualHeight / 2 - visibleHeight / 2;
        minX = centerX;
        minY = centerY;
        maxX = centerX;
        maxY = centerY;
      } else {
        // When zoomed in, allow movement within canvas boundaries
        minX = -(virtualWidth - visibleWidth);
        minY = -(virtualHeight - visibleHeight);
        maxX = virtualWidth - visibleWidth;
        maxY = virtualHeight - visibleHeight;
      }

      return {
        x: Math.max(minX, Math.min(maxX, newViewport.x)),
        y: Math.max(minY, Math.min(maxY, newViewport.y)),
        scale: newViewport.scale,
      };
    },
    [width, height, virtualWidth, virtualHeight]
  );

  const handleShapeSelect = useCallback(
    (id: string) => {
      if (currentTool === "select") {
        setSelectedShapeIds([id]);
        // Update presence selection
        presence.updateSelection([id]);
      }
    },
    [currentTool, setSelectedShapeIds, presence]
  );

  // Track active dragging shapes for more frequent updates
  const activeDraggingShapes = useRef<Set<string>>(new Set());

  // Track hierarchical containers being dragged (frames/groups with children)
  const hierarchicalDraggingRef = useRef<Set<string>>(new Set());

  // Track initial positions of selected shapes for group dragging
  const groupDragStartPositions = useRef<
    Record<string, { x: number; y: number }>
  >({});
  const groupDragInitialPosition = useRef<{ x: number; y: number } | null>(
    null
  );

  // Store copied shapes for paste functionality
  const copiedShapes = useRef<Shape[]>([]);

  const handleShapeDragStart = useCallback(
    (id: string) => {
      // Check if this is a hierarchical container (frame/group with children in hierarchical mode)
      const shape = shapes.find((s) => s.id === id);
      const isHierarchicalContainer =
        shape &&
        (shape.type === "frame" || shape.type === "group") &&
        useHierarchicalRendering;

      if (isHierarchicalContainer) {
        // For hierarchical containers, just track drag without updating React state
        // This prevents React re-renders from fighting with Konva's drag
        hierarchicalDraggingRef.current.add(id);
        activeDraggingShapes.current.add(id);
        return;
      }

      // For regular shapes, use normal drag handling
      setDraggedShapeId(id);
      activeDraggingShapes.current.add(id);

      // If multiple shapes are selected, track their starting positions for group dragging
      if (selectedShapeIds.length > 1 && selectedShapeIds.includes(id)) {
        const startPositions: Record<string, { x: number; y: number }> = {};
        selectedShapeIds.forEach((shapeId) => {
          const s = shapes.find((sh) => sh.id === shapeId);
          if (s) {
            const worldPos = getShapeWorldPosition(s, shapes);
            startPositions[shapeId] = { x: worldPos.x, y: worldPos.y };
          }
        });
        groupDragStartPositions.current = startPositions;

        // Store the initial position of the dragged shape
        if (shape) {
          const worldPos = getShapeWorldPosition(shape, shapes);
          groupDragInitialPosition.current = { x: worldPos.x, y: worldPos.y };
        }
      } else {
        groupDragStartPositions.current = {};
        groupDragInitialPosition.current = null;
      }

      // Update presence gesture
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
    [
      shapes,
      presence,
      useHierarchicalRendering,
      selectedShapeIds,
      getShapeWorldPosition,
    ]
  );

  // Throttle RTDB updates to 30 FPS for better performance
  const rtdbUpdateRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const handleShapeDragMove = useCallback(
    (id: string, x: number, y: number) => {
      // If dragging multiple selected shapes, move them all together
      if (
        selectedShapeIds.length > 1 &&
        selectedShapeIds.includes(id) &&
        groupDragInitialPosition.current
      ) {
        // Calculate the delta from the initial position
        const deltaX = x - groupDragInitialPosition.current.x;
        const deltaY = y - groupDragInitialPosition.current.y;

        // Update all selected shapes
        const newLocalDragState: Record<string, { x: number; y: number }> = {};
        selectedShapeIds.forEach((shapeId) => {
          const startPos = groupDragStartPositions.current[shapeId];
          if (startPos) {
            newLocalDragState[shapeId] = {
              x: startPos.x + deltaX,
              y: startPos.y + deltaY,
            };
          }
        });

        setLocalDragState((prev) => ({
          ...prev,
          ...newLocalDragState,
        }));

        // Update RTDB for real-time collaboration and Firestore for persistence
        selectedShapeIds.forEach((shapeId) => {
          if (rtdbUpdateRef.current[shapeId]) {
            clearTimeout(rtdbUpdateRef.current[shapeId]);
          }

          rtdbUpdateRef.current[shapeId] = setTimeout(() => {
            const shape = shapes.find((s) => s.id === shapeId);
            const newPos = newLocalDragState[shapeId];
            if (shape && newPos) {
              // Update RTDB for real-time collaboration
              presence.updateGesture({
                type: "move",
                shapeId: shapeId,
                draft: {
                  x: newPos.x,
                  y: newPos.y,
                  width: shape.width || 100,
                  height: shape.height || 100,
                  rotation: shape.rotation || 0,
                },
              });

              // Convert world coordinates to local coordinates if shape has a parent
              const localPos = shape.parentId
                ? worldToLocalPosition(
                    newPos.x,
                    newPos.y,
                    shape.parentId,
                    externalShapes
                  )
                : { x: newPos.x, y: newPos.y };

              // Update Firestore with throttled updates to maintain positions
              commitThrottled(shapeId, { x: localPos.x, y: localPos.y });
            }
            delete rtdbUpdateRef.current[shapeId];
          }, 25);
        });

        return;
      }

      // Single shape drag (original behavior)
      // Update local drag state for instant visual feedback
      setLocalDragState((prev) => ({
        ...prev,
        [id]: { x, y },
      }));

      // Check if shape is over a frame for visual feedback
      const draggedShape = shapes.find((s) => s.id === id);
      if (draggedShape && draggedShape.type !== "frame") {
        const shapeWithCurrentPos = { ...draggedShape, x, y };
        const containingFrame = findContainingFrame(
          shapeWithCurrentPos,
          shapes
        );
        setHoveredFrameId(containingFrame?.id || null);
      }

      // Throttle RTDB updates to 40 FPS (25ms intervals) for smooth real-time collaboration
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
      }, 25); // 40 FPS for smoother real-time updates

      // Convert world coordinates to local coordinates if shape has a parent
      const shape = shapes.find((s) => s.id === id);
      if (shape) {
        // Only convert to local coordinates if shape has a parent
        // Frames and root-level shapes use world coordinates directly
        // Note: Don't pass localDragState here - we want to save relative to parent's database position
        const localPos = shape.parentId
          ? worldToLocalPosition(x, y, shape.parentId, externalShapes)
          : { x, y };
        // Use throttled commit for Firestore updates with local coordinates
        commitThrottled(id, { x: localPos.x, y: localPos.y });
      }
    },
    [
      selectedShapeIds,
      shapes,
      externalShapes,
      presence,
      commitThrottled,
      findContainingFrame,
      worldToLocalPosition,
    ]
  );

  const handleShapeDragEnd = useCallback(
    async (id: string, finalX?: number, finalY?: number) => {
      // Handle group drag end
      if (
        selectedShapeIds.length > 1 &&
        selectedShapeIds.includes(id) &&
        groupDragInitialPosition.current &&
        finalX !== undefined &&
        finalY !== undefined
      ) {
        // Clear any pending RTDB updates for all selected shapes
        selectedShapeIds.forEach((shapeId) => {
          if (rtdbUpdateRef.current[shapeId]) {
            clearTimeout(rtdbUpdateRef.current[shapeId]);
            delete rtdbUpdateRef.current[shapeId];
          }
        });

        // Calculate the delta from the initial position
        const deltaX = finalX - groupDragInitialPosition.current.x;
        const deltaY = finalY - groupDragInitialPosition.current.y;

        // Clear local drag state for all selected shapes
        setLocalDragState((prev) => {
          const newState = { ...prev };
          selectedShapeIds.forEach((shapeId) => {
            delete newState[shapeId];
          });
          return newState;
        });

        // Update all selected shapes with their final positions immediately
        selectedShapeIds.forEach((shapeId) => {
          const shape = shapes.find((s) => s.id === shapeId);
          const startPos = groupDragStartPositions.current[shapeId];
          if (shape && startPos && user?.uid && onShapeUpdate) {
            const newX = startPos.x + deltaX;
            const newY = startPos.y + deltaY;

            // Convert world coordinates to local coordinates if shape has a parent
            const localPos = shape.parentId
              ? worldToLocalPosition(newX, newY, shape.parentId, externalShapes)
              : { x: newX, y: newY };

            // Save final position to database
            onShapeUpdate(shapeId, { x: localPos.x, y: localPos.y });
            pendingDragEnds.current.add(shapeId);
          }
        });

        // Clear group drag state
        groupDragStartPositions.current = {};
        groupDragInitialPosition.current = null;

        // Clear presence gesture
        presence.updateGesture(null);

        // Clear drag state
        setDraggedShapeId(null);
        setHoveredFrameId(null);

        return;
      }

      // Single shape drag (original behavior)
      // Check if this was a hierarchical container drag
      const wasHierarchicalDrag = hierarchicalDraggingRef.current.has(id);
      if (wasHierarchicalDrag) {
        hierarchicalDraggingRef.current.delete(id);
      }

      // Remove from active dragging set
      activeDraggingShapes.current.delete(id);

      // Clear any pending RTDB updates
      if (rtdbUpdateRef.current[id]) {
        clearTimeout(rtdbUpdateRef.current[id]);
        delete rtdbUpdateRef.current[id];
      }

      // Clear presence gesture immediately to prevent ghost objects
      presence.updateGesture(null);

      // For hierarchical containers, just commit final position without local drag state
      if (wasHierarchicalDrag && finalX !== undefined && finalY !== undefined) {
        setTimeout(() => {
          if (user?.uid && onShapeUpdate) {
            onShapeUpdate(id, { x: finalX, y: finalY });
          }
        }, 50);
        return;
      }

      // Determine if we need to nest/unnest based on final position
      if (finalX !== undefined && finalY !== undefined) {
        const draggedShape = shapes.find((s) => s.id === id);

        if (draggedShape && draggedShape.type !== "frame") {
          // Create shape with final position for bounds checking
          const shapeWithFinalPos = { ...draggedShape, x: finalX, y: finalY };

          // Find what frame this shape is now inside
          const newContainingFrame = findContainingFrame(
            shapeWithFinalPos,
            shapes
          );
          const newParentId = newContainingFrame?.id || null;

          // Get current parent from the shape's parentId property
          const currentParentId = draggedShape.parentId || null;

          // Check if parent changed
          if (newParentId !== currentParentId) {
            // Reparent the shape
            try {
              if (user?.uid && canvasId) {
                await reparentTx(
                  canvasId,
                  id,
                  newParentId,
                  null, // insertBeforeId - will be first child
                  null, // insertAfterId
                  user.uid
                );
              }
            } catch (error) {
              console.error("Error reparenting shape:", error);
            }
          } else {
            // Same parent, just update position
            // Convert world coordinates to local coordinates
            // Note: Use externalShapes (database positions) not shapes (with drag state)
            const localPos = worldToLocalPosition(
              finalX,
              finalY,
              draggedShape.parentId || null,
              externalShapes
            );
            setTimeout(() => {
              if (user?.uid && onShapeUpdate) {
                onShapeUpdate(id, { x: localPos.x, y: localPos.y });
              }
            }, 50);

            pendingDragEnds.current.add(id);
          }
        } else {
          // Frame or other shape - just update position
          // Frames are always at root level (no parent), so coordinates are world coordinates
          setTimeout(() => {
            if (user?.uid && onShapeUpdate) {
              onShapeUpdate(id, { x: finalX, y: finalY });
            }
          }, 50);

          pendingDragEnds.current.add(id);
        }
      } else {
        // No final position provided, clear local state
        setLocalDragState((prev) => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      }

      // Clear drag state
      setDraggedShapeId(null);
      setHoveredFrameId(null);
    },
    [
      selectedShapeIds,
      presence,
      user?.uid,
      onShapeUpdate,
      canvasId,
      shapes,
      externalShapes,
      findContainingFrame,
      worldToLocalPosition,
    ]
  );

  const handleShapeChange = useCallback(
    (id: string, updates: Partial<Shape>) => {
      if (onShapeUpdate) {
        onShapeUpdate(id, updates);
      }
    },
    [onShapeUpdate]
  );

  // Helper function to generate display name for shapes
  const getShapeDisplayName = useCallback(
    (shape: Shape, index: number): string => {
      // If the shape has a custom name, use it
      if (shape.name) {
        return shape.name;
      }

      // Otherwise, generate default names based on type
      switch (shape.type) {
        case "text":
          return shape.text || `Text ${index + 1}`;
        case "rectangle":
          return `Rectangle ${index + 1}`;
        case "circle":
          return `Circle ${index + 1}`;
        case "line":
          return `Line ${index + 1}`;
        case "triangle":
          return `Triangle ${index + 1}`;
        case "frame":
          return `Frame ${index + 1}`;
        case "group":
          return `Group ${index + 1}`;
        default:
          return `Shape ${index + 1}`;
      }
    },
    []
  );

  // Memoized shape renderer to prevent unnecessary re-renders
  const renderShape = useCallback(
    (shape: Shape, index: number) => {
      // Don't render if shape is hidden
      if (shape.visible === false) {
        return null;
      }

      const isSelected = selectedShapeIds.includes(shape.id);
      const isGhost = shape.id.startsWith("ghost-");

      // Generate display name for the shape
      const displayName = getShapeDisplayName(shape, index);

      // Create a shape with the display name
      const shapeWithName = { ...shape, name: displayName };

      // For ghost shapes, render without interaction handlers
      const interactionProps = isGhost
        ? {
            onSelect: undefined,
            onDragStart: undefined,
            onDragMove: undefined,
            onDragEnd: undefined,
            onShapeChange: undefined,
          }
        : {
            onSelect: handleShapeSelect,
            onDragStart: handleShapeDragStart,
            onDragMove: handleShapeDragMove,
            onDragEnd: handleShapeDragEnd,
            onShapeChange: handleShapeChange,
          };

      switch (shape.type) {
        case "rectangle":
          return (
            <RectangleShape
              key={shape.id}
              shape={shapeWithName}
              isSelected={isSelected}
              {...interactionProps}
              virtualWidth={virtualWidth}
              virtualHeight={virtualHeight}
              scale={viewport.scale}
            />
          );
        case "circle":
          return (
            <CircleShape
              key={shape.id}
              shape={shapeWithName}
              isSelected={isSelected}
              {...interactionProps}
              virtualWidth={virtualWidth}
              virtualHeight={virtualHeight}
              scale={viewport.scale}
            />
          );
        case "text":
          return (
            <TextShape
              key={shape.id}
              shape={shapeWithName}
              isSelected={isSelected}
              {...interactionProps}
              virtualWidth={virtualWidth}
              virtualHeight={virtualHeight}
              scale={viewport.scale}
            />
          );
        case "line":
          return (
            <LineShape
              key={shape.id}
              shape={shapeWithName}
              isSelected={isSelected}
              {...interactionProps}
              virtualWidth={virtualWidth}
              virtualHeight={virtualHeight}
              scale={viewport.scale}
            />
          );
        case "triangle":
          return (
            <TriangleShape
              key={shape.id}
              shape={shapeWithName}
              isSelected={isSelected}
              {...interactionProps}
              virtualWidth={virtualWidth}
              virtualHeight={virtualHeight}
              scale={viewport.scale}
            />
          );
        case "frame":
          return (
            <FrameShape
              key={shape.id}
              shape={shapeWithName}
              isSelected={isSelected}
              {...interactionProps}
              virtualWidth={virtualWidth}
              virtualHeight={virtualHeight}
              scale={viewport.scale}
              isDraggedOver={hoveredFrameId === shape.id}
            />
          );
        case "group":
          return (
            <GroupShape
              key={shape.id}
              shape={shapeWithName}
              isSelected={isSelected}
              {...interactionProps}
              virtualWidth={virtualWidth}
              virtualHeight={virtualHeight}
              scale={viewport.scale}
            />
          );
        default:
          return null;
      }
    },
    [
      selectedShapeIds,
      handleShapeSelect,
      handleShapeDragStart,
      handleShapeDragMove,
      handleShapeDragEnd,
      handleShapeChange,
      virtualWidth,
      virtualHeight,
      viewport.scale,
      getShapeDisplayName,
      hoveredFrameId,
    ]
  );

  const handleCreateShape = useCallback(
    (
      type: "rectangle" | "circle" | "text" | "line" | "triangle" | "frame",
      x: number,
      y: number
    ) => {
      if (currentTool !== type) return;

      // Use preview shape dimensions if available, otherwise use defaults
      let width = 100;
      let height = 100;
      let radius = 50;
      let startX = x;
      let startY = y;
      let endX = x + 100;
      let endY = y;

      if (previewShape) {
        if (
          (type === "rectangle" || type === "frame") &&
          previewShape.width &&
          previewShape.height
        ) {
          width = previewShape.width;
          height = previewShape.height;
        } else if (type === "circle" && previewShape.radius) {
          radius = previewShape.radius;
        } else if (
          type === "line" &&
          previewShape.startX !== undefined &&
          previewShape.startY !== undefined &&
          previewShape.endX !== undefined &&
          previewShape.endY !== undefined
        ) {
          startX = previewShape.startX;
          startY = previewShape.startY;
          endX = previewShape.endX;
          endY = previewShape.endY;

          // Ensure line has minimum length
          const lineLength = Math.sqrt(
            Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
          );
          if (lineLength < 10) {
            // If line is too short, extend it horizontally
            endX = startX + 100;
            endY = startY;
          }
        } else if (
          type === "triangle" &&
          previewShape.width &&
          previewShape.height
        ) {
          width = previewShape.width;
          height = previewShape.height;
        }
      }

      // Constrain shape position to canvas boundaries
      let constrainedX = x;
      let constrainedY = y;

      if (type === "line") {
        // For lines, constrain the endpoints to canvas boundaries
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);

        // If line extends beyond boundaries, adjust it
        if (minX < 0) {
          const offset = -minX;
          startX += offset;
          endX += offset;
        }
        if (maxX > virtualWidth) {
          const offset = virtualWidth - maxX;
          startX += offset;
          endX += offset;
        }
        if (minY < 0) {
          const offset = -minY;
          startY += offset;
          endY += offset;
        }
        if (maxY > virtualHeight) {
          const offset = virtualHeight - maxY;
          startY += offset;
          endY += offset;
        }

        // For lines, use the adjusted coordinates as the shape position
        constrainedX = Math.min(startX, endX);
        constrainedY = Math.min(startY, endY);
      } else {
        // For other shapes, use the original constraint logic
        // Use correct dimensions: frames are 300x200, others are 100x100
        const shapeWidth = type === "frame" ? 300 : width || 100;
        const shapeHeight = type === "frame" ? 200 : height || 100;
        constrainedX = Math.max(0, Math.min(virtualWidth - shapeWidth, x));
        constrainedY = Math.max(0, Math.min(virtualHeight - shapeHeight, y));
      }

      // For lines, use absolute coordinates (no adjustment needed)
      let adjustedStartX = startX;
      let adjustedStartY = startY;
      let adjustedEndX = endX;
      let adjustedEndY = endY;

      if (type === "line") {
        // Ensure all coordinates are valid numbers
        const validStartX = Number.isFinite(startX) ? startX : x;
        const validStartY = Number.isFinite(startY) ? startY : y;
        const validEndX = Number.isFinite(endX) ? endX : x + 100;
        const validEndY = Number.isFinite(endY) ? endY : y;

        // For lines, use absolute coordinates directly
        adjustedStartX = validStartX;
        adjustedStartY = validStartY;
        adjustedEndX = validEndX;
        adjustedEndY = validEndY;
      }

      const newShape: Shape = {
        id: generateId(),
        canvasId: "default", // Add canvasId for forward compatibility
        type,
        x: constrainedX,
        y: constrainedY,
        ...(type === "rectangle" && { width, height }),
        ...(type === "frame" && { width: width || 300, height: height || 200 }),
        ...(type === "circle" && { radius }),
        ...(type === "text" && {
          text: "Click to edit",
          fontSize: 36,
          fill: "#000000",
        }),
        ...(type === "line" && {
          startX: adjustedStartX,
          startY: adjustedStartY,
          endX: adjustedEndX,
          endY: adjustedEndY,
        }),
        ...(type === "triangle" && { width, height }),
        // Default fill colors: white for frames, #D9D9D9 for shapes
        ...(type === "frame" && { fill: "#ffffff" }),
        ...(type !== "text" && type !== "frame" && { fill: "#D9D9D9" }),
        stroke: "#000000",
        strokeWidth: 1,
        zIndex: Date.now(), // Add zIndex for proper stacking
      };

      setIsCreatingShape(false);

      // Switch to select tool after creating any shape
      setCurrentTool("select");
      onToolChange?.("select");

      // Select the newly created shape
      setSelectedShapeIds([newShape.id]);

      // Notify parent component (it will handle saving to database)
      onShapeCreate?.(newShape);
    },
    [
      currentTool,
      generateId,
      previewShape,
      onShapeCreate,
      onToolChange,
      virtualWidth,
      virtualHeight,
      setCurrentTool,
      setSelectedShapeIds,
    ]
  );

  // Handle stage mouse down for starting shape creation or selection
  const handleStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Convert screen coordinates to virtual canvas coordinates
      const virtualPoint = {
        x: pointer.x / viewport.scale + viewport.x,
        y: pointer.y / viewport.scale + viewport.y,
      };

      // Check if we clicked on the background or grid (not a shape)
      const targetName = e.target.name();
      const isBackgroundOrGrid =
        e.target === stage ||
        targetName === "canvas-background" ||
        e.target.getClassName() === "Line"; // Grid lines

      // Handle selection rectangle in select mode when clicking on background
      if (currentTool === "select" && isBackgroundOrGrid) {
        setIsSelecting(true);
        selectionStartRef.current = virtualPoint;
        setSelectionRect({
          x: virtualPoint.x,
          y: virtualPoint.y,
          width: 0,
          height: 0,
        });
        return;
      }

      // Shape creation tools
      if (
        !isCreatingShape ||
        currentTool === "select" ||
        currentTool === "pan" ||
        currentTool === "text" ||
        currentTool === "ai-chat"
      )
        return;

      // Clear selection when creating new shape
      setSelectedShapeIds([]);

      // Constrain creation start point to canvas boundaries
      const constrainedPoint = {
        x: Math.max(0, Math.min(virtualWidth - 100, virtualPoint.x)),
        y: Math.max(0, Math.min(virtualHeight - 100, virtualPoint.y)),
      };

      setCreationStartPoint(constrainedPoint);

      // Create preview shape (for rectangle, circle, line, triangle, and frame)
      const preview: Shape = {
        id: "preview",
        canvasId: "default", // Add canvasId for forward compatibility
        type: currentTool,
        x: constrainedPoint.x,
        y: constrainedPoint.y,
        ...(currentTool === "rectangle" && { width: 0, height: 0 }),
        ...(currentTool === "frame" && { width: 0, height: 0 }),
        ...(currentTool === "circle" && { radius: 0 }),
        ...(currentTool === "line" && {
          startX: constrainedPoint.x,
          startY: constrainedPoint.y,
          endX: constrainedPoint.x,
          endY: constrainedPoint.y,
        }),
        ...(currentTool === "triangle" && { width: 0, height: 0 }),
        fill: currentTool === "frame" ? "#ffffff" : "#D9D9D9",
        stroke: "#3b82f6",
        strokeWidth: 2,
        zIndex: Date.now(), // Add zIndex for proper stacking
      };

      setPreviewShape(preview);
    },
    [
      isCreatingShape,
      currentTool,
      viewport,
      virtualWidth,
      virtualHeight,
      setSelectedShapeIds,
    ]
  );

  // Throttled mouse move handler to reduce re-renders
  const lastMouseMoveTime = useRef(0);
  const handleGlobalMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!onMouseMove || !containerRef.current) return;

      // Simple throttling: only process mouse moves every 50ms
      const now = Date.now();
      const shouldSend = now - lastMouseMoveTime.current >= 50;
      if (!shouldSend) return;
      lastMouseMoveTime.current = now;

      // Get the container's bounding rectangle
      const containerRect = containerRef.current.getBoundingClientRect();

      // Check if mouse is within the canvas container
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;

      if (
        mouseX < 0 ||
        mouseY < 0 ||
        mouseX > containerRect.width ||
        mouseY > containerRect.height
      ) {
        return; // Mouse is outside canvas area
      }

      // Convert screen coordinates to virtual canvas coordinates
      const virtualPosition: CursorPosition = {
        x: mouseX / viewport.scale + viewport.x,
        y: mouseY / viewport.scale + viewport.y,
        timestamp: now,
      };

      // Update presence cursor (throttled to 5 FPS in usePresence)
      // Note: This is separate from cursorManager for different purposes
      // Disabled to prevent conflicts with cursorManager
      // presence.updateCursor(virtualPosition.x, virtualPosition.y);

      onMouseMove?.(virtualPosition, viewport);
    },
    [onMouseMove, viewport]
  );

  // Global mouse leave handler to clear cursor when leaving canvas
  const handleGlobalMouseLeave = useCallback(() => {
    if (!onMouseMove || !containerRef.current) return;

    // Send a position outside the canvas to indicate mouse left
    const virtualPosition: CursorPosition = {
      x: -1000, // Off-screen position
      y: -1000,
      timestamp: Date.now(),
    };

    onMouseMove?.(virtualPosition, viewport);
  }, [onMouseMove, viewport]);

  // Use refs to store handlers to prevent effect re-runs
  const handleGlobalMouseMoveRef = useRef(handleGlobalMouseMove);
  const handleGlobalMouseLeaveRef = useRef(handleGlobalMouseLeave);
  const onMouseMoveRef = useRef(onMouseMove);

  // Update refs when handlers change
  handleGlobalMouseMoveRef.current = handleGlobalMouseMove;
  handleGlobalMouseLeaveRef.current = handleGlobalMouseLeave;
  onMouseMoveRef.current = onMouseMove;

  // Set up global mouse event listeners for cursor tracking
  useEffect(() => {
    if (onMouseMoveRef.current) {
      window.addEventListener("mousemove", handleGlobalMouseMoveRef.current);
      window.addEventListener("mouseleave", handleGlobalMouseLeaveRef.current);

      return () => {
        window.removeEventListener(
          "mousemove",
          handleGlobalMouseMoveRef.current
        );
        window.removeEventListener(
          "mouseleave",
          handleGlobalMouseLeaveRef.current
        );
      };
    }
  }, []); // Empty dependency array - use refs for current handlers

  // Set up keyboard event listener for delete, copy, and paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Don't handle keyboard shortcuts when typing in an input
      if (isInputElement) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Copy: Ctrl+C or Cmd+C
      if (
        modKey &&
        e.key.toLowerCase() === "c" &&
        selectedShapeIds.length > 0
      ) {
        e.preventDefault();

        // Copy selected shapes
        const shapesToCopy = shapes.filter((shape) =>
          selectedShapeIds.includes(shape.id)
        );

        // Store deep copies of the shapes
        copiedShapes.current = shapesToCopy.map((shape) => ({
          ...shape,
          // Store world coordinates for pasting
          x: getShapeWorldPosition(shape, shapes).x,
          y: getShapeWorldPosition(shape, shapes).y,
        }));

        return;
      }

      // Paste: Ctrl+V or Cmd+V
      if (
        modKey &&
        e.key.toLowerCase() === "v" &&
        copiedShapes.current.length > 0
      ) {
        e.preventDefault();

        if (!user?.uid || !onShapeCreate) return;

        const newShapeIds: string[] = [];
        const offset = 20; // Offset pasted shapes by 20 pixels

        // Create new shapes from copied ones
        copiedShapes.current.forEach((copiedShape) => {
          const newId = `shape_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;

          const newShape: Shape = {
            ...copiedShape,
            id: newId,
            x: copiedShape.x + offset,
            y: copiedShape.y + offset,
            zIndex: Date.now(), // New zIndex for proper stacking
            // Remove parent relationship for simplicity (paste at root level)
            parentId: undefined,
          };

          // Create the shape in the database
          onShapeCreate(newShape);
          newShapeIds.push(newId);
        });

        // Select the newly pasted shapes
        setTimeout(() => {
          setSelectedShapeIds(newShapeIds);
          presence.updateSelection(newShapeIds);
        }, 100);

        return;
      }

      // Delete: Delete or Backspace key
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedShapeIds.length > 0
      ) {
        e.preventDefault();

        // Delete all selected shapes
        selectedShapeIds.forEach((shapeId) => {
          if (onShapeDelete) {
            onShapeDelete(shapeId);
          }
        });

        // Clear selection
        setSelectedShapeIds([]);
        presence.updateSelection([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedShapeIds,
    shapes,
    onShapeDelete,
    onShapeCreate,
    setSelectedShapeIds,
    presence,
    user?.uid,
    getShapeWorldPosition,
  ]);

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

  // Handle stage mouse move for updating preview shape, selection rectangle, and cursor tracking
  const handleStageMouseMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert screen coordinates to virtual canvas coordinates
    const virtualPoint = {
      x: pointer.x / viewport.scale + viewport.x,
      y: pointer.y / viewport.scale + viewport.y,
    };

    // Update selection rectangle if we're selecting
    if (isSelecting && selectionStartRef.current) {
      const start = selectionStartRef.current;
      const x = Math.min(start.x, virtualPoint.x);
      const y = Math.min(start.y, virtualPoint.y);
      const width = Math.abs(virtualPoint.x - start.x);
      const height = Math.abs(virtualPoint.y - start.y);

      setSelectionRect({ x, y, width, height });
      return;
    }

    if (!isCreatingShape || !creationStartPoint || !previewShape) {
      // Track cursor position for real-time collaboration even when not creating shapes
      if (onMouseMove) {
        // Convert screen coordinates to virtual canvas coordinates
        const virtualPosition: CursorPosition = {
          x: virtualPoint.x,
          y: virtualPoint.y,
          timestamp: Date.now(),
        };

        onMouseMove?.(virtualPosition, viewport);
      }
      return;
    }

    // Update preview shape based on drag distance
    if (currentTool === "rectangle" || currentTool === "frame") {
      const width = Math.abs(virtualPoint.x - creationStartPoint.x);
      const height = Math.abs(virtualPoint.y - creationStartPoint.y);
      setPreviewShape((prev) =>
        prev
          ? {
              ...prev,
              x: Math.min(creationStartPoint.x, virtualPoint.x),
              y: Math.min(creationStartPoint.y, virtualPoint.y),
              width: Math.max(width, 10),
              height: Math.max(height, 10),
            }
          : null
      );
    } else if (currentTool === "circle") {
      const radius =
        Math.sqrt(
          Math.pow(virtualPoint.x - creationStartPoint.x, 2) +
            Math.pow(virtualPoint.y - creationStartPoint.y, 2)
        ) / 2;
      setPreviewShape((prev) =>
        prev
          ? {
              ...prev,
              radius: Math.max(radius, 5),
            }
          : null
      );
    } else if (currentTool === "line") {
      setPreviewShape((prev) =>
        prev
          ? {
              ...prev,
              startX: creationStartPoint.x,
              startY: creationStartPoint.y,
              endX: virtualPoint.x,
              endY: virtualPoint.y,
            }
          : null
      );
    } else if (currentTool === "triangle") {
      const width = Math.abs(virtualPoint.x - creationStartPoint.x);
      const height = Math.abs(virtualPoint.y - creationStartPoint.y);
      setPreviewShape((prev) =>
        prev
          ? {
              ...prev,
              x: Math.min(creationStartPoint.x, virtualPoint.x),
              y: Math.min(creationStartPoint.y, virtualPoint.y),
              width: Math.max(width, 10),
              height: Math.max(height, 10),
            }
          : null
      );
    }

    // Also track cursor position when creating shapes
    if (onMouseMove) {
      const virtualPosition: CursorPosition = {
        x: virtualPoint.x,
        y: virtualPoint.y,
        timestamp: Date.now(),
      };

      onMouseMove?.(virtualPosition, viewport);
    }
  }, [
    isCreatingShape,
    creationStartPoint,
    previewShape,
    currentTool,
    viewport,
    onMouseMove,
  ]);

  // Handle stage mouse up for finalizing shape creation or selection
  const handleStageMouseUp = useCallback(() => {
    // Handle selection rectangle finalization
    if (
      isSelecting &&
      selectionRect &&
      selectionRect.width > 5 &&
      selectionRect.height > 5
    ) {
      // Find all shapes that intersect with the selection rectangle
      const selectedIds = shapes
        .filter((shape) => doesShapeIntersectRect(shape, selectionRect, shapes))
        .map((shape) => shape.id);

      setSelectedShapeIds(selectedIds);

      // Update presence selection
      presence.updateSelection(selectedIds);

      // Reset selection state
      setIsSelecting(false);
      setSelectionRect(null);
      selectionStartRef.current = null;

      // Mark that we just finished selecting to prevent immediate deselection in onClick
      justFinishedSelectingRef.current = true;
      setTimeout(() => {
        justFinishedSelectingRef.current = false;
      }, 50);
      return;
    }

    // Reset selection state even if rectangle was too small
    if (isSelecting) {
      setIsSelecting(false);
      setSelectionRect(null);
      selectionStartRef.current = null;
      return;
    }

    if (!isCreatingShape || !creationStartPoint || !previewShape) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Create final shape (for rectangle, circle, line, triangle, text, frame)
    if (
      currentTool === "rectangle" ||
      currentTool === "circle" ||
      currentTool === "line" ||
      currentTool === "triangle" ||
      currentTool === "text" ||
      currentTool === "frame"
    ) {
      handleCreateShape(
        currentTool,
        creationStartPoint.x,
        creationStartPoint.y
      );
    }

    // Reset creation state
    setCreationStartPoint(null);
    setPreviewShape(null);
  }, [
    isSelecting,
    selectionRect,
    shapes,
    doesShapeIntersectRect,
    setSelectedShapeIds,
    presence,
    isCreatingShape,
    creationStartPoint,
    previewShape,
    currentTool,
    handleCreateShape,
  ]);

  // Handle stage click for creating shapes and deselecting objects
  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // If we're in select mode, deselect all objects when clicking on empty area
      // But don't deselect if we just finished a drag selection
      if (currentTool === "select") {
        // Don't deselect if we just finished a drag selection
        if (justFinishedSelectingRef.current) {
          return;
        }

        // Check if we clicked on the background
        const targetName = e.target.name();
        const isBackground =
          e.target === e.target.getStage() ||
          targetName === "canvas-background" ||
          e.target.getClassName() === "Line";

        // Only deselect if we clicked on background
        if (isBackground) {
          setSelectedShapeIds([]);
        }
        return;
      }

      // If we're in pan mode, don't do anything
      if (currentTool === "pan") {
        return;
      }

      // For shape creation tools, handle shape creation
      if (!isCreatingShape) return;

      // For text, create on click since it doesn't need drag sizing
      if (currentTool === "text") {
        const stage = stageRef.current;
        if (!stage) return;

        setSelectedShapeIds([]);

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const virtualPoint = {
          x: pointer.x / viewport.scale + viewport.x,
          y: pointer.y / viewport.scale + viewport.y,
        };

        // Constrain text position to canvas boundaries
        const constrainedX = Math.max(
          0,
          Math.min(virtualWidth - 100, virtualPoint.x)
        );
        const constrainedY = Math.max(
          0,
          Math.min(virtualHeight - 50, virtualPoint.y)
        );

        handleCreateShape(currentTool, constrainedX, constrainedY);
      }
    },
    [
      currentTool,
      isCreatingShape,
      viewport,
      handleCreateShape,
      virtualWidth,
      virtualHeight,
      setSelectedShapeIds,
    ]
  );

  // Canvas methods for imperative access
  const setTool = useCallback(
    (
      tool:
        | "select"
        | "pan"
        | "rectangle"
        | "circle"
        | "text"
        | "line"
        | "triangle"
        | "frame"
    ) => {
      setCurrentTool(tool);
      setIsCreatingShape(tool !== "select" && tool !== "pan");
      // Reset creation state when switching tools
      setCreationStartPoint(null);
      setPreviewShape(null);
    },
    [setCurrentTool]
  );

  const getViewport = useCallback(() => viewport, [viewport]);

  const getShapes = useCallback(() => shapes, [shapes]);

  const deleteShape = useCallback(
    (id: string) => {
      if (onShapeDelete) {
        onShapeDelete(id);
      }
      setSelectedShapeIds(
        selectedShapeIds.filter((selectedId) => selectedId !== id)
      );
    },
    [onShapeDelete, selectedShapeIds, setSelectedShapeIds]
  );

  const clearCanvas = useCallback(() => {
    // Clear all shapes - parent component should handle database cleanup
    shapes.forEach((shape) => {
      if (onShapeDelete) {
        onShapeDelete(shape.id);
      }
    });
    setSelectedShapeIds([]);
  }, [shapes, onShapeDelete, setSelectedShapeIds]);

  // Expose methods to parent component
  useImperativeHandle(
    ref,
    () => ({
      setTool,
      getViewport,
      getShapes,
      deleteShape,
      clearCanvas,
    }),
    [setTool, getViewport, getShapes, deleteShape, clearCanvas]
  );

  // Handle viewport changes
  const handleViewportChange = useCallback(
    (newViewport: CanvasViewport) => {
      const constrainedViewport = constrainViewport(newViewport);
      setViewport(constrainedViewport);

      // Update viewport in presence for accurate cursor positioning across different zoom levels
      presence.updateViewport(constrainedViewport);

      // Notify parent component of viewport change (cursor manager now includes viewport with each cursor update)
      onViewportChange?.(constrainedViewport);
    },
    [setViewport, constrainViewport, presence, onViewportChange]
  );

  // Handle zoom with mouse wheel
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.1;
      const oldScale = viewport.scale;
      const newScale =
        e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

      // Clamp scale to min/max
      const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

      // Calculate the point to scale around (mouse position in virtual coordinates)
      const mousePointTo = {
        x: pointer.x / oldScale + viewport.x,
        y: pointer.y / oldScale + viewport.y,
      };

      // Calculate new viewport position
      const newX = mousePointTo.x - pointer.x / clampedScale;
      const newY = mousePointTo.y - pointer.y / clampedScale;

      const newViewport = {
        x: newX,
        y: newY,
        scale: clampedScale,
      };

      handleViewportChange(newViewport);
    },
    [viewport, handleViewportChange]
  );

  // Handle pan start
  const handlePanStart = useCallback(() => {
    setIsPanMode(true);
  }, []);

  // Handle pan move
  const handlePanMove = useCallback(
    (delta: Point) => {
      const newViewport = {
        ...viewport,
        x: viewport.x - delta.x / viewport.scale,
        y: viewport.y - delta.y / viewport.scale,
      };

      handleViewportChange(newViewport);
    },
    [viewport, handleViewportChange]
  );

  // Handle pan end
  const handlePanEnd = useCallback(() => {
    setIsPanMode(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-300 dark:bg-gray-700 ${className}`}
      style={{ width, height }}
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
        style={{
          cursor: isPanMode
            ? "grabbing"
            : currentTool === "pan"
            ? "grab"
            : isCreatingShape
            ? "crosshair"
            : "default",
        }}
      >
        {/* Main Canvas Layer */}
        <Layer>
          {/* Viewport with Grid and Shapes */}
          <Viewport
            canvasWidth={width}
            canvasHeight={height}
            virtualWidth={virtualWidth}
            virtualHeight={virtualHeight}
            viewport={viewport}
            onViewportChange={handleViewportChange}
            onPanStart={handlePanStart}
            onPanMove={handlePanMove}
            onPanEnd={handlePanEnd}
            currentTool={currentTool}
          >
            {/* Canvas background */}
            <Rect
              name="canvas-background"
              x={0}
              y={0}
              width={virtualWidth}
              height={virtualHeight}
              fill="#ffffff"
              listening={currentTool === "pan" || currentTool === "select"}
              onMouseDown={(e) => {
                if (currentTool === "select") {
                  const stage = stageRef.current;
                  if (!stage) return;

                  const pointer = stage.getPointerPosition();
                  if (!pointer) return;

                  const virtualPoint = {
                    x: pointer.x / viewport.scale + viewport.x,
                    y: pointer.y / viewport.scale + viewport.y,
                  };

                  setIsSelecting(true);
                  selectionStartRef.current = virtualPoint;
                  setSelectionRect({
                    x: virtualPoint.x,
                    y: virtualPoint.y,
                    width: 0,
                    height: 0,
                  });
                  e.cancelBubble = true;
                }
              }}
              onMouseMove={(e) => {
                if (
                  currentTool === "select" &&
                  isSelecting &&
                  selectionStartRef.current
                ) {
                  const stage = stageRef.current;
                  if (!stage) return;

                  const pointer = stage.getPointerPosition();
                  if (!pointer) return;

                  const virtualPoint = {
                    x: pointer.x / viewport.scale + viewport.x,
                    y: pointer.y / viewport.scale + viewport.y,
                  };

                  const start = selectionStartRef.current;
                  const x = Math.min(start.x, virtualPoint.x);
                  const y = Math.min(start.y, virtualPoint.y);
                  const width = Math.abs(virtualPoint.x - start.x);
                  const height = Math.abs(virtualPoint.y - start.y);

                  setSelectionRect({ x, y, width, height });
                }
              }}
              onMouseUp={(e) => {
                if (currentTool === "select" && isSelecting && selectionRect) {
                  if (selectionRect.width > 5 && selectionRect.height > 5) {
                    const selectedIds = shapes
                      .filter((shape) =>
                        doesShapeIntersectRect(shape, selectionRect, shapes)
                      )
                      .map((shape) => shape.id);

                    setSelectedShapeIds(selectedIds);
                    presence.updateSelection(selectedIds);

                    justFinishedSelectingRef.current = true;
                    setTimeout(() => {
                      justFinishedSelectingRef.current = false;
                    }, 50);
                  }

                  setIsSelecting(false);
                  setSelectionRect(null);
                  selectionStartRef.current = null;
                }
              }}
              onClick={() => {
                if (
                  currentTool === "select" &&
                  !justFinishedSelectingRef.current
                ) {
                  setSelectedShapeIds([]);
                }
              }}
            />

            {/* Grid */}
            {showGrid && (
              <CanvasGrid
                size={gridSize}
                virtualWidth={virtualWidth}
                virtualHeight={virtualHeight}
                show={showGrid}
                scale={viewport.scale}
              />
            )}

            {/* Preview Shape */}
            {previewShape && (
              <>
                {previewShape.type === "rectangle" &&
                  previewShape.width !== undefined &&
                  previewShape.height !== undefined &&
                  previewShape.width > 0 &&
                  previewShape.height > 0 && (
                    <RectangleShape
                      shape={previewShape}
                      isSelected={false}
                      onSelect={() => {}}
                      onDragStart={() => {}}
                      onDragMove={() => {}}
                      onDragEnd={() => {}}
                      onShapeChange={() => {}}
                      virtualWidth={virtualWidth}
                      virtualHeight={virtualHeight}
                      scale={viewport.scale}
                    />
                  )}
                {previewShape.type === "circle" &&
                  previewShape.radius !== undefined &&
                  previewShape.radius > 0 && (
                    <CircleShape
                      shape={previewShape}
                      isSelected={false}
                      onSelect={() => {}}
                      onDragStart={() => {}}
                      onDragMove={() => {}}
                      onDragEnd={() => {}}
                      onShapeChange={() => {}}
                      virtualWidth={virtualWidth}
                      virtualHeight={virtualHeight}
                      scale={viewport.scale}
                    />
                  )}
                {previewShape.type === "line" &&
                  previewShape.startX !== undefined &&
                  previewShape.startY !== undefined &&
                  previewShape.endX !== undefined &&
                  previewShape.endY !== undefined && (
                    <LineShape
                      shape={previewShape}
                      isSelected={false}
                      onSelect={() => {}}
                      onDragStart={() => {}}
                      onDragMove={() => {}}
                      onDragEnd={() => {}}
                      onShapeChange={() => {}}
                      virtualWidth={virtualWidth}
                      virtualHeight={virtualHeight}
                      scale={viewport.scale}
                    />
                  )}
                {previewShape.type === "triangle" &&
                  previewShape.width !== undefined &&
                  previewShape.height !== undefined &&
                  previewShape.width > 0 &&
                  previewShape.height > 0 && (
                    <TriangleShape
                      shape={previewShape}
                      isSelected={false}
                      onSelect={() => {}}
                      onDragStart={() => {}}
                      onDragMove={() => {}}
                      onDragEnd={() => {}}
                      onShapeChange={() => {}}
                      virtualWidth={virtualWidth}
                      virtualHeight={virtualHeight}
                      scale={viewport.scale}
                    />
                  )}
                {previewShape.type === "frame" &&
                  previewShape.width !== undefined &&
                  previewShape.height !== undefined &&
                  previewShape.width > 0 &&
                  previewShape.height > 0 && (
                    <FrameShape
                      shape={previewShape}
                      isSelected={false}
                      onSelect={() => {}}
                      onDragStart={() => {}}
                      onDragMove={() => {}}
                      onDragEnd={() => {}}
                      onShapeChange={() => {}}
                      virtualWidth={virtualWidth}
                      virtualHeight={virtualHeight}
                      scale={viewport.scale}
                    />
                  )}
              </>
            )}

            {/* Selection Rectangle */}
            {selectionRect &&
              selectionRect.width > 0 &&
              selectionRect.height > 0 && (
                <Rect
                  x={selectionRect.x}
                  y={selectionRect.y}
                  width={selectionRect.width}
                  height={selectionRect.height}
                  fill="rgba(59, 130, 246, 0.1)"
                  stroke="#3b82f6"
                  strokeWidth={2 / viewport.scale}
                  dash={[8 / viewport.scale, 4 / viewport.scale]}
                  listening={false}
                />
              )}

            {/* Shapes - Use hierarchical rendering if nodes have parent relationships */}
            {useHierarchicalRendering ? (
              <NodeTreeListRenderer
                nodes={nodeTree}
                selectedShapeIds={selectedShapeIds}
                onSelect={handleShapeSelect}
                onDragStart={handleShapeDragStart}
                onDragMove={handleShapeDragMove}
                onDragEnd={handleShapeDragEnd}
                onShapeChange={handleShapeChange}
                virtualWidth={virtualWidth}
                virtualHeight={virtualHeight}
                scale={viewport.scale}
                getShapeDisplayName={getShapeDisplayName}
              />
            ) : (
              allShapesForRendering.map((shape, index) =>
                renderShape(shape, index)
              )
            )}
          </Viewport>
        </Layer>
      </Stage>

      {/* Cursors overlay */}
      <CursorsOverlay currentUserId={currentUserId} viewport={viewport} />

      {/* Canvas boundary indicators */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Canvas outline - show square boundaries when zoomed out enough */}
        {(() => {
          // Check if we can see the full virtual canvas
          const canSeeFullCanvas =
            width / viewport.scale >= virtualWidth &&
            height / viewport.scale >= virtualHeight;

          if (!canSeeFullCanvas) return null;

          // When we can see the full canvas, show outline at viewport edges
          // The outline should be at the edges of the viewport
          return (
            <div className="absolute border-2 border-blue-400 opacity-70 pointer-events-none" />
          );
        })()}

        {/* Edge collision indicators - show when hitting boundaries */}
        {(() => {
          // Calculate the visible area in virtual coordinates
          const visibleWidth = width / viewport.scale;
          const visibleHeight = height / viewport.scale;

          // Calculate the allowed viewport movement area
          let minX, minY, maxX, maxY;

          if (visibleWidth >= virtualWidth && visibleHeight >= virtualHeight) {
            // When we can see the full canvas, center it
            const centerX = virtualWidth / 2 - visibleWidth / 2;
            const centerY = virtualHeight / 2 - visibleHeight / 2;
            minX = centerX;
            minY = centerY;
            maxX = centerX;
            maxY = centerY;
          } else {
            // When zoomed in, allow movement within canvas boundaries
            minX = -(virtualWidth - visibleWidth);
            minY = -(virtualHeight - visibleHeight);
            maxX = virtualWidth - visibleWidth;
            maxY = virtualHeight - visibleHeight;
          }

          return (
            <>
              {/* Top boundary - show when viewport is at top of allowed area */}
              {viewport.y <= minY && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-400 shadow-lg" />
              )}
              {/* Bottom boundary - show when viewport is at bottom of allowed area */}
              {viewport.y >= maxY && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-400 shadow-lg" />
              )}
              {/* Left boundary - show when viewport is at left of allowed area */}
              {viewport.x <= minX && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-neutral-400 shadow-lg" />
              )}
              {/* Right boundary - show when viewport is at right of allowed area */}
              {viewport.x >= maxX && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-neutral-400 shadow-lg" />
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
});

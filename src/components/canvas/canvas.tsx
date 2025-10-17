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
import { CanvasProps, CanvasViewport, Point, Shape } from "@/types";
import { Viewport } from "./viewport";
import { CanvasGrid } from "./grid";
import { RectangleShape, CircleShape, TextShape, LineShape } from "./shapes";
import { CursorsOverlay } from "./cursor";
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
import { updateShape } from "@/services/shapeTransactions";

// Canvas constants
const VIRTUAL_WIDTH = 5000;
const VIRTUAL_HEIGHT = 5000;
const MIN_SCALE = 0.05; // Lower minimum scale to allow seeing full canvas
const MAX_SCALE = 5;

export interface CanvasRef {
  setTool: (
    tool: "select" | "pan" | "rectangle" | "circle" | "text" | "line"
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
    onShapeCreate,
    onShapeUpdate,
    onShapeDelete,
    onToolChange,
    onMouseMove,
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
  const presence = usePresence("default", presenceConfig);

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
          cleanedPeers[peerId] = peer as any;
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
      const remaining = 100 - (now - lastCall); // Reduced to 100ms for better responsiveness

      if (remaining <= 0) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        lastCall = now;
        if (user?.uid && onShapeUpdate && pendingUpdate) {
          // Use regular update for throttled drag updates (better performance)
          // Only use transactions for final commits and important operations
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
            // Use regular update for throttled drag updates (better performance)
            // Only use transactions for final commits and important operations
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
        return { ...shape, x: localDrag.x, y: localDrag.y };
      }
      return shape;
    });

    return baseShapes;
  }, [externalShapes, localDragState]);

  // Separate ghost shapes for visual rendering only (not interactive)
  const allShapesForRendering = useMemo(() => {
    return [...shapes, ...ghostShapes];
  }, [shapes, ghostShapes]);

  // Monitor Firebase updates to clear local drag state when confirmed
  useEffect(() => {
    if (!externalShapes) return;

    // Check if any pending drag ends have been confirmed by Firebase
    pendingDragEnds.current.forEach((shapeId) => {
      const externalShape = externalShapes.find((s) => s.id === shapeId);
      const localDrag = localDragState[shapeId];

      if (externalShape && localDrag) {
        // Check if Firebase position matches our local position (within tolerance)
        const tolerance = 1; // 1 pixel tolerance
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
  }, [externalShapes, localDragState]);

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

  // Throttle RTDB updates to 30 FPS for better performance
  const rtdbUpdateRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

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
      }, 33); // ~30 FPS

      // Use throttled commit for Firestore updates
      commitThrottled(id, { x, y });
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
        }, 50); // Reduced delay for faster final positioning

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

  const handleShapeChange = useCallback(
    (id: string, updates: Partial<Shape>) => {
      if (onShapeUpdate) {
        onShapeUpdate(id, updates);
      }
    },
    [onShapeUpdate]
  );

  // Memoized shape renderer to prevent unnecessary re-renders
  const renderShape = useCallback(
    (shape: Shape) => {
      // Don't render if shape is hidden
      if (shape.visible === false) {
        return null;
      }

      const isSelected = selectedShapeIds.includes(shape.id);
      const isGhost = shape.id.startsWith("ghost-");

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
              shape={shape}
              isSelected={isSelected}
              {...interactionProps}
              virtualWidth={virtualWidth}
              virtualHeight={virtualHeight}
            />
          );
        case "circle":
          return (
            <CircleShape
              key={shape.id}
              shape={shape}
              isSelected={isSelected}
              {...interactionProps}
              virtualWidth={virtualWidth}
              virtualHeight={virtualHeight}
            />
          );
        case "text":
          return (
            <TextShape
              key={shape.id}
              shape={shape}
              isSelected={isSelected}
              {...interactionProps}
              virtualWidth={virtualWidth}
              virtualHeight={virtualHeight}
            />
          );
        case "line":
          return (
            <LineShape
              key={shape.id}
              shape={shape}
              isSelected={isSelected}
              {...interactionProps}
              virtualWidth={virtualWidth}
              virtualHeight={virtualHeight}
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
    ]
  );

  const handleCreateShape = useCallback(
    (type: "rectangle" | "circle" | "text" | "line", x: number, y: number) => {
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
        if (type === "rectangle" && previewShape.width && previewShape.height) {
          width = previewShape.width;
          height = previewShape.height;
        } else if (type === "circle" && previewShape.radius) {
          radius = previewShape.radius;
        } else if (
          type === "line" &&
          previewShape.startX &&
          previewShape.startY &&
          previewShape.endX &&
          previewShape.endY
        ) {
          startX = previewShape.startX;
          startY = previewShape.startY;
          endX = previewShape.endX;
          endY = previewShape.endY;
        }
      }

      // Constrain shape position to canvas boundaries
      const constrainedX = Math.max(
        0,
        Math.min(virtualWidth - (width || 100), x)
      );
      const constrainedY = Math.max(
        0,
        Math.min(virtualHeight - (height || 100), y)
      );

      const newShape: Shape = {
        id: generateId(),
        canvasId: "default", // Add canvasId for forward compatibility
        type,
        x: constrainedX,
        y: constrainedY,
        ...(type === "rectangle" && { width, height }),
        ...(type === "circle" && { radius }),
        ...(type === "text" && {
          text: "Click to edit",
          fontSize: 36,
          fill: "#000000",
        }),
        ...(type === "line" && { startX, startY, endX, endY }),
        // Default fill for non-text shapes
        ...(type !== "text" && { fill: "#ffffff" }),
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

  // Handle stage mouse down for starting shape creation
  const handleStageMouseDown = useCallback(() => {
    if (
      !isCreatingShape ||
      currentTool === "select" ||
      currentTool === "pan" ||
      currentTool === "text"
    )
      return;

    const stage = stageRef.current;
    if (!stage) return;

    // Clear selection when creating new shape
    setSelectedShapeIds([]);

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert screen coordinates to virtual canvas coordinates
    const virtualPoint = {
      x: pointer.x / viewport.scale + viewport.x,
      y: pointer.y / viewport.scale + viewport.y,
    };

    // Constrain creation start point to canvas boundaries
    const constrainedPoint = {
      x: Math.max(0, Math.min(virtualWidth - 100, virtualPoint.x)),
      y: Math.max(0, Math.min(virtualHeight - 100, virtualPoint.y)),
    };

    setCreationStartPoint(constrainedPoint);

    // Create preview shape (for rectangle, circle, and line)
    const preview: Shape = {
      id: "preview",
      canvasId: "default", // Add canvasId for forward compatibility
      type: currentTool,
      x: constrainedPoint.x,
      y: constrainedPoint.y,
      ...(currentTool === "rectangle" && { width: 0, height: 0 }),
      ...(currentTool === "circle" && { radius: 0 }),
      ...(currentTool === "line" && {
        startX: constrainedPoint.x,
        startY: constrainedPoint.y,
        endX: constrainedPoint.x,
        endY: constrainedPoint.y,
      }),
      fill: "#ffffff",
      stroke: "#3b82f6",
      strokeWidth: 2,
      zIndex: Date.now(), // Add zIndex for proper stacking
    };

    setPreviewShape(preview);
  }, [
    isCreatingShape,
    currentTool,
    viewport,
    virtualWidth,
    virtualHeight,
    setSelectedShapeIds,
  ]);

  // Throttled mouse move handler to reduce re-renders
  const lastMouseMoveTime = useRef(0);
  const handleGlobalMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!onMouseMove || !containerRef.current) return;

      // Simple throttling: only process mouse moves every 50ms
      const now = Date.now();
      if (now - lastMouseMoveTime.current < 50) return;
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

      onMouseMove(virtualPosition);
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

    onMouseMove(virtualPosition);
  }, [onMouseMove]);

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

  // Handle stage mouse move for updating preview shape and cursor tracking
  const handleStageMouseMove = useCallback(() => {
    if (!isCreatingShape || !creationStartPoint || !previewShape) {
      // Track cursor position for real-time collaboration even when not creating shapes
      if (onMouseMove) {
        const stage = stageRef.current;
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        // Convert screen coordinates to virtual canvas coordinates
        const virtualPosition: CursorPosition = {
          x: pointer.x / viewport.scale + viewport.x,
          y: pointer.y / viewport.scale + viewport.y,
          timestamp: Date.now(),
        };

        onMouseMove(virtualPosition);
      }
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert screen coordinates to virtual canvas coordinates
    const virtualPoint = {
      x: pointer.x / viewport.scale + viewport.x,
      y: pointer.y / viewport.scale + viewport.y,
    };

    // Update preview shape based on drag distance
    if (currentTool === "rectangle") {
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
    }

    // Also track cursor position when creating shapes
    if (onMouseMove) {
      const virtualPosition: CursorPosition = {
        x: virtualPoint.x,
        y: virtualPoint.y,
        timestamp: Date.now(),
      };

      onMouseMove(virtualPosition);
    }
  }, [
    isCreatingShape,
    creationStartPoint,
    previewShape,
    currentTool,
    viewport,
    onMouseMove,
  ]);

  // Handle stage mouse up for finalizing shape creation
  const handleStageMouseUp = useCallback(() => {
    if (!isCreatingShape || !creationStartPoint || !previewShape) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Create final shape (for rectangle, circle, line, text)
    if (
      currentTool === "rectangle" ||
      currentTool === "circle" ||
      currentTool === "line" ||
      currentTool === "text"
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
    isCreatingShape,
    creationStartPoint,
    previewShape,
    currentTool,
    handleCreateShape,
  ]);

  // Handle stage click for creating shapes and deselecting objects
  const handleStageClick = useCallback(() => {
    // If we're in select mode, deselect all objects when clicking on empty area
    if (currentTool === "select") {
      setSelectedShapeIds([]);
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
  }, [
    currentTool,
    isCreatingShape,
    viewport,
    handleCreateShape,
    virtualWidth,
    virtualHeight,
    setSelectedShapeIds,
  ]);

  // Canvas methods for imperative access
  const setTool = useCallback(
    (tool: "select" | "pan" | "rectangle" | "circle" | "text" | "line") => {
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
    },
    [setViewport, constrainViewport]
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

      const constrainedViewport = constrainViewport(newViewport);
      setViewport(constrainedViewport);
    },
    [viewport, setViewport, constrainViewport]
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
        x: viewport.x + delta.x / viewport.scale,
        y: viewport.y + delta.y / viewport.scale,
      };

      const constrainedViewport = constrainViewport(newViewport);
      setViewport(constrainedViewport);
    },
    [viewport, setViewport, constrainViewport]
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
              x={0}
              y={0}
              width={virtualWidth}
              height={virtualHeight}
              fill="#ffffff"
              listening={false}
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
                    />
                  )}
              </>
            )}

            {/* Shapes */}
            {allShapesForRendering.map(renderShape)}
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

"use client";

import React, {
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  forwardRef,
} from "react";
import { Stage, Layer, Rect } from "react-konva";
import Konva from "konva";
import { CanvasProps, CanvasViewport, Shape } from "@/types";
import { Viewport } from "../canvas/viewport";
import { CanvasGrid } from "../canvas/grid";
import {
  RectangleShape,
  CircleShape,
  TextShape,
  LineShape,
  TriangleShape,
} from "../canvas/shapes";
import { CursorsOverlay } from "../canvas/cursor";
import { CursorPosition } from "@/types";
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
import { generateUserColor } from "@/utils/color";
import {
  useCanvasDrag,
  useCanvasCreation,
  useCanvasViewport as useCanvasViewportHook,
  useCanvasPresence,
} from "@/components/refactored-test/canvas-hooks";
import {
  CANVAS_CONSTANTS,
  createMouseHandlers,
  createShapeHandlers,
} from "./canvas-lib";

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
    virtualWidth = CANVAS_CONSTANTS.VIRTUAL_WIDTH,
    virtualHeight = CANVAS_CONSTANTS.VIRTUAL_HEIGHT,
    gridSize = CANVAS_CONSTANTS.DEFAULT_GRID_SIZE,
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
      color: user?.uid ? generateUserColor(user.uid) : "#3b82f6",
    }),
    [user?.uid, user?.displayName, user?.email]
  );

  // Initialize presence system
  const presence = usePresence("default", presenceConfig);

  // Use custom hooks for complex logic
  const {
    localDragState,
    handleShapeDragStart,
    handleShapeDragMove,
    handleShapeDragEnd,
  } = useCanvasDrag({
    shapes: externalShapes,
    user,
    onShapeUpdate,
    presence,
  });

  const {
    isCreatingShape,
    setIsCreatingShape,
    creationStartPoint,
    previewShape,
    startShapeCreation,
    updateShapePreview,
    finalizeShapeCreation,
    createTextShape,
    resetCreationState,
  } = useCanvasCreation({
    currentTool,
    virtualWidth,
    virtualHeight,
    onShapeCreate,
    onToolChange: onToolChange as ((tool: string) => void) | undefined,
    setCurrentTool: setCurrentTool as (tool: string) => void,
    setSelectedShapeIds,
  });

  const {
    isPanMode,
    handleViewportChange,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    updateCursorPosition,
  } = useCanvasViewportHook({
    width,
    height,
    virtualWidth,
    virtualHeight,
    viewport,
    setViewport,
    onMouseMove,
  });

  const { ghostShapes } = useCanvasPresence({
    user: user
      ? {
          uid: user.uid,
          displayName: user.displayName || undefined,
          email: user.email || undefined,
        }
      : null,
    externalShapes,
    localDragState,
    presence,
  });

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

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global mouse event handlers for cursor tracking (like original canvas)
  const lastMouseMoveTime = useRef(0);

  const handleGlobalMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!onMouseMove || !containerRef.current) return;

      // Simple throttling: only process mouse moves every 50ms (match original)
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
        return; // Mouse is outside canvas area (match original behavior)
      }

      // Convert screen coordinates to virtual canvas coordinates
      const virtualPosition: CursorPosition = {
        x: mouseX / viewport.scale + viewport.x,
        y: mouseY / viewport.scale + viewport.y,
        timestamp: now,
      };

      onMouseMove(virtualPosition);
    },
    [onMouseMove, viewport]
  );

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

  // Create event handlers
  const mouseHandlers = createMouseHandlers({
    viewport,
    onMouseMove,
    onStageMouseDown: (point) => {
      if (
        !isCreatingShape ||
        currentTool === "select" ||
        currentTool === "pan" ||
        currentTool === "text"
      )
        return;

      // Clear selection when creating new shape
      setSelectedShapeIds([]);

      // Constrain creation start point to canvas boundaries
      const constrainedPoint = {
        x: Math.max(0, Math.min(virtualWidth - 100, point.x)),
        y: Math.max(0, Math.min(virtualHeight - 100, point.y)),
      };

      startShapeCreation(currentTool, constrainedPoint);
    },
    onStageMouseMove: (point) => {
      if (!isCreatingShape || !creationStartPoint || !previewShape) {
        updateCursorPosition(point);
        return;
      }

      updateShapePreview(point);
      updateCursorPosition(point);
    },
    onStageMouseUp: () => {
      if (!isCreatingShape || !creationStartPoint || !previewShape) return;
      finalizeShapeCreation();
    },
    onStageClick: (point) => {
      // If we're in select mode, deselect all objects when clicking on empty area
      if (currentTool === "select") {
        setSelectedShapeIds([]);
        return;
      }

      // If we're in pan mode, don't do anything
      if (currentTool === "pan") {
        return;
      }

      // For text, create on click since it doesn't need drag sizing
      if (currentTool === "text") {
        createTextShape(point);
      }
    },
    onWheel: (e, stage) => handleWheel(e, stage),
  });

  const shapeHandlers = createShapeHandlers({
    currentTool,
    selectedShapeIds,
    onShapeSelect: (id) => {
      setSelectedShapeIds([id]);
      presence.updateSelection([id]);
    },
    onShapeDragStart: handleShapeDragStart,
    onShapeDragMove: handleShapeDragMove,
    onShapeDragEnd: handleShapeDragEnd,
    onShapeChange: (id, updates) => {
      if (onShapeUpdate) {
        onShapeUpdate(id, updates);
      }
    },
    setSelectedShapeIds,
  });

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
            onSelect: shapeHandlers.handleShapeSelect,
            onDragStart: shapeHandlers.handleShapeDragStart,
            onDragMove: shapeHandlers.handleShapeDragMove,
            onDragEnd: shapeHandlers.handleShapeDragEnd,
            onShapeChange: shapeHandlers.handleShapeChange,
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
        case "triangle":
          return (
            <TriangleShape
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
    [selectedShapeIds, shapeHandlers, virtualWidth, virtualHeight]
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
    ) => {
      setCurrentTool(tool);
      setIsCreatingShape(tool !== "select" && tool !== "pan");
      // Reset creation state when switching tools
      resetCreationState();
    },
    [setCurrentTool, setIsCreatingShape, resetCreationState]
  );

  const getViewport = useCallback(() => viewport, [viewport]);

  const getShapes = useCallback(() => shapes, [shapes]);

  const deleteShape = useCallback(
    (id: string) => {
      shapeHandlers.handleDeleteShape(id, onShapeDelete);
    },
    [shapeHandlers, onShapeDelete]
  );

  const clearCanvas = useCallback(() => {
    shapeHandlers.handleClearCanvas(shapes, onShapeDelete);
  }, [shapeHandlers, shapes, onShapeDelete]);

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
        onWheel={mouseHandlers.handleWheel}
        onMouseDown={mouseHandlers.handleStageMouseDown}
        onMouseMove={mouseHandlers.handleStageMouseMove}
        onMouseUp={mouseHandlers.handleStageMouseUp}
        onClick={mouseHandlers.handleStageClick}
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

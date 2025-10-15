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
import { CanvasProps, CanvasViewport, Point, Shape } from "./types";
import { Viewport } from "./viewport";
import { CanvasGrid } from "./grid";
import { RectangleShape, CircleShape, TextShape } from "./shapes";
import { CursorsOverlay } from "./cursor";
import { CursorPosition } from "@/types";

// Canvas constants
const VIRTUAL_WIDTH = 5000;
const VIRTUAL_HEIGHT = 5000;
const MIN_SCALE = 0.05; // Lower minimum scale to allow seeing full canvas
const MAX_SCALE = 5;

export interface CanvasRef {
  setTool: (tool: "select" | "pan" | "rectangle" | "circle" | "text") => void;
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
  const [viewport, setViewport] = useState<CanvasViewport>({
    x: virtualWidth / 2 - width / 2,
    y: virtualHeight / 2 - height / 2,
    scale: 1,
  });

  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isCreatingShape, setIsCreatingShape] = useState(false);
  const [currentTool, setCurrentTool] = useState<
    "select" | "pan" | "rectangle" | "circle" | "text"
  >("select");
  const [creationStartPoint, setCreationStartPoint] = useState<Point | null>(
    null
  );
  const [previewShape, setPreviewShape] = useState<Shape | null>(null);

  // Use external shapes if provided, otherwise use empty array
  const shapes = useMemo(() => externalShapes || [], [externalShapes]);

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate unique ID for shapes
  const generateId = useCallback(() => {
    return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Shape management functions
  const handleShapeSelect = useCallback(
    (id: string) => {
      if (currentTool === "select") {
        setSelectedShapeIds([id]);
      }
    },
    [currentTool]
  );

  const handleShapeDragStart = useCallback(
    (id: string) => {
      // Move shape to front when dragging starts
      if (onShapeUpdate) {
        onShapeUpdate(id, { zIndex: Date.now() });
      }
    },
    [onShapeUpdate]
  );

  const handleShapeDragMove = useCallback(
    (id: string, x: number, y: number) => {
      if (onShapeUpdate) {
        onShapeUpdate(id, { x, y });
      }
    },
    [onShapeUpdate]
  );

  const handleShapeDragEnd = useCallback(() => {
    // Shape drag end handled in individual shape components
  }, []);

  const handleShapeChange = useCallback(
    (id: string, updates: Partial<Shape>) => {
      if (onShapeUpdate) {
        onShapeUpdate(id, updates);
      }
    },
    [onShapeUpdate]
  );

  const handleCreateShape = useCallback(
    (type: "rectangle" | "circle" | "text", x: number, y: number) => {
      if (currentTool !== type) return;

      // Use preview shape dimensions if available, otherwise use defaults
      let width = 100;
      let height = 100;
      let radius = 50;

      if (previewShape) {
        if (type === "rectangle" && previewShape.width && previewShape.height) {
          width = previewShape.width;
          height = previewShape.height;
        } else if (type === "circle" && previewShape.radius) {
          radius = previewShape.radius;
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
        type,
        x: constrainedX,
        y: constrainedY,
        ...(type === "rectangle" && { width, height }),
        ...(type === "circle" && { radius }),
        ...(type === "text" && { text: "Click to edit", fontSize: 16 }),
        fill: "#ffffff",
        stroke: "#000000",
        strokeWidth: 1,
      };

      setIsCreatingShape(false);
      setCurrentTool("select");

      // Notify parent component of tool change
      onToolChange?.("select");

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
    ]
  );

  // Handle stage mouse down for starting shape creation
  const handleStageMouseDown = useCallback(() => {
    if (!isCreatingShape || currentTool === "select" || currentTool === "pan")
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

    // Create preview shape
    const preview: Shape = {
      id: "preview",
      type: currentTool,
      x: constrainedPoint.x,
      y: constrainedPoint.y,
      ...(currentTool === "rectangle" && { width: 0, height: 0 }),
      ...(currentTool === "circle" && { radius: 0 }),
      ...(currentTool === "text" && { text: "", fontSize: 16 }),
      fill: "#ffffff",
      stroke: "#3b82f6",
      strokeWidth: 2,
    };

    setPreviewShape(preview);
  }, [isCreatingShape, currentTool, viewport, virtualWidth, virtualHeight]);

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

    // Create final shape (only for rectangle, circle, text)
    if (
      currentTool === "rectangle" ||
      currentTool === "circle" ||
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

  // Handle stage click for creating shapes (fallback for text)
  const handleStageClick = useCallback(() => {
    if (!isCreatingShape || currentTool === "select" || currentTool === "pan")
      return;

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
    isCreatingShape,
    currentTool,
    viewport,
    handleCreateShape,
    virtualWidth,
    virtualHeight,
  ]);

  // Canvas methods for imperative access
  const setTool = useCallback(
    (tool: "select" | "pan" | "rectangle" | "circle" | "text") => {
      setCurrentTool(tool);
      setIsCreatingShape(tool !== "select" && tool !== "pan");
      // Reset creation state when switching tools
      setCreationStartPoint(null);
      setPreviewShape(null);
    },
    []
  );

  const getViewport = useCallback(() => viewport, [viewport]);

  const getShapes = useCallback(() => shapes, [shapes]);

  const deleteShape = useCallback(
    (id: string) => {
      if (onShapeDelete) {
        onShapeDelete(id);
      }
      setSelectedShapeIds((prev) =>
        prev.filter((selectedId) => selectedId !== id)
      );
    },
    [onShapeDelete]
  );

  const clearCanvas = useCallback(() => {
    // Clear all shapes - parent component should handle database cleanup
    shapes.forEach((shape) => {
      if (onShapeDelete) {
        onShapeDelete(shape.id);
      }
    });
    setSelectedShapeIds([]);
  }, [shapes, onShapeDelete]);

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
  const handleViewportChange = useCallback((newViewport: CanvasViewport) => {
    setViewport(newViewport);
  }, []);

  // Handle zoom with mouse wheel
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
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

      setViewport({
        x: newX,
        y: newY,
        scale: clampedScale,
      });
    },
    [viewport]
  );

  // Handle pan start
  const handlePanStart = useCallback(() => {
    setIsPanMode(true);
  }, []);

  // Handle pan move
  const handlePanMove = useCallback((delta: Point) => {
    setViewport((prev) => ({
      ...prev,
      x: prev.x + delta.x / prev.scale,
      y: prev.y + delta.y / prev.scale,
    }));
  }, []);

  // Handle pan end
  const handlePanEnd = useCallback(() => {
    setIsPanMode(false);
  }, []);

  // Constrain viewport to canvas boundaries
  useEffect(() => {
    // Calculate the visible area in virtual coordinates
    const visibleWidth = width / viewport.scale;
    const visibleHeight = height / viewport.scale;

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

    setViewport((prev) => ({
      x: Math.max(minX, Math.min(maxX, prev.x)),
      y: Math.max(minY, Math.min(maxY, prev.y)),
      scale: prev.scale,
    }));
  }, [viewport.scale, virtualWidth, virtualHeight, width, height]);

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
              </>
            )}

            {/* Shapes */}
            {shapes.map((shape) => {
              const isSelected = selectedShapeIds.includes(shape.id);

              switch (shape.type) {
                case "rectangle":
                  return (
                    <RectangleShape
                      key={shape.id}
                      shape={shape}
                      isSelected={isSelected}
                      onSelect={handleShapeSelect}
                      onDragStart={handleShapeDragStart}
                      onDragMove={handleShapeDragMove}
                      onDragEnd={handleShapeDragEnd}
                      onShapeChange={handleShapeChange}
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
                      onSelect={handleShapeSelect}
                      onDragStart={handleShapeDragStart}
                      onDragMove={handleShapeDragMove}
                      onDragEnd={handleShapeDragEnd}
                      onShapeChange={handleShapeChange}
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
                      onSelect={handleShapeSelect}
                      onDragStart={handleShapeDragStart}
                      onDragMove={handleShapeDragMove}
                      onDragEnd={handleShapeDragEnd}
                      onShapeChange={handleShapeChange}
                      virtualWidth={virtualWidth}
                      virtualHeight={virtualHeight}
                    />
                  );
                default:
                  return null;
              }
            })}
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
                <div className="absolute top-0 left-0 right-0 h-2 bg-neutral-900/50 shadow-lg" />
              )}
              {/* Bottom boundary - show when viewport is at bottom of allowed area */}
              {viewport.y >= maxY && (
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-neutral-900/50 shadow-lg" />
              )}
              {/* Left boundary - show when viewport is at left of allowed area */}
              {viewport.x <= minX && (
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-neutral-900/50 shadow-lg" />
              )}
              {/* Right boundary - show when viewport is at right of allowed area */}
              {viewport.x >= maxX && (
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-neutral-900/50 shadow-lg" />
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
});

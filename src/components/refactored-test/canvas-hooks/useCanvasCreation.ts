import { useState, useCallback } from "react";
import type { Shape, Point } from "@/types";
import {
  createShape,
  createPreviewShape,
  updatePreviewShape,
} from "../canvas-lib";
import { CANVAS_CONSTANTS } from "../canvas-lib/constants";

interface UseCanvasCreationProps {
  currentTool: string;
  virtualWidth: number;
  virtualHeight: number;
  onShapeCreate?: (shape: Shape) => void;
  onToolChange?: (tool: string) => void;
  setCurrentTool: (tool: string) => void;
  setSelectedShapeIds: (ids: string[]) => void;
}

export const useCanvasCreation = ({
  currentTool,
  virtualWidth,
  virtualHeight,
  onShapeCreate,
  onToolChange,
  setCurrentTool,
  setSelectedShapeIds,
}: UseCanvasCreationProps) => {
  const [isCreatingShape, setIsCreatingShape] = useState(false);
  const [creationStartPoint, setCreationStartPoint] = useState<Point | null>(
    null
  );
  const [previewShape, setPreviewShape] = useState<Shape | null>(null);

  const handleCreateShape = useCallback(
    (
      type: "rectangle" | "circle" | "text" | "line" | "triangle",
      x: number,
      y: number
    ) => {
      if (currentTool !== type) return;

      // Use preview shape dimensions if available, otherwise use defaults
      let width = CANVAS_CONSTANTS.DEFAULT_SHAPE_SIZE as number;
      let height = CANVAS_CONSTANTS.DEFAULT_SHAPE_SIZE as number;
      let radius = CANVAS_CONSTANTS.DEFAULT_CIRCLE_RADIUS as number;
      let startX = x;
      let startY = y;
      let endX = x + CANVAS_CONSTANTS.DEFAULT_SHAPE_SIZE;
      let endY = y;

      if (previewShape) {
        if (type === "rectangle" && previewShape.width && previewShape.height) {
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
        } else if (
          type === "triangle" &&
          previewShape.width &&
          previewShape.height
        ) {
          width = previewShape.width;
          height = previewShape.height;
        }
      }

      const newShape = createShape(type, x, y, {
        width,
        height,
        radius,
        startX,
        startY,
        endX,
        endY,
        virtualWidth,
        virtualHeight,
      });

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
      previewShape,
      onShapeCreate,
      onToolChange,
      virtualWidth,
      virtualHeight,
      setCurrentTool,
      setSelectedShapeIds,
    ]
  );

  const startShapeCreation = useCallback((tool: string, point: Point) => {
    if (tool === "select" || tool === "pan" || tool === "text") return;

    setCreationStartPoint(point);

    // Create preview shape (for rectangle, circle, line, and triangle)
    const preview = createPreviewShape(
      tool as "rectangle" | "circle" | "line" | "triangle",
      point.x,
      point.y
    );
    setPreviewShape(preview);
  }, []);

  const updateShapePreview = useCallback(
    (currentPoint: Point) => {
      if (!isCreatingShape || !creationStartPoint || !previewShape) return;

      const updatedPreview = updatePreviewShape(
        previewShape,
        creationStartPoint,
        currentPoint
      );
      setPreviewShape(updatedPreview);
    },
    [isCreatingShape, creationStartPoint, previewShape]
  );

  const finalizeShapeCreation = useCallback(() => {
    if (!isCreatingShape || !creationStartPoint || !previewShape) return;

    // Create final shape (for rectangle, circle, line, triangle, text)
    if (
      currentTool === "rectangle" ||
      currentTool === "circle" ||
      currentTool === "line" ||
      currentTool === "triangle" ||
      currentTool === "text"
    ) {
      handleCreateShape(
        currentTool as "rectangle" | "circle" | "line" | "triangle" | "text",
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

  const createTextShape = useCallback(
    (point: Point) => {
      if (currentTool !== "text") return;

      setSelectedShapeIds([]);

      // Constrain text position to canvas boundaries
      const constrainedX = Math.max(
        0,
        Math.min(virtualWidth - CANVAS_CONSTANTS.DEFAULT_SHAPE_SIZE, point.x)
      );
      const constrainedY = Math.max(0, Math.min(virtualHeight - 50, point.y));

      handleCreateShape(currentTool, constrainedX, constrainedY);
    },
    [
      currentTool,
      virtualWidth,
      virtualHeight,
      handleCreateShape,
      setSelectedShapeIds,
    ]
  );

  const resetCreationState = useCallback(() => {
    setCreationStartPoint(null);
    setPreviewShape(null);
  }, []);

  return {
    isCreatingShape,
    setIsCreatingShape,
    creationStartPoint,
    previewShape,
    handleCreateShape,
    startShapeCreation,
    updateShapePreview,
    finalizeShapeCreation,
    createTextShape,
    resetCreationState,
  };
};

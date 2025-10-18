import type { Shape } from "@/types";
import { CANVAS_CONSTANTS, DEFAULT_SHAPE_PROPS } from "./constants";
import { generateShapeId, constrainPointToCanvas } from "./canvas-utils";

/**
 * Create a new shape with default properties
 */
export const createShape = (
  type: "rectangle" | "circle" | "text" | "line" | "triangle",
  x: number,
  y: number,
  options: {
    width?: number;
    height?: number;
    radius?: number;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    text?: string;
    fontSize?: number;
    fill?: string;
    virtualWidth?: number;
    virtualHeight?: number;
  } = {}
): Shape => {
  const {
    width = CANVAS_CONSTANTS.DEFAULT_SHAPE_SIZE,
    height = CANVAS_CONSTANTS.DEFAULT_SHAPE_SIZE,
    radius = CANVAS_CONSTANTS.DEFAULT_CIRCLE_RADIUS,
    startX = x,
    startY = y,
    endX = x + CANVAS_CONSTANTS.DEFAULT_SHAPE_SIZE,
    endY = y,
    text = "Click to edit",
    fontSize = CANVAS_CONSTANTS.DEFAULT_TEXT_SIZE,
    fill = DEFAULT_SHAPE_PROPS.fill,
    virtualWidth = CANVAS_CONSTANTS.VIRTUAL_WIDTH,
    virtualHeight = CANVAS_CONSTANTS.VIRTUAL_HEIGHT,
  } = options;

  // Constrain position to canvas boundaries
  const constrainedPoint = constrainPointToCanvas(
    { x, y },
    virtualWidth,
    virtualHeight,
    width,
    height
  );

  const baseShape: Shape = {
    id: generateShapeId(),
    canvasId: "default",
    type,
    x: constrainedPoint.x,
    y: constrainedPoint.y,
    ...DEFAULT_SHAPE_PROPS,
    fill,
    zIndex: Date.now(),
  };

  // Add type-specific properties
  switch (type) {
    case "rectangle":
      return {
        ...baseShape,
        width,
        height,
      };
    case "circle":
      return {
        ...baseShape,
        radius,
      };
    case "text":
      return {
        ...baseShape,
        text,
        fontSize,
        fill: "#000000",
      };
    case "line":
      return {
        ...baseShape,
        startX,
        startY,
        endX,
        endY,
      };
    case "triangle":
      return {
        ...baseShape,
        width,
        height,
      };
    default:
      return baseShape;
  }
};

/**
 * Validate shape properties
 */
export const validateShape = (shape: Shape): boolean => {
  if (!shape.id || !shape.type) return false;

  switch (shape.type) {
    case "rectangle":
      return (
        typeof shape.width === "number" &&
        typeof shape.height === "number" &&
        shape.width > 0 &&
        shape.height > 0
      );
    case "circle":
      return typeof shape.radius === "number" && shape.radius > 0;
    case "text":
      return typeof shape.text === "string";
    case "line":
      return (
        typeof shape.startX === "number" &&
        typeof shape.startY === "number" &&
        typeof shape.endX === "number" &&
        typeof shape.endY === "number"
      );
    case "triangle":
      return (
        typeof shape.width === "number" &&
        typeof shape.height === "number" &&
        shape.width > 0 &&
        shape.height > 0
      );
    default:
      return false;
  }
};

/**
 * Constrain line coordinates to canvas boundaries
 */
export const constrainLineToCanvas = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  virtualWidth: number,
  virtualHeight: number
): { startX: number; startY: number; endX: number; endY: number } => {
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);

  let adjustedStartX = startX;
  let adjustedStartY = startY;
  let adjustedEndX = endX;
  let adjustedEndY = endY;

  // Adjust if line extends beyond boundaries
  if (minX < 0) {
    const offset = -minX;
    adjustedStartX += offset;
    adjustedEndX += offset;
  }
  if (maxX > virtualWidth) {
    const offset = virtualWidth - maxX;
    adjustedStartX += offset;
    adjustedEndX += offset;
  }
  if (minY < 0) {
    const offset = -minY;
    adjustedStartY += offset;
    adjustedEndY += offset;
  }
  if (maxY > virtualHeight) {
    const offset = virtualHeight - maxY;
    adjustedStartY += offset;
    adjustedEndY += offset;
  }

  return {
    startX: adjustedStartX,
    startY: adjustedStartY,
    endX: adjustedEndX,
    endY: adjustedEndY,
  };
};

/**
 * Ensure line has minimum length
 */
export const ensureMinimumLineLength = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  minLength: number = CANVAS_CONSTANTS.MIN_LINE_LENGTH
): { startX: number; startY: number; endX: number; endY: number } => {
  const lineLength = Math.sqrt(
    Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
  );

  if (lineLength < minLength) {
    // If line is too short, extend it horizontally
    return {
      startX,
      startY,
      endX: startX + minLength,
      endY: startY,
    };
  }

  return { startX, startY, endX, endY };
};

/**
 * Create preview shape for shape creation
 */
export const createPreviewShape = (
  type: "rectangle" | "circle" | "line" | "triangle",
  x: number,
  y: number,
  options: {
    width?: number;
    height?: number;
    radius?: number;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
  } = {}
): Shape => {
  const {
    width = 0,
    height = 0,
    radius = 0,
    startX = x,
    startY = y,
    endX = x,
    endY = y,
  } = options;

  const baseShape: Shape = {
    id: "preview",
    canvasId: "default",
    type,
    x,
    y,
    ...DEFAULT_SHAPE_PROPS,
    fill: "#ffffff",
    stroke: "#3b82f6",
    strokeWidth: 2,
    zIndex: Date.now(),
  };

  switch (type) {
    case "rectangle":
      return { ...baseShape, width, height };
    case "circle":
      return { ...baseShape, radius };
    case "line":
      return { ...baseShape, startX, startY, endX, endY };
    case "triangle":
      return { ...baseShape, width, height };
    default:
      return baseShape;
  }
};

/**
 * Update preview shape dimensions
 */
export const updatePreviewShape = (
  previewShape: Shape,
  startPoint: { x: number; y: number },
  currentPoint: { x: number; y: number }
): Shape => {
  switch (previewShape.type) {
    case "rectangle": {
      const width = Math.abs(currentPoint.x - startPoint.x);
      const height = Math.abs(currentPoint.y - startPoint.y);
      return {
        ...previewShape,
        x: Math.min(startPoint.x, currentPoint.x),
        y: Math.min(startPoint.y, currentPoint.y),
        width: Math.max(width, CANVAS_CONSTANTS.MIN_SHAPE_SIZE),
        height: Math.max(height, CANVAS_CONSTANTS.MIN_SHAPE_SIZE),
      };
    }
    case "circle": {
      const radius =
        Math.sqrt(
          Math.pow(currentPoint.x - startPoint.x, 2) +
            Math.pow(currentPoint.y - startPoint.y, 2)
        ) / 2;
      return {
        ...previewShape,
        radius: Math.max(radius, CANVAS_CONSTANTS.MIN_CIRCLE_RADIUS),
      };
    }
    case "line": {
      return {
        ...previewShape,
        startX: startPoint.x,
        startY: startPoint.y,
        endX: currentPoint.x,
        endY: currentPoint.y,
      };
    }
    case "triangle": {
      const width = Math.abs(currentPoint.x - startPoint.x);
      const height = Math.abs(currentPoint.y - startPoint.y);
      return {
        ...previewShape,
        x: Math.min(startPoint.x, currentPoint.x),
        y: Math.min(startPoint.y, currentPoint.y),
        width: Math.max(width, CANVAS_CONSTANTS.MIN_SHAPE_SIZE),
        height: Math.max(height, CANVAS_CONSTANTS.MIN_SHAPE_SIZE),
      };
    }
    default:
      return previewShape;
  }
};

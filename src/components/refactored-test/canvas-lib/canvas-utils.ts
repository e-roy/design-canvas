import type { CanvasViewport, Point } from "@/types";
import { CANVAS_CONSTANTS } from "./constants";

/**
 * Constrain viewport to canvas boundaries
 */
export const constrainViewport = (
  newViewport: CanvasViewport,
  width: number,
  height: number,
  virtualWidth: number,
  virtualHeight: number
): CanvasViewport => {
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
};

/**
 * Convert screen coordinates to virtual canvas coordinates
 */
export const screenToVirtual = (
  screenPoint: Point,
  viewport: CanvasViewport
): Point => ({
  x: screenPoint.x / viewport.scale + viewport.x,
  y: screenPoint.y / viewport.scale + viewport.y,
});

/**
 * Convert virtual coordinates to screen coordinates
 */
export const virtualToScreen = (
  virtualPoint: Point,
  viewport: CanvasViewport
): Point => ({
  x: (virtualPoint.x - viewport.x) * viewport.scale,
  y: (virtualPoint.y - viewport.y) * viewport.scale,
});

/**
 * Constrain point to canvas boundaries
 */
export const constrainPointToCanvas = (
  point: Point,
  virtualWidth: number,
  virtualHeight: number,
  shapeWidth: number = CANVAS_CONSTANTS.DEFAULT_SHAPE_SIZE,
  shapeHeight: number = CANVAS_CONSTANTS.DEFAULT_SHAPE_SIZE
): Point => ({
  x: Math.max(0, Math.min(virtualWidth - shapeWidth, point.x)),
  y: Math.max(0, Math.min(virtualHeight - shapeHeight, point.y)),
});

/**
 * Calculate zoom around a specific point
 */
export const calculateZoomViewport = (
  oldViewport: CanvasViewport,
  mousePoint: Point,
  newScale: number,
  minScale: number = CANVAS_CONSTANTS.MIN_SCALE,
  maxScale: number = CANVAS_CONSTANTS.MAX_SCALE
): CanvasViewport => {
  const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));

  // Calculate the point to scale around (mouse position in virtual coordinates)
  const mousePointTo = {
    x: mousePoint.x / oldViewport.scale + oldViewport.x,
    y: mousePoint.y / oldViewport.scale + oldViewport.y,
  };

  // Calculate new viewport position
  const newX = mousePointTo.x - mousePoint.x / clampedScale;
  const newY = mousePointTo.y - mousePoint.y / clampedScale;

  return {
    x: newX,
    y: newY,
    scale: clampedScale,
  };
};

/**
 * Check if two points are within tolerance
 */
export const pointsWithinTolerance = (
  point1: Point,
  point2: Point,
  tolerance: number = CANVAS_CONSTANTS.DRAG_TOLERANCE
): boolean => {
  return (
    Math.abs(point1.x - point2.x) < tolerance &&
    Math.abs(point1.y - point2.y) < tolerance
  );
};

/**
 * Calculate distance between two points
 */
export const calculateDistance = (point1: Point, point2: Point): number => {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  );
};

/**
 * Generate unique ID for shapes
 */
export const generateShapeId = (): string => {
  return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

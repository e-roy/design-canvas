import { useState, useCallback, useEffect } from "react";
import type { CanvasViewport, Point, CursorPosition } from "@/types";
import {
  constrainViewport,
  calculateZoomViewport,
} from "@/lib/canvas/canvas-utils";
import { CANVAS_CONSTANTS } from "@/lib/canvas/constants";

interface UseCanvasViewportProps {
  width: number;
  height: number;
  virtualWidth: number;
  virtualHeight: number;
  viewport: CanvasViewport;
  setViewport: (viewport: CanvasViewport) => void;
  onMouseMove?: (position: CursorPosition) => void;
}

export const useCanvasViewport = ({
  width,
  height,
  virtualWidth,
  virtualHeight,
  viewport,
  setViewport,
  onMouseMove,
}: UseCanvasViewportProps) => {
  const [isPanMode, setIsPanMode] = useState(false);

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
      }, CANVAS_CONSTANTS.THROTTLE_INTERVAL);

      return () => clearTimeout(timeoutId);
    }
  }, [viewport.x, viewport.y, viewport.scale]);

  const handleViewportChange = useCallback(
    (newViewport: CanvasViewport) => {
      const constrainedViewport = constrainViewport(
        newViewport,
        width,
        height,
        virtualWidth,
        virtualHeight
      );
      setViewport(constrainedViewport);
    },
    [setViewport, width, height, virtualWidth, virtualHeight]
  );

  const handleWheel = useCallback(
    (
      e: WheelEvent,
      stage: { getPointerPosition: () => { x: number; y: number } | null }
    ) => {
      e.preventDefault();

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.1;
      const oldScale = viewport.scale;
      const newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

      const newViewport = calculateZoomViewport(
        viewport,
        pointer,
        newScale,
        CANVAS_CONSTANTS.MIN_SCALE,
        CANVAS_CONSTANTS.MAX_SCALE
      );

      handleViewportChange(newViewport);
    },
    [viewport, handleViewportChange]
  );

  const handlePanStart = useCallback(() => {
    setIsPanMode(true);
  }, []);

  const handlePanMove = useCallback(
    (delta: Point) => {
      const newViewport = {
        ...viewport,
        x: viewport.x + delta.x / viewport.scale,
        y: viewport.y + delta.y / viewport.scale,
      };

      handleViewportChange(newViewport);
    },
    [viewport, handleViewportChange]
  );

  const handlePanEnd = useCallback(() => {
    setIsPanMode(false);
  }, []);

  const updateCursorPosition = useCallback(
    (screenPoint: Point) => {
      if (!onMouseMove) return;

      // Convert screen coordinates to virtual canvas coordinates
      const virtualPosition: CursorPosition = {
        x: screenPoint.x / viewport.scale + viewport.x,
        y: screenPoint.y / viewport.scale + viewport.y,
        timestamp: Date.now(),
      };

      onMouseMove(virtualPosition);
    },
    [onMouseMove, viewport]
  );

  return {
    isPanMode,
    handleViewportChange,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    updateCursorPosition,
  };
};

"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { Group } from "react-konva";
import Konva from "konva";
import { ViewportProps, CanvasViewport, Point } from "./types";

export function Viewport({
  canvasWidth,
  canvasHeight,
  virtualWidth,
  virtualHeight,
  viewport,
  onViewportChange,
  onPanStart,
  onPanMove,
  onPanEnd,
  children,
  currentTool,
}: ViewportProps & { currentTool: string }) {
  const groupRef = useRef<Konva.Group>(null);
  const isDraggingRef = useRef(false);
  const lastPointerPositionRef = useRef<Point>({ x: 0, y: 0 });

  // Handle mouse down for panning
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Only handle panning when in pan mode
      if (currentTool !== "pan") {
        e.cancelBubble = true;
        return;
      }

      const stage = e.target.getStage();
      if (!stage) return;

      isDraggingRef.current = true;
      lastPointerPositionRef.current = stage.getPointerPosition() || {
        x: 0,
        y: 0,
      };

      // Change cursor to grabbing
      if (stage.container()) {
        stage.container().style.cursor = "grabbing";
      }

      onPanStart?.();

      // Prevent default behavior
      e.evt.preventDefault();
    },
    [onPanStart, currentTool]
  );

  // Handle mouse move for panning
  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDraggingRef.current || currentTool !== "pan") {
        e.cancelBubble = true;
        return;
      }

      const stage = e.target.getStage();
      if (!stage) return;

      const currentPointer = stage.getPointerPosition();
      if (!currentPointer) return;

      const delta: Point = {
        x: currentPointer.x - lastPointerPositionRef.current.x,
        y: currentPointer.y - lastPointerPositionRef.current.y,
      };

      lastPointerPositionRef.current = currentPointer;

      onPanMove?.(delta);

      // Prevent default behavior
      e.evt.preventDefault();
    },
    [onPanMove, currentTool]
  );

  // Handle mouse up for panning
  const handleMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDraggingRef.current || currentTool !== "pan") {
        e.cancelBubble = true;
        return;
      }

      const stage = e.target.getStage();
      if (!stage) return;

      isDraggingRef.current = false;

      // Change cursor back to grab
      if (stage.container()) {
        stage.container().style.cursor = "grab";
      }

      onPanEnd?.();

      // Prevent default behavior
      e.evt.preventDefault();
    },
    [onPanEnd, currentTool]
  );

  // Update group transform when viewport changes
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Apply viewport transformation to convert virtual coordinates to screen coordinates
    // The viewport represents the top-left corner of the visible area in virtual coordinates
    group.x(-viewport.x * viewport.scale);
    group.y(-viewport.y * viewport.scale);
    group.scale({ x: viewport.scale, y: viewport.scale });

    // Force layer redraw for smooth performance
    group.getLayer()?.batchDraw();
  }, [viewport]);

  // Handle global mouse events
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        onPanEnd?.();
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("mouseleave", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("mouseleave", handleGlobalMouseUp);
    };
  }, [onPanEnd]);

  return (
    <Group
      ref={groupRef}
      width={virtualWidth}
      height={virtualHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      listening={true}
    >
      {children}
    </Group>
  );
}

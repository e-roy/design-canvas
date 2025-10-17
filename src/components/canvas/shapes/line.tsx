"use client";

import React, { useRef, useState, useCallback, memo } from "react";
import { Line, Group, Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Line as KonvaLine } from "konva/lib/shapes/Line";
import type { Circle as KonvaCircle } from "konva/lib/shapes/Circle";
import { Shape } from "@/types";

interface LineProps {
  shape: Shape;
  isSelected: boolean;
  onSelect?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragMove?: (id: string, x: number, y: number) => void;
  onDragEnd?: (id: string, finalX?: number, finalY?: number) => void;
  onShapeChange?: (id: string, updates: Partial<Shape>) => void;
  virtualWidth: number;
  virtualHeight: number;
}

export const LineShape = memo(function LineShape({
  shape,
  isSelected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onShapeChange,
  virtualWidth,
  virtualHeight,
}: LineProps) {
  const lineRef = useRef<KonvaLine>(null);
  const startHandleRef = useRef<KonvaCircle>(null);
  const endHandleRef = useRef<KonvaCircle>(null);
  const [, _setIsDragging] = useState(false);
  const [, setDraggingHandle] = useState<"start" | "end" | null>(null);

  // Handle dragging the entire line
  const handleLineDragStart = useCallback(() => {
    _setIsDragging(true);
    onDragStart?.(shape.id);

    // Bring to front
    const line = lineRef.current;
    if (line) {
      line.moveToTop();
    }
  }, [shape.id, onDragStart]);

  const handleLineDragMove = useCallback(() => {
    const line = lineRef.current;
    if (!line) return;

    let newX = line.x();
    let newY = line.y();

    // For lines, we need to constrain the endpoints, not the position
    // Calculate where the line endpoints would be after this drag
    const newStartX = shape.startX! + newX;
    const newStartY = shape.startY! + newY;
    const newEndX = shape.endX! + newX;
    const newEndY = shape.endY! + newY;

    // Find the bounds of the line
    const minX = Math.min(newStartX, newEndX);
    const maxX = Math.max(newStartX, newEndX);
    const minY = Math.min(newStartY, newEndY);
    const maxY = Math.max(newStartY, newEndY);

    // Constrain the line to stay within canvas boundaries
    if (minX < 0) {
      newX -= minX; // Move right to keep line in bounds
    }
    if (maxX > virtualWidth) {
      newX -= maxX - virtualWidth; // Move left to keep line in bounds
    }
    if (minY < 0) {
      newY -= minY; // Move down to keep line in bounds
    }
    if (maxY > virtualHeight) {
      newY -= maxY - virtualHeight; // Move up to keep line in bounds
    }

    // Update position
    line.position({ x: newX, y: newY });

    onDragMove?.(shape.id, newX, newY);
  }, [
    shape.id,
    shape.startX,
    shape.startY,
    shape.endX,
    shape.endY,
    onDragMove,
    virtualWidth,
    virtualHeight,
  ]);

  const handleLineDragEnd = useCallback(() => {
    _setIsDragging(false);

    // Get final position and update line coordinates
    const line = lineRef.current;
    if (line) {
      const finalX = line.x();
      const finalY = line.y();

      // Calculate new line coordinates based on drag movement
      const newStartX = shape.startX! + finalX;
      const newStartY = shape.startY! + finalY;
      const newEndX = shape.endX! + finalX;
      const newEndY = shape.endY! + finalY;

      // Update the line coordinates
      onShapeChange?.(shape.id, {
        startX: newStartX,
        startY: newStartY,
        endX: newEndX,
        endY: newEndY,
        x: Math.min(newStartX, newEndX), // Update shape position to top-left of line
        y: Math.min(newStartY, newEndY),
      });

      // Reset the line position since we're using absolute coordinates
      line.x(0);
      line.y(0);

      onDragEnd?.(shape.id, finalX, finalY);
    } else {
      onDragEnd?.(shape.id);
    }
  }, [
    shape.id,
    shape.startX,
    shape.startY,
    shape.endX,
    shape.endY,
    onShapeChange,
    onDragEnd,
  ]);

  // Handle dragging the start handle
  const handleStartHandleDragMove = useCallback(() => {
    const handle = startHandleRef.current;
    if (!handle) return;

    let newX = handle.x();
    let newY = handle.y();

    // Constrain to canvas boundaries
    newX = Math.max(0, Math.min(virtualWidth, newX));
    newY = Math.max(0, Math.min(virtualHeight, newY));

    // Update handle position
    handle.position({ x: newX, y: newY });

    // Update line coordinates
    onShapeChange?.(shape.id, {
      startX: newX,
      startY: newY,
      x: Math.min(newX, shape.endX ?? 100),
      y: Math.min(newY, shape.endY ?? 0),
    });
  }, [
    shape.id,
    shape.endX,
    shape.endY,
    onShapeChange,
    virtualWidth,
    virtualHeight,
  ]);

  // Handle dragging the end handle
  const handleEndHandleDragMove = useCallback(() => {
    const handle = endHandleRef.current;
    if (!handle) return;

    let newX = handle.x();
    let newY = handle.y();

    // Constrain to canvas boundaries
    newX = Math.max(0, Math.min(virtualWidth, newX));
    newY = Math.max(0, Math.min(virtualHeight, newY));

    // Update handle position
    handle.position({ x: newX, y: newY });

    // Update line coordinates
    onShapeChange?.(shape.id, {
      endX: newX,
      endY: newY,
      x: Math.min(shape.startX ?? 0, newX),
      y: Math.min(shape.startY ?? 0, newY),
    });
  }, [
    shape.id,
    shape.startX,
    shape.startY,
    onShapeChange,
    virtualWidth,
    virtualHeight,
  ]);

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect?.(shape.id);
    },
    [shape.id, onSelect]
  );

  const strokeColor = isSelected ? "#3b82f6" : shape.stroke || "#000000";
  const strokeWidth = isSelected ? 3 : shape.strokeWidth || 1;

  // Calculate line points - use absolute coordinates for lines
  const startX = shape.startX ?? 0;
  const startY = shape.startY ?? 0;
  const endX = shape.endX ?? 100;
  const endY = shape.endY ?? 0;

  // Don't render if line has zero length
  const lineLength = Math.sqrt(
    Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
  );
  if (lineLength < 1) {
    return null;
  }

  return (
    <Group>
      {/* Selection outline */}
      {isSelected && (
        <Line
          x={0}
          y={0}
          points={[startX, startY, endX, endY]}
          stroke="#3b82f6"
          strokeWidth={strokeWidth + 4}
          opacity={0.3}
          listening={false}
        />
      )}

      {/* Main line */}
      <Line
        ref={lineRef}
        x={0}
        y={0}
        points={[startX, startY, endX, endY]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        rotation={shape.rotation || 0}
        draggable={true}
        onDragStart={handleLineDragStart}
        onDragMove={handleLineDragMove}
        onDragEnd={handleLineDragEnd}
        onClick={handleClick}
      />

      {/* Endpoint handles - only show when selected */}
      {isSelected && (
        <>
          {/* Start handle */}
          <Circle
            ref={startHandleRef}
            x={startX}
            y={startY}
            radius={40}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={3}
            draggable={true}
            onDragMove={handleStartHandleDragMove}
            onDragStart={() => setDraggingHandle("start")}
            onDragEnd={() => setDraggingHandle(null)}
          />

          {/* End handle */}
          <Circle
            ref={endHandleRef}
            x={endX}
            y={endY}
            radius={40}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={3}
            draggable={true}
            onDragMove={handleEndHandleDragMove}
            onDragStart={() => setDraggingHandle("end")}
            onDragEnd={() => setDraggingHandle(null)}
          />
        </>
      )}
    </Group>
  );
});

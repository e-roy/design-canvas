"use client";

import React, { useRef, useState, useCallback, memo } from "react";
import { Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Line as KonvaLine } from "konva/lib/shapes/Line";
import { Shape } from "@/types";

interface LineProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, finalX?: number, finalY?: number) => void;
  onShapeChange: (id: string, updates: Partial<Shape>) => void;
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
  const [, _setIsDragging] = useState(false);

  const handleDragStart = useCallback(() => {
    _setIsDragging(true);
    onDragStart(shape.id);

    // Bring to front
    const line = lineRef.current;
    if (line) {
      line.moveToTop();
    }
  }, [shape.id, onDragStart]);

  const handleDragMove = useCallback(() => {
    const line = lineRef.current;
    if (!line) return;

    let newX = line.x();
    let newY = line.y();

    // Get line dimensions for boundary calculation
    const lineWidth = Math.abs(shape.endX! - shape.startX!);
    const lineHeight = Math.abs(shape.endY! - shape.startY!);

    // Constrain to canvas boundaries
    newX = Math.max(0, Math.min(virtualWidth - lineWidth, newX));
    newY = Math.max(0, Math.min(virtualHeight - lineHeight, newY));

    // Update position
    line.position({ x: newX, y: newY });

    onDragMove(shape.id, newX, newY);
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

  const handleDragEnd = useCallback(() => {
    _setIsDragging(false);

    // Get final position and pass it to parent
    const line = lineRef.current;
    if (line) {
      const finalX = line.x();
      const finalY = line.y();
      onDragEnd(shape.id, finalX, finalY);
    } else {
      onDragEnd(shape.id);
    }
  }, [shape.id, onDragEnd]);

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect(shape.id);
    },
    [shape.id, onSelect]
  );

  const handleTransform = useCallback(() => {
    const line = lineRef.current;
    if (!line) return;

    const newRotation = line.rotation();

    // Reset scale
    line.scaleX(1);
    line.scaleY(1);

    onShapeChange(shape.id, {
      rotation: newRotation,
      x: line.x(),
      y: line.y(),
    });
  }, [shape.id, onShapeChange]);

  const strokeColor = isSelected ? "#3b82f6" : shape.stroke || "#000000";
  const strokeWidth = isSelected ? 3 : shape.strokeWidth || 1;

  // Calculate line points relative to shape position
  const startX = (shape.startX || 0) - shape.x;
  const startY = (shape.startY || 0) - shape.y;
  const endX = (shape.endX || 100) - shape.x;
  const endY = (shape.endY || 0) - shape.y;

  return (
    <Line
      ref={lineRef}
      x={shape.x}
      y={shape.y}
      points={[startX, startY, endX, endY]}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      rotation={shape.rotation || 0}
      draggable={true}
      transformsEnabled="all"
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTransform={handleTransform}
      onTransformEnd={handleTransform}
    />
  );
});

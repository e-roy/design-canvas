"use client";

import React, { useRef, useState, useCallback } from "react";
import { Rect } from "react-konva";
import Konva from "konva";
import { Shape } from "../types";

interface RectangleProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string) => void;
  onShapeChange: (id: string, updates: Partial<Shape>) => void;
  virtualWidth: number;
  virtualHeight: number;
}

export function RectangleShape({
  shape,
  isSelected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onShapeChange,
  virtualWidth,
  virtualHeight,
}: RectangleProps) {
  const rectRef = useRef<Konva.Rect>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      setIsDragging(true);
      onDragStart(shape.id);

      // Bring to front
      const rect = rectRef.current;
      if (rect) {
        rect.moveToTop();
      }
    },
    [shape.id, onDragStart]
  );

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const rect = rectRef.current;
      if (!rect) return;

      let newX = rect.x();
      let newY = rect.y();

      // Constrain to canvas boundaries
      newX = Math.max(0, Math.min(virtualWidth - (shape.width || 100), newX));
      newY = Math.max(0, Math.min(virtualHeight - (shape.height || 100), newY));

      // Update position
      rect.position({ x: newX, y: newY });

      onDragMove(shape.id, newX, newY);
    },
    [
      shape.id,
      shape.width,
      shape.height,
      onDragMove,
      virtualWidth,
      virtualHeight,
    ]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    onDragEnd(shape.id);
  }, [shape.id, onDragEnd]);

  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect(shape.id);
    },
    [shape.id, onSelect]
  );

  const handleTransform = useCallback(
    (e: Konva.KonvaEventObject<Event>) => {
      const rect = rectRef.current;
      if (!rect) return;

      const newWidth = rect.width() * rect.scaleX();
      const newHeight = rect.height() * rect.scaleY();
      const newRotation = rect.rotation();

      // Reset scale
      rect.scaleX(1);
      rect.scaleY(1);

      onShapeChange(shape.id, {
        width: Math.max(10, newWidth),
        height: Math.max(10, newHeight),
        rotation: newRotation,
        x: rect.x(),
        y: rect.y(),
      });
    },
    [shape.id, onShapeChange]
  );

  const strokeColor = isSelected ? "#3b82f6" : shape.stroke || "#000000";
  const strokeWidth = isSelected ? 3 : shape.strokeWidth || 1;

  return (
    <Rect
      ref={rectRef}
      x={shape.x}
      y={shape.y}
      width={shape.width || 100}
      height={shape.height || 100}
      fill={shape.fill || "#ffffff"}
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
}

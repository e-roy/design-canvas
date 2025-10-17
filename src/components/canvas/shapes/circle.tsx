"use client";

import React, { useRef, useState, useCallback, memo } from "react";
import { Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Circle as KonvaCircle } from "konva/lib/shapes/Circle";
import { Shape } from "@/types";

interface CircleProps {
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

export const CircleShape = memo(function CircleShape({
  shape,
  isSelected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onShapeChange,
  virtualWidth,
  virtualHeight,
}: CircleProps) {
  const circleRef = useRef<KonvaCircle>(null);
  const [, _setIsDragging] = useState(false);

  const handleDragStart = useCallback(() => {
    _setIsDragging(true);
    onDragStart(shape.id);

    // Bring to front
    const circle = circleRef.current;
    if (circle) {
      circle.moveToTop();
    }
  }, [shape.id, onDragStart]);

  const handleDragMove = useCallback(() => {
    const circle = circleRef.current;
    if (!circle) return;

    let newX = circle.x();
    let newY = circle.y();

    // Constrain to canvas boundaries (accounting for radius)
    // Circle position is the center, so we need radius on each side
    const radius = shape.radius || 50;
    newX = Math.max(radius, Math.min(virtualWidth - radius, newX));
    newY = Math.max(radius, Math.min(virtualHeight - radius, newY));

    // Update position
    circle.position({ x: newX, y: newY });

    onDragMove(shape.id, newX, newY);
  }, [shape.id, shape.radius, onDragMove, virtualWidth, virtualHeight]);

  const handleDragEnd = useCallback(() => {
    _setIsDragging(false);

    // Get final position and pass it to parent
    const circle = circleRef.current;
    if (circle) {
      const finalX = circle.x();
      const finalY = circle.y();
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
    const circle = circleRef.current;
    if (!circle) return;

    const newRadius = circle.radius() * circle.scaleX();
    const newRotation = circle.rotation();

    // Reset scale
    circle.scaleX(1);
    circle.scaleY(1);

    onShapeChange(shape.id, {
      radius: Math.max(5, newRadius),
      rotation: newRotation,
      x: circle.x(),
      y: circle.y(),
    });
  }, [shape.id, onShapeChange]);

  const strokeColor = isSelected ? "#3b82f6" : shape.stroke || "#000000";
  const strokeWidth = isSelected ? 3 : shape.strokeWidth || 1;

  return (
    <Circle
      ref={circleRef}
      x={shape.x}
      y={shape.y}
      radius={shape.radius || 50}
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
});

/**
 * Group shape component for rendering group containers
 * Groups are invisible containers that hold child nodes
 */

import React from "react";
import { Group as KonvaGroup, Rect, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Shape } from "@/types";

export interface GroupShapeProps {
  shape: Shape;
  isSelected: boolean;
  onSelect?: (id: string) => void;
  onDragStart?: (id: string, x: number, y: number) => void;
  onDragMove?: (id: string, x: number, y: number) => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
  onShapeChange?: (id: string, changes: Partial<Shape>) => void;
  virtualWidth: number;
  virtualHeight: number;
  scale: number;
  children?: React.ReactNode;
}

/**
 * Group component - renders as a transparent container with optional selection outline
 */
export function GroupShape({
  shape,
  isSelected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onShapeChange: _onShapeChange,
  virtualWidth: _virtualWidth,
  virtualHeight: _virtualHeight,
  scale,
  children,
}: GroupShapeProps) {
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect?.(shape.id);
  };

  const handleDragStart = (e: KonvaEventObject<DragEvent>) => {
    onDragStart?.(shape.id, e.target.x(), e.target.y());
  };

  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    onDragMove?.(shape.id, e.target.x(), e.target.y());
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const newX = e.target.x();
    const newY = e.target.y();
    onDragEnd?.(shape.id, newX, newY);
  };

  // Groups don't have a specific size, so we don't render any visual bounds
  // They just act as transform containers for their children
  // However, when selected, we might want to show a subtle outline

  return (
    <KonvaGroup
      id={shape.id}
      x={shape.x}
      y={shape.y}
      rotation={shape.rotation ?? 0}
      opacity={shape.opacity ?? 1}
      draggable={onDragStart !== undefined}
      onClick={handleClick}
      onTap={handleClick}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {/* Selection indicator - subtle outline when selected */}
      {isSelected && (
        <Rect
          x={0}
          y={0}
          width={100}
          height={100}
          stroke="#3b82f6"
          strokeWidth={2 / scale}
          dash={[10 / scale, 5 / scale]}
          listening={false}
        />
      )}

      {/* Optional label for debugging */}
      {isSelected && (
        <Text
          x={0}
          y={-20 / scale}
          text={shape.name || "Group"}
          fontSize={12 / scale}
          fill="#3b82f6"
          listening={false}
        />
      )}

      {/* Render children inside the group */}
      {children}
    </KonvaGroup>
  );
}

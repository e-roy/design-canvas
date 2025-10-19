"use client";

import React, { useRef, useState, useCallback, memo, useEffect } from "react";
import { Rect, Transformer } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Rect as KonvaRect } from "konva/lib/shapes/Rect";
import { Shape } from "@/types";
import Konva from "konva";

interface RectangleProps {
  shape: Shape;
  isSelected: boolean;
  onSelect?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragMove?: (id: string, x: number, y: number) => void;
  onDragEnd?: (id: string, finalX?: number, finalY?: number) => void;
  onShapeChange?: (id: string, updates: Partial<Shape>) => void;
  virtualWidth: number;
  virtualHeight: number;
  scale: number;
}

export const RectangleShape = memo(function RectangleShape({
  shape,
  isSelected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onShapeChange,
  virtualWidth,
  virtualHeight,
  scale,
}: RectangleProps) {
  const rectRef = useRef<KonvaRect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [, _setIsDragging] = useState(false);

  // Attach transformer to shape when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && rectRef.current) {
      transformerRef.current.nodes([rectRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragStart = useCallback(() => {
    _setIsDragging(true);
    onDragStart?.(shape.id);
  }, [shape.id, onDragStart]);

  const handleDragMove = useCallback(() => {
    const rect = rectRef.current;
    if (!rect) return;

    let newX = rect.x();
    let newY = rect.y();

    // Constrain to canvas boundaries
    newX = Math.max(0, Math.min(virtualWidth - (shape.width || 100), newX));
    newY = Math.max(0, Math.min(virtualHeight - (shape.height || 100), newY));

    // Update position
    rect.position({ x: newX, y: newY });

    // Only call onDragMove for visual updates, not Firebase
    onDragMove?.(shape.id, newX, newY);
  }, [
    shape.id,
    shape.width,
    shape.height,
    onDragMove,
    virtualWidth,
    virtualHeight,
  ]);

  const handleDragEnd = useCallback(() => {
    _setIsDragging(false);

    // Get final position and pass it to parent
    const rect = rectRef.current;
    if (rect) {
      const finalX = rect.x();
      const finalY = rect.y();
      onDragEnd?.(shape.id, finalX, finalY);
    } else {
      onDragEnd?.(shape.id);
    }
  }, [shape.id, onDragEnd]);

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect?.(shape.id);
    },
    [shape.id, onSelect]
  );

  const handleTransform = useCallback(() => {
    const rect = rectRef.current;
    if (!rect) return;

    const newWidth = rect.width() * rect.scaleX();
    const newHeight = rect.height() * rect.scaleY();
    const newRotation = rect.rotation();

    // Reset scale
    rect.scaleX(1);
    rect.scaleY(1);

    onShapeChange?.(shape.id, {
      width: Math.max(10, newWidth),
      height: Math.max(10, newHeight),
      rotation: newRotation,
      x: rect.x(),
      y: rect.y(),
    });
  }, [shape.id, onShapeChange]);

  const strokeColor = isSelected ? "#3b82f6" : shape.stroke || "#000000";
  const strokeWidth = isSelected ? 3 : shape.strokeWidth || 1;

  return (
    <>
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
        draggable={!!onDragStart}
        transformsEnabled="all"
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onTransform={handleTransform}
        onTransformEnd={handleTransform}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
          }}
          rotateEnabled={false}
        />
      )}
    </>
  );
});

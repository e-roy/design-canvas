"use client";

import React, { useRef, useState, useCallback, memo, useEffect } from "react";
import { Line, Transformer } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Line as KonvaLine } from "konva/lib/shapes/Line";
import { Shape } from "@/types";
import Konva from "konva";

interface TriangleProps {
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

export const TriangleShape = memo(function TriangleShape({
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
}: TriangleProps) {
  const triangleRef = useRef<KonvaLine>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [, _setIsDragging] = useState(false);

  // Attach transformer to shape when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && triangleRef.current) {
      transformerRef.current.nodes([triangleRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragStart = useCallback(() => {
    _setIsDragging(true);
    onDragStart?.(shape.id);
  }, [shape.id, onDragStart]);

  const handleDragMove = useCallback(() => {
    const triangle = triangleRef.current;
    if (!triangle) return;

    let newX = triangle.x();
    let newY = triangle.y();

    // Constrain to canvas boundaries
    newX = Math.max(0, Math.min(virtualWidth - (shape.width || 100), newX));
    newY = Math.max(0, Math.min(virtualHeight - (shape.height || 100), newY));

    // Update position
    triangle.position({ x: newX, y: newY });

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
    const triangle = triangleRef.current;
    if (triangle) {
      const finalX = triangle.x();
      const finalY = triangle.y();
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
    const triangle = triangleRef.current;
    if (!triangle) return;

    const newWidth = triangle.width() * triangle.scaleX();
    const newHeight = triangle.height() * triangle.scaleY();
    const newRotation = triangle.rotation();

    // Reset scale
    triangle.scaleX(1);
    triangle.scaleY(1);

    onShapeChange?.(shape.id, {
      width: Math.max(10, newWidth),
      height: Math.max(10, newHeight),
      rotation: newRotation,
      x: triangle.x(),
      y: triangle.y(),
    });
  }, [shape.id, onShapeChange]);

  const strokeColor = isSelected ? "#3b82f6" : shape.stroke || "#000000";
  const strokeWidth = isSelected ? 3 : shape.strokeWidth || 1;

  // Calculate triangle points (relative to shape position)
  const width = shape.width || 100;
  const height = shape.height || 100;

  // Triangle points: top, bottom-left, bottom-right (relative coordinates)
  const points = [
    width / 2,
    0, // Top point
    0,
    height, // Bottom-left point
    width,
    height, // Bottom-right point
    width / 2,
    0, // Close the triangle
  ];

  return (
    <>
      <Line
        ref={triangleRef}
        x={shape.x}
        y={shape.y}
        points={points}
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
        closed={true}
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

"use client";

import React, { useRef, useState, useCallback, memo, useEffect } from "react";
import { Rect, Transformer, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Rect as KonvaRect } from "konva/lib/shapes/Rect";
import { Shape } from "@/types";
import Konva from "konva";

interface FrameProps {
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

export const FrameShape = memo(function FrameShape({
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
}: FrameProps) {
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

    // Bring to front
    const rect = rectRef.current;
    if (rect) {
      rect.moveToTop();
    }
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

  // Frame-specific styling: distinct from regular rectangles
  const strokeColor = isSelected ? "#8b5cf6" : "#6366f1"; // Purple color for frames
  const strokeWidth = 2;
  const dashEnabled = true; // Dashed border to distinguish from regular rectangles

  // Calculate font size that scales inversely with zoom to maintain readability
  const labelFontSize = 12 / scale;
  const labelOffset = 4 / scale; // Small offset above the frame

  return (
    <>
      <Rect
        ref={rectRef}
        x={shape.x}
        y={shape.y}
        width={shape.width || 300}
        height={shape.height || 200}
        fill={shape.fill || "#ffffff"} // Use shape fill, default to white
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        dash={dashEnabled ? [10, 5] : undefined}
        rotation={shape.rotation || 0}
        draggable={true}
        transformsEnabled="all"
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onTransform={handleTransform}
        onTransformEnd={handleTransform}
        opacity={shape.opacity ?? 1}
      />
      {/* Frame label outside above the frame */}
      <Text
        x={shape.x}
        y={shape.y - labelOffset - labelFontSize}
        text={shape.name || "Frame"}
        fontSize={labelFontSize}
        fill="#999999"
        listening={false}
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

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
  // Drop target props
  isDraggedOver?: boolean;
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
  isDraggedOver = false,
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

  // Constrain frame to canvas boundaries during drag
  const dragBoundFunc = useCallback(
    (pos: { x: number; y: number }) => {
      const frameWidth = shape.width || 300;
      const frameHeight = shape.height || 200;
      return {
        x: Math.max(0, Math.min(virtualWidth - frameWidth, pos.x)),
        y: Math.max(0, Math.min(virtualHeight - frameHeight, pos.y)),
      };
    },
    [shape.width, shape.height, virtualWidth, virtualHeight]
  );

  const handleDragStart = useCallback(() => {
    _setIsDragging(true);
    onDragStart?.(shape.id);
  }, [shape.id, onDragStart]);

  const handleDragMove = useCallback(() => {
    const rect = rectRef.current;
    if (!rect) return;

    const newX = rect.x();
    const newY = rect.y();

    // Call onDragMove for visual updates
    onDragMove?.(shape.id, newX, newY);
  }, [shape.id, onDragMove]);

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
  const strokeColor = isDraggedOver
    ? "#10b981" // Green when drop target
    : isSelected
    ? "#8b5cf6" // Purple when selected
    : "#6366f1"; // Default purple
  const strokeWidth = isDraggedOver ? 4 : 2;
  const dashEnabled = true; // Dashed border to distinguish from regular rectangles
  const fillColor = isDraggedOver
    ? (shape.fill || "#ffffff") + "99" // Add transparency when drop target
    : shape.fill || "#ffffff";

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
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        dash={dashEnabled ? [10, 5] : undefined}
        rotation={shape.rotation || 0}
        draggable={!!onDragStart}
        dragBoundFunc={onDragStart ? dragBoundFunc : undefined}
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

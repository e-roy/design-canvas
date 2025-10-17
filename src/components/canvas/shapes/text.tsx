"use client";

import React, { useRef, useState, useCallback, memo } from "react";
import { Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Text as KonvaText } from "konva/lib/shapes/Text";
import { Shape } from "@/types";

interface TextProps {
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

export const TextShape = memo(function TextShape({
  shape,
  isSelected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onShapeChange,
  virtualWidth,
  virtualHeight,
}: TextProps) {
  const textRef = useRef<KonvaText>(null);
  const [, _setIsDragging] = useState(false);

  const handleDragStart = useCallback(() => {
    _setIsDragging(true);
    onDragStart(shape.id);

    // Bring to front
    const text = textRef.current;
    if (text) {
      text.moveToTop();
    }
  }, [shape.id, onDragStart]);

  const handleDragMove = useCallback(() => {
    const text = textRef.current;
    if (!text) return;

    let newX = text.x();
    let newY = text.y();

    // Get text dimensions for boundary calculation
    const textWidth = text.width();
    const textHeight = text.height();

    // Constrain to canvas boundaries
    newX = Math.max(0, Math.min(virtualWidth - (textWidth || 100), newX));
    newY = Math.max(0, Math.min(virtualHeight - (textHeight || 50), newY));

    // Update position
    text.position({ x: newX, y: newY });

    onDragMove(shape.id, newX, newY);
  }, [shape.id, onDragMove, virtualWidth, virtualHeight]);

  const handleDragEnd = useCallback(() => {
    _setIsDragging(false);

    // Get final position and pass it to parent
    const text = textRef.current;
    if (text) {
      const finalX = text.x();
      const finalY = text.y();
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
    const text = textRef.current;
    if (!text) return;

    const newRotation = text.rotation();

    // Reset scale
    text.scaleX(1);
    text.scaleY(1);

    onShapeChange(shape.id, {
      rotation: newRotation,
      x: text.x(),
      y: text.y(),
    });
  }, [shape.id, onShapeChange]);

  const strokeColor = isSelected ? "#3b82f6" : shape.stroke || "#000000";
  const strokeWidth = isSelected ? 3 : shape.strokeWidth || 1;

  return (
    <>
      <Text
        ref={textRef}
        x={shape.x}
        y={shape.y}
        text={shape.text || "Click to edit"}
        fontSize={shape.fontSize || 16}
        fill={shape.fill || "#000000"}
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
    </>
  );
});

"use client";

import React, { useRef, useState, useCallback } from "react";
import { Text } from "react-konva";
import Konva from "konva";
import { Shape } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TextProps {
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

export function TextShape({
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
  const textRef = useRef<Konva.Text>(null);
  const [_isDragging, _setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(shape.text || "");

  const handleDragStart = useCallback(
    (_e: Konva.KonvaEventObject<DragEvent>) => {
      _setIsDragging(true);
      onDragStart(shape.id);

      // Bring to front
      const text = textRef.current;
      if (text) {
        text.moveToTop();
      }
    },
    [shape.id, onDragStart]
  );

  const handleDragMove = useCallback(
    (_e: Konva.KonvaEventObject<DragEvent>) => {
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
    },
    [shape.id, onDragMove, virtualWidth, virtualHeight]
  );

  const handleDragEnd = useCallback(() => {
    _setIsDragging(false);
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
    (_e: Konva.KonvaEventObject<Event>) => {
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
    },
    [shape.id, onShapeChange]
  );

  const handleDblClick = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      setIsEditing(true);
      setEditText(shape.text || "");
    },
    [shape.text]
  );

  const handleSaveEdit = useCallback(() => {
    onShapeChange(shape.id, { text: editText });
    setIsEditing(false);
  }, [shape.id, editText, onShapeChange]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText(shape.text || "");
  }, [shape.text]);

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
        onDblClick={handleDblClick}
        onTransform={handleTransform}
        onTransformEnd={handleTransform}
      />

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Text</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Enter text..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import React from "react";
import { StoredShape } from "@/types";
import { Square, Circle, Type, Minus, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ObjectsListProps {
  shapes: StoredShape[];
  selectedShapeIds: string[];
  onShapeSelect: (shapeId: string) => void;
  onShapeVisibilityToggle?: (shapeId: string, visible: boolean) => void;
  className?: string;
}

export function ObjectsList({
  shapes,
  selectedShapeIds,
  onShapeSelect,
  onShapeVisibilityToggle,
  className,
}: ObjectsListProps) {
  // Track visibility state for each shape (default to visible)
  const [shapeVisibility, setShapeVisibility] = React.useState<
    Record<string, boolean>
  >({});
  const getShapeIcon = (type: string) => {
    switch (type) {
      case "rectangle":
        return <Square className="w-3 h-3" />;
      case "circle":
        return <Circle className="w-3 h-3" />;
      case "text":
        return <Type className="w-3 h-3" />;
      case "line":
        return <Minus className="w-3 h-3" />;
      default:
        return <Square className="w-3 h-3" />;
    }
  };

  const getShapeDisplayName = (shape: StoredShape, index: number) => {
    switch (shape.type) {
      case "text":
        return shape.text || `Text ${index + 1}`;
      case "rectangle":
        return `Rectangle ${index + 1}`;
      case "circle":
        return `Circle ${index + 1}`;
      case "line":
        return `Line ${index + 1}`;
      default:
        return `${
          (shape.type as string).charAt(0).toUpperCase() +
          (shape.type as string).slice(1)
        } ${index + 1}`;
    }
  };

  const handleVisibilityToggle = (shapeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newVisibility = !shapeVisibility[shapeId];
    setShapeVisibility((prev) => ({ ...prev, [shapeId]: newVisibility }));
    onShapeVisibilityToggle?.(shapeId, newVisibility);
  };

  if (shapes.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col h-full bg-white dark:bg-gray-800",
          className
        )}
      >
        <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Objects (0)
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Square className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No objects</p>
            <p className="text-xs mt-1">Create shapes to see them here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white dark:bg-gray-800",
        className
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Objects ({shapes.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {shapes
          .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
          .map((shape, index) => {
            const isSelected = selectedShapeIds.includes(shape.id);

            return (
              <div
                key={shape.id}
                className={cn(
                  "flex items-center px-3 py-2 cursor-pointer transition-colors",
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                )}
                onClick={() => onShapeSelect(shape.id)}
              >
                <div className="flex items-center gap-2 flex-1">
                  {/* Shape icon */}
                  <div className="flex-shrink-0">
                    {getShapeIcon(shape.type)}
                  </div>

                  {/* Shape name */}
                  <span className="text-sm truncate">
                    {getShapeDisplayName(shape, index)}
                  </span>
                </div>

                {/* Visibility control on the right */}
                <div
                  className="flex-shrink-0 p-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  onClick={(e) => handleVisibilityToggle(shape.id, e)}
                >
                  {shapeVisibility[shape.id] !== false ? (
                    <Eye className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

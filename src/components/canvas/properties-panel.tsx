"use client";

import React, { useState, useCallback, useRef, useEffect, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StoredShapeWithId } from "@/types";
import { Trash2, Square, Circle, Type, Minus } from "lucide-react";

interface PropertiesPanelProps {
  selectedShape: StoredShapeWithId | null;
  onShapeUpdate: (shapeId: string, updates: Partial<StoredShapeWithId>) => void;
  onShapeDelete: (shapeId: string) => void;
}

export const PropertiesPanel = memo(function PropertiesPanel({
  selectedShape,
  onShapeUpdate,
  onShapeDelete,
}: PropertiesPanelProps) {
  // Local state for input values to prevent conflicts with rapid typing
  const [localValues, setLocalValues] = useState<Partial<StoredShapeWithId>>(
    {}
  );
  const updateTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Update local values when selectedShape changes
  useEffect(() => {
    if (selectedShape) {
      setLocalValues(selectedShape);
    } else {
      setLocalValues({});
    }
  }, [selectedShape]);

  // Immediate update for text content to prevent character loss
  const immediateUpdate = useCallback(
    (property: keyof StoredShapeWithId, value: string | number) => {
      if (!selectedShape) return;

      // Update local state immediately for responsive UI
      setLocalValues((prev) => ({ ...prev, [property]: value }));

      // Update immediately for text content to prevent character loss
      onShapeUpdate(selectedShape.id, { [property]: value });
    },
    [selectedShape, onShapeUpdate]
  );

  // Debounced update function for non-text properties
  const debouncedUpdate = useCallback(
    (property: keyof StoredShapeWithId, value: string | number) => {
      if (!selectedShape) return;

      // Clear existing timeout for this property
      if (updateTimeouts.current[property]) {
        clearTimeout(updateTimeouts.current[property]);
      }

      // Update local state immediately for responsive UI
      setLocalValues((prev) => ({ ...prev, [property]: value }));

      // Debounce the actual update to prevent race conditions
      updateTimeouts.current[property] = setTimeout(() => {
        onShapeUpdate(selectedShape.id, { [property]: value });
        delete updateTimeouts.current[property];
      }, 100); // 100ms debounce for better typing responsiveness
    },
    [selectedShape, onShapeUpdate]
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    const updateTimeoutsRef = updateTimeouts.current;

    return () => {
      Object.values(updateTimeoutsRef).forEach((timeout) => {
        clearTimeout(timeout);
      });
    };
  }, []);

  if (!selectedShape) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="mb-2">
            <Square className="w-8 h-8 mx-auto opacity-50" />
          </div>
          <p className="text-sm">No object selected</p>
          <p className="text-xs mt-1">
            Select an object to view its properties
          </p>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (selectedShape) {
      onShapeDelete(selectedShape.id);
    }
  };

  const getShapeIcon = () => {
    switch (selectedShape.type) {
      case "rectangle":
        return <Square className="w-4 h-4" />;
      case "circle":
        return <Circle className="w-4 h-4" />;
      case "text":
        return <Type className="w-4 h-4" />;
      case "line":
        return <Minus className="w-4 h-4" />;
      default:
        return <Square className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            {getShapeIcon()}
            <span className="capitalize">{selectedShape.type}</span>
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4">
          {/* Position */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Position
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="x" className="text-xs">
                  X
                </Label>
                <Input
                  id="x"
                  type="number"
                  value={Math.round(localValues.x || 0)}
                  onChange={(e) =>
                    debouncedUpdate("x", parseFloat(e.target.value) || 0)
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="y" className="text-xs">
                  Y
                </Label>
                <Input
                  id="y"
                  type="number"
                  value={Math.round(localValues.y || 0)}
                  onChange={(e) =>
                    debouncedUpdate("y", parseFloat(e.target.value) || 0)
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Size - Rectangle */}
          {selectedShape.type === "rectangle" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Size
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="width" className="text-xs">
                    Width
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    value={Math.round(localValues.width || 0)}
                    onChange={(e) =>
                      debouncedUpdate("width", parseFloat(e.target.value) || 0)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="text-xs">
                    Height
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    value={Math.round(localValues.height || 0)}
                    onChange={(e) =>
                      debouncedUpdate("height", parseFloat(e.target.value) || 0)
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Radius - Circle */}
          {selectedShape.type === "circle" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Radius
              </Label>
              <Input
                type="number"
                value={Math.round(localValues.radius || 0)}
                onChange={(e) =>
                  debouncedUpdate("radius", parseFloat(e.target.value) || 0)
                }
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Line Points - Line */}
          {selectedShape.type === "line" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Line Points
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="startX" className="text-xs">
                    Start X
                  </Label>
                  <Input
                    id="startX"
                    type="number"
                    value={Math.round(localValues.startX || 0)}
                    onChange={(e) =>
                      debouncedUpdate("startX", parseFloat(e.target.value) || 0)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="startY" className="text-xs">
                    Start Y
                  </Label>
                  <Input
                    id="startY"
                    type="number"
                    value={Math.round(localValues.startY || 0)}
                    onChange={(e) =>
                      debouncedUpdate("startY", parseFloat(e.target.value) || 0)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="endX" className="text-xs">
                    End X
                  </Label>
                  <Input
                    id="endX"
                    type="number"
                    value={Math.round(localValues.endX || 0)}
                    onChange={(e) =>
                      debouncedUpdate("endX", parseFloat(e.target.value) || 0)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="endY" className="text-xs">
                    End Y
                  </Label>
                  <Input
                    id="endY"
                    type="number"
                    value={Math.round(localValues.endY || 0)}
                    onChange={(e) =>
                      debouncedUpdate("endY", parseFloat(e.target.value) || 0)
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Text - Text Shape */}
          {selectedShape.type === "text" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Text Content
              </Label>
              <Input
                value={localValues.text || ""}
                onChange={(e) => immediateUpdate("text", e.target.value)}
                className="h-8 text-xs"
                placeholder="Enter text..."
              />
              <div>
                <Label htmlFor="fontSize" className="text-xs">
                  Font Size
                </Label>
                <Input
                  id="fontSize"
                  type="number"
                  value={localValues.fontSize || 16}
                  onChange={(e) =>
                    debouncedUpdate(
                      "fontSize",
                      parseFloat(e.target.value) || 16
                    )
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Appearance */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Appearance
            </Label>
            <div className="space-y-2">
              <div>
                <Label htmlFor="fill" className="text-xs">
                  Fill Color
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="fill"
                    type="color"
                    value={localValues.fill || "#ffffff"}
                    onChange={(e) => debouncedUpdate("fill", e.target.value)}
                    className="h-8 w-12 p-0 border-0"
                  />
                  <Input
                    value={localValues.fill || "#ffffff"}
                    onChange={(e) => debouncedUpdate("fill", e.target.value)}
                    className="h-8 text-xs flex-1"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="stroke" className="text-xs">
                  Stroke Color
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="stroke"
                    type="color"
                    value={localValues.stroke || "#000000"}
                    onChange={(e) => debouncedUpdate("stroke", e.target.value)}
                    className="h-8 w-12 p-0 border-0"
                  />
                  <Input
                    value={localValues.stroke || "#000000"}
                    onChange={(e) => debouncedUpdate("stroke", e.target.value)}
                    className="h-8 text-xs flex-1"
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="strokeWidth" className="text-xs">
                  Stroke Width
                </Label>
                <Input
                  id="strokeWidth"
                  type="number"
                  value={localValues.strokeWidth || 1}
                  onChange={(e) =>
                    debouncedUpdate(
                      "strokeWidth",
                      parseFloat(e.target.value) || 1
                    )
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Rotation */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Transform
            </Label>
            <div>
              <Label htmlFor="rotation" className="text-xs">
                Rotation (°)
              </Label>
              <Input
                id="rotation"
                type="number"
                value={localValues.rotation || 0}
                onChange={(e) =>
                  debouncedUpdate("rotation", parseFloat(e.target.value) || 0)
                }
                className="h-8 text-xs"
              />
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Actions
            </Label>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="w-full h-8 text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete Object
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

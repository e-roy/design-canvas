"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StoredShape } from "@/types";
import { Trash2, Square, Circle, Type } from "lucide-react";

interface PropertiesPanelProps {
  selectedShape: StoredShape | null;
  onShapeUpdate: (shapeId: string, updates: Partial<StoredShape>) => void;
  onShapeDelete: (shapeId: string) => void;
}

export function PropertiesPanel({
  selectedShape,
  onShapeUpdate,
  onShapeDelete,
}: PropertiesPanelProps) {
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

  const handlePropertyChange = (
    property: keyof StoredShape,
    value: string | number
  ) => {
    if (selectedShape) {
      onShapeUpdate(selectedShape.id, { [property]: value });
    }
  };

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
                  value={Math.round(selectedShape.x)}
                  onChange={(e) =>
                    handlePropertyChange("x", parseFloat(e.target.value) || 0)
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
                  value={Math.round(selectedShape.y)}
                  onChange={(e) =>
                    handlePropertyChange("y", parseFloat(e.target.value) || 0)
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
                    value={Math.round(selectedShape.width || 0)}
                    onChange={(e) =>
                      handlePropertyChange(
                        "width",
                        parseFloat(e.target.value) || 0
                      )
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
                    value={Math.round(selectedShape.height || 0)}
                    onChange={(e) =>
                      handlePropertyChange(
                        "height",
                        parseFloat(e.target.value) || 0
                      )
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
                value={Math.round(selectedShape.radius || 0)}
                onChange={(e) =>
                  handlePropertyChange(
                    "radius",
                    parseFloat(e.target.value) || 0
                  )
                }
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Text - Text Shape */}
          {selectedShape.type === "text" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Text Content
              </Label>
              <Input
                value={selectedShape.text || ""}
                onChange={(e) => handlePropertyChange("text", e.target.value)}
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
                  value={selectedShape.fontSize || 16}
                  onChange={(e) =>
                    handlePropertyChange(
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
                    value={selectedShape.fill || "#ffffff"}
                    onChange={(e) =>
                      handlePropertyChange("fill", e.target.value)
                    }
                    className="h-8 w-12 p-0 border-0"
                  />
                  <Input
                    value={selectedShape.fill || "#ffffff"}
                    onChange={(e) =>
                      handlePropertyChange("fill", e.target.value)
                    }
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
                    value={selectedShape.stroke || "#000000"}
                    onChange={(e) =>
                      handlePropertyChange("stroke", e.target.value)
                    }
                    className="h-8 w-12 p-0 border-0"
                  />
                  <Input
                    value={selectedShape.stroke || "#000000"}
                    onChange={(e) =>
                      handlePropertyChange("stroke", e.target.value)
                    }
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
                  value={selectedShape.strokeWidth || 1}
                  onChange={(e) =>
                    handlePropertyChange(
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
                value={selectedShape.rotation || 0}
                onChange={(e) =>
                  handlePropertyChange(
                    "rotation",
                    parseFloat(e.target.value) || 0
                  )
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
}

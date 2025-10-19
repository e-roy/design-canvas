"use client";

import React, { useState, useCallback, useRef, useEffect, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { NodeDoc } from "@/types/page";
import {
  Trash2,
  Square,
  Circle,
  Type,
  Minus,
  User,
  Move,
  Ruler,
  Palette,
  RotateCcw,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Grid3X3,
  Plus,
  Minus as MinusIcon,
  Settings,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCursorStore } from "@/store/cursor-store";
import { useUserStore } from "@/store/user-store";

interface PropertiesPanelProps {
  selectedShape: NodeDoc | null;
  onShapeUpdate: (shapeId: string, updates: Partial<NodeDoc>) => void;
  onShapeDelete: (shapeId: string) => void;
}

export const PropertiesPanel = memo(function PropertiesPanel({
  selectedShape,
  onShapeUpdate,
  onShapeDelete,
}: PropertiesPanelProps) {
  // Local state for input values to prevent conflicts with rapid typing
  const [localValues, setLocalValues] = useState<Partial<NodeDoc>>({});
  const updateTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Get cursor store to look up user display names
  const { cursors } = useCursorStore();
  const { user: currentUser } = useUserStore();

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
    (property: keyof NodeDoc, value: string | number) => {
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
    (property: keyof NodeDoc, value: string | number) => {
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

  // Format the last updated time - MUST be before any conditional returns (Rules of Hooks)
  const getLastEditedText = useCallback(() => {
    if (!selectedShape?.updatedAt) return null;

    try {
      const timestamp = selectedShape.updatedAt;
      // Handle Firestore Timestamp
      const date = timestamp?.toDate
        ? timestamp.toDate()
        : new Date(timestamp as unknown as string);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return null;
    }
  }, [selectedShape?.updatedAt]);

  // Get user display name or email from updatedBy UID - MUST be before any conditional returns (Rules of Hooks)
  const getEditorDisplay = useCallback(() => {
    if (!selectedShape?.updatedBy) return "Unknown";

    const uid = selectedShape.updatedBy;

    // Check if this is the current user
    if (currentUser && uid === currentUser.uid) {
      return "You";
    }

    // Look up the user in cursor data (which has display names)
    const cursor = cursors[uid];
    if (cursor?.displayName) {
      return cursor.displayName;
    }

    // Fallback to shortened UID if user not found in cursors
    // This can happen if the user is offline or hasn't joined yet
    return uid.substring(0, 8) + "...";
  }, [selectedShape?.updatedBy, cursors, currentUser]);

  if (!selectedShape) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-white">
        <div className="text-center text-gray-500">
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
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          {getShapeIcon()}
          <h2 className="text-sm font-semibold text-gray-900 capitalize">
            {selectedShape.type}
          </h2>
        </div>

        {/* Last Edited Info */}
        {selectedShape.updatedBy && getLastEditedText() && (
          <div className="mb-4">
            <Badge
              variant="secondary"
              className="text-xs font-normal bg-gray-100 text-gray-600"
            >
              <User className="w-3 h-3 mr-1" />
              Edited by {getEditorDisplay()} {getLastEditedText()}
            </Badge>
          </div>
        )}

        <div className="space-y-6">
          {/* Position */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Move className="w-3 h-3 text-gray-500" />
              <Label className="text-xs font-medium text-gray-600">
                Position
              </Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Label htmlFor="x" className="text-xs text-gray-500 mb-1 block">
                  X
                </Label>
                <Input
                  id="x"
                  type="number"
                  value={Math.round(localValues.x || 0)}
                  onChange={(e) =>
                    debouncedUpdate("x", parseFloat(e.target.value) || 0)
                  }
                  className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>
              <div className="relative">
                <Label htmlFor="y" className="text-xs text-gray-500 mb-1 block">
                  Y
                </Label>
                <Input
                  id="y"
                  type="number"
                  value={Math.round(localValues.y || 0)}
                  onChange={(e) =>
                    debouncedUpdate("y", parseFloat(e.target.value) || 0)
                  }
                  className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>
            </div>
            <div className="relative">
              <Label
                htmlFor="rotation"
                className="text-xs text-gray-500 mb-1 block"
              >
                Rotation (°)
              </Label>
              <Input
                id="rotation"
                type="number"
                value={localValues.rotation || 0}
                onChange={(e) =>
                  debouncedUpdate("rotation", parseFloat(e.target.value) || 0)
                }
                className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                placeholder="0"
              />
            </div>
          </div>

          <Separator />

          {/* Layout */}
          {selectedShape.type === "rectangle" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-3 h-3 text-gray-500" />
                <Label className="text-xs font-medium text-gray-600">
                  Layout
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Label
                    htmlFor="width"
                    className="text-xs text-gray-500 mb-1 block"
                  >
                    W
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    value={Math.round(localValues.width || 0)}
                    onChange={(e) =>
                      debouncedUpdate("width", parseFloat(e.target.value) || 0)
                    }
                    className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
                <div className="relative">
                  <Label
                    htmlFor="height"
                    className="text-xs text-gray-500 mb-1 block"
                  >
                    H
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    value={Math.round(localValues.height || 0)}
                    onChange={(e) =>
                      debouncedUpdate("height", parseFloat(e.target.value) || 0)
                    }
                    className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Layout - Circle */}
          {selectedShape.type === "circle" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-3 h-3 text-gray-500" />
                <Label className="text-xs font-medium text-gray-600">
                  Layout
                </Label>
              </div>
              <div className="relative">
                <Label
                  htmlFor="radius"
                  className="text-xs text-gray-500 mb-1 block"
                >
                  Radius
                </Label>
                <Input
                  id="radius"
                  type="number"
                  value={Math.round(localValues.radius || 0)}
                  onChange={(e) =>
                    debouncedUpdate("radius", parseFloat(e.target.value) || 0)
                  }
                  className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Layout - Line */}
          {selectedShape.type === "line" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-3 h-3 text-gray-500" />
                <Label className="text-xs font-medium text-gray-600">
                  Layout
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Label
                    htmlFor="startX"
                    className="text-xs text-gray-500 mb-1 block"
                  >
                    Start X
                  </Label>
                  <Input
                    id="startX"
                    type="number"
                    value={Math.round(localValues.startX || 0)}
                    onChange={(e) =>
                      debouncedUpdate("startX", parseFloat(e.target.value) || 0)
                    }
                    className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
                <div className="relative">
                  <Label
                    htmlFor="startY"
                    className="text-xs text-gray-500 mb-1 block"
                  >
                    Start Y
                  </Label>
                  <Input
                    id="startY"
                    type="number"
                    value={Math.round(localValues.startY || 0)}
                    onChange={(e) =>
                      debouncedUpdate("startY", parseFloat(e.target.value) || 0)
                    }
                    className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
                <div className="relative">
                  <Label
                    htmlFor="endX"
                    className="text-xs text-gray-500 mb-1 block"
                  >
                    End X
                  </Label>
                  <Input
                    id="endX"
                    type="number"
                    value={Math.round(localValues.endX || 0)}
                    onChange={(e) =>
                      debouncedUpdate("endX", parseFloat(e.target.value) || 0)
                    }
                    className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
                <div className="relative">
                  <Label
                    htmlFor="endY"
                    className="text-xs text-gray-500 mb-1 block"
                  >
                    End Y
                  </Label>
                  <Input
                    id="endY"
                    type="number"
                    value={Math.round(localValues.endY || 0)}
                    onChange={(e) =>
                      debouncedUpdate("endY", parseFloat(e.target.value) || 0)
                    }
                    className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Layout - Text */}
          {selectedShape.type === "text" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-3 h-3 text-gray-500" />
                <Label className="text-xs font-medium text-gray-600">
                  Layout
                </Label>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Label
                    htmlFor="text"
                    className="text-xs text-gray-500 mb-1 block"
                  >
                    Text Content
                  </Label>
                  <Input
                    id="text"
                    value={localValues.text || ""}
                    onChange={(e) => immediateUpdate("text", e.target.value)}
                    className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                    placeholder="Enter text..."
                  />
                </div>
                <div className="relative">
                  <Label
                    htmlFor="fontSize"
                    className="text-xs text-gray-500 mb-1 block"
                  >
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
                    className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Fill */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-3 h-3 text-gray-500" />
              <Label className="text-xs font-medium text-gray-600">Fill</Label>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div
                  className="h-7 w-12 rounded-md border border-gray-200 cursor-pointer overflow-hidden"
                  style={{ backgroundColor: localValues.fill || "#ffffff" }}
                  onClick={() => {
                    const colorInput = document.getElementById(
                      "fill-color"
                    ) as HTMLInputElement;
                    colorInput?.click();
                  }}
                >
                  <input
                    id="fill-color"
                    type="color"
                    value={localValues.fill || "#ffffff"}
                    onChange={(e) => debouncedUpdate("fill", e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              <Input
                value={localValues.fill || "#ffffff"}
                onChange={(e) => debouncedUpdate("fill", e.target.value)}
                className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white flex-1 font-mono"
                placeholder="#ffffff"
              />
            </div>
          </div>

          <Separator />

          {/* Stroke */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-3 h-3 text-gray-500" />
              <Label className="text-xs font-medium text-gray-600">
                Stroke
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div
                  className="h-7 w-12 rounded-md border border-gray-200 cursor-pointer overflow-hidden"
                  style={{ backgroundColor: localValues.stroke || "#000000" }}
                  onClick={() => {
                    const colorInput = document.getElementById(
                      "stroke-color"
                    ) as HTMLInputElement;
                    colorInput?.click();
                  }}
                >
                  <input
                    id="stroke-color"
                    type="color"
                    value={localValues.stroke || "#000000"}
                    onChange={(e) => debouncedUpdate("stroke", e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              <Input
                value={localValues.stroke || "#000000"}
                onChange={(e) => debouncedUpdate("stroke", e.target.value)}
                className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white flex-1 font-mono"
                placeholder="#000000"
              />
            </div>
            <div className="relative">
              <Label
                htmlFor="strokeWidth"
                className="text-xs text-gray-500 mb-1 block"
              >
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
                className="h-7 text-xs bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="w-3 h-3 text-gray-500" />
              <Label className="text-xs font-medium text-gray-600">
                Actions
              </Label>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="w-full h-7 text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete Object
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

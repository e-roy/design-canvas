"use client";

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MousePointer,
  Hand,
  Square,
  Circle,
  Type,
  ChevronDown,
  Minus,
} from "lucide-react";

interface ToolbarProps {
  currentTool: "select" | "pan" | "rectangle" | "circle" | "text" | "line";
  onToolChange: (
    tool: "select" | "pan" | "rectangle" | "circle" | "text" | "line"
  ) => void;
}

export const Toolbar = memo(function Toolbar({
  currentTool,
  onToolChange,
}: ToolbarProps) {
  const getSelectPanIcon = () => {
    // Show the current tool icon, default to select if neither is active
    if (currentTool === "pan") {
      return <Hand className="w-4 h-4" />;
    }
    return <MousePointer className="w-4 h-4" />;
  };

  const getShapeIcon = () => {
    // Show the current tool icon, default to rectangle if none are active
    if (currentTool === "circle") {
      return <Circle className="w-4 h-4" />;
    }
    if (currentTool === "line") {
      return <Minus className="w-4 h-4" />;
    }
    return <Square className="w-4 h-4" />;
  };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
      <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
        <div className="flex items-center gap-2">
          {/* Select/Pan Tool Group */}
          <div className="flex items-center">
            <Button
              variant={
                currentTool === "select" || currentTool === "pan"
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => onToolChange("select")}
              className="w-10 h-10 p-0 rounded-r-none"
            >
              {getSelectPanIcon()}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={
                    currentTool === "select" || currentTool === "pan"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="w-6 h-10 p-0 rounded-l-none"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem
                  onClick={() => onToolChange("select")}
                  className={currentTool === "select" ? "bg-accent" : ""}
                >
                  <MousePointer className="w-4 h-4 mr-2" />
                  Select
                </DropdownMenuItem>
                {/* <DropdownMenuItem
                  onClick={() => onToolChange("pan")}
                  className={currentTool === "pan" ? "bg-accent" : ""}
                >
                  <Hand className="w-4 h-4 mr-2" />
                  Pan
                </DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Rectangle/Circle Tool Group */}
          <div className="flex items-center">
            <Button
              variant={
                currentTool === "rectangle" ||
                currentTool === "circle" ||
                currentTool === "line"
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => onToolChange("rectangle")}
              className="w-10 h-10 p-0 rounded-r-none"
            >
              {getShapeIcon()}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={
                    currentTool === "rectangle" ||
                    currentTool === "circle" ||
                    currentTool === "line"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="w-6 h-10 p-0 rounded-l-none"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem
                  onClick={() => onToolChange("rectangle")}
                  className={currentTool === "rectangle" ? "bg-accent" : ""}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Rectangle
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onToolChange("circle")}
                  className={currentTool === "circle" ? "bg-accent" : ""}
                >
                  <Circle className="w-4 h-4 mr-2" />
                  Circle
                </DropdownMenuItem>
                {/* <DropdownMenuItem
                  onClick={() => onToolChange("line")}
                  className={currentTool === "line" ? "bg-accent" : ""}
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Line
                </DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Text Tool */}
          <Button
            variant={currentTool === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => onToolChange("text")}
            className="w-10 h-10 p-0"
          >
            <Type className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

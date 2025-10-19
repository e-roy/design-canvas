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
  Triangle,
  Frame,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  currentTool:
    | "select"
    | "pan"
    | "rectangle"
    | "circle"
    | "text"
    | "line"
    | "triangle"
    | "frame"
    | "ai-chat";
  onToolChange: (
    tool:
      | "select"
      | "pan"
      | "rectangle"
      | "circle"
      | "text"
      | "line"
      | "triangle"
      | "frame"
      | "ai-chat"
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
    if (currentTool === "triangle") {
      return <Triangle className="w-4 h-4" />;
    }
    return <Square className="w-4 h-4" />;
  };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
      <div className="glass-3 rounded-xl shadow-xl p-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Select/Pan Tool Group */}
          <div className="flex items-center">
            <Button
              variant={
                currentTool === "select" || currentTool === "pan"
                  ? "default"
                  : "ghost"
              }
              size="sm"
              onClick={() => onToolChange("select")}
              className={cn(
                "w-11 h-11 p-0 rounded-r-none transition-all duration-200",
                currentTool === "select" || currentTool === "pan"
                  ? "hover:bg-primary/80 hover:text-primary-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              {getSelectPanIcon()}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={
                    currentTool === "select" || currentTool === "pan"
                      ? "default"
                      : "ghost"
                  }
                  size="sm"
                  className={cn(
                    "w-7 h-11 p-0 rounded-l-none transition-all duration-200",
                    currentTool === "select" || currentTool === "pan"
                      ? "hover:bg-primary/80 hover:text-primary-foreground"
                      : "hover:bg-accent/50"
                  )}
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
                <DropdownMenuItem
                  onClick={() => onToolChange("pan")}
                  className={currentTool === "pan" ? "bg-accent" : ""}
                >
                  <Hand className="w-4 h-4 mr-2" />
                  Pan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Frame Tool */}
          <Button
            variant={currentTool === "frame" ? "default" : "ghost"}
            size="sm"
            onClick={() => onToolChange("frame")}
            className={cn(
              "w-11 h-11 p-0 transition-all duration-200",
              currentTool === "frame"
                ? "hover:bg-primary/80 hover:text-primary-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Frame className="w-4 h-4" />
          </Button>

          {/* Rectangle/Circle Tool Group */}
          <div className="flex items-center">
            <Button
              variant={
                currentTool === "rectangle" ||
                currentTool === "circle" ||
                currentTool === "triangle" ||
                currentTool === "line"
                  ? "default"
                  : "ghost"
              }
              size="sm"
              onClick={() => onToolChange("rectangle")}
              className={cn(
                "w-11 h-11 p-0 rounded-r-none transition-all duration-200",
                currentTool === "rectangle" ||
                  currentTool === "circle" ||
                  currentTool === "triangle" ||
                  currentTool === "line"
                  ? "hover:bg-primary/80 hover:text-primary-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              {getShapeIcon()}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={
                    currentTool === "rectangle" ||
                    currentTool === "circle" ||
                    currentTool === "triangle" ||
                    currentTool === "line"
                      ? "default"
                      : "ghost"
                  }
                  size="sm"
                  className={cn(
                    "w-7 h-11 p-0 rounded-l-none transition-all duration-200",
                    currentTool === "rectangle" ||
                      currentTool === "circle" ||
                      currentTool === "triangle" ||
                      currentTool === "line"
                      ? "hover:bg-primary/80 hover:text-primary-foreground"
                      : "hover:bg-accent/50"
                  )}
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
                <DropdownMenuItem
                  onClick={() => onToolChange("line")}
                  className={currentTool === "line" ? "bg-accent" : ""}
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Line
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onToolChange("triangle")}
                  className={currentTool === "triangle" ? "bg-accent" : ""}
                >
                  <Triangle className="w-4 h-4 mr-2" />
                  Triangle
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Text Tool */}
          <Button
            variant={currentTool === "text" ? "default" : "ghost"}
            size="sm"
            onClick={() => onToolChange("text")}
            className={cn(
              "w-11 h-11 p-0 transition-all duration-200",
              currentTool === "text"
                ? "hover:bg-primary/80 hover:text-primary-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <Type className="w-4 h-4" />
          </Button>

          {/* AI Chat Tool */}
          <Button
            variant={currentTool === "ai-chat" ? "default" : "ghost"}
            size="sm"
            onClick={() => onToolChange("ai-chat")}
            className={cn(
              "w-11 h-11 p-0 transition-all duration-200",
              currentTool === "ai-chat"
                ? "hover:bg-primary/80 hover:text-primary-foreground"
                : "hover:bg-accent/50"
            )}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

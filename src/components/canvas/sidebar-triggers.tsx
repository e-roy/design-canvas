"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { PanelLeftIcon, PanelRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarTriggerProps {
  side: "left" | "right";
  onToggle: () => void;
  isOpen: boolean;
  className?: string;
}

export const CustomSidebarTrigger = memo(function CustomSidebarTrigger({
  side,
  onToggle,
  isOpen,
  className,
}: SidebarTriggerProps) {
  const Icon = side === "left" ? PanelLeftIcon : PanelRightIcon;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "size-10 transition-all duration-200 ease-linear z-50 glass-3 rounded-xl shadow-lg backdrop-blur-sm hover:glass-4",
        side === "left"
          ? cn(
              "fixed top-4 transition-all duration-200 ease-linear",
              // When sidebar is open, button should be just outside the sidebar (16rem + 0.5rem for spacing)
              // When sidebar is closed, button should be at the edge of the screen
              isOpen ? "left-[16.5rem]" : "left-4"
            )
          : cn(
              "fixed top-4 transition-all duration-200 ease-linear",
              // When sidebar is open, button should be just outside the sidebar (16rem + 0.5rem for spacing)
              // When sidebar is closed, button should be at the edge of the screen
              isOpen ? "right-[16.5rem]" : "right-4"
            ),
        className
      )}
      onClick={onToggle}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">Toggle {side} Sidebar</span>
    </Button>
  );
});

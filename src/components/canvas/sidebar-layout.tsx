"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageDoc, NodeDoc } from "@/types/page";
import { PageContextMenu } from "./page-context-menu";
import { useNodeTree } from "@/hooks/useNodeTree";
import { LayerTree } from "./layer-tree";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";

import type { DropPosition } from "@/hooks/useLayerDragDrop";

// Custom AccordionTrigger with chevron on the left
function CustomAccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-center gap-2 rounded-md py-2 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-0",
          className
        )}
        {...props}
      >
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 transition-transform duration-200 -rotate-90" />
        {children}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

interface SidebarLayoutProps {
  // Pages section
  pages: PageDoc[];
  currentPageId: string | null;
  onPageSelect: (pageId: string) => void;
  onCreatePage: () => void;
  onRenamePage: (pageId: string, name: string) => void;
  onDuplicatePage?: (pageId: string) => void; // Added for context menu
  onDeletePage?: (pageId: string) => void; // Added for context menu

  // Layers section
  nodes: NodeDoc[];
  selectedShapeIds: string[];
  onShapeSelect: (shapeId: string) => void;
  onShapeVisibilityToggle?: (shapeId: string, visible: boolean) => void;
  onRenameNode?: (nodeId: string, name: string) => void; // Added for layer editing
  onNodeReorder?: (
    draggedNodeId: string,
    targetNodeId: string,
    position: DropPosition
  ) => void; // For drag-and-drop
}

export function SidebarLayout({
  pages,
  currentPageId,
  onPageSelect,
  onCreatePage,
  onRenamePage,
  onDuplicatePage, // Added for context menu
  onDeletePage, // Added for context menu
  nodes,
  selectedShapeIds,
  onShapeSelect,
  onShapeVisibilityToggle,
  onRenameNode, // Added for layer editing
  onNodeReorder, // For drag-and-drop
}: SidebarLayoutProps) {
  // Build hierarchical tree from flat nodes list
  const nodeTree = useNodeTree(nodes, null);

  // State for page editing
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // State for context menu
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    pageId: string | null;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    pageId: null,
    position: { x: 0, y: 0 },
  });

  const handleStartEdit = (pageId: string, currentName: string) => {
    setEditingPageId(pageId);
    setEditingName(currentName);
  };

  const handleRenamePage = (pageId: string) => {
    if (editingName.trim()) {
      onRenamePage(pageId, editingName.trim());
    }
    setEditingPageId(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingPageId(null);
    setEditingName("");
  };

  // Context menu handlers
  const handleContextMenu = (event: React.MouseEvent, pageId: string) => {
    event.preventDefault();
    event.stopPropagation();

    setContextMenu({
      isOpen: true,
      pageId,
      position: { x: event.clientX, y: event.clientY },
    });
  };

  const closeContextMenu = () => {
    setContextMenu({
      isOpen: false,
      pageId: null,
      position: { x: 0, y: 0 },
    });
  };

  // const handleContextMenuAction = (action: () => void) => {
  //   action();
  //   closeContextMenu();
  // };

  return (
    <div className="flex flex-col h-full bg-white">
      <Accordion
        type="multiple"
        defaultValue={["pages", "layers"]}
        className="flex-1 flex flex-col"
      >
        {/* Pages Section */}
        <AccordionItem value="pages" className="border-b border-gray-200">
          <div className="flex items-center justify-between px-3 py-2">
            <CustomAccordionTrigger className="hover:no-underline flex-1">
              <h3 className="text-sm font-medium text-gray-700">Pages</h3>
            </CustomAccordionTrigger>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreatePage}
              className="h-6 w-6 p-0 hover:bg-gray-100 ml-2"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <AccordionContent className="px-0 pb-0">
            <div className="max-h-48 overflow-y-auto px-3 pb-2">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className={cn(
                    "px-2 py-1 text-sm rounded hover:bg-blue-200",
                    currentPageId === page.id && "bg-blue-100"
                  )}
                  onContextMenu={(e) => handleContextMenu(e, page.id)}
                >
                  {editingPageId === page.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRenamePage(page.id);
                          } else if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                        onBlur={() => handleRenamePage(page.id)}
                        className="h-6 text-xs px-1 py-0"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer"
                      onClick={() => onPageSelect(page.id)}
                      onDoubleClick={() => handleStartEdit(page.id, page.name)}
                    >
                      {page.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Layers Section */}
        <AccordionItem value="layers" className="flex-1 flex flex-col">
          <div className="px-3 py-2">
            <CustomAccordionTrigger className="hover:no-underline">
              <h3 className="text-sm font-medium text-gray-700">Layers</h3>
            </CustomAccordionTrigger>
          </div>
          <AccordionContent className="flex-1 flex flex-col px-0 pb-0">
            <div className="flex-1 overflow-y-auto px-3 pb-2">
              <LayerTree
                nodes={nodeTree}
                selectedShapeIds={selectedShapeIds}
                onShapeSelect={onShapeSelect}
                onShapeVisibilityToggle={onShapeVisibilityToggle}
                onRenameNode={onRenameNode}
                onNodeDrop={onNodeReorder}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Context Menu */}
      <PageContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onRename={() => {
          if (contextMenu.pageId) {
            const page = pages.find((p) => p.id === contextMenu.pageId);
            if (page) {
              handleStartEdit(page.id, page.name);
            }
          }
        }}
        onDuplicate={() => {
          if (contextMenu.pageId && onDuplicatePage) {
            onDuplicatePage(contextMenu.pageId);
          }
        }}
        onDelete={() => {
          if (contextMenu.pageId && onDeletePage) {
            onDeletePage(contextMenu.pageId);
          }
        }}
      />
    </div>
  );
}

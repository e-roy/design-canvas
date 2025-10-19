"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Eye,
  EyeOff,
  Square,
  Circle,
  Type,
  Minus,
  Triangle,
  Frame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageDoc } from "@/types/page";
import { NodeDoc } from "@/types/page";
import { PageContextMenu } from "./page-context-menu";

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
}: SidebarLayoutProps) {
  // State for page editing
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // State for layer editing
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeName, setEditingNodeName] = useState("");

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

  // Layer editing handlers
  const handleStartNodeEdit = (nodeId: string, currentName: string) => {
    setEditingNodeId(nodeId);
    setEditingNodeName(currentName);
  };

  const handleRenameNode = (nodeId: string) => {
    if (editingNodeName.trim() && onRenameNode) {
      onRenameNode(nodeId, editingNodeName.trim());
    }
    setEditingNodeId(null);
    setEditingNodeName("");
  };

  const handleCancelNodeEdit = () => {
    setEditingNodeId(null);
    setEditingNodeName("");
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

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "rectangle":
        return <Square className="w-3 h-3" />;
      case "circle":
        return <Circle className="w-3 h-3" />;
      case "text":
        return <Type className="w-3 h-3" />;
      case "line":
        return <Minus className="w-3 h-3" />;
      case "triangle":
        return <Triangle className="w-3 h-3" />;
      case "frame":
        return <Frame className="w-3 h-3" />;
      case "group":
        return <Square className="w-3 h-3" />;
      default:
        return <Square className="w-3 h-3" />;
    }
  };

  const getNodeDisplayName = (node: NodeDoc, index: number) => {
    // If the node has a custom name, use it
    if (node.name) {
      return node.name;
    }

    // Otherwise, use default names based on type
    switch (node.type) {
      case "text":
        return node.text || `Text ${index + 1}`;
      case "rectangle":
        return `Rectangle ${index + 1}`;
      case "circle":
        return `Circle ${index + 1}`;
      case "line":
        return `Line ${index + 1}`;
      case "triangle":
        return `Triangle ${index + 1}`;
      case "frame":
        return `Frame ${index + 1}`;
      case "group":
        return `Group ${index + 1}`;
      default:
        return `${
          (node.type as string).charAt(0).toUpperCase() +
          (node.type as string).slice(1)
        } ${index + 1}`;
    }
  };

  const handleVisibilityToggle = (nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      onShapeVisibilityToggle?.(nodeId, !node.isVisible);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Pages Section */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="text-sm font-medium text-gray-700">Pages</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreatePage}
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        <div className="px-3 pb-2">
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
      </div>

      {/* Layers Section */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Layers</h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          {nodes.length === 0 ? (
            <div className="flex items-center justify-center p-4">
              <div className="text-center text-gray-500">
                <div className="w-8 h-8 mx-auto mb-2 bg-gray-200 rounded-sm" />
                <p className="text-sm">No layers</p>
                <p className="text-xs mt-1">Create shapes to see them here</p>
              </div>
            </div>
          ) : (
            <div className="p-2">
              {nodes
                .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                .map((node, index) => {
                  const isSelected = selectedShapeIds.includes(node.id);

                  return (
                    <div
                      key={node.id}
                      className={cn(
                        "flex items-center px-2 py-1 cursor-pointer transition-colors rounded",
                        isSelected ? "bg-blue-100" : "hover:bg-gray-50"
                      )}
                      onClick={() => onShapeSelect(node.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleStartNodeEdit(
                          node.id,
                          getNodeDisplayName(node, index)
                        );
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Node icon */}
                        <div className="flex-shrink-0">
                          {getNodeIcon(node.type)}
                        </div>

                        {/* Node name */}
                        {editingNodeId === node.id ? (
                          <Input
                            value={editingNodeName}
                            onChange={(e) => setEditingNodeName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleRenameNode(node.id);
                              } else if (e.key === "Escape") {
                                handleCancelNodeEdit();
                              }
                            }}
                            onBlur={() => handleRenameNode(node.id)}
                            className="h-6 text-xs px-1 py-0 flex-1"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm truncate min-w-0">
                            {getNodeDisplayName(node, index)}
                          </span>
                        )}
                      </div>

                      {/* Visibility control */}
                      <div
                        className="flex-shrink-0 p-1 cursor-pointer hover:bg-gray-200 rounded transition-colors"
                        onClick={(e) => handleVisibilityToggle(node.id, e)}
                      >
                        {node.isVisible !== false ? (
                          <Eye className="w-3 h-3 text-gray-500" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-gray-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

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

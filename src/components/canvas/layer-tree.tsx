/**
 * Hierarchical layer tree component for sidebar
 * Displays nodes in a tree structure with parent-child relationships
 */

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Eye,
  EyeOff,
  Square,
  Circle,
  Type,
  Minus,
  Triangle,
  Frame,
  ChevronRight,
  ChevronDown,
  Folder,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NodeTree } from "@/hooks/useNodeTree";
import { useLayerDragDrop, type DropPosition } from "@/hooks/useLayerDragDrop";

interface LayerTreeNodeProps {
  node: NodeTree;
  level: number;
  selectedShapeIds: string[];
  editingNodeId: string | null;
  editingNodeName: string;
  onSelect: (nodeId: string) => void;
  onStartEdit: (nodeId: string, name: string) => void;
  onRename: (nodeId: string) => void;
  onCancelEdit: () => void;
  onVisibilityToggle: (nodeId: string, e: React.MouseEvent) => void;
  setEditingNodeName: (name: string) => void;
  // Drag and drop
  draggedNodeId: string | null;
  dragOverNodeId: string | null;
  dropPosition: DropPosition | null;
  onDragStart: (nodeId: string) => void;
  onDragOver: (nodeId: string, position: DropPosition) => void;
  onDragEnd: () => void;
  // Visibility propagation
  isParentHidden?: boolean;
}

function getNodeIcon(type: string) {
  switch (type) {
    case "rectangle":
      return <Square className="w-3.5 h-3.5 text-blue-600" />;
    case "circle":
      return <Circle className="w-3.5 h-3.5 text-purple-600" />;
    case "text":
      return <Type className="w-3.5 h-3.5 text-gray-600" />;
    case "line":
      return <Minus className="w-3.5 h-3.5 text-gray-600" />;
    case "triangle":
      return <Triangle className="w-3.5 h-3.5 text-green-600" />;
    case "frame":
      return <Frame className="w-3.5 h-3.5 text-indigo-600" />;
    case "group":
      return <Folder className="w-3.5 h-3.5 text-amber-600" />;
    default:
      return <Square className="w-3.5 h-3.5 text-gray-400" />;
  }
}

function getNodeDisplayName(node: NodeTree, index: number): string {
  if (node.name) return node.name;

  const baseNames: Record<string, string> = {
    rectangle: "Rectangle",
    circle: "Circle",
    text: "Text",
    line: "Line",
    triangle: "Triangle",
    frame: "Frame",
    group: "Group",
  };

  const baseName = baseNames[node.type] || "Shape";
  return `${baseName} ${index + 1}`;
}

/**
 * Single node in the tree with recursive children
 */
function LayerTreeNode({
  node,
  level,
  selectedShapeIds,
  editingNodeId,
  editingNodeName,
  onSelect,
  onStartEdit,
  onRename,
  onCancelEdit,
  onVisibilityToggle,
  setEditingNodeName,
  draggedNodeId,
  dragOverNodeId,
  dropPosition,
  onDragStart,
  onDragOver,
  onDragEnd,
  isParentHidden = false,
}: LayerTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isSelected = selectedShapeIds.includes(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isDragging = draggedNodeId === node.id;
  const isDropTarget = dragOverNodeId === node.id;
  const canAcceptChildren = node.type === "frame" || node.type === "group";

  // Check if this node is effectively hidden (either directly or by parent)
  const isNodeHidden = node.isVisible === false;
  const isEffectivelyHidden = isParentHidden || isNodeHidden;

  // Always show chevron for containers, even if they're empty
  const showChevron = canAcceptChildren || hasChildren;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", node.id);
    onDragStart(node.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate drop position based on mouse Y position within the element
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let position: DropPosition;
    if (canAcceptChildren && y > height * 0.33 && y < height * 0.67) {
      position = "inside";
    } else if (y < height / 2) {
      position = "before";
    } else {
      position = "after";
    }

    onDragOver(node.id, position);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    // Don't clear on leave as we want to maintain state between siblings
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragEnd();
  };

  return (
    <div className="relative">
      {/* Hierarchy line indicator - vertical line */}
      {level > 0 && (
        <>
          <div
            className="absolute top-0 bottom-0 w-px bg-gray-200"
            style={{ left: `${level * 12 + 4}px` }}
          />
          {/* Horizontal connecting line */}
          <div
            className="absolute h-px bg-gray-200"
            style={{
              left: `${level * 12 + 4}px`,
              width: "8px",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
        </>
      )}

      {/* Drop indicator - before */}
      {isDropTarget && dropPosition === "before" && (
        <div
          className="h-0.5 bg-blue-500 mx-2 relative z-10"
          style={{ marginLeft: `${level * 12 + 8}px` }}
        />
      )}

      <div
        className={cn(
          "flex items-center py-1.5 cursor-move transition-colors rounded group relative z-10",
          isSelected ? "bg-blue-100" : "hover:bg-gray-50",
          isDragging && "opacity-50",
          isDropTarget &&
            dropPosition === "inside" &&
            "bg-blue-50 ring-2 ring-blue-400"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onSelect(node.id)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onStartEdit(node.id, getNodeDisplayName(node, 0));
        }}
      >
        {/* Expand/collapse toggle for containers */}
        <div className="flex-shrink-0 w-4 mr-1">
          {showChevron ? (
            <button
              onClick={handleToggleExpand}
              className={cn(
                "hover:bg-gray-300 dark:hover:bg-gray-600 rounded p-0.5 transition-all",
                !hasChildren && "opacity-20 cursor-default"
              )}
              disabled={!hasChildren}
              title={
                hasChildren
                  ? isExpanded
                    ? "Collapse"
                    : "Expand"
                  : "Empty container"
              }
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-gray-600" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-3 h-3" />
          )}
        </div>

        {/* Node content */}
        <div
          className={cn(
            "flex items-center gap-1.5 flex-1 min-w-0",
            isEffectivelyHidden && "opacity-40"
          )}
        >
          {/* Node icon */}
          <div className="flex-shrink-0">{getNodeIcon(node.type)}</div>

          {/* Node name */}
          {editingNodeId === node.id ? (
            <Input
              value={editingNodeName}
              onChange={(e) => setEditingNodeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRename(node.id);
                } else if (e.key === "Escape") {
                  onCancelEdit();
                }
              }}
              onBlur={() => onRename(node.id)}
              className="h-6 text-xs px-1.5 py-0 flex-1"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={cn(
                "text-xs font-medium truncate min-w-0",
                canAcceptChildren && "text-gray-700",
                isEffectivelyHidden && "text-gray-400"
              )}
            >
              {getNodeDisplayName(node, 0)}
            </span>
          )}
        </div>

        {/* Visibility control - only show if parent is not hidden */}
        {!isParentHidden && (
          <div
            className="flex-shrink-0 p-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors opacity-0 group-hover:opacity-100"
            onClick={(e) => onVisibilityToggle(node.id, e)}
          >
            {node.isVisible !== false ? (
              <Eye className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Drop indicator - after */}
      {isDropTarget && dropPosition === "after" && (
        <div
          className="h-0.5 bg-blue-500 mx-2 relative z-10"
          style={{ marginLeft: `${level * 12 + 8}px` }}
        />
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <LayerTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedShapeIds={selectedShapeIds}
              editingNodeId={editingNodeId}
              editingNodeName={editingNodeName}
              onSelect={onSelect}
              onStartEdit={onStartEdit}
              onRename={onRename}
              onCancelEdit={onCancelEdit}
              onVisibilityToggle={onVisibilityToggle}
              setEditingNodeName={setEditingNodeName}
              draggedNodeId={draggedNodeId}
              dragOverNodeId={dragOverNodeId}
              dropPosition={dropPosition}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              isParentHidden={isEffectivelyHidden}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface LayerTreeProps {
  nodes: NodeTree[];
  selectedShapeIds: string[];
  onShapeSelect: (shapeId: string) => void;
  onShapeVisibilityToggle?: (shapeId: string, visible: boolean) => void;
  onRenameNode?: (nodeId: string, name: string) => void;
  onNodeDrop?: (
    draggedNodeId: string,
    targetNodeId: string,
    position: DropPosition
  ) => void;
}

/**
 * Layer tree component showing hierarchical node structure
 */
export function LayerTree({
  nodes,
  selectedShapeIds,
  onShapeSelect,
  onShapeVisibilityToggle,
  onRenameNode,
  onNodeDrop,
}: LayerTreeProps) {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeName, setEditingNodeName] = useState("");

  // Drag and drop functionality
  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd: handleDragEndHook,
    getDropTarget,
  } = useLayerDragDrop(nodes);

  const handleStartEdit = (nodeId: string, currentName: string) => {
    setEditingNodeId(nodeId);
    setEditingNodeName(currentName);
  };

  const handleRename = (nodeId: string) => {
    if (editingNodeName.trim() && onRenameNode) {
      onRenameNode(nodeId, editingNodeName.trim());
    }
    setEditingNodeId(null);
    setEditingNodeName("");
  };

  const handleCancelEdit = () => {
    setEditingNodeId(null);
    setEditingNodeName("");
  };

  const handleDragEnd = () => {
    const dropTarget = getDropTarget();
    if (dropTarget && dragState.draggedNodeId && onNodeDrop) {
      onNodeDrop(
        dragState.draggedNodeId,
        dropTarget.targetNodeId,
        dropTarget.position
      );
    }
    handleDragEndHook();
  };

  const handleVisibilityToggle = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShapeVisibilityToggle) {
      // Find current visibility state
      const findNode = (nodes: NodeTree[]): boolean | undefined => {
        for (const node of nodes) {
          if (node.id === nodeId) {
            return node.isVisible;
          }
          if (node.children) {
            const found = findNode(node.children);
            if (found !== undefined) return found;
          }
        }
        return undefined;
      };

      const currentVisibility = findNode(nodes);
      onShapeVisibilityToggle(nodeId, currentVisibility === false);
    }
  };

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <div className="w-8 h-8 mx-auto mb-2 bg-gray-200 rounded-sm" />
          <p className="text-sm">No layers</p>
          <p className="text-xs mt-1">Create shapes to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2">
      {nodes.map((node) => (
        <LayerTreeNode
          key={node.id}
          node={node}
          level={0}
          selectedShapeIds={selectedShapeIds}
          editingNodeId={editingNodeId}
          editingNodeName={editingNodeName}
          onSelect={onShapeSelect}
          onStartEdit={handleStartEdit}
          onRename={handleRename}
          onCancelEdit={handleCancelEdit}
          onVisibilityToggle={handleVisibilityToggle}
          setEditingNodeName={setEditingNodeName}
          draggedNodeId={dragState.draggedNodeId}
          dragOverNodeId={dragState.dragOverNodeId}
          dropPosition={dragState.dropPosition}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
}

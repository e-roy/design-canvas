/**
 * Hook for drag-and-drop functionality in the layer panel
 * Handles reordering and reparenting of nodes
 */

import { useState, useCallback } from "react";
import { NodeTree } from "./useNodeTree";

export type DropPosition = "before" | "after" | "inside";

export interface DragState {
  draggedNodeId: string | null;
  dragOverNodeId: string | null;
  dropPosition: DropPosition | null;
}

export interface DropTarget {
  targetNodeId: string;
  position: DropPosition;
}

/**
 * Determine if a node can be dropped into another node
 */
function canDropInside(targetNode: NodeTree): boolean {
  // Only frames and groups can accept children
  return targetNode.type === "frame" || targetNode.type === "group";
}

/**
 * Check if dropping would create a cycle (can't drop parent into its own child)
 */
function wouldCreateCycle(
  draggedNodeId: string,
  targetNodeId: string,
  allNodes: NodeTree[]
): boolean {
  // Find all descendants of dragged node
  const getDescendants = (nodeId: string, nodes: NodeTree[]): string[] => {
    const descendants: string[] = [];
    const findChildren = (id: string, treeNodes: NodeTree[]) => {
      for (const node of treeNodes) {
        if (node.parentId === id || node.id === id) {
          if (node.id !== nodeId) {
            descendants.push(node.id);
          }
          if (node.children) {
            node.children.forEach((child) =>
              findChildren(child.id, [child, ...child.children])
            );
          }
        }
      }
    };
    findChildren(nodeId, nodes);
    return descendants;
  };

  const descendants = getDescendants(draggedNodeId, allNodes);
  return descendants.includes(targetNodeId);
}

export function useLayerDragDrop(nodes: NodeTree[]) {
  const [dragState, setDragState] = useState<DragState>({
    draggedNodeId: null,
    dragOverNodeId: null,
    dropPosition: null,
  });

  const handleDragStart = useCallback((nodeId: string) => {
    setDragState({
      draggedNodeId: nodeId,
      dragOverNodeId: null,
      dropPosition: null,
    });
  }, []);

  const handleDragOver = useCallback(
    (nodeId: string, position: DropPosition) => {
      setDragState((prev) => {
        // Don't allow dropping onto self
        if (prev.draggedNodeId === nodeId && position === "inside") {
          return prev;
        }

        // Find the target node
        const findNode = (
          id: string,
          treeNodes: NodeTree[]
        ): NodeTree | null => {
          for (const node of treeNodes) {
            if (node.id === id) return node;
            if (node.children) {
              const found = findNode(id, node.children);
              if (found) return found;
            }
          }
          return null;
        };

        const targetNode = findNode(nodeId, nodes);
        if (!targetNode) return prev;

        // Check if we can drop inside
        if (position === "inside" && !canDropInside(targetNode)) {
          return prev;
        }

        // Check for cycles
        if (
          prev.draggedNodeId &&
          wouldCreateCycle(prev.draggedNodeId, nodeId, nodes)
        ) {
          return prev;
        }

        return {
          ...prev,
          dragOverNodeId: nodeId,
          dropPosition: position,
        };
      });
    },
    [nodes]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({
      draggedNodeId: null,
      dragOverNodeId: null,
      dropPosition: null,
    });
  }, []);

  const getDropTarget = useCallback((): DropTarget | null => {
    if (
      !dragState.draggedNodeId ||
      !dragState.dragOverNodeId ||
      !dragState.dropPosition
    ) {
      return null;
    }

    return {
      targetNodeId: dragState.dragOverNodeId,
      position: dragState.dropPosition,
    };
  }, [dragState]);

  const clearDragState = useCallback(() => {
    setDragState({
      draggedNodeId: null,
      dragOverNodeId: null,
      dropPosition: null,
    });
  }, []);

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    getDropTarget,
    clearDragState,
  };
}

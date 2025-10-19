/**
 * Hook for building hierarchical tree structures from flat node lists
 * Used for rendering nested nodes with parent-child relationships
 */

import { useMemo } from "react";
import { NodeDoc } from "@/types/page";

export interface NodeTree extends NodeDoc {
  children: NodeTree[];
}

/**
 * Build a hierarchical tree from a flat list of nodes
 * @param nodes - Flat array of all nodes on the page
 * @param parentId - Parent ID to build tree for (null = root)
 * @returns Array of tree nodes with children
 */
export function buildNodeTree(
  nodes: NodeDoc[],
  parentId: string | null = null
): NodeTree[] {
  // Filter nodes by parent
  const directChildren = nodes.filter((node) => node.parentId === parentId);

  // Sort by orderKey
  const sortedChildren = [...directChildren].sort(
    (a, b) => (a.orderKey ?? 0) - (b.orderKey ?? 0)
  );

  // Recursively build tree for each child
  return sortedChildren.map((node) => ({
    ...node,
    children: buildNodeTree(nodes, node.id),
  }));
}

/**
 * Hook to build a node tree from a flat list
 * @param nodes - Flat array of nodes
 * @param parentId - Parent ID to build tree for (null = root)
 * @returns Memoized tree structure
 */
export function useNodeTree(
  nodes: NodeDoc[],
  parentId: string | null = null
): NodeTree[] {
  return useMemo(() => buildNodeTree(nodes, parentId), [nodes, parentId]);
}

/**
 * Get all ancestor IDs for a node (from root to direct parent)
 * @param nodes - Flat array of all nodes
 * @param nodeId - Node ID to get ancestors for
 * @returns Array of ancestor IDs (root first, parent last)
 */
export function getAncestorIds(nodes: NodeDoc[], nodeId: string): string[] {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || !node.parentId) return [];

  // Recursively get ancestors
  const parentAncestors = getAncestorIds(nodes, node.parentId);
  return [...parentAncestors, node.parentId];
}

/**
 * Get all descendant IDs for a node (children, grandchildren, etc.)
 * @param nodes - Flat array of all nodes
 * @param parentId - Parent ID to get descendants for
 * @returns Array of all descendant node IDs
 */
export function getDescendantIds(nodes: NodeDoc[], parentId: string): string[] {
  const children = nodes.filter((n) => n.parentId === parentId);
  const descendants: string[] = [];

  for (const child of children) {
    descendants.push(child.id);
    descendants.push(...getDescendantIds(nodes, child.id));
  }

  return descendants;
}

/**
 * Check if a node is an ancestor of another node
 * @param nodes - Flat array of all nodes
 * @param ancestorId - Potential ancestor node ID
 * @param descendantId - Potential descendant node ID
 * @returns True if ancestorId is an ancestor of descendantId
 */
export function isAncestor(
  nodes: NodeDoc[],
  ancestorId: string,
  descendantId: string
): boolean {
  const ancestors = getAncestorIds(nodes, descendantId);
  return ancestors.includes(ancestorId);
}

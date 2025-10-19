/**
 * Recursive node tree renderer for hierarchical canvas rendering
 * Handles rendering of nodes with nested children and composed transforms
 */

import React from "react";
import { Group as KonvaGroup } from "react-konva";
import type { Shape } from "@/types";
import { NodeTree } from "@/hooks/useNodeTree";
import {
  RectangleShape,
  CircleShape,
  TextShape,
  LineShape,
  TriangleShape,
  FrameShape,
  GroupShape,
} from "./shapes";

export interface NodeTreeRendererProps {
  node: NodeTree;
  selectedShapeIds: string[];
  onSelect?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragMove?: (id: string, x: number, y: number) => void;
  onDragEnd?: (id: string, finalX?: number, finalY?: number) => void;
  onShapeChange?: (id: string, changes: Partial<Shape>) => void;
  virtualWidth: number;
  virtualHeight: number;
  scale: number;
  getShapeDisplayName?: (shape: Shape, index: number) => string;
}

/**
 * Render a single node and its children recursively
 */
export function NodeTreeRenderer({
  node,
  selectedShapeIds,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onShapeChange,
  virtualWidth,
  virtualHeight,
  scale,
  getShapeDisplayName,
}: NodeTreeRendererProps) {
  // Don't render if node is hidden
  if (node.isVisible === false) {
    return null;
  }

  const isSelected = selectedShapeIds.includes(node.id);

  // Convert NodeDoc to Shape for rendering
  const shape: Shape = {
    id: node.id,
    canvasId: "", // Will be filled by parent
    type: node.type,
    name: node.name,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    radius: node.radius,
    rotation: node.rotation,
    opacity: node.opacity,
    text: node.text,
    fontSize: node.fontSize,
    startX: node.startX,
    startY: node.startY,
    endX: node.endX,
    endY: node.endY,
    fill: node.fill,
    stroke: node.stroke,
    strokeWidth: node.strokeWidth,
    visible: node.isVisible,
  };

  // Display name
  const displayName = getShapeDisplayName
    ? getShapeDisplayName(shape, 0)
    : node.name || `${node.type}-${node.id.slice(0, 4)}`;
  const shapeWithName = { ...shape, name: displayName };

  // Common props for all shapes
  const commonProps = {
    shape: shapeWithName,
    isSelected,
    onSelect,
    onDragStart,
    onDragMove,
    onDragEnd,
    onShapeChange,
    virtualWidth,
    virtualHeight,
    scale,
  };

  // Render children recursively
  const renderChildren = () => {
    if (!node.children || node.children.length === 0) return null;

    // Children inside frames/groups should not be independently draggable
    // Only the parent container handles drag to move everything together
    return node.children.map((child) => (
      <NodeTreeRenderer
        key={child.id}
        node={child}
        selectedShapeIds={selectedShapeIds}
        onSelect={onSelect}
        // DO NOT pass drag handlers to children - parent handles drag
        onDragStart={undefined}
        onDragMove={undefined}
        onDragEnd={undefined}
        onShapeChange={onShapeChange}
        virtualWidth={virtualWidth}
        virtualHeight={virtualHeight}
        scale={scale}
        getShapeDisplayName={getShapeDisplayName}
      />
    ));
  };

  // For groups and frames, wrap children in the container
  if (node.type === "group") {
    // Groups wrap their children in a transformed group
    // Children's coordinates are in the group's local space

    // Handle drag for the entire group (including children)
    const handleGroupDragStart = () => {
      onDragStart?.(node.id);
    };

    // Don't call onDragMove during hierarchical group drag to avoid React/Konva position conflicts
    // Let Konva handle the position smoothly, only commit on drag end
    // (onDragMove intentionally not defined)

    const handleGroupDragEnd = (e: {
      target: { x: () => number; y: () => number };
    }) => {
      const finalX = e.target.x();
      const finalY = e.target.y();
      onDragEnd?.(node.id, finalX, finalY);
    };

    // Constrain drag to canvas boundaries
    const dragBoundFunc = (pos: { x: number; y: number }) => {
      const width = node.width || 100;
      const height = node.height || 100;
      return {
        x: Math.max(0, Math.min(virtualWidth - width, pos.x)),
        y: Math.max(0, Math.min(virtualHeight - height, pos.y)),
      };
    };

    return (
      <KonvaGroup
        x={node.x}
        y={node.y}
        rotation={node.rotation ?? 0}
        draggable={true}
        dragBoundFunc={dragBoundFunc}
        onDragStart={handleGroupDragStart}
        onDragEnd={handleGroupDragEnd}
      >
        {/* Group shape at origin - NOT draggable (group handles drag) */}
        <GroupShape
          {...commonProps}
          shape={{ ...shapeWithName, x: 0, y: 0, rotation: 0 }}
          onDragStart={undefined}
          onDragMove={undefined}
          onDragEnd={undefined}
        />
        {/* Children are positioned relative to group's origin */}
        {renderChildren()}
      </KonvaGroup>
    );
  }

  if (node.type === "frame") {
    // Frames render their visual representation AND children inside
    // Children's coordinates are already in the frame's local space

    // Handle drag for the entire group (frame + children)
    const handleGroupDragStart = () => {
      onDragStart?.(node.id);
    };

    // Don't call onDragMove during hierarchical frame drag to avoid React/Konva position conflicts
    // Let Konva handle the position smoothly, only commit on drag end
    // (onDragMove intentionally not defined)

    const handleGroupDragEnd = (e: {
      target: { x: () => number; y: () => number };
    }) => {
      const finalX = e.target.x();
      const finalY = e.target.y();
      onDragEnd?.(node.id, finalX, finalY);
    };

    // Constrain drag to canvas boundaries using frame dimensions
    const dragBoundFunc = (pos: { x: number; y: number }) => {
      const frameWidth = node.width || 300;
      const frameHeight = node.height || 200;
      return {
        x: Math.max(0, Math.min(virtualWidth - frameWidth, pos.x)),
        y: Math.max(0, Math.min(virtualHeight - frameHeight, pos.y)),
      };
    };

    return (
      <KonvaGroup
        x={node.x}
        y={node.y}
        rotation={node.rotation ?? 0}
        draggable={true}
        dragBoundFunc={dragBoundFunc}
        onDragStart={handleGroupDragStart}
        onDragEnd={handleGroupDragEnd}
      >
        {/* Frame shape at origin of this group - NOT draggable (group handles drag) */}
        <FrameShape
          {...commonProps}
          shape={{ ...shapeWithName, x: 0, y: 0, rotation: 0 }}
          onDragStart={undefined}
          onDragMove={undefined}
          onDragEnd={undefined}
        />
        {/* Children are positioned relative to frame's origin */}
        {renderChildren()}
      </KonvaGroup>
    );
  }

  // For leaf nodes (no children), render the shape directly
  switch (node.type) {
    case "rectangle":
      return <RectangleShape {...commonProps} />;
    case "circle":
      return <CircleShape {...commonProps} />;
    case "text":
      return <TextShape {...commonProps} />;
    case "line":
      return <LineShape {...commonProps} />;
    case "triangle":
      return <TriangleShape {...commonProps} />;
    default:
      return null;
  }
}

export interface NodeTreeListRendererProps {
  nodes: NodeTree[];
  selectedShapeIds: string[];
  onSelect?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragMove?: (id: string, x: number, y: number) => void;
  onDragEnd?: (id: string, finalX?: number, finalY?: number) => void;
  onShapeChange?: (id: string, changes: Partial<Shape>) => void;
  virtualWidth: number;
  virtualHeight: number;
  scale: number;
  getShapeDisplayName?: (shape: Shape, index: number) => string;
}

/**
 * Render a list of node trees
 */
export function NodeTreeListRenderer({
  nodes,
  ...props
}: NodeTreeListRendererProps) {
  return (
    <>
      {nodes.map((node) => (
        <NodeTreeRenderer key={node.id} node={node} {...props} />
      ))}
    </>
  );
}

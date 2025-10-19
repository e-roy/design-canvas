import { Timestamp } from "firebase/firestore";

export interface PageDoc {
  id: string; // doc id (runtime only)
  name: string;
  index: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  version: number;
}

export interface NodeDoc {
  id: string; // doc id (runtime only)
  pageId: string; // FK to pages/{pageId}
  parentId: string | null; // null = root on page
  type:
    | "frame"
    | "group"
    | "rectangle"
    | "circle"
    | "text"
    | "line"
    | "triangle";
  name?: string;

  // sibling order within parent
  orderKey: number; // e.g., 1000, 2000... use midpoints on reorder

  // local transform (relative to parent)
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number; // circle
  rotation?: number; // deg
  opacity?: number; // 0..1

  // text/line props
  text?: string;
  fontSize?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;

  // style
  fill?: string;
  stroke?: string;
  strokeWidth?: number;

  // visibility & locking
  isVisible: boolean;
  isLocked: boolean;

  // legacy compat (prefer orderKey for render)
  zIndex?: number;

  createdBy: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
  version: number;
}

// Transform matrix type for hierarchical transforms
export type TransformMatrix = [number, number, number, number, number, number]; // [a,b,c,d,tx,ty]

export interface TransformState {
  x: number;
  y: number;
  rotation: number;
}

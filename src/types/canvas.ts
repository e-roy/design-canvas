// Canvas database types for real-time collaboration
import type { Timestamp } from "firebase/firestore";

export interface CanvasDocument {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastEditedBy: string;
  collaborators: string[]; // Array of user IDs with access
  isPublic: boolean;
  version: number;
}

export interface StoredShape {
  canvasId: string; // NEW: future rooms/pages compatibility
  type: "rectangle" | "circle" | "text" | "line" | "triangle";
  x: number;
  y: number;
  width?: number;
  height?: number; // rect
  radius?: number; // circle
  text?: string;
  fontSize?: number; // text
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number; // line
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rotation?: number;
  opacity?: number; // optional but recommended (0..1)
  visible?: boolean; // visibility state (defaults to true)
  zIndex: number;
  createdBy: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  updatedBy: string;
  version: number; // NEW: optimistic concurrency
}

// Shape with document ID for Firestore operations
export interface StoredShapeWithId extends StoredShape {
  id: string;
}

export interface CanvasSnapshot {
  document: CanvasDocument;
  shapes: StoredShape[];
  viewport: {
    x: number;
    y: number;
    scale: number;
  };
}

export interface CanvasUserCursor {
  userId: string;
  userName: string;
  x: number;
  y: number;
  timestamp: Date;
}

// Hook return types for canvas collaboration
export interface UseCanvasReturn {
  canvasDocument: CanvasDocument | null;
  shapes: StoredShape[];
  userCursors: CanvasUserCursor[];
  isLoading: boolean;
  error: string | null;
  saveShape: (
    shapeData: Omit<
      StoredShape,
      "id" | "createdAt" | "updatedAt" | "updatedBy" | "version"
    >
  ) => Promise<string>;
  updateShape: (
    shapeId: string,
    updates: Partial<StoredShape>
  ) => Promise<void>;
  deleteShape: (shapeId: string) => Promise<void>;
  updateViewport: (viewport: {
    x: number;
    y: number;
    scale: number;
  }) => Promise<void>;
  addCollaborator: (userId: string) => Promise<void>;
  removeCollaborator: (userId: string) => Promise<void>;
}

// Canvas UI/Component types
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  scale: number;
}

export interface Shape {
  id: string;
  canvasId: string;
  type: "rectangle" | "circle" | "text" | "line" | "triangle";
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  fontSize?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
  zIndex?: number;
}

export interface DragState {
  isDragging: boolean;
  startPoint: Point;
  currentPoint: Point;
  offset: Point;
}

export interface ZoomState {
  scale: number;
  centerPoint: Point;
}

export interface CanvasState {
  shapes: Shape[];
  selectedShapeIds: string[];
  viewport: CanvasViewport;
  isPanMode: boolean;
  isCreatingShape: boolean;
  currentTool:
    | "select"
    | "pan"
    | "rectangle"
    | "circle"
    | "text"
    | "line"
    | "triangle";
}

export interface CanvasProps {
  width: number;
  height: number;
  virtualWidth?: number;
  virtualHeight?: number;
  gridSize?: number;
  showGrid?: boolean;
  className?: string;
  shapes?: Shape[];
  onShapeCreate?: (shape: Shape) => void;
  onShapeUpdate?: (shapeId: string, updates: Partial<Shape>) => void;
  onShapeDelete?: (shapeId: string) => void;
  onToolChange?: (
    tool:
      | "select"
      | "pan"
      | "rectangle"
      | "circle"
      | "text"
      | "line"
      | "triangle"
  ) => void;
  onMouseMove?: (position: import("@/types").CursorPosition) => void;
  currentUserId?: string;
}

export interface ViewportProps {
  canvasWidth: number;
  canvasHeight: number;
  virtualWidth: number;
  virtualHeight: number;
  viewport: CanvasViewport;
  onViewportChange?: (viewport: CanvasViewport) => void;
  onPanStart?: () => void;
  onPanMove?: (delta: Point) => void;
  onPanEnd?: () => void;
  children?: React.ReactNode;
  currentTool:
    | "select"
    | "pan"
    | "rectangle"
    | "circle"
    | "text"
    | "line"
    | "triangle";
}

export interface GridProps {
  size: number;
  virtualWidth: number;
  virtualHeight: number;
  show: boolean;
  scale?: number;
}

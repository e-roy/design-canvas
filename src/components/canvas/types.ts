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
  type: "rectangle" | "circle" | "text";
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  fontSize?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rotation?: number;
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
  currentTool: "select" | "pan" | "rectangle" | "circle" | "text";
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
  cursors?: Record<string, import("@/types").UserCursor>;
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
  currentTool: "select" | "pan" | "rectangle" | "circle" | "text";
}

export interface GridProps {
  size: number;
  virtualWidth: number;
  virtualHeight: number;
  show: boolean;
  scale?: number;
}

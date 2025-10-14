// Canvas database types for real-time collaboration

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
  zIndex: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
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

export interface UserCursor {
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
  userCursors: UserCursor[];
  isLoading: boolean;
  error: string | null;
  saveShape: (
    shapeData: Omit<StoredShape, "id" | "createdAt" | "updatedAt" | "updatedBy">
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

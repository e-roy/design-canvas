// Cursor position and user data
export interface CursorPosition {
  x: number;
  y: number;
  timestamp: number;
}

// User cursor data with color and name
export interface UserCursor {
  userId: string;
  displayName: string;
  color: string;
  photoURL: string | null;
  currentProject?: string | null;
  x: number;
  y: number;
  timestamp: number;
  isOnline: boolean;
}

// Canvas cursor state
export interface CanvasCursorState {
  [userId: string]: UserCursor;
}

// Utility types for cursor management
export interface CursorConfig {
  updateInterval: number; // milliseconds
  cleanupThreshold: number; // milliseconds
  maxCursors: number;
  positionThreshold: number; // pixels - minimum movement to trigger update
  debounceDelay: number; // milliseconds - debounce delay for rapid movements
}

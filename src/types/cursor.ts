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

// Random color generation for cursors
export const CURSOR_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FFEAA7", // Yellow
  "#DDA0DD", // Plum
  "#98D8C8", // Mint
  "#F7DC6F", // Light Yellow
  "#BB8FCE", // Light Purple
  "#85C1E9", // Light Blue
  "#F8C471", // Orange
  "#82E0AA", // Light Green
  "#F1948A", // Light Red
  "#85C1E9", // Sky Blue
  "#D7BDE2", // Light Purple
];

// Generate a random color for a user
export function generateUserColor(userId: string): string {
  // Use user ID to consistently assign the same color to each user
  const hash = userId.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

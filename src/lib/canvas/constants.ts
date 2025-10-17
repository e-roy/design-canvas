// Canvas constants
export const CANVAS_CONSTANTS = {
  VIRTUAL_WIDTH: 5000,
  VIRTUAL_HEIGHT: 5000,
  MIN_SCALE: 0.05,
  MAX_SCALE: 5,
  DEFAULT_GRID_SIZE: 50,
  DEFAULT_SHAPE_SIZE: 100,
  DEFAULT_CIRCLE_RADIUS: 50,
  DEFAULT_TEXT_SIZE: 36,
  MIN_SHAPE_SIZE: 10,
  MIN_CIRCLE_RADIUS: 5,
  MIN_LINE_LENGTH: 10,
  DRAG_TOLERANCE: 1,
  THROTTLE_INTERVAL: 100,
  RTDB_UPDATE_INTERVAL: 33, // ~30 FPS
  PRESENCE_TIMEOUT: 10000,
  GESTURE_TIMEOUT: 2000,
  FINAL_POSITION_DELAY: 50,
  MOUSE_MOVE_THROTTLE: 50,
} as const;

export const DEFAULT_SHAPE_PROPS = {
  fill: "#ffffff",
  stroke: "#000000",
  strokeWidth: 1,
  opacity: 1,
  visible: true,
  rotation: 0,
} as const;

export const PREVIEW_SHAPE_PROPS = {
  fill: "#ffffff",
  stroke: "#3b82f6",
  strokeWidth: 2,
  opacity: 1,
} as const;

export const GHOST_SHAPE_PROPS = {
  fill: "transparent",
  strokeWidth: 2,
  opacity: 0.5,
} as const;

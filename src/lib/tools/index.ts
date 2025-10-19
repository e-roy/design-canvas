/**
 * AI Canvas Tools - Main Export
 *
 * This module combines all AI tool categories and exports them as a single
 * `canvasTools` object for use with the Vercel AI SDK.
 *
 * Tool Categories:
 * - Creation Tools: Create new shapes (rectangle, circle, text, line, triangle, frame)
 * - Manipulation Tools: Modify existing shapes (move, resize, rotate, changeColor, delete)
 * - Layout Tools: Create layouts and arrangements (grids, etc.)
 * - Complex Tools: Create multi-element UI components (buttons, forms, cards, navbars, dashboards)
 *
 * Usage:
 * import { canvasTools } from '@/lib/tools';
 */

import { creationTools } from "./creation-tools";
import { manipulationTools } from "./manipulation-tools";
import { layoutTools } from "./layout-tools";
import { complexTools } from "./complex-tools";

/**
 * Combined canvas tools for AI agent
 * All tools execute server-side using Firebase Admin SDK
 */
export const canvasTools = {
  // Creation tools (6)
  ...creationTools,

  // Manipulation tools (5)
  ...manipulationTools,

  // Layout tools (1)
  ...layoutTools,

  // Complex template tools (5)
  ...complexTools,
};

// Re-export individual tool categories for targeted imports
export { creationTools } from "./creation-tools";
export { manipulationTools } from "./manipulation-tools";
export { layoutTools } from "./layout-tools";
export { complexTools } from "./complex-tools";

// Re-export server-side utilities
export * from "./server-shapes";

import { tool } from "ai";
import { z } from "zod";

/**
 * Shape Manipulation Tools
 * Tools for modifying existing shapes on the canvas
 * Following AI SDK v5 documentation: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

export const manipulationTools = {
  moveShape: tool({
    description:
      "Move a shape to a new position. You can specify the shape by its ID or search for it by characteristics.",
    inputSchema: z.object({
      shapeId: z.string().describe("The ID of the shape to move"),
      x: z.number().describe("New X coordinate"),
      y: z.number().describe("New Y coordinate"),
    }),
    execute: async (args: { shapeId: string; x: number; y: number }) => {
      const { shapeId, x, y } = args;
      const { updateNodeInFirestore } = await import("./server-shapes");

      await updateNodeInFirestore(shapeId, { x, y });

      return `✓ Moved shape to position (${x}, ${y})`;
    },
  }),

  resizeShape: tool({
    description: "Resize a shape by changing its dimensions",
    inputSchema: z.object({
      shapeId: z.string().describe("The ID of the shape to resize"),
      width: z
        .number()
        .optional()
        .describe("New width (for rectangles, frames)"),
      height: z
        .number()
        .optional()
        .describe("New height (for rectangles, frames)"),
      radius: z.number().optional().describe("New radius (for circles)"),
    }),
    execute: async (args: {
      shapeId: string;
      width?: number;
      height?: number;
      radius?: number;
    }) => {
      const { shapeId, width, height, radius } = args;
      const { updateNodeInFirestore } = await import("./server-shapes");

      const updates: Record<string, number> = {};
      if (width !== undefined) updates.width = width;
      if (height !== undefined) updates.height = height;
      if (radius !== undefined) updates.radius = radius;

      await updateNodeInFirestore(shapeId, updates);

      const changes = [];
      if (width) changes.push(`width: ${width}px`);
      if (height) changes.push(`height: ${height}px`);
      if (radius) changes.push(`radius: ${radius}px`);
      return `✓ Resized shape (${changes.join(", ")})`;
    },
  }),

  rotateShape: tool({
    description: "Rotate a shape by a specified angle in degrees",
    inputSchema: z.object({
      shapeId: z.string().describe("The ID of the shape to rotate"),
      degrees: z
        .number()
        .describe(
          "Rotation angle in degrees (0-360, or negative for counter-clockwise)"
        ),
    }),
    execute: async (args: { shapeId: string; degrees: number }) => {
      const { shapeId, degrees } = args;
      const { updateNodeInFirestore } = await import("./server-shapes");

      await updateNodeInFirestore(shapeId, { rotation: degrees });

      return `✓ Rotated shape by ${degrees} degrees`;
    },
  }),

  changeColor: tool({
    description: "Change the fill and/or stroke color of a shape",
    inputSchema: z.object({
      shapeId: z.string().describe("The ID of the shape to recolor"),
      fill: z
        .string()
        .optional()
        .describe("New fill color (hex format, e.g., #ff0000)"),
      stroke: z
        .string()
        .optional()
        .describe("New stroke color (hex format, e.g., #000000)"),
    }),
    execute: async (args: {
      shapeId: string;
      fill?: string;
      stroke?: string;
    }) => {
      const { shapeId, fill, stroke } = args;
      const { updateNodeInFirestore } = await import("./server-shapes");

      const updates: Record<string, string> = {};
      if (fill) updates.fill = fill;
      if (stroke) updates.stroke = stroke;

      await updateNodeInFirestore(shapeId, updates);

      const changes = [];
      if (fill) changes.push(`fill to ${fill}`);
      if (stroke) changes.push(`stroke to ${stroke}`);

      return `✓ Changed ${changes.join(" and ")} for shape`;
    },
  }),

  deleteShape: tool({
    description: "Delete a shape from the canvas",
    inputSchema: z.object({
      shapeId: z.string().describe("The ID of the shape to delete"),
    }),
    execute: async (args: { shapeId: string }) => {
      const { shapeId } = args;
      const { deleteNodeInFirestore } = await import("./server-shapes");

      await deleteNodeInFirestore(shapeId);

      return `✓ Deleted shape from canvas`;
    },
  }),
};

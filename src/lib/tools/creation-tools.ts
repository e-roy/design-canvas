import { tool } from "ai";
import { z } from "zod";

/**
 * Shape Creation Tools
 * Tools for creating new shapes on the canvas
 * Following AI SDK v5 documentation: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

export const creationTools = {
  createRectangle: tool({
    description: "Create a rectangle shape on the canvas",
    inputSchema: z.object({
      x: z.number().describe("X coordinate of top-left corner"),
      y: z.number().describe("Y coordinate of top-left corner"),
      width: z.number().describe("Width of the rectangle"),
      height: z.number().describe("Height of the rectangle"),
      fill: z
        .string()
        .optional()
        .describe("Fill color (hex format, e.g., #ff0000 for red)"),
      stroke: z.string().optional().describe("Stroke color (hex format)"),
      strokeWidth: z.number().optional().describe("Stroke width in pixels"),
    }),
    execute: async (args: {
      x: number;
      y: number;
      width: number;
      height: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
    }) => {
      const { x, y, width, height, fill, stroke, strokeWidth } = args;
      const { createNodeInFirestore } = await import("./server-shapes");

      await createNodeInFirestore({
        type: "rectangle",
        x,
        y,
        width,
        height,
        fill: fill || "#3b82f6",
        stroke: stroke || "#000000",
        strokeWidth: strokeWidth || 2,
      });

      return `✓ Created rectangle at position (${x}, ${y}) with size ${width}x${height}${
        fill ? ` in color ${fill}` : ""
      }`;
    },
  }),

  createCircle: tool({
    description: "Create a circle shape on the canvas",
    inputSchema: z.object({
      x: z.number().describe("X coordinate of circle center"),
      y: z.number().describe("Y coordinate of circle center"),
      radius: z.number().describe("Radius of the circle"),
      fill: z
        .string()
        .optional()
        .describe("Fill color (hex format, e.g., #ff0000 for red)"),
      stroke: z.string().optional().describe("Stroke color (hex format)"),
      strokeWidth: z.number().optional().describe("Stroke width in pixels"),
    }),
    execute: async (args: {
      x: number;
      y: number;
      radius: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
    }) => {
      const { x, y, radius, fill, stroke, strokeWidth } = args;
      const { createNodeInFirestore } = await import("./server-shapes");

      await createNodeInFirestore({
        type: "circle",
        x,
        y,
        radius,
        fill: fill || "#3b82f6",
        stroke: stroke || "#000000",
        strokeWidth: strokeWidth || 2,
      });

      return `✓ Created circle at position (${x}, ${y}) with radius ${radius}${
        fill ? ` in color ${fill}` : ""
      }`;
    },
  }),

  createText: tool({
    description: "Create a text element on the canvas",
    inputSchema: z.object({
      x: z.number().describe("X coordinate of text position"),
      y: z.number().describe("Y coordinate of text position"),
      text: z.string().describe("The text content to display"),
      fontSize: z
        .number()
        .optional()
        .describe("Font size in pixels (default: 16)"),
      fill: z
        .string()
        .optional()
        .describe("Text color (hex format, default: #000000)"),
    }),
    execute: async (args: {
      x: number;
      y: number;
      text: string;
      fontSize?: number;
      fill?: string;
    }) => {
      const { x, y, text, fontSize, fill } = args;
      const { createNodeInFirestore } = await import("./server-shapes");

      await createNodeInFirestore({
        type: "text",
        x,
        y,
        text,
        fontSize: fontSize || 16,
        fill: fill || "#000000",
      });

      return `✓ Created text "${text}" at position (${x}, ${y}) with font size ${
        fontSize || 16
      }px`;
    },
  }),

  createLine: tool({
    description: "Create a line on the canvas",
    inputSchema: z.object({
      startX: z.number().describe("Starting X coordinate"),
      startY: z.number().describe("Starting Y coordinate"),
      endX: z.number().describe("Ending X coordinate"),
      endY: z.number().describe("Ending Y coordinate"),
      stroke: z
        .string()
        .optional()
        .describe("Line color (hex format, default: #000000)"),
      strokeWidth: z
        .number()
        .optional()
        .describe("Line width in pixels (default: 2)"),
    }),
    execute: async (args: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      stroke?: string;
      strokeWidth?: number;
    }) => {
      const { startX, startY, endX, endY, stroke, strokeWidth } = args;
      const { createNodeInFirestore } = await import("./server-shapes");

      await createNodeInFirestore({
        type: "line",
        x: 0,
        y: 0,
        startX,
        startY,
        endX,
        endY,
        stroke: stroke || "#000000",
        strokeWidth: strokeWidth || 2,
      });

      return `✓ Created line from (${startX}, ${startY}) to (${endX}, ${endY})`;
    },
  }),

  createTriangle: tool({
    description: "Create a triangle shape on the canvas",
    inputSchema: z.object({
      x: z.number().describe("X coordinate of top vertex"),
      y: z.number().describe("Y coordinate of top vertex"),
      width: z.number().describe("Base width of the triangle"),
      height: z.number().describe("Height of the triangle"),
      fill: z
        .string()
        .optional()
        .describe("Fill color (hex format, e.g., #ff0000 for red)"),
      stroke: z.string().optional().describe("Stroke color (hex format)"),
      strokeWidth: z.number().optional().describe("Stroke width in pixels"),
    }),
    execute: async (args: {
      x: number;
      y: number;
      width: number;
      height: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
    }) => {
      const { x, y, width, height, fill, stroke, strokeWidth } = args;
      const { createNodeInFirestore } = await import("./server-shapes");

      await createNodeInFirestore({
        type: "triangle",
        x,
        y,
        width,
        height,
        fill: fill || "#3b82f6",
        stroke: stroke || "#000000",
        strokeWidth: strokeWidth || 2,
      });

      return `✓ Created triangle at position (${x}, ${y}) with base ${width}px and height ${height}px${
        fill ? ` in color ${fill}` : ""
      }`;
    },
  }),

  createFrame: tool({
    description:
      "Create a frame container on the canvas to group other elements",
    inputSchema: z.object({
      x: z.number().describe("X coordinate of top-left corner"),
      y: z.number().describe("Y coordinate of top-left corner"),
      width: z.number().describe("Width of the frame"),
      height: z.number().describe("Height of the frame"),
      name: z.string().optional().describe("Optional name/label for the frame"),
    }),
    execute: async (args: {
      x: number;
      y: number;
      width: number;
      height: number;
      name?: string;
    }) => {
      const { x, y, width, height, name } = args;
      const { createNodeInFirestore } = await import("./server-shapes");

      await createNodeInFirestore({
        type: "frame",
        x,
        y,
        width,
        height,
      });

      const frameName = name || `Frame`;
      return `✓ Created frame "${frameName}" at position (${x}, ${y}) with size ${width}x${height}`;
    },
  }),
};

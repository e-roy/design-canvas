import { tool } from "ai";
import { z } from "zod";

/**
 * Layout & Arrangement Tools
 * Tools for creating layouts and arranging multiple shapes
 * Following AI SDK v5 documentation: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

export const layoutTools = {
  createGrid: tool({
    description:
      "Create a grid of shapes with specified rows, columns, and spacing",
    inputSchema: z.object({
      rows: z.number().min(1).describe("Number of rows"),
      cols: z.number().min(1).describe("Number of columns"),
      shapeType: z
        .enum(["rectangle", "circle"])
        .describe("Type of shape to create in the grid"),
      startX: z.number().describe("Starting X coordinate for the grid"),
      startY: z.number().describe("Starting Y coordinate for the grid"),
      spacing: z
        .number()
        .optional()
        .describe("Space between shapes (default: 20)"),
      shapeSize: z
        .number()
        .optional()
        .describe("Size of each shape (width/radius, default: 50)"),
      fill: z.string().optional().describe("Fill color for all shapes"),
    }),
    execute: async (args: {
      rows: number;
      cols: number;
      shapeType: "rectangle" | "circle";
      startX: number;
      startY: number;
      spacing?: number;
      shapeSize?: number;
      fill?: string;
    }) => {
      const {
        rows,
        cols,
        shapeType,
        startX,
        startY,
        spacing = 20,
        shapeSize = 50,
        fill = "#3b82f6",
      } = args;

      const { createNodeInFirestore } = await import("./server-shapes");

      let count = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = startX + col * (shapeSize + spacing);
          const y = startY + row * (shapeSize + spacing);

          if (shapeType === "rectangle") {
            await createNodeInFirestore({
              type: "rectangle",
              x,
              y,
              width: shapeSize,
              height: shapeSize,
              fill,
              stroke: "#000000",
              strokeWidth: 2,
            });
          } else if (shapeType === "circle") {
            await createNodeInFirestore({
              type: "circle",
              x: x + shapeSize / 2,
              y: y + shapeSize / 2,
              radius: shapeSize / 2,
              fill,
              stroke: "#000000",
              strokeWidth: 2,
            });
          }
          count++;
        }
      }

      return `✓ Created ${rows}x${cols} grid with ${count} ${shapeType}s at position (${startX}, ${startY})`;
    },
  }),
};

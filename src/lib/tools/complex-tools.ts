import { tool } from "ai";
import { z } from "zod";

/**
 * Complex Template Tools
 * Tools for creating multi-element UI components and layouts
 * Following AI SDK v5 documentation: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

export const complexTools = {
  createButton: tool({
    description:
      "Create a button component with rectangle background and text label",
    inputSchema: z.object({
      x: z.number().describe("X coordinate of button"),
      y: z.number().describe("Y coordinate of button"),
      text: z.string().describe("Button label text"),
      width: z.number().optional().describe("Button width (default: 120)"),
      height: z.number().optional().describe("Button height (default: 40)"),
      fill: z
        .string()
        .optional()
        .describe("Button background color (default: #3b82f6)"),
      textColor: z
        .string()
        .optional()
        .describe("Text color (default: #ffffff)"),
    }),
    execute: async (args: {
      x: number;
      y: number;
      text: string;
      width?: number;
      height?: number;
      fill?: string;
      textColor?: string;
    }) => {
      const {
        x,
        y,
        text,
        width = 120,
        height = 40,
        fill = "#3b82f6",
        textColor = "#ffffff",
      } = args;

      const { createNodeInFirestore } = await import("./server-shapes");

      // Create button background (rectangle)
      await createNodeInFirestore({
        type: "rectangle",
        x,
        y,
        width,
        height,
        fill,
        stroke: "#000000",
        strokeWidth: 2,
      });

      // Create button text (centered)
      await createNodeInFirestore({
        type: "text",
        x: x + width / 2,
        y: y + height / 2,
        text,
        fontSize: 16,
        fill: textColor,
      });

      return `✓ Created button "${text}" at position (${x}, ${y}) with size ${width}x${height}`;
    },
  }),

  createCard: tool({
    description:
      "Create a card component with frame container, title, and description text",
    inputSchema: z.object({
      x: z.number().describe("X coordinate of card"),
      y: z.number().describe("Y coordinate of card"),
      title: z.string().describe("Card title text"),
      description: z.string().describe("Card description text"),
      width: z.number().optional().describe("Card width (default: 300)"),
      height: z.number().optional().describe("Card height (default: 200)"),
    }),
    execute: async (args: {
      x: number;
      y: number;
      title: string;
      description: string;
      width?: number;
      height?: number;
    }) => {
      const { x, y, title, description, width = 300, height = 200 } = args;

      const { createNodeInFirestore } = await import("./server-shapes");

      // Create card frame/container
      await createNodeInFirestore({
        type: "frame",
        x,
        y,
        width,
        height,
      });

      // Create title text
      await createNodeInFirestore({
        type: "text",
        x: x + 20,
        y: y + 30,
        text: title,
        fontSize: 24,
        fill: "#000000",
      });

      // Create description text
      await createNodeInFirestore({
        type: "text",
        x: x + 20,
        y: y + 70,
        text: description,
        fontSize: 14,
        fill: "#666666",
      });

      return `✓ Created card "${title}" at position (${x}, ${y}) with title and description`;
    },
  }),

  createLoginForm: tool({
    description:
      "Create a complete login form with username field, password field, and submit button",
    inputSchema: z.object({
      x: z.number().describe("X coordinate of form top-left"),
      y: z.number().describe("Y coordinate of form top-left"),
    }),
    execute: async (args: { x: number; y: number }) => {
      const { x, y } = args;

      const { createNodeInFirestore } = await import("./server-shapes");

      const formWidth = 320;
      const fieldHeight = 40;

      // Create form container frame
      await createNodeInFirestore({
        type: "frame",
        x,
        y,
        width: formWidth,
        height: 240,
      });

      // Title
      await createNodeInFirestore({
        type: "text",
        x: x + 20,
        y: y + 30,
        text: "Login",
        fontSize: 24,
        fill: "#000000",
      });

      // Username label
      await createNodeInFirestore({
        type: "text",
        x: x + 20,
        y: y + 70,
        text: "Username",
        fontSize: 14,
        fill: "#333333",
      });

      // Username input field (rectangle)
      await createNodeInFirestore({
        type: "rectangle",
        x: x + 20,
        y: y + 90,
        width: formWidth - 40,
        height: fieldHeight,
        fill: "#ffffff",
        stroke: "#cccccc",
        strokeWidth: 2,
      });

      // Password label
      await createNodeInFirestore({
        type: "text",
        x: x + 20,
        y: y + 140,
        text: "Password",
        fontSize: 14,
        fill: "#333333",
      });

      // Password input field (rectangle)
      await createNodeInFirestore({
        type: "rectangle",
        x: x + 20,
        y: y + 160,
        width: formWidth - 40,
        height: fieldHeight,
        fill: "#ffffff",
        stroke: "#cccccc",
        strokeWidth: 2,
      });

      // Submit button background
      await createNodeInFirestore({
        type: "rectangle",
        x: x + 20,
        y: y + 215,
        width: formWidth - 40,
        height: fieldHeight,
        fill: "#3b82f6",
        stroke: "#000000",
        strokeWidth: 2,
      });

      // Submit button text
      await createNodeInFirestore({
        type: "text",
        x: x + formWidth / 2,
        y: y + 235,
        text: "Login",
        fontSize: 16,
        fill: "#ffffff",
      });

      return `✓ Created login form at position (${x}, ${y}) with username field, password field, and submit button (8 elements total)`;
    },
  }),

  createNavigationBar: tool({
    description:
      "Create a navigation bar with background and multiple menu items",
    inputSchema: z.object({
      x: z.number().describe("X coordinate of navbar"),
      y: z.number().describe("Y coordinate of navbar"),
      menuItems: z
        .array(z.string())
        .describe(
          "Array of menu item labels (e.g., ['Home', 'About', 'Contact'])"
        ),
      width: z.number().optional().describe("Navbar width (default: 800)"),
    }),
    execute: async (args: {
      x: number;
      y: number;
      menuItems: string[];
      width?: number;
    }) => {
      const { x, y, menuItems, width = 800 } = args;

      const { createNodeInFirestore } = await import("./server-shapes");

      const navHeight = 60;
      const itemSpacing = width / (menuItems.length + 1);

      // Create navbar background
      await createNodeInFirestore({
        type: "rectangle",
        x,
        y,
        width,
        height: navHeight,
        fill: "#1f2937",
        stroke: "#000000",
        strokeWidth: 2,
      });

      // Create menu items
      for (let i = 0; i < menuItems.length; i++) {
        const itemX = x + itemSpacing * (i + 1);
        const itemY = y + navHeight / 2;

        await createNodeInFirestore({
          type: "text",
          x: itemX,
          y: itemY,
          text: menuItems[i],
          fontSize: 16,
          fill: "#ffffff",
        });
      }

      return `✓ Created navigation bar at position (${x}, ${y}) with ${
        menuItems.length
      } menu items (${menuItems.join(", ")})`;
    },
  }),

  createDashboard: tool({
    description:
      "Create a dashboard layout with header, sidebar, and multiple cards",
    inputSchema: z.object({
      x: z.number().describe("X coordinate of dashboard"),
      y: z.number().describe("Y coordinate of dashboard"),
      title: z.string().describe("Dashboard title"),
      cardCount: z
        .number()
        .min(1)
        .max(6)
        .describe("Number of dashboard cards (1-6)"),
    }),
    execute: async (args: {
      x: number;
      y: number;
      title: string;
      cardCount: number;
    }) => {
      const { x, y, title, cardCount } = args;

      const { createNodeInFirestore } = await import("./server-shapes");

      const dashWidth = 1000;
      const dashHeight = 600;
      const headerHeight = 80;
      const sidebarWidth = 200;
      const cardWidth = 240;
      const cardHeight = 160;
      const cardSpacing = 20;

      // Main container
      await createNodeInFirestore({
        type: "frame",
        x,
        y,
        width: dashWidth,
        height: dashHeight,
      });

      // Header
      await createNodeInFirestore({
        type: "rectangle",
        x,
        y,
        width: dashWidth,
        height: headerHeight,
        fill: "#1f2937",
        stroke: "#000000",
        strokeWidth: 2,
      });

      await createNodeInFirestore({
        type: "text",
        x: x + 40,
        y: y + 50,
        text: title,
        fontSize: 28,
        fill: "#ffffff",
      });

      // Sidebar
      await createNodeInFirestore({
        type: "rectangle",
        x,
        y: y + headerHeight,
        width: sidebarWidth,
        height: dashHeight - headerHeight,
        fill: "#374151",
        stroke: "#000000",
        strokeWidth: 2,
      });

      // Content area cards
      const contentX = x + sidebarWidth + cardSpacing;
      const contentY = y + headerHeight + cardSpacing;
      const cardsPerRow = 3;

      for (let i = 0; i < cardCount; i++) {
        const row = Math.floor(i / cardsPerRow);
        const col = i % cardsPerRow;
        const cardX = contentX + col * (cardWidth + cardSpacing);
        const cardY = contentY + row * (cardHeight + cardSpacing);

        await createNodeInFirestore({
          type: "rectangle",
          x: cardX,
          y: cardY,
          width: cardWidth,
          height: cardHeight,
          fill: "#ffffff",
          stroke: "#e5e7eb",
          strokeWidth: 2,
        });

        await createNodeInFirestore({
          type: "text",
          x: cardX + 20,
          y: cardY + 30,
          text: `Card ${i + 1}`,
          fontSize: 18,
          fill: "#000000",
        });
      }

      const totalElements = 3 + cardCount; // header + sidebar + title + cards
      return `✓ Created dashboard "${title}" at position (${x}, ${y}) with header, sidebar, and ${cardCount} cards (${totalElements} elements total)`;
    },
  }),
};

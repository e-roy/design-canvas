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
      "Create a button component with frame container, rectangle background and text label",
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
        fill = "#2563eb",
        textColor = "#ffffff",
      } = args;

      const { createNodeInFirestore } = await import("./server-shapes");

      // Create button frame container
      const frameResult = await createNodeInFirestore({
        type: "frame",
        x,
        y,
        width,
        height,
      });

      const frameId = frameResult.nodeId;

      // Create button background (rectangle)
      await createNodeInFirestore({
        type: "rectangle",
        x: 0,
        y: 0,
        width,
        height,
        fill,
        stroke: "#1e40af",
        strokeWidth: 1,
        parentId: frameId,
      });

      // Create button text (centered)
      await createNodeInFirestore({
        type: "text",
        x: width / 2,
        y: height / 2,
        text,
        fontSize: 16,
        fill: textColor,
        parentId: frameId,
      });

      return `✓ Created button "${text}" at position (${x}, ${y}) with size ${width}x${height} (all elements nested in frame)`;
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
      const frameResult = await createNodeInFirestore({
        type: "frame",
        x,
        y,
        width,
        height,
      });

      const frameId = frameResult.nodeId;

      // Create title text
      await createNodeInFirestore({
        type: "text",
        x: 20,
        y: 30,
        text: title,
        fontSize: 24,
        fill: "#000000",
        parentId: frameId,
      });

      // Create description text
      await createNodeInFirestore({
        type: "text",
        x: 20,
        y: 70,
        text: description,
        fontSize: 14,
        fill: "#6b7280",
        parentId: frameId,
      });

      return `✓ Created card "${title}" at position (${x}, ${y}) with title and description (all elements nested in frame)`;
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

      const formWidth = 400;
      const fieldHeight = 48;
      const padding = 40;
      const labelSpacing = 8;
      const fieldGap = 28;
      const formHeight = 420;

      // Create form container frame with shadow effect
      const frameResult = await createNodeInFirestore({
        type: "frame",
        x,
        y,
        width: formWidth,
        height: formHeight,
      });

      const frameId = frameResult.nodeId;

      // Background card
      await createNodeInFirestore({
        type: "rectangle",
        x: 0,
        y: 0,
        width: formWidth,
        height: formHeight,
        fill: "#ffffff",
        stroke: "#e5e7eb",
        strokeWidth: 1,
        parentId: frameId,
      });

      // Title - bold and prominent
      await createNodeInFirestore({
        type: "text",
        x: padding,
        y: padding,
        text: "Login",
        fontSize: 36,
        fill: "#111827",
        parentId: frameId,
      });

      // Subtitle with more space from title
      await createNodeInFirestore({
        type: "text",
        x: padding,
        y: padding + 50,
        text: "Welcome back! Please login to your account.",
        fontSize: 13,
        fill: "#6b7280",
        parentId: frameId,
      });

      // Username label - more space from subtitle
      const usernameFieldY = padding + 110;
      await createNodeInFirestore({
        type: "text",
        x: padding,
        y: usernameFieldY,
        text: "Username",
        fontSize: 14,
        fill: "#374151",
        parentId: frameId,
      });

      // Username input field with better visibility
      await createNodeInFirestore({
        type: "rectangle",
        x: padding,
        y: usernameFieldY + labelSpacing + 6,
        width: formWidth - padding * 2,
        height: fieldHeight,
        fill: "#f9fafb",
        stroke: "#9ca3af",
        strokeWidth: 2,
        parentId: frameId,
      });

      // Username placeholder text
      await createNodeInFirestore({
        type: "text",
        x: padding + 14,
        y: usernameFieldY + labelSpacing + 26,
        text: "Enter your username",
        fontSize: 14,
        fill: "#9ca3af",
        parentId: frameId,
      });

      // Password label
      const passwordFieldY =
        usernameFieldY + labelSpacing + 6 + fieldHeight + fieldGap;
      await createNodeInFirestore({
        type: "text",
        x: padding,
        y: passwordFieldY,
        text: "Password",
        fontSize: 14,
        fill: "#374151",
        parentId: frameId,
      });

      // Password input field
      await createNodeInFirestore({
        type: "rectangle",
        x: padding,
        y: passwordFieldY + labelSpacing + 6,
        width: formWidth - padding * 2,
        height: fieldHeight,
        fill: "#f9fafb",
        stroke: "#9ca3af",
        strokeWidth: 2,
        parentId: frameId,
      });

      // Password placeholder text
      await createNodeInFirestore({
        type: "text",
        x: padding + 14,
        y: passwordFieldY + labelSpacing + 26,
        text: "Enter your password",
        fontSize: 14,
        fill: "#9ca3af",
        parentId: frameId,
      });

      // Submit button with more breathing room
      const buttonY = passwordFieldY + labelSpacing + 6 + fieldHeight + 32;
      await createNodeInFirestore({
        type: "rectangle",
        x: padding,
        y: buttonY,
        width: formWidth - padding * 2,
        height: 52,
        fill: "#2563eb",
        stroke: "#1d4ed8",
        strokeWidth: 0,
        parentId: frameId,
      });

      // Submit button text (properly centered)
      await createNodeInFirestore({
        type: "text",
        x: formWidth / 2,
        y: buttonY + 28,
        text: "Sign In",
        fontSize: 16,
        fill: "#ffffff",
        parentId: frameId,
      });

      return `✓ Created modern login form at position (${x}, ${y}) with styled input fields, placeholder text, and submit button (all elements properly nested in frame)`;
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
      width: z.number().optional().describe("Navbar width (default: 1000)"),
    }),
    execute: async (args: {
      x: number;
      y: number;
      menuItems: string[];
      width?: number;
    }) => {
      const { x, y, menuItems, width = 1000 } = args;

      const { createNodeInFirestore } = await import("./server-shapes");

      const navHeight = 70;
      const horizontalPadding = 48;
      const itemSpacing = 60;
      const startX = horizontalPadding;

      // Create navbar frame container
      const frameResult = await createNodeInFirestore({
        type: "frame",
        x,
        y,
        width,
        height: navHeight,
      });

      const frameId = frameResult.nodeId;

      // Create navbar background
      await createNodeInFirestore({
        type: "rectangle",
        x: 0,
        y: 0,
        width,
        height: navHeight,
        fill: "#1e293b",
        stroke: "#334155",
        strokeWidth: 1,
        parentId: frameId,
      });

      // Create menu items with better spacing
      let currentX = startX;
      for (let i = 0; i < menuItems.length; i++) {
        await createNodeInFirestore({
          type: "text",
          x: currentX,
          y: navHeight / 2,
          text: menuItems[i],
          fontSize: 15,
          fill: "#f1f5f9",
          parentId: frameId,
        });

        // Estimate text width for spacing (approximate)
        const estimatedTextWidth = menuItems[i].length * 9;
        currentX += estimatedTextWidth + itemSpacing;
      }

      return `✓ Created modern navigation bar at position (${x}, ${y}) with ${
        menuItems.length
      } menu items (${menuItems.join(", ")}) - all elements nested in frame`;
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

      const dashWidth = 1100;
      const dashHeight = 650;
      const headerHeight = 70;
      const sidebarWidth = 180;
      const cardWidth = 260;
      const cardHeight = 180;
      const cardSpacing = 24;
      const contentPadding = 28;

      // Main container frame
      const frameResult = await createNodeInFirestore({
        type: "frame",
        x,
        y,
        width: dashWidth,
        height: dashHeight,
      });

      const frameId = frameResult.nodeId;

      // Background
      await createNodeInFirestore({
        type: "rectangle",
        x: 0,
        y: 0,
        width: dashWidth,
        height: dashHeight,
        fill: "#f8fafc",
        stroke: "#e2e8f0",
        strokeWidth: 1,
        parentId: frameId,
      });

      // Header
      await createNodeInFirestore({
        type: "rectangle",
        x: 0,
        y: 0,
        width: dashWidth,
        height: headerHeight,
        fill: "#0f172a",
        stroke: "#1e293b",
        strokeWidth: 0,
        parentId: frameId,
      });

      // Header title
      await createNodeInFirestore({
        type: "text",
        x: 32,
        y: headerHeight / 2,
        text: title,
        fontSize: 24,
        fill: "#f8fafc",
        parentId: frameId,
      });

      // Sidebar
      await createNodeInFirestore({
        type: "rectangle",
        x: 0,
        y: headerHeight,
        width: sidebarWidth,
        height: dashHeight - headerHeight,
        fill: "#334155",
        stroke: "#475569",
        strokeWidth: 0,
        parentId: frameId,
      });

      // Sidebar menu items
      const sidebarItems = ["Dashboard", "Analytics", "Reports", "Settings"];
      for (let i = 0; i < sidebarItems.length; i++) {
        await createNodeInFirestore({
          type: "text",
          x: 20,
          y: headerHeight + 40 + i * 50,
          text: sidebarItems[i],
          fontSize: 14,
          fill: "#cbd5e1",
          parentId: frameId,
        });
      }

      // Content area background
      await createNodeInFirestore({
        type: "rectangle",
        x: sidebarWidth,
        y: headerHeight,
        width: dashWidth - sidebarWidth,
        height: dashHeight - headerHeight,
        fill: "#f1f5f9",
        stroke: "transparent",
        strokeWidth: 0,
        parentId: frameId,
      });

      // Content area cards
      const contentX = sidebarWidth + contentPadding;
      const contentY = headerHeight + contentPadding;
      const cardsPerRow = 3;

      for (let i = 0; i < cardCount; i++) {
        const row = Math.floor(i / cardsPerRow);
        const col = i % cardsPerRow;
        const cardX = contentX + col * (cardWidth + cardSpacing);
        const cardY = contentY + row * (cardHeight + cardSpacing);

        // Card background
        await createNodeInFirestore({
          type: "rectangle",
          x: cardX,
          y: cardY,
          width: cardWidth,
          height: cardHeight,
          fill: "#ffffff",
          stroke: "#cbd5e1",
          strokeWidth: 1,
          parentId: frameId,
        });

        // Card title
        await createNodeInFirestore({
          type: "text",
          x: cardX + 20,
          y: cardY + 28,
          text: `Card ${i + 1}`,
          fontSize: 18,
          fill: "#1e293b",
          parentId: frameId,
        });

        // Card description
        await createNodeInFirestore({
          type: "text",
          x: cardX + 20,
          y: cardY + 60,
          text: "Data visualization",
          fontSize: 13,
          fill: "#64748b",
          parentId: frameId,
        });
      }

      return `✓ Created modern dashboard "${title}" at position (${x}, ${y}) with header, sidebar (4 menu items), and ${cardCount} cards - all elements properly nested in frame`;
    },
  }),
};

import type { NodeDoc } from "@/types/page";

// Types for AI function calls
export interface AIFunctionCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  createdIds?: string[];
  error?: string;
}

export interface CommandExecutorContext {
  canvasId: string | null;
  currentPageId: string | null;
  userId: string;
  viewport: { x: number; y: number; scale: number };
  nodes: NodeDoc[]; // Current canvas nodes for lookup
  createNode: (
    pageId: string,
    nodeData: Omit<
      NodeDoc,
      | "id"
      | "pageId"
      | "orderKey"
      | "createdAt"
      | "updatedAt"
      | "createdBy"
      | "updatedBy"
      | "version"
    >,
    userId: string
  ) => Promise<string>;
  updateNode: (
    nodeId: string,
    updates: Partial<NodeDoc>,
    userId: string
  ) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
}

/**
 * Execute AI function calls to manipulate the canvas
 */
export async function executeAICommand(
  functionCall: AIFunctionCall,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { name, arguments: args } = functionCall;

  try {
    switch (name) {
      // Creation commands
      case "createRectangle":
        return await createRectangle(args, context);
      case "createCircle":
        return await createCircle(args, context);
      case "createText":
        return await createText(args, context);
      case "createLine":
        return await createLine(args, context);
      case "createTriangle":
        return await createTriangle(args, context);
      case "createFrame":
        return await createFrame(args, context);
      // Manipulation commands
      case "moveShape":
        return await moveShape(args, context);
      case "resizeShape":
        return await resizeShape(args, context);
      case "rotateShape":
        return await rotateShape(args, context);
      case "changeColor":
        return await changeColor(args, context);
      case "deleteShape":
        return await deleteShape(args, context);
      // Layout commands
      case "arrangeHorizontal":
        return await arrangeHorizontal(args, context);
      case "arrangeVertical":
        return await arrangeVertical(args, context);
      case "createGrid":
        return await createGrid(args, context);
      // Complex template commands
      case "createLoginForm":
        return await createLoginForm(args, context);
      case "createNavigationBar":
        return await createNavigationBar(args, context);
      case "createCard":
        return await createCard(args, context);
      case "createButton":
        return await createButton(args, context);
      default:
        return {
          success: false,
          message: `Unknown command: ${name}`,
          error: "Unknown command",
        };
    }
  } catch (error) {
    console.error("Error executing AI command:", error);
    return {
      success: false,
      message: `Failed to execute ${name}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function createRectangle(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { currentPageId, userId, createNode } = context;

  if (!currentPageId) {
    return {
      success: false,
      message: "No page selected",
      error: "No active page",
    };
  }

  const x = Number(args.x) || 100;
  const y = Number(args.y) || 100;
  const width = Number(args.width) || 100;
  const height = Number(args.height) || 100;
  const fill = String(args.fill || "#3b82f6");
  const stroke = String(args.stroke || "#1e40af");
  const strokeWidth = Number(args.strokeWidth) || 2;

  const nodeData = {
    parentId: null as string | null,
    type: "rectangle" as const,
    name: "Rectangle",
    x,
    y,
    width,
    height,
    fill,
    stroke,
    strokeWidth,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };

  const nodeId = await createNode(currentPageId, nodeData, userId);

  return {
    success: true,
    message: `Created rectangle at (${Math.round(x)}, ${Math.round(y)})`,
    createdIds: [nodeId],
  };
}

async function createCircle(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { currentPageId, userId, createNode } = context;

  if (!currentPageId) {
    return {
      success: false,
      message: "No page selected",
      error: "No active page",
    };
  }

  const x = Number(args.x) || 100;
  const y = Number(args.y) || 100;
  const radius = Number(args.radius) || 50;
  const fill = String(args.fill || "#3b82f6");
  const stroke = String(args.stroke || "#1e40af");
  const strokeWidth = Number(args.strokeWidth) || 2;

  const nodeData = {
    parentId: null as string | null,
    type: "circle" as const,
    name: "Circle",
    x,
    y,
    radius,
    fill,
    stroke,
    strokeWidth,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };

  const nodeId = await createNode(currentPageId, nodeData, userId);

  return {
    success: true,
    message: `Created circle at (${Math.round(x)}, ${Math.round(
      y
    )}) with radius ${radius}`,
    createdIds: [nodeId],
  };
}

async function createText(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { currentPageId, userId, createNode } = context;

  if (!currentPageId) {
    return {
      success: false,
      message: "No page selected",
      error: "No active page",
    };
  }

  const x = Number(args.x) || 100;
  const y = Number(args.y) || 100;
  const text = String(args.text || "Text");
  const fontSize = Number(args.fontSize) || 16;
  const fill = String(args.fill || "#000000");

  const nodeData = {
    parentId: null as string | null,
    type: "text" as const,
    name: "Text",
    x,
    y,
    text,
    fontSize,
    fill,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };

  const nodeId = await createNode(currentPageId, nodeData, userId);

  return {
    success: true,
    message: `Created text "${text}" at (${Math.round(x)}, ${Math.round(y)})`,
    createdIds: [nodeId],
  };
}

async function createLine(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { currentPageId, userId, createNode } = context;

  if (!currentPageId) {
    return {
      success: false,
      message: "No page selected",
      error: "No active page",
    };
  }

  const startX = Number(args.startX) || 100;
  const startY = Number(args.startY) || 100;
  const endX = Number(args.endX) || 200;
  const endY = Number(args.endY) || 200;
  const stroke = String(args.stroke || "#000000");
  const strokeWidth = Number(args.strokeWidth) || 2;

  const nodeData = {
    parentId: null as string | null,
    type: "line" as const,
    name: "Line",
    x: startX,
    y: startY,
    startX,
    startY,
    endX,
    endY,
    stroke,
    strokeWidth,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };

  const nodeId = await createNode(currentPageId, nodeData, userId);

  return {
    success: true,
    message: `Created line from (${Math.round(startX)}, ${Math.round(
      startY
    )}) to (${Math.round(endX)}, ${Math.round(endY)})`,
    createdIds: [nodeId],
  };
}

async function createTriangle(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { currentPageId, userId, createNode } = context;

  if (!currentPageId) {
    return {
      success: false,
      message: "No page selected",
      error: "No active page",
    };
  }

  const x = Number(args.x) || 100;
  const y = Number(args.y) || 100;
  const width = Number(args.width) || 100;
  const height = Number(args.height) || 100;
  const fill = String(args.fill || "#3b82f6");
  const stroke = String(args.stroke || "#1e40af");
  const strokeWidth = Number(args.strokeWidth) || 2;

  const nodeData = {
    parentId: null as string | null,
    type: "triangle" as const,
    name: "Triangle",
    x,
    y,
    width,
    height,
    fill,
    stroke,
    strokeWidth,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };

  const nodeId = await createNode(currentPageId, nodeData, userId);

  return {
    success: true,
    message: `Created triangle at (${Math.round(x)}, ${Math.round(y)})`,
    createdIds: [nodeId],
  };
}

async function createFrame(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { currentPageId, userId, createNode } = context;

  if (!currentPageId) {
    return {
      success: false,
      message: "No page selected",
      error: "No active page",
    };
  }

  const x = Number(args.x) || 100;
  const y = Number(args.y) || 100;
  const width = Number(args.width) || 200;
  const height = Number(args.height) || 200;
  const fill = String(args.fill || "#ffffff");
  const stroke = String(args.stroke || "#d1d5db");
  const strokeWidth = Number(args.strokeWidth) || 1;

  const nodeData = {
    parentId: null as string | null,
    type: "frame" as const,
    name: "Frame",
    x,
    y,
    width,
    height,
    fill,
    stroke,
    strokeWidth,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };

  const nodeId = await createNode(currentPageId, nodeData, userId);

  return {
    success: true,
    message: `Created frame at (${Math.round(x)}, ${Math.round(y)})`,
    createdIds: [nodeId],
  };
}

// === Manipulation Commands ===

/**
 * Helper function to find a shape by ID or name
 */
function findShape(identifier: string, nodes: NodeDoc[]): NodeDoc | undefined {
  // Try to find by ID first
  let shape = nodes.find((n) => n.id === identifier);
  if (shape) return shape;

  // Try to find by name (case-insensitive)
  shape = nodes.find((n) => n.name?.toLowerCase() === identifier.toLowerCase());
  return shape;
}

async function moveShape(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { nodes, updateNode, userId } = context;
  const shapeIdentifier = String(args.shapeId || args.shapeName || "");
  const x = Number(args.x);
  const y = Number(args.y);

  const shape = findShape(shapeIdentifier, nodes);
  if (!shape) {
    return {
      success: false,
      message: `Could not find shape: ${shapeIdentifier}`,
      error: "Shape not found",
    };
  }

  await updateNode(shape.id, { x, y }, userId);

  return {
    success: true,
    message: `Moved ${shape.name} to (${Math.round(x)}, ${Math.round(y)})`,
  };
}

async function resizeShape(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { nodes, updateNode, userId } = context;
  const shapeIdentifier = String(args.shapeId || args.shapeName || "");

  const shape = findShape(shapeIdentifier, nodes);
  if (!shape) {
    return {
      success: false,
      message: `Could not find shape: ${shapeIdentifier}`,
      error: "Shape not found",
    };
  }

  const updates: Partial<NodeDoc> = {};
  if (args.width !== undefined) updates.width = Number(args.width);
  if (args.height !== undefined) updates.height = Number(args.height);
  if (args.radius !== undefined) updates.radius = Number(args.radius);

  await updateNode(shape.id, updates, userId);

  return {
    success: true,
    message: `Resized ${shape.name}`,
  };
}

async function rotateShape(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { nodes, updateNode, userId } = context;
  const shapeIdentifier = String(args.shapeId || args.shapeName || "");
  const degrees = Number(args.degrees || 0);

  const shape = findShape(shapeIdentifier, nodes);
  if (!shape) {
    return {
      success: false,
      message: `Could not find shape: ${shapeIdentifier}`,
      error: "Shape not found",
    };
  }

  await updateNode(shape.id, { rotation: degrees }, userId);

  return {
    success: true,
    message: `Rotated ${shape.name} by ${degrees}°`,
  };
}

async function changeColor(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { nodes, updateNode, userId } = context;
  const shapeIdentifier = String(args.shapeId || args.shapeName || "");

  const shape = findShape(shapeIdentifier, nodes);
  if (!shape) {
    return {
      success: false,
      message: `Could not find shape: ${shapeIdentifier}`,
      error: "Shape not found",
    };
  }

  const updates: Partial<NodeDoc> = {};
  if (args.fill) updates.fill = String(args.fill);
  if (args.stroke) updates.stroke = String(args.stroke);

  await updateNode(shape.id, updates, userId);

  return {
    success: true,
    message: `Changed colors of ${shape.name}`,
  };
}

async function deleteShape(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { nodes, deleteNode: deleteNodeFn } = context;
  const shapeIdentifier = String(args.shapeId || args.shapeName || "");

  const shape = findShape(shapeIdentifier, nodes);
  if (!shape) {
    return {
      success: false,
      message: `Could not find shape: ${shapeIdentifier}`,
      error: "Shape not found",
    };
  }

  await deleteNodeFn(shape.id);

  return {
    success: true,
    message: `Deleted ${shape.name}`,
  };
}

// === Layout Commands ===

async function arrangeHorizontal(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { nodes, updateNode, userId } = context;
  const shapeIds = (args.shapeIds as string[]) || [];
  const spacing = Number(args.spacing || 20);

  if (shapeIds.length === 0) {
    return {
      success: false,
      message: "No shapes specified for arrangement",
      error: "No shapes",
    };
  }

  // Find all shapes
  const shapes = shapeIds
    .map((id) => findShape(id, nodes))
    .filter(Boolean) as NodeDoc[];

  if (shapes.length === 0) {
    return {
      success: false,
      message: "Could not find any of the specified shapes",
      error: "Shapes not found",
    };
  }

  // Sort by current x position
  shapes.sort((a, b) => (a.x || 0) - (b.x || 0));

  // Arrange horizontally
  let currentX = shapes[0].x || 0;
  for (const shape of shapes) {
    await updateNode(shape.id, { x: currentX }, userId);
    const shapeWidth =
      shape.width || shape.radius ? (shape.radius || 0) * 2 : 100;
    currentX += shapeWidth + spacing;
  }

  return {
    success: true,
    message: `Arranged ${shapes.length} shapes horizontally`,
  };
}

async function arrangeVertical(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { nodes, updateNode, userId } = context;
  const shapeIds = (args.shapeIds as string[]) || [];
  const spacing = Number(args.spacing || 20);

  if (shapeIds.length === 0) {
    return {
      success: false,
      message: "No shapes specified for arrangement",
      error: "No shapes",
    };
  }

  // Find all shapes
  const shapes = shapeIds
    .map((id) => findShape(id, nodes))
    .filter(Boolean) as NodeDoc[];

  if (shapes.length === 0) {
    return {
      success: false,
      message: "Could not find any of the specified shapes",
      error: "Shapes not found",
    };
  }

  // Sort by current y position
  shapes.sort((a, b) => (a.y || 0) - (b.y || 0));

  // Arrange vertically
  let currentY = shapes[0].y || 0;
  for (const shape of shapes) {
    await updateNode(shape.id, { y: currentY }, userId);
    const shapeHeight =
      shape.height || shape.radius ? (shape.radius || 0) * 2 : 100;
    currentY += shapeHeight + spacing;
  }

  return {
    success: true,
    message: `Arranged ${shapes.length} shapes vertically`,
  };
}

async function createGrid(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { currentPageId, userId, createNode } = context;

  if (!currentPageId) {
    return {
      success: false,
      message: "No page selected",
      error: "No active page",
    };
  }

  const rows = Number(args.rows || 3);
  const cols = Number(args.cols || 3);
  const shape = String(args.shape || "rectangle");
  const spacing = Number(args.spacing || 20);
  const size = Number(args.size || 50);
  const startX = Number(args.x || 100);
  const startY = Number(args.y || 100);

  const createdIds: string[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (size + spacing);
      const y = startY + row * (size + spacing);

      let nodeData;
      if (shape === "circle") {
        nodeData = {
          parentId: null as string | null,
          type: "circle" as const,
          name: `Grid Circle ${row}-${col}`,
          x,
          y,
          radius: size / 2,
          fill: "#3b82f6",
          stroke: "#1e40af",
          strokeWidth: 2,
          rotation: 0,
          opacity: 1,
          isVisible: true,
          isLocked: false,
        };
      } else {
        nodeData = {
          parentId: null as string | null,
          type: "rectangle" as const,
          name: `Grid Square ${row}-${col}`,
          x,
          y,
          width: size,
          height: size,
          fill: "#3b82f6",
          stroke: "#1e40af",
          strokeWidth: 2,
          rotation: 0,
          opacity: 1,
          isVisible: true,
          isLocked: false,
        };
      }

      const nodeId = await createNode(currentPageId, nodeData, userId);
      createdIds.push(nodeId);
    }
  }

  return {
    success: true,
    message: `Created ${rows}x${cols} grid (${createdIds.length} shapes)`,
    createdIds,
  };
}

// === Complex Template Commands ===

async function createLoginForm(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { currentPageId, userId, createNode } = context;

  if (!currentPageId) {
    return {
      success: false,
      message: "No page selected",
      error: "No active page",
    };
  }

  const x = Number(args.x || 2200);
  const y = Number(args.y || 2200);
  const createdIds: string[] = [];

  // Create container frame
  const frameData = {
    parentId: null as string | null,
    type: "frame" as const,
    name: "Login Form",
    x,
    y,
    width: 320,
    height: 380,
    fill: "#ffffff",
    stroke: "#d1d5db",
    strokeWidth: 1,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const frameId = await createNode(currentPageId, frameData, userId);
  createdIds.push(frameId);

  // Title
  const titleData = {
    parentId: null as string | null,
    type: "text" as const,
    name: "Login Title",
    x: x + 20,
    y: y + 30,
    text: "Login",
    fontSize: 24,
    fill: "#111827",
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const titleId = await createNode(currentPageId, titleData, userId);
  createdIds.push(titleId);

  // Username label
  const userLabelData = {
    parentId: null as string | null,
    type: "text" as const,
    name: "Username Label",
    x: x + 20,
    y: y + 80,
    text: "Username",
    fontSize: 14,
    fill: "#374151",
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const userLabelId = await createNode(currentPageId, userLabelData, userId);
  createdIds.push(userLabelId);

  // Username input
  const userInputData = {
    parentId: null as string | null,
    type: "rectangle" as const,
    name: "Username Input",
    x: x + 20,
    y: y + 105,
    width: 280,
    height: 40,
    fill: "#ffffff",
    stroke: "#d1d5db",
    strokeWidth: 1,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const userInputId = await createNode(currentPageId, userInputData, userId);
  createdIds.push(userInputId);

  // Password label
  const passLabelData = {
    parentId: null as string | null,
    type: "text" as const,
    name: "Password Label",
    x: x + 20,
    y: y + 165,
    text: "Password",
    fontSize: 14,
    fill: "#374151",
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const passLabelId = await createNode(currentPageId, passLabelData, userId);
  createdIds.push(passLabelId);

  // Password input
  const passInputData = {
    parentId: null as string | null,
    type: "rectangle" as const,
    name: "Password Input",
    x: x + 20,
    y: y + 190,
    width: 280,
    height: 40,
    fill: "#ffffff",
    stroke: "#d1d5db",
    strokeWidth: 1,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const passInputId = await createNode(currentPageId, passInputData, userId);
  createdIds.push(passInputId);

  // Submit button
  const buttonData = {
    parentId: null as string | null,
    type: "rectangle" as const,
    name: "Login Button",
    x: x + 20,
    y: y + 260,
    width: 280,
    height: 44,
    fill: "#3b82f6",
    stroke: "#2563eb",
    strokeWidth: 1,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const buttonId = await createNode(currentPageId, buttonData, userId);
  createdIds.push(buttonId);

  // Button text
  const buttonTextData = {
    parentId: null as string | null,
    type: "text" as const,
    name: "Login Button Text",
    x: x + 130,
    y: y + 275,
    text: "Login",
    fontSize: 16,
    fill: "#ffffff",
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const buttonTextId = await createNode(currentPageId, buttonTextData, userId);
  createdIds.push(buttonTextId);

  return {
    success: true,
    message: "Created login form with username and password fields",
    createdIds,
  };
}

async function createNavigationBar(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { currentPageId, userId, createNode } = context;

  if (!currentPageId) {
    return {
      success: false,
      message: "No page selected",
      error: "No active page",
    };
  }

  const x = Number(args.x || 2000);
  const y = Number(args.y || 2100);
  const menuItems = (args.menuItems as string[]) || [
    "Home",
    "About",
    "Services",
    "Contact",
  ];
  const createdIds: string[] = [];

  // Calculate nav bar width
  const itemWidth = 120;
  const navWidth = menuItems.length * itemWidth + 40;

  // Create nav bar background
  const navBarData = {
    parentId: null as string | null,
    type: "rectangle" as const,
    name: "Navigation Bar",
    x,
    y,
    width: navWidth,
    height: 60,
    fill: "#1f2937",
    stroke: "#111827",
    strokeWidth: 1,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const navBarId = await createNode(currentPageId, navBarData, userId);
  createdIds.push(navBarId);

  // Create menu items
  for (let i = 0; i < menuItems.length; i++) {
    const itemX = x + 20 + i * itemWidth;
    const itemY = y + 20;

    // Menu item text
    const menuItemData = {
      parentId: null as string | null,
      type: "text" as const,
      name: `Nav Item: ${menuItems[i]}`,
      x: itemX,
      y: itemY,
      text: menuItems[i],
      fontSize: 16,
      fill: "#ffffff",
      rotation: 0,
      opacity: 1,
      isVisible: true,
      isLocked: false,
    };
    const menuItemId = await createNode(currentPageId, menuItemData, userId);
    createdIds.push(menuItemId);
  }

  return {
    success: true,
    message: `Created navigation bar with ${menuItems.length} menu items`,
    createdIds,
  };
}

async function createCard(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { currentPageId, userId, createNode } = context;

  if (!currentPageId) {
    return {
      success: false,
      message: "No page selected",
      error: "No active page",
    };
  }

  const x = Number(args.x || 2300);
  const y = Number(args.y || 2300);
  const title = String(args.title || "Card Title");
  const description = String(args.description || "This is a card description");
  const createdIds: string[] = [];

  // Card frame
  const cardData = {
    parentId: null as string | null,
    type: "frame" as const,
    name: "Card",
    x,
    y,
    width: 280,
    height: 320,
    fill: "#ffffff",
    stroke: "#e5e7eb",
    strokeWidth: 1,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const cardId = await createNode(currentPageId, cardData, userId);
  createdIds.push(cardId);

  // Image placeholder
  const imageData = {
    parentId: null as string | null,
    type: "rectangle" as const,
    name: "Card Image",
    x: x + 20,
    y: y + 20,
    width: 240,
    height: 160,
    fill: "#e5e7eb",
    stroke: "#d1d5db",
    strokeWidth: 1,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const imageId = await createNode(currentPageId, imageData, userId);
  createdIds.push(imageId);

  // Title
  const titleData = {
    parentId: null as string | null,
    type: "text" as const,
    name: "Card Title",
    x: x + 20,
    y: y + 200,
    text: title,
    fontSize: 18,
    fill: "#111827",
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const titleId = await createNode(currentPageId, titleData, userId);
  createdIds.push(titleId);

  // Description
  const descData = {
    parentId: null as string | null,
    type: "text" as const,
    name: "Card Description",
    x: x + 20,
    y: y + 235,
    text: description,
    fontSize: 14,
    fill: "#6b7280",
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const descId = await createNode(currentPageId, descData, userId);
  createdIds.push(descId);

  return {
    success: true,
    message: `Created card with title "${title}"`,
    createdIds,
  };
}

async function createButton(
  args: Record<string, unknown>,
  context: CommandExecutorContext
): Promise<ExecutionResult> {
  const { currentPageId, userId, createNode } = context;

  if (!currentPageId) {
    return {
      success: false,
      message: "No page selected",
      error: "No active page",
    };
  }

  const x = Number(args.x || 2400);
  const y = Number(args.y || 2400);
  const text = String(args.text || "Button");
  const width = Number(args.width || 120);
  const height = Number(args.height || 40);
  const createdIds: string[] = [];

  // Button background
  const buttonData = {
    parentId: null as string | null,
    type: "rectangle" as const,
    name: "Button",
    x,
    y,
    width,
    height,
    fill: "#3b82f6",
    stroke: "#2563eb",
    strokeWidth: 1,
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const buttonId = await createNode(currentPageId, buttonData, userId);
  createdIds.push(buttonId);

  // Button text (centered)
  const textX = x + width / 2 - (text.length * 8) / 2; // Rough centering
  const textY = y + height / 2 - 8;

  const textData = {
    parentId: null as string | null,
    type: "text" as const,
    name: "Button Text",
    x: textX,
    y: textY,
    text,
    fontSize: 16,
    fill: "#ffffff",
    rotation: 0,
    opacity: 1,
    isVisible: true,
    isLocked: false,
  };
  const textId = await createNode(currentPageId, textData, userId);
  createdIds.push(textId);

  return {
    success: true,
    message: `Created button "${text}"`,
    createdIds,
  };
}

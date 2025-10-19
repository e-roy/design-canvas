/**
 * Server-side shape creation for AI tools
 * Creates shapes directly in Firestore from the API route using Firebase Admin SDK
 */

import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { NodeDoc } from "@/types/page";

// Global context set by the API route before tool execution
let executionContext: {
  userId: string;
  currentPageId: string;
  canvasId: string;
} | null = null;

export function setExecutionContext(context: {
  userId: string;
  currentPageId: string;
  canvasId: string;
}) {
  executionContext = context;
}

export function getExecutionContext() {
  if (!executionContext) {
    throw new Error(
      "Execution context not set. Call setExecutionContext first."
    );
  }

  // Validate canvasId is not empty
  if (!executionContext.canvasId || executionContext.canvasId.trim() === "") {
    throw new Error(
      "Invalid execution context: canvasId is empty. Ensure the canvas is properly initialized."
    );
  }

  return executionContext;
}

/**
 * Input type for creating a node - derived from NodeDoc to ensure consistency
 * Includes only the shape-specific properties that are provided by the AI tool
 */
export type CreateNodeInput = Pick<
  NodeDoc,
  | "type"
  | "x"
  | "y"
  | "width"
  | "height"
  | "radius"
  | "fill"
  | "stroke"
  | "strokeWidth"
  | "text"
  | "fontSize"
  | "startX"
  | "startY"
  | "endX"
  | "endY"
>;

export async function createNodeInFirestore(params: CreateNodeInput) {
  const context = getExecutionContext();
  const db = getAdminFirestore();

  // Generate order key (simplified - using timestamp)
  const orderKey = Date.now();

  // Build the node document
  // Note: createdAt and updatedAt use FieldValue.serverTimestamp() which is converted by Firestore
  const nodeDoc = {
    type: params.type,
    parentId: null, // Root-level shapes have null parentId
    pageId: context.currentPageId,
    orderKey,
    isVisible: true,
    isLocked: false,
    version: 1,
    updatedBy: context.userId,
    name: `${
      params.type.charAt(0).toUpperCase() + params.type.slice(1)
    } ${Date.now()}`,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: context.userId,
  } as Partial<NodeDoc> & {
    createdAt: ReturnType<typeof FieldValue.serverTimestamp>;
    updatedAt: ReturnType<typeof FieldValue.serverTimestamp>;
  };

  // Add type-specific properties
  switch (params.type) {
    case "rectangle":
      nodeDoc.x = params.x;
      nodeDoc.y = params.y;
      nodeDoc.width = params.width || 100;
      nodeDoc.height = params.height || 100;
      nodeDoc.fill = params.fill || "#3b82f6";
      nodeDoc.stroke = params.stroke || "#000000";
      nodeDoc.strokeWidth = params.strokeWidth || 2;
      break;

    case "circle":
      nodeDoc.x = params.x;
      nodeDoc.y = params.y;
      nodeDoc.radius = params.radius || 50;
      nodeDoc.fill = params.fill || "#3b82f6";
      nodeDoc.stroke = params.stroke || "#000000";
      nodeDoc.strokeWidth = params.strokeWidth || 2;
      break;

    case "text":
      nodeDoc.x = params.x;
      nodeDoc.y = params.y;
      nodeDoc.text = params.text || "Text";
      nodeDoc.fontSize = params.fontSize || 16;
      nodeDoc.fill = params.fill || "#000000";
      break;

    case "line":
      nodeDoc.startX = params.startX || 0;
      nodeDoc.startY = params.startY || 0;
      nodeDoc.endX = params.endX || 100;
      nodeDoc.endY = params.endY || 100;
      nodeDoc.stroke = params.stroke || "#000000";
      nodeDoc.strokeWidth = params.strokeWidth || 2;
      break;

    case "triangle":
      nodeDoc.x = params.x;
      nodeDoc.y = params.y;
      nodeDoc.width = params.width || 100;
      nodeDoc.height = params.height || 100;
      nodeDoc.fill = params.fill || "#3b82f6";
      nodeDoc.stroke = params.stroke || "#000000";
      nodeDoc.strokeWidth = params.strokeWidth || 2;
      break;

    case "frame":
      nodeDoc.x = params.x;
      nodeDoc.y = params.y;
      nodeDoc.width = params.width || 200;
      nodeDoc.height = params.height || 200;
      nodeDoc.fill = "#ffffff";
      nodeDoc.stroke = params.stroke || "#9ca3af";
      nodeDoc.strokeWidth = params.strokeWidth || 2;
      break;
  }

  try {
    // Create node in Firestore using Firebase Admin SDK
    // Nodes are stored in canvases/{canvasId}/nodes subcollection
    const nodesRef = db.collection(`canvases/${context.canvasId}/nodes`);
    const docRef = await nodesRef.add(nodeDoc);

    return { success: true, nodeId: docRef.id };
  } catch (error) {
    console.error("Error creating node:", error);
    throw error;
  }
}

/**
 * Update an existing node in Firestore
 */
export async function updateNodeInFirestore(
  nodeId: string,
  updates: Partial<CreateNodeInput> & {
    rotation?: number;
    opacity?: number;
    name?: string;
  }
) {
  const context = getExecutionContext();
  const db = getAdminFirestore();

  try {
    const nodeRef = db
      .collection(`canvases/${context.canvasId}/nodes`)
      .doc(nodeId);

    // Update the node with new values
    await nodeRef.update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: context.userId,
      version: FieldValue.increment(1),
    });

    return { success: true, nodeId };
  } catch (error) {
    console.error("Error updating node:", error);
    throw error;
  }
}

/**
 * Delete a node from Firestore
 */
export async function deleteNodeInFirestore(nodeId: string) {
  const context = getExecutionContext();
  const db = getAdminFirestore();

  try {
    const nodeRef = db
      .collection(`canvases/${context.canvasId}/nodes`)
      .doc(nodeId);

    await nodeRef.delete();

    return { success: true, nodeId };
  } catch (error) {
    console.error("Error deleting node:", error);
    throw error;
  }
}

/**
 * Get all nodes for the current canvas to help AI find shapes
 */
export async function getNodesFromFirestore() {
  const context = getExecutionContext();
  const db = getAdminFirestore();

  try {
    const nodesSnapshot = await db
      .collection(`canvases/${context.canvasId}/nodes`)
      .where("pageId", "==", context.currentPageId)
      .get();

    const nodes = nodesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return nodes;
  } catch (error) {
    console.error("Error fetching nodes:", error);
    throw error;
  }
}

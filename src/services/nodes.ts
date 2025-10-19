import { runTransaction, serverTimestamp, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function createNodeTx(
  canvasId: string,
  nodeId: string,
  data: Partial<{
    type:
      | "frame"
      | "group"
      | "rectangle"
      | "circle"
      | "text"
      | "line"
      | "triangle";
    pageId: string;
    parentId: string | null;
    orderKey: number;
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    rotation: number;
    opacity: number;
    text: string;
    fontSize: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
    name: string;
  }>,
  uid: string
) {
  const ref = doc(db, `canvases/${canvasId}/nodes/${nodeId}`);
  await runTransaction(db, async (tx) => {
    const now = serverTimestamp();
    tx.set(ref, {
      type: data.type,
      pageId: data.pageId,
      parentId: data.parentId ?? null,
      orderKey: data.orderKey ?? 1000,
      x: data.x ?? 0,
      y: data.y ?? 0,
      width: data.width,
      height: data.height,
      radius: data.radius,
      rotation: data.rotation ?? 0,
      opacity: data.opacity ?? 1,
      text: data.text,
      fontSize: data.fontSize,
      startX: data.startX,
      startY: data.startY,
      endX: data.endX,
      endY: data.endY,
      fill: data.fill,
      stroke: data.stroke,
      strokeWidth: data.strokeWidth,
      name: data.name,
      isVisible: true,
      isLocked: false,
      createdBy: uid,
      createdAt: now,
      updatedBy: uid,
      updatedAt: now,
      version: 1,
    });
  });
}

export async function updateNodeTx(
  canvasId: string,
  nodeId: string,
  patch: Partial<{
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    rotation: number;
    opacity: number;
    text: string;
    fontSize: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
    isVisible: boolean;
    isLocked: boolean;
    name: string;
    pageId: string;
    parentId: string | null;
    orderKey: number;
  }>,
  uid: string
) {
  const ref = doc(db, `canvases/${canvasId}/nodes/${nodeId}`);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const now = serverTimestamp();
    const cur = snap.data();

    // Filter out undefined values
    const filteredPatch = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined)
    );

    tx.update(ref, {
      ...filteredPatch,
      version: (cur.version ?? 0) + 1,
      updatedAt: now,
      updatedBy: uid,
    });
  });
}

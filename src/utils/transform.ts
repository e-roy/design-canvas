/**
 * Transform utilities for hierarchical coordinate systems
 * Matrix format: [a, b, c, d, tx, ty] representing a 2D affine transformation
 * No scale support in v3 - only translation and rotation
 */

import { TransformMatrix, TransformState } from "@/types/page";

const D2R = (degrees: number): number => (degrees * Math.PI) / 180;
const R2D = (radians: number): number => (radians * 180) / Math.PI;

/**
 * Create a transformation matrix from translation and rotation
 * @param x - X translation
 * @param y - Y translation
 * @param rotDeg - Rotation in degrees
 * @returns Transform matrix [a, b, c, d, tx, ty]
 */
export const makeTR = (
  x: number,
  y: number,
  rotDeg: number
): TransformMatrix => {
  const theta = D2R(rotDeg || 0);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return [cos, sin, -sin, cos, x, y];
};

/**
 * Multiply two transformation matrices
 * @param A - First matrix
 * @param B - Second matrix
 * @returns Resulting matrix A * B
 */
export const mul = (
  A: TransformMatrix,
  B: TransformMatrix
): TransformMatrix => {
  const [a1, b1, c1, d1, tx1, ty1] = A;
  const [a2, b2, c2, d2, tx2, ty2] = B;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * tx2 + c1 * ty2 + tx1,
    b1 * tx2 + d1 * ty2 + ty1,
  ];
};

/**
 * Invert a transformation matrix
 * @param M - Matrix to invert
 * @returns Inverted matrix
 */
export const inv = (M: TransformMatrix): TransformMatrix => {
  const [a, b, c, d, tx, ty] = M;
  const det = a * d - b * c || 1e-12; // Avoid division by zero
  const ia = d / det;
  const ib = -b / det;
  const ic = -c / det;
  const id = a / det;
  const itx = -(ia * tx + ic * ty);
  const ity = -(ib * tx + id * ty);
  return [ia, ib, ic, id, itx, ity];
};

/**
 * Extract translation and rotation from a transformation matrix
 * @param M - Matrix to extract from
 * @returns Transform state with x, y, rotation
 */
export const extractTR = (M: TransformMatrix): TransformState => ({
  x: M[4],
  y: M[5],
  rotation: R2D(Math.atan2(M[1], M[0])),
});

/**
 * Compute local transform for a node when moving to a new parent
 * @param WparentA - World transform of current parent
 * @param nodeLocal - Current local transform of node
 * @param WparentB - World transform of new parent
 * @returns New local transform relative to new parent
 */
export function computeLocalForNewParent(
  WparentA: TransformMatrix,
  nodeLocal: TransformState,
  WparentB: TransformMatrix
): TransformState {
  // Compute world transform of node: Wnode = WparentA * nodeLocal
  const Wnode = mul(
    WparentA,
    makeTR(nodeLocal.x, nodeLocal.y, nodeLocal.rotation)
  );

  // Compute new local transform: localB = WparentB^-1 * Wnode
  const localB = mul(inv(WparentB), Wnode);

  return extractTR(localB);
}

/**
 * Build world transform for a node by walking from root to node
 * @param ancestors - Array of ancestor transforms from root to parent (not including node itself)
 * @returns World transform matrix
 */
export function buildWorldTransform(
  ancestors: TransformState[]
): TransformMatrix {
  let world: TransformMatrix = [1, 0, 0, 1, 0, 0]; // Identity matrix

  for (const ancestor of ancestors) {
    world = mul(world, makeTR(ancestor.x, ancestor.y, ancestor.rotation));
  }

  return world;
}

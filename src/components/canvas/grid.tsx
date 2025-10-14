"use client";

import React from "react";
import { Group, Line } from "react-konva";
import { GridProps } from "./types";

export function CanvasGrid({
  size,
  virtualWidth,
  virtualHeight,
  show,
  scale = 1,
}: GridProps) {
  if (!show) return null;

  const lines = [];

  // Scale stroke width based on viewport scale for consistent visual weight
  const baseStrokeWidth = 1 / scale;
  const majorStrokeWidth = 1.5 / scale;

  // Vertical lines - within canvas boundaries only
  for (let x = 0; x <= virtualWidth; x += size) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, virtualHeight]}
        stroke="#e5e7eb"
        strokeWidth={x % (size * 5) === 0 ? majorStrokeWidth : baseStrokeWidth}
        opacity={x % (size * 5) === 0 ? 0.8 : 0.4}
        listening={false}
      />
    );
  }

  // Horizontal lines - within canvas boundaries only
  for (let y = 0; y <= virtualHeight; y += size) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, virtualWidth, y]}
        stroke="#e5e7eb"
        strokeWidth={y % (size * 5) === 0 ? majorStrokeWidth : baseStrokeWidth}
        opacity={y % (size * 5) === 0 ? 0.8 : 0.4}
        listening={false}
      />
    );
  }

  // Major grid lines (every 5th line)
  const majorLines = [];

  for (let x = 0; x <= virtualWidth; x += size * 5) {
    majorLines.push(
      <Line
        key={`major-v-${x}`}
        points={[x, 0, x, virtualHeight]}
        stroke="#d1d5db"
        strokeWidth={majorStrokeWidth * 1.2}
        opacity={0.6}
        listening={false}
      />
    );
  }

  for (let y = 0; y <= virtualHeight; y += size * 5) {
    majorLines.push(
      <Line
        key={`major-h-${y}`}
        points={[0, y, virtualWidth, y]}
        stroke="#d1d5db"
        strokeWidth={majorStrokeWidth * 1.2}
        opacity={0.6}
        listening={false}
      />
    );
  }

  return (
    <Group listening={false}>
      {/* Regular grid lines */}
      {lines}

      {/* Major grid lines */}
      {majorLines}
    </Group>
  );
}

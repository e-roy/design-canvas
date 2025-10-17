import type { KonvaEventObject } from "konva/lib/Node";
import type { CanvasViewport, Point, CursorPosition } from "@/types";
import { screenToVirtual } from "@/lib/canvas/canvas-utils";

interface MouseHandlersProps {
  viewport: CanvasViewport;
  onMouseMove?: (position: CursorPosition) => void;
  onStageMouseDown?: (point: Point) => void;
  onStageMouseMove?: (point: Point) => void;
  onStageMouseUp?: (point: Point) => void;
  onStageClick?: (point: Point) => void;
  onWheel?: (
    e: WheelEvent,
    stage: { getPointerPosition: () => { x: number; y: number } | null }
  ) => void;
}

export const createMouseHandlers = ({
  viewport,
  onMouseMove,
  onStageMouseDown,
  onStageMouseMove,
  onStageMouseUp,
  onStageClick,
  onWheel,
}: MouseHandlersProps) => {
  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert screen coordinates to virtual canvas coordinates
    const virtualPoint = screenToVirtual(pointer, viewport);
    onStageMouseDown?.(virtualPoint);
  };

  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert screen coordinates to virtual canvas coordinates
    const virtualPoint = screenToVirtual(pointer, viewport);

    // Update cursor position
    if (onMouseMove) {
      const virtualPosition: CursorPosition = {
        x: virtualPoint.x,
        y: virtualPoint.y,
        timestamp: Date.now(),
      };
      onMouseMove(virtualPosition);
    }

    onStageMouseMove?.(virtualPoint);
  };

  const handleStageMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert screen coordinates to virtual canvas coordinates
    const virtualPoint = screenToVirtual(pointer, viewport);
    onStageMouseUp?.(virtualPoint);
  };

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert screen coordinates to virtual canvas coordinates
    const virtualPoint = screenToVirtual(pointer, viewport);
    onStageClick?.(virtualPoint);
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    onWheel?.(e.evt, stage);
  };

  return {
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    handleStageClick,
    handleWheel,
  };
};

import type { Shape } from "@/types";

interface ShapeHandlersProps {
  currentTool: string;
  selectedShapeIds: string[];
  onShapeSelect: (id: string) => void;
  onShapeDragStart: (id: string) => void;
  onShapeDragMove: (id: string, x: number, y: number) => void;
  onShapeDragEnd: (id: string, finalX?: number, finalY?: number) => void;
  onShapeChange: (id: string, updates: Partial<Shape>) => void;
  setSelectedShapeIds: (ids: string[]) => void;
}

export const createShapeHandlers = ({
  currentTool,
  selectedShapeIds,
  onShapeSelect,
  onShapeDragStart,
  onShapeDragMove,
  onShapeDragEnd,
  onShapeChange,
  setSelectedShapeIds,
}: ShapeHandlersProps) => {
  const handleShapeSelect = (id: string) => {
    if (currentTool === "select") {
      setSelectedShapeIds([id]);
      onShapeSelect(id);
    }
  };

  const handleShapeDragStart = (id: string) => {
    onShapeDragStart(id);
  };

  const handleShapeDragMove = (id: string, x: number, y: number) => {
    onShapeDragMove(id, x, y);
  };

  const handleShapeDragEnd = (id: string, finalX?: number, finalY?: number) => {
    onShapeDragEnd(id, finalX, finalY);
  };

  const handleShapeChange = (id: string, updates: Partial<Shape>) => {
    onShapeChange(id, updates);
  };

  const handleDeselectAll = () => {
    setSelectedShapeIds([]);
  };

  const handleDeleteShape = (
    id: string,
    onShapeDelete?: (id: string) => void
  ) => {
    if (onShapeDelete) {
      onShapeDelete(id);
    }
    setSelectedShapeIds(
      selectedShapeIds.filter((selectedId) => selectedId !== id)
    );
  };

  const handleClearCanvas = (
    shapes: Shape[],
    onShapeDelete?: (id: string) => void
  ) => {
    // Clear all shapes - parent component should handle database cleanup
    shapes.forEach((shape) => {
      if (onShapeDelete) {
        onShapeDelete(shape.id);
      }
    });
    setSelectedShapeIds([]);
  };

  return {
    handleShapeSelect,
    handleShapeDragStart,
    handleShapeDragMove,
    handleShapeDragEnd,
    handleShapeChange,
    handleDeselectAll,
    handleDeleteShape,
    handleClearCanvas,
  };
};

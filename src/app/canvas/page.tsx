"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { CompactPresence } from "@/components/compact-presence";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
} from "@/components/ui/sidebar";
import { CustomSidebarTrigger } from "@/components/canvas/sidebar-triggers";
import { useUserStore } from "@/store/user-store";
import { useCursorStore } from "@/store/cursor-store";
import {
  useCanvasDocument,
  useCanvasShapes,
  useCanvasError,
  useCanvasTool,
  useCanvasDimensions,
  useCanvasActions,
  useSelectedShapeIds,
} from "@/store/canvas-store";
import {
  Canvas,
  CanvasRef,
  PropertiesPanel,
  ObjectsList,
  Toolbar,
} from "@/components/canvas";
import { StoredShape, CursorPosition, Shape } from "@/types";
import { cursorManager } from "@/lib/cursor-manager";

// Use a fixed document ID for the main collaborative canvas
const MAIN_CANVAS_ID = "main-collaborative-canvas";

export default function CanvasPage() {
  const canvasRef = useRef<CanvasRef>(null);
  const { user } = useUserStore();
  const { setCursors } = useCursorStore();

  // Sidebar state management - memoized to prevent unnecessary re-renders
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // Use the canvas store
  const canvasDocument = useCanvasDocument();
  const shapes = useCanvasShapes();
  const canvasError = useCanvasError();
  const currentTool = useCanvasTool();
  const canvasDimensions = useCanvasDimensions();
  const selectedShapeIds = useSelectedShapeIds();
  const {
    setDocumentId,
    saveShape,
    updateShape,
    deleteShape,
    setCurrentTool,
    setCanvasDimensions,
    setSelectedShapeIds,
  } = useCanvasActions();

  // Memoized dimension calculation function
  const calculateCanvasDimensions = useCallback(() => {
    // Calculate available width accounting for sidebars
    // Convert 16rem to pixels using the actual rem value
    const remValue = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
    const sidebarWidth = 16 * remValue; // 16rem in actual pixels

    let availableWidth = window.innerWidth;

    // Subtract sidebar widths when they are open
    if (leftSidebarOpen) {
      availableWidth -= sidebarWidth;
    }
    if (rightSidebarOpen) {
      availableWidth -= sidebarWidth;
    }

    return {
      width: Math.max(400, availableWidth), // Minimum 400px width
      height: Math.max(400, window.innerHeight), // Full height since no header
    };
  }, [leftSidebarOpen, rightSidebarOpen]);

  // Memoized mouse move handler
  const handleMouseMove = useCallback(
    (position: CursorPosition) => {
      if (user) {
        cursorManager.updateCursorPosition(position);
      }
    },
    [user]
  );

  // Consolidated initialization and setup effect
  useEffect(() => {
    // Initialize canvas document ID
    setDocumentId(MAIN_CANVAS_ID);

    // Set up cursor tracking if user exists
    if (user) {
      cursorManager.setUser({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });

      // Subscribe to cursor updates
      const unsubscribeCursors = cursorManager.subscribeToCanvasCursors(
        (newCursors) => {
          setCursors(newCursors);
        }
      );

      // Cleanup cursor tracking
      return () => {
        unsubscribeCursors();
        cursorManager.clearUserCursor();
      };
    }
  }, [setDocumentId, user, setCursors]);

  // Optimized dimensions effect with debouncing
  useEffect(() => {
    const updateDimensions = () => {
      requestAnimationFrame(() => {
        const dimensions = calculateCanvasDimensions();
        setCanvasDimensions(dimensions);
      });
    };

    // Initial update
    const timeoutId = setTimeout(updateDimensions, 0);

    // Debounced resize handler
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateDimensions, 100);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
    };
  }, [calculateCanvasDimensions, setCanvasDimensions]);

  // Memoized event handlers for better performance
  const handleShapeDelete = useCallback(
    (shapeId: string) => {
      if (canvasDocument) {
        deleteShape(shapeId);
      }
    },
    [canvasDocument, deleteShape]
  );

  const handleShapeUpdate = useCallback(
    (shapeId: string, updates: Partial<Shape>) => {
      if (canvasDocument) {
        // Filter out undefined values for Firestore
        const updateData: Partial<StoredShape> = {};

        if (updates.x !== undefined) updateData.x = updates.x;
        if (updates.y !== undefined) updateData.y = updates.y;
        if (updates.width !== undefined) updateData.width = updates.width;
        if (updates.height !== undefined) updateData.height = updates.height;
        if (updates.radius !== undefined) updateData.radius = updates.radius;
        if (updates.text !== undefined) updateData.text = updates.text;
        if (updates.fontSize !== undefined)
          updateData.fontSize = updates.fontSize;
        if (updates.fill !== undefined) updateData.fill = updates.fill;
        if (updates.stroke !== undefined) updateData.stroke = updates.stroke;
        if (updates.strokeWidth !== undefined)
          updateData.strokeWidth = updates.strokeWidth;
        if (updates.rotation !== undefined)
          updateData.rotation = updates.rotation;
        if (updates.zIndex !== undefined) updateData.zIndex = updates.zIndex;

        // Only update if there are actual changes
        if (Object.keys(updateData).length > 0) {
          // Fire and forget - don't await to avoid blocking the UI
          updateShape(shapeId, updateData).catch((error) => {
            console.error("Error updating shape:", error);
          });
        }
      }
    },
    [canvasDocument, updateShape]
  );

  const handleToolChange = useCallback(
    (tool: "select" | "pan" | "rectangle" | "circle" | "text" | "line") => {
      setCurrentTool(tool);
      canvasRef.current?.setTool(tool);
    },
    [setCurrentTool]
  );

  const handleShapeSelect = useCallback(
    (shapeId: string) => {
      setSelectedShapeIds([shapeId]);
    },
    [setSelectedShapeIds]
  );

  // Memoized sidebar toggle handlers
  const handleLeftSidebarToggle = useCallback(() => {
    setLeftSidebarOpen((prev) => !prev);
  }, []);

  const handleRightSidebarToggle = useCallback(() => {
    setRightSidebarOpen((prev) => !prev);
  }, []);

  // Memoized canvas shapes conversion
  const canvasShapes: Shape[] = useMemo(
    () =>
      shapes.map((storedShape) => ({
        id: storedShape.id,
        canvasId: storedShape.canvasId,
        type: storedShape.type,
        x: storedShape.x,
        y: storedShape.y,
        width: storedShape.width,
        height: storedShape.height,
        radius: storedShape.radius,
        text: storedShape.text,
        fontSize: storedShape.fontSize,
        fill: storedShape.fill,
        stroke: storedShape.stroke,
        strokeWidth: storedShape.strokeWidth,
        rotation: storedShape.rotation,
        zIndex: storedShape.zIndex,
      })),
    [shapes]
  );

  const handleShapeCreate = useCallback(
    async (shape: Shape) => {
      if (!canvasDocument || !user) {
        return;
      }

      try {
        // Filter out undefined values for Firestore
        const shapeData: Partial<
          Omit<StoredShape, "id" | "createdAt" | "updatedAt" | "updatedBy">
        > & { createdBy: string } = {
          x: shape.x,
          y: shape.y,
          type: shape.type,
          zIndex: shape.zIndex || Date.now(),
          createdBy: user.uid,
        };

        // Only add defined properties
        if (shape.width !== undefined) shapeData.width = shape.width;
        if (shape.height !== undefined) shapeData.height = shape.height;
        if (shape.radius !== undefined) shapeData.radius = shape.radius;
        if (shape.text !== undefined) shapeData.text = shape.text;
        if (shape.fontSize !== undefined) shapeData.fontSize = shape.fontSize;
        if (shape.fill !== undefined) shapeData.fill = shape.fill;
        if (shape.stroke !== undefined) shapeData.stroke = shape.stroke;
        if (shape.strokeWidth !== undefined)
          shapeData.strokeWidth = shape.strokeWidth;
        if (shape.rotation !== undefined) shapeData.rotation = shape.rotation;

        await saveShape(
          shapeData as Omit<
            StoredShape,
            "id" | "createdAt" | "updatedAt" | "updatedBy"
          >
        );
      } catch (error) {
        console.error("Error saving shape:", error);
      }
    },
    [canvasDocument, user, saveShape]
  );

  // Memoized selected shape calculation
  const selectedShape = useMemo(
    () =>
      selectedShapeIds.length === 1
        ? shapes.find((shape) => shape.id === selectedShapeIds[0]) || null
        : null,
    [selectedShapeIds, shapes]
  );

  // Show error if canvas doesn't exist (user needs to create it manually)
  if (
    canvasError ===
    "Canvas not found. Please check if the canvas document exists in Firebase."
  ) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-6">
            <h2 className="text-xl font-semibold mb-4">
              Canvas Setup Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The collaborative canvas document needs to be created in Firebase.
            </p>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-left text-sm">
              <p className="font-medium mb-2">To create the canvas document:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                <li>Go to Firebase Console → Firestore Database</li>
                <li>
                  Create a new document in &apos;canvas_documents&apos;
                  collection
                </li>
                <li>
                  Set Document ID:&nbsp;
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                    main-collaborative-canvas
                  </code>
                </li>
                <li>Add these fields:</li>
              </ol>
              <pre className="mt-2 text-xs bg-gray-200 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                {`{
  "name": "Main Collaborative Canvas",
  "description": "A collaborative canvas for real-time editing",
  "createdBy": "your-user-id",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "lastEditedBy": "your-user-id",
  "collaborators": ["your-user-id"],
  "isPublic": true,
  "version": 1
}`}
              </pre>
            </div>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry Loading Canvas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <SidebarProvider open={leftSidebarOpen} onOpenChange={setLeftSidebarOpen}>
        <Sidebar side="left" className="border-r">
          <SidebarHeader className="border-b">
            <div className="flex items-center justify-between p-2">
              <h1 className="text-lg font-semibold">Design Canvas</h1>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <ObjectsList
              shapes={shapes}
              selectedShapeIds={selectedShapeIds}
              onShapeSelect={handleShapeSelect}
            />
          </SidebarContent>

          <SidebarFooter className="border-t">
            <div className="p-2">
              <UserAvatar />
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset>
          <div className="flex h-screen relative">
            {/* Canvas Area */}
            <div className="flex-1 relative bg-white dark:bg-gray-800">
              <Canvas
                ref={canvasRef}
                width={canvasDimensions.width}
                height={canvasDimensions.height}
                shapes={canvasShapes}
                onShapeCreate={handleShapeCreate}
                onShapeUpdate={handleShapeUpdate}
                onShapeDelete={handleShapeDelete}
                onToolChange={setCurrentTool}
                onMouseMove={handleMouseMove}
                currentUserId={user?.uid}
                className="w-full h-full"
              />

              {/* Toolbar */}
              <Toolbar
                currentTool={currentTool}
                onToolChange={handleToolChange}
              />
            </div>

            {/* Right Sidebar */}
            <SidebarProvider
              open={rightSidebarOpen}
              onOpenChange={setRightSidebarOpen}
            >
              <Sidebar side="right" className="border-l">
                <SidebarHeader className="border-b">
                  <div className="flex items-center justify-between p-2">
                    <CompactPresence
                      projectId={MAIN_CANVAS_ID}
                      showCount={true}
                    />
                  </div>
                </SidebarHeader>

                <SidebarContent>
                  <PropertiesPanel
                    selectedShape={selectedShape}
                    onShapeUpdate={handleShapeUpdate}
                    onShapeDelete={handleShapeDelete}
                  />
                </SidebarContent>
              </Sidebar>
            </SidebarProvider>
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* Custom Sidebar Triggers */}
      <CustomSidebarTrigger
        side="left"
        onToggle={handleLeftSidebarToggle}
        isOpen={leftSidebarOpen}
      />
      <CustomSidebarTrigger
        side="right"
        onToggle={handleRightSidebarToggle}
        isOpen={rightSidebarOpen}
      />
    </div>
  );
}

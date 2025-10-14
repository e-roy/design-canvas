"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { CompactPresence } from "@/components/compact-presence";
import { useCanvas } from "@/hooks/use-canvas";
import { useUserStore } from "@/store/user-store";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Canvas, CanvasRef, Shape } from "@/components/canvas";
import { StoredShape, CanvasCursorState, CursorPosition } from "@/types";
import { cursorManager } from "@/lib/cursor-manager";
import { Square, Circle, MousePointer, Hand } from "lucide-react";

// Use a fixed document ID for the main collaborative canvas
const MAIN_CANVAS_ID = "main-collaborative-canvas";

export default function CanvasPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTool, setCurrentTool] = useState<
    "select" | "pan" | "rectangle" | "circle" | "text"
  >("select");
  const [cursors, setCursors] = useState<CanvasCursorState>({});
  const router = useRouter();
  const canvasRef = useRef<CanvasRef>(null);
  const { user } = useUserStore();

  // Use the canvas collaboration hook
  const {
    canvasDocument,
    shapes,
    error: canvasError,
    saveShape,
    updateShape,
    deleteShape,
  } = useCanvas(MAIN_CANVAS_ID);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.push("/login");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Set up cursor tracking
  useEffect(() => {
    if (user && isAuthenticated) {
      // Set the user for cursor tracking
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

      return () => {
        unsubscribeCursors();
        cursorManager.clearUserCursor();
      };
    }
  }, [user, isAuthenticated]);

  // Handle mouse movement for cursor tracking
  const handleMouseMove = (position: CursorPosition) => {
    if (user && isAuthenticated) {
      cursorManager.updateCursorPosition(position);
    }
  };

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

  // Handle shape deletion
  const handleShapeDelete = (shapeId: string) => {
    if (canvasDocument) {
      deleteShape(shapeId);
    }
  };

  // Handle shape updates (movement, resizing, etc.)
  const handleShapeUpdate = (shapeId: string, updates: Partial<Shape>) => {
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
  };

  const handleToolChange = (
    tool: "select" | "pan" | "rectangle" | "circle" | "text"
  ) => {
    setCurrentTool(tool);
    canvasRef.current?.setTool(tool);
  };

  // Convert database shapes to canvas shapes for rendering
  const canvasShapes: Shape[] = shapes.map((storedShape) => ({
    id: storedShape.id,
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
  }));

  const handleShapeCreate = async (shape: Shape) => {
    if (!canvasDocument || !user) return;

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
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Design Canvas</h1>
          </div>

          {/* Center - Online Users */}
          <div className="flex-1 flex justify-center">
            <CompactPresence projectId="canvas" showCount={true} />
          </div>

          <div className="flex items-center gap-2">
            <UserAvatar />
          </div>
        </div>
      </header>

      {/* Canvas Area */}
      <main className="flex-1 relative">
        <div className="absolute inset-0 bg-white dark:bg-gray-800">
          <Canvas
            ref={canvasRef}
            width={typeof window !== "undefined" ? window.innerWidth : 1200}
            height={
              typeof window !== "undefined" ? window.innerHeight - 80 : 800
            }
            shapes={canvasShapes}
            onShapeCreate={handleShapeCreate}
            onShapeUpdate={handleShapeUpdate}
            onShapeDelete={handleShapeDelete}
            onToolChange={setCurrentTool}
            onMouseMove={handleMouseMove}
            cursors={cursors}
            currentUserId={user?.uid}
            className="w-full h-full"
          />
        </div>
      </main>

      {/* Toolbar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
          <div className="flex items-center gap-2">
            <Button
              variant={currentTool === "select" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolChange("select")}
              className="flex items-center gap-2"
            >
              <MousePointer className="w-4 h-4" />
              Select
            </Button>
            {/* <Button
              variant={currentTool === "pan" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolChange("pan")}
              className="flex items-center gap-2"
            >
              <Hand className="w-4 h-4" />
              Pan
            </Button> */}
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />
            <Button
              variant={currentTool === "rectangle" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolChange("rectangle")}
              className="flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Rectangle
            </Button>
            <Button
              variant={currentTool === "circle" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolChange("circle")}
              className="flex items-center gap-2"
            >
              <Circle className="w-4 h-4" />
              Circle
            </Button>
            {/* <Button
              variant={currentTool === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolChange("text")}
              className="flex items-center gap-2"
            >
              <Type className="w-4 h-4" />
              Text
            </Button> */}
          </div>
        </div>
      </div>
    </div>
  );
}

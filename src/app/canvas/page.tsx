"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Canvas, CanvasRef, Shape } from "@/components/canvas";
import { Square, Circle, Type, MousePointer, Hand } from "lucide-react";

export default function CanvasPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTool, setCurrentTool] = useState<
    "select" | "pan" | "rectangle" | "circle" | "text"
  >("select");
  const router = useRouter();
  const canvasRef = useRef<CanvasRef>(null);

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

  const handleToolChange = (
    tool: "select" | "pan" | "rectangle" | "circle" | "text"
  ) => {
    setCurrentTool(tool);
    canvasRef.current?.setTool(tool);
  };

  const handleShapeCreate = (shape: Shape) => {
    console.log("Shape created:", shape);
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
            onShapeCreate={handleShapeCreate}
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
            <Button
              variant={currentTool === "pan" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolChange("pan")}
              className="flex items-center gap-2"
            >
              <Hand className="w-4 h-4" />
              Pan
            </Button>
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

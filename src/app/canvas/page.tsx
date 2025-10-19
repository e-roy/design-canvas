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
import { usePages } from "@/hooks/usePages";
import { useNodes } from "@/hooks/useNodes";
import {
  useCanvasDocument,
  useCanvasNodes,
  useCanvasError,
  useCanvasTool,
  useCanvasDimensions,
  useSelectedShapeIds,
  useCanvasSetDocumentId,
  useCanvasSetCurrentTool,
  useCanvasSetCanvasDimensions,
  useCanvasSetSelectedShapeIds,
  useCanvasLoadViewportFromStorage,
  useCanvasLoadPageFromStorage,
  useCanvasPages,
  useCanvasCurrentPageId,
  useCanvasSetCurrentPageId,
  useCanvasStore,
} from "@/store/canvas-store";
import {
  Canvas,
  CanvasRef,
  PropertiesPanel,
  Toolbar,
  AiChatPanel,
} from "@/components/canvas";
import { SidebarLayout } from "@/components/canvas/sidebar-layout";
import { ConnectionStatus } from "@/components/connection-status";
import { CursorPosition, Shape } from "@/types";
import { NodeDoc } from "@/types/page";
import { cursorManager } from "@/lib/cursor-manager";
import { reorderSiblingTx, reparentTx } from "@/services/nodes";
import type { DropPosition } from "@/hooks/useLayerDragDrop";
import type { CommandExecutorContext } from "@/lib/ai-command-executor";

// Use a fixed document ID for the main collaborative canvas
const MAIN_CANVAS_ID = "main-collaborative-canvas";

export default function CanvasPage() {
  const canvasRef = useRef<CanvasRef>(null);
  const { user, _hasHydrated } = useUserStore();
  const { setCursors } = useCursorStore();

  // Sidebar state management with localStorage persistence
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPage, setIsCreatingPage] = useState(false);

  // Use specific canvas store selectors to minimize re-renders
  const canvasDocument = useCanvasDocument();
  const nodes = useCanvasNodes();
  const canvasError = useCanvasError();
  const currentTool = useCanvasTool();
  const canvasDimensions = useCanvasDimensions();
  const selectedShapeIds = useSelectedShapeIds();
  const pages = useCanvasPages();
  const currentPageId = useCanvasCurrentPageId();
  const documentId = useCanvasStore((state) => state.documentId);
  const viewport = useCanvasStore((state) => state.viewport);

  // Check if the current page actually exists
  const currentPageExists =
    currentPageId && pages.some((page) => page.id === currentPageId);

  // Use individual action selectors to prevent re-renders
  const setDocumentId = useCanvasSetDocumentId();
  const setCurrentTool = useCanvasSetCurrentTool();
  const setCanvasDimensions = useCanvasSetCanvasDimensions();
  const setSelectedShapeIds = useCanvasSetSelectedShapeIds();
  const loadViewportFromStorage = useCanvasLoadViewportFromStorage();
  const loadPageFromStorage = useCanvasLoadPageFromStorage();
  const setCurrentPageId = useCanvasSetCurrentPageId();

  // No more store-based node actions needed!

  // Use custom hooks for pages and nodes subscriptions
  // These hooks handle all the subscription logic internally
  const pagesActions = usePages(documentId);
  const nodesActions = useNodes(documentId, currentPageId);

  // Use refs to access current sidebar state without causing re-renders
  // const leftSidebarOpenRef = useRef(leftSidebarOpen);
  // const rightSidebarOpenRef = useRef(rightSidebarOpen);

  // Ensure a page is selected when pages load (only if no page was loaded from storage)
  useEffect(() => {
    if (pages.length > 0 && !currentPageId) {
      // Only select the first page if no page was loaded from storage
      // This prevents overriding the persisted page selection
      setCurrentPageId(pages[0].id);
    }
  }, [pages, currentPageId, setCurrentPageId]);

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
    (
      position: CursorPosition,
      viewport: { x: number; y: number; scale: number }
    ) => {
      if (user) {
        cursorManager.updateCursorPosition(position, viewport);
      }
    },
    [user]
  );

  // Update cursor manager with viewport changes
  // Note: Viewport is now included with each cursor position update for synchronization
  const handleViewportChange = useCallback(
    (_viewport: { x: number; y: number; scale: number }) => {
      // Viewport changes are automatically sent with cursor updates
      // No separate update needed for cursor manager
    },
    []
  );

  // Initialize canvas document ID and load persisted state
  useEffect(() => {
    setDocumentId(MAIN_CANVAS_ID);

    // Load persisted state from localStorage
    if (typeof window !== "undefined") {
      try {
        // Load sidebar states
        const sidebarState = localStorage.getItem("design-canvas-sidebars");
        if (sidebarState) {
          const parsed = JSON.parse(sidebarState);
          if (typeof parsed.leftOpen === "boolean") {
            setLeftSidebarOpen(parsed.leftOpen);
          }
          if (typeof parsed.rightOpen === "boolean") {
            setRightSidebarOpen(parsed.rightOpen);
          }
        }

        // Load viewport state
        loadViewportFromStorage();

        // Load current page state
        loadPageFromStorage();
      } catch (error) {
        console.warn("Failed to load persisted state:", error);
      }
    }

    setIsLoading(false);
  }, [setDocumentId, loadViewportFromStorage, loadPageFromStorage]);

  // Subscriptions are now handled by usePages and useNodes hooks above
  // No manual subscription management needed!

  // Set up cursor tracking when user changes
  useEffect(() => {
    // Wait for store hydration before initializing cursor manager
    if (!_hasHydrated || !user) return;

    cursorManager.setUser({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    });

    // Update current page if we have one
    if (currentPageId) {
      cursorManager.updateCurrentPage(currentPageId);
    }

    // Subscribe to cursor updates
    const unsubscribeCursors = cursorManager.subscribeToCanvasCursors(
      (newCursors) => {
        setCursors(newCursors);
      },
      currentPageId
    );

    // Cleanup cursor tracking
    return () => {
      unsubscribeCursors();
      cursorManager.clearUserCursor();
    };
  }, [user, _hasHydrated, setCursors, currentPageId]);

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
      if (canvasDocument && user) {
        nodesActions.deleteNode(shapeId);
      }
    },
    [canvasDocument, nodesActions, user]
  );

  const handleShapeUpdate = useCallback(
    (shapeId: string, updates: Partial<Shape>) => {
      if (canvasDocument && user) {
        // Filter out undefined values for Firestore
        const updateData: Partial<NodeDoc> = {};

        if (updates.x !== undefined) updateData.x = updates.x;
        if (updates.y !== undefined) updateData.y = updates.y;
        if (updates.width !== undefined) updateData.width = updates.width;
        if (updates.height !== undefined) updateData.height = updates.height;
        if (updates.radius !== undefined) updateData.radius = updates.radius;
        if (updates.text !== undefined) updateData.text = updates.text;
        if (updates.fontSize !== undefined)
          updateData.fontSize = updates.fontSize;
        if (updates.startX !== undefined) updateData.startX = updates.startX;
        if (updates.startY !== undefined) updateData.startY = updates.startY;
        if (updates.endX !== undefined) updateData.endX = updates.endX;
        if (updates.endY !== undefined) updateData.endY = updates.endY;
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
          nodesActions
            .updateNode(shapeId, updateData, user.uid)
            .catch((error: Error) => {
              console.error("Error updating shape:", error);
            });
        }
      }
    },
    [canvasDocument, nodesActions, user]
  );

  const handleToolChange = useCallback(
    (
      tool:
        | "select"
        | "pan"
        | "rectangle"
        | "circle"
        | "text"
        | "line"
        | "triangle"
        | "frame"
        | "ai-chat"
    ) => {
      setCurrentTool(tool);
      // Don't set tool on canvas for ai-chat since it's not a drawing tool
      if (tool !== "ai-chat") {
        canvasRef.current?.setTool(tool);
      }
    },
    [setCurrentTool]
  );

  const handleShapeSelect = useCallback(
    (shapeId: string) => {
      setSelectedShapeIds([shapeId]);
    },
    [setSelectedShapeIds]
  );

  const handleShapeVisibilityToggle = useCallback(
    async (shapeId: string, visible: boolean) => {
      if (!user) return;
      try {
        await nodesActions.updateNode(
          shapeId,
          { isVisible: visible },
          user.uid
        );
      } catch (error) {
        console.error("Error toggling shape visibility:", error);
      }
    },
    [nodesActions, user]
  );

  // Memoized sidebar toggle handlers with persistence
  const handleLeftSidebarToggle = useCallback(() => {
    setLeftSidebarOpen((prev) => {
      const newState = !prev;
      // Save to localStorage
      if (typeof window !== "undefined") {
        try {
          const currentState = localStorage.getItem("design-canvas-sidebars");
          const sidebarState = currentState ? JSON.parse(currentState) : {};
          sidebarState.leftOpen = newState;
          localStorage.setItem(
            "design-canvas-sidebars",
            JSON.stringify(sidebarState)
          );
        } catch (error) {
          console.warn("Failed to save sidebar state:", error);
        }
      }
      return newState;
    });
  }, []);

  const handleRightSidebarToggle = useCallback(() => {
    setRightSidebarOpen((prev) => {
      const newState = !prev;
      // Save to localStorage
      if (typeof window !== "undefined") {
        try {
          const currentState = localStorage.getItem("design-canvas-sidebars");
          const sidebarState = currentState ? JSON.parse(currentState) : {};
          sidebarState.rightOpen = newState;
          localStorage.setItem(
            "design-canvas-sidebars",
            JSON.stringify(sidebarState)
          );
        } catch (error) {
          console.warn("Failed to save sidebar state:", error);
        }
      }
      return newState;
    });
  }, []);

  // Page management handlers
  const handlePageSelect = useCallback(
    (pageId: string) => {
      setCurrentPageId(pageId);
    },
    [setCurrentPageId]
  );

  const handleCreatePage = useCallback(
    async (name: string) => {
      if (isCreatingPage || !user) return; // Prevent multiple clicks

      try {
        setIsCreatingPage(true);
        const newPageId = await pagesActions.createPage(name, user.uid);
        // Automatically select the newly created page
        if (newPageId) {
          setCurrentPageId(newPageId);
        }
      } catch (error) {
        console.error("Error creating page:", error);
      } finally {
        setIsCreatingPage(false);
      }
    },
    [pagesActions, setCurrentPageId, isCreatingPage, user]
  );

  const handleRenamePage = useCallback(
    async (pageId: string, name: string) => {
      if (!user) return;
      try {
        await pagesActions.renamePage(pageId, name, user.uid);
      } catch (error) {
        console.error("Error renaming page:", error);
      }
    },
    [pagesActions, user]
  );

  const handleRenameNode = useCallback(
    async (nodeId: string, name: string) => {
      if (!user) return;
      try {
        await nodesActions.updateNode(nodeId, { name }, user.uid);
      } catch (error) {
        console.error("Error renaming node:", error);
      }
    },
    [nodesActions, user]
  );

  const handleNodeReorder = useCallback(
    async (
      draggedNodeId: string,
      targetNodeId: string,
      position: DropPosition
    ) => {
      if (!user || !documentId) return;

      try {
        const draggedNode = nodes.find((n) => n.id === draggedNodeId);
        const targetNode = nodes.find((n) => n.id === targetNodeId);

        if (!draggedNode || !targetNode) return;

        // Determine if this is a reparent or reorder operation
        if (position === "inside") {
          // Reparenting into a container (frame or group)
          if (targetNode.type !== "frame" && targetNode.type !== "group") {
            console.warn("Cannot nest inside non-container node");
            return;
          }

          // Reparent to be first child of target
          await reparentTx(
            documentId,
            draggedNodeId,
            targetNodeId,
            null, // insertBeforeId
            null, // insertAfterId
            user.uid
          );
        } else {
          // Check if we're moving within the same parent or changing parents
          const newParentId = targetNode.parentId;

          if (draggedNode.parentId === newParentId) {
            // Same parent - just reorder
            const beforeId = position === "before" ? targetNodeId : null;
            const afterId = position === "after" ? targetNodeId : null;

            await reorderSiblingTx(
              documentId,
              draggedNodeId,
              beforeId,
              afterId,
              user.uid
            );
          } else {
            // Different parent - reparent with position
            const beforeId = position === "before" ? targetNodeId : null;
            const afterId = position === "after" ? targetNodeId : null;

            await reparentTx(
              documentId,
              draggedNodeId,
              newParentId,
              beforeId,
              afterId,
              user.uid
            );
          }
        }
      } catch (error) {
        console.error("Error reordering node:", error);
      }
    },
    [nodes, documentId, user]
  );

  const handleDeletePage = useCallback(
    async (pageId: string) => {
      if (!user) return;
      try {
        await pagesActions.deletePage(pageId, user.uid);
      } catch (error) {
        console.error("Error deleting page:", error);
      }
    },
    [pagesActions, user]
  );

  const handleDuplicatePage = useCallback(
    async (pageId: string) => {
      if (!user) return;

      try {
        const page = pages.find((p) => p.id === pageId);
        if (!page) return;

        // Create the new page
        const newPageId = await pagesActions.createPage(
          `${page.name} Copy`,
          user.uid
        );

        // Get all nodes from the original page
        const originalNodes = nodes.filter((node) => node.pageId === pageId);

        // Create copies of all nodes for the new page
        for (const originalNode of originalNodes) {
          const nodeData = {
            parentId: originalNode.parentId,
            type: originalNode.type,
            name: originalNode.name,
            x: originalNode.x,
            y: originalNode.y,
            width: originalNode.width,
            height: originalNode.height,
            radius: originalNode.radius,
            rotation: originalNode.rotation,
            opacity: originalNode.opacity,
            text: originalNode.text,
            fontSize: originalNode.fontSize,
            startX: originalNode.startX,
            startY: originalNode.startY,
            endX: originalNode.endX,
            endY: originalNode.endY,
            fill: originalNode.fill,
            stroke: originalNode.stroke,
            strokeWidth: originalNode.strokeWidth,
            isVisible: originalNode.isVisible,
            isLocked: originalNode.isLocked,
            zIndex: originalNode.zIndex,
          };

          await nodesActions.createNode(newPageId, nodeData, user.uid);
        }
      } catch (error) {
        console.error("Error duplicating page:", error);
      }
    },
    [pagesActions, nodesActions, pages, nodes, user]
  );

  // Memoized canvas nodes conversion
  const canvasNodes: Shape[] = useMemo(
    () =>
      nodes.map((node) => ({
        id: node.id,
        canvasId: "default", // Use default for now
        pageId: node.pageId,
        parentId: node.parentId,
        orderKey: node.orderKey,
        type: node.type,
        name: node.name, // Include custom name from database
        x: node.x || 0,
        y: node.y || 0,
        width: node.width || 0,
        height: node.height || 0,
        radius: node.radius || 0,
        text: node.text || "",
        fontSize: node.fontSize || 16,
        startX: node.startX || 0,
        startY: node.startY || 0,
        endX: node.endX || 0,
        endY: node.endY || 0,
        fill: node.fill || "#000000",
        stroke: node.stroke || "#000000",
        strokeWidth: node.strokeWidth || 1,
        rotation: node.rotation || 0,
        visible: node.isVisible !== false,
        zIndex: node.zIndex || 0,
        createdBy: node.createdBy,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        updatedBy: node.updatedBy,
        version: node.version,
      })),
    [nodes]
  );

  const getShapeDisplayName = (shape: Shape): string => {
    switch (shape.type) {
      case "text":
        return shape.text || "Text";
      case "rectangle":
        return "Rectangle";
      case "circle":
        return "Circle";
      case "line":
        return "Line";
      case "triangle":
        return "Triangle";
      case "frame":
        return "Frame";
      case "group":
        return "Group";
      default:
        return (
          (shape.type as string).charAt(0).toUpperCase() +
          (shape.type as string).slice(1)
        );
    }
  };

  const handleShapeCreate = useCallback(
    async (shape: Shape) => {
      if (!canvasDocument || !user || !currentPageId) {
        return;
      }

      try {
        const nodeData = {
          parentId: null,
          type: shape.type,
          name: getShapeDisplayName(shape),
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          radius: shape.radius,
          rotation: shape.rotation,
          opacity: 1,
          text: shape.text,
          fontSize: shape.fontSize,
          startX: shape.startX,
          startY: shape.startY,
          endX: shape.endX,
          endY: shape.endY,
          fill: shape.fill,
          stroke: shape.stroke,
          strokeWidth: shape.strokeWidth,
          isVisible: shape.visible ?? true,
          isLocked: false,
          zIndex: shape.zIndex,
        };

        const shapeId = await nodesActions.createNode(
          currentPageId,
          nodeData,
          user.uid
        );

        // Select the newly created shape
        setSelectedShapeIds([shapeId]);
      } catch (error) {
        console.error("Error saving shape:", error);
      }
    },
    [canvasDocument, user, nodesActions, setSelectedShapeIds, currentPageId]
  );

  // Memoized selected shape calculation
  const selectedShape = useMemo(
    () =>
      selectedShapeIds.length === 1
        ? nodes.find((node) => node.id === selectedShapeIds[0]) || null
        : null,
    [selectedShapeIds, nodes]
  );

  // Create command executor context for AI chat
  const commandContext: CommandExecutorContext | undefined = useMemo(() => {
    // Ensure documentId is valid (not empty string or null)
    if (!user || !documentId || documentId.trim() === "") return undefined;

    return {
      canvasId: documentId,
      currentPageId,
      userId: user.uid,
      viewport,
      nodes, // Include current nodes for manipulation commands
      createNode: async (
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
      ) => {
        return await nodesActions.createNode(pageId, nodeData, userId);
      },
      updateNode: async (
        nodeId: string,
        updates: Partial<NodeDoc>,
        userId: string
      ) => {
        return await nodesActions.updateNode(nodeId, updates, userId);
      },
      deleteNode: async (nodeId: string) => {
        return await nodesActions.deleteNode(nodeId);
      },
    };
  }, [user, documentId, currentPageId, viewport, nodes, nodesActions]);

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading canvas...</p>
        </div>
      </div>
    );
  }

  // Show error if canvas creation/loading fails
  if (canvasError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-6">
            <h2 className="text-xl font-semibold mb-4">Canvas Error</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {canvasError}
            </p>
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
              <h1 className="text-lg font-semibold">CollabCanvas</h1>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarLayout
              pages={pages}
              currentPageId={currentPageId}
              onPageSelect={handlePageSelect}
              onCreatePage={() => handleCreatePage("New Page")}
              onRenamePage={handleRenamePage}
              onDuplicatePage={handleDuplicatePage}
              onDeletePage={handleDeletePage}
              nodes={nodes}
              selectedShapeIds={selectedShapeIds}
              onShapeSelect={handleShapeSelect}
              onShapeVisibilityToggle={handleShapeVisibilityToggle}
              onRenameNode={handleRenameNode}
              onNodeReorder={handleNodeReorder}
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
          {/* Connection Status Indicator */}
          <ConnectionStatus />

          {currentPageExists ? (
            <div className="flex h-screen relative">
              {/* Canvas Area */}
              <div className="flex-1 relative bg-white dark:bg-gray-800">
                <Canvas
                  ref={canvasRef}
                  width={canvasDimensions.width}
                  height={canvasDimensions.height}
                  shapes={canvasNodes}
                  canvasId={MAIN_CANVAS_ID}
                  currentPageId={currentPageId}
                  onShapeCreate={handleShapeCreate}
                  onShapeUpdate={handleShapeUpdate}
                  onShapeDelete={handleShapeDelete}
                  onToolChange={handleToolChange}
                  onMouseMove={handleMouseMove}
                  onViewportChange={handleViewportChange}
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
                    {currentTool === "ai-chat" ? (
                      <AiChatPanel
                        commandContext={commandContext}
                        nodes={nodes}
                      />
                    ) : (
                      <PropertiesPanel
                        selectedShape={selectedShape}
                        onShapeUpdate={handleShapeUpdate}
                        onShapeDelete={handleShapeDelete}
                      />
                    )}
                  </SidebarContent>
                </Sidebar>
              </SidebarProvider>
            </div>
          ) : (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-800">
              <div className="text-center text-gray-500 max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {currentPageId ? "Page Not Found" : "No Page Selected"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                  {currentPageId
                    ? "The selected page may have been deleted by another user. Please select another page or create a new one."
                    : "Select a page from the sidebar to start designing, or create a new page to get started."}
                </p>
                <Button
                  onClick={() => handleCreatePage("New Page")}
                  disabled={isCreatingPage}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingPage ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    "Create New Page"
                  )}
                </Button>
              </div>
            </div>
          )}
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

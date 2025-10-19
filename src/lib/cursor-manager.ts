import { ref, set, update, onValue, onDisconnect } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import {
  CursorPosition,
  CanvasCursorState,
  CursorConfig,
  UserCursor,
} from "@/types";
import { generateUserColor } from "@/utils/color";
import { User } from "@/store/user-store";

const CURSOR_COLLECTION = "canvas_cursors";

export class CursorManager {
  private canvasId: string;
  private currentUser: User | null = null;
  private userColor: string = "";
  private updateInterval: NodeJS.Timeout | null = null;
  private lastPosition: CursorPosition | null = null;
  private lastUpdateTime: number = 0;
  private debounceTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, () => void> = new Map();
  private config: CursorConfig;

  // Throttling system similar to shape updates
  private lastCall: number = 0;
  private timeout: NodeJS.Timeout | null = null;
  private pendingUpdate: CursorPosition | null = null;
  private pendingViewport: { x: number; y: number; scale: number } | undefined =
    undefined;

  constructor(canvasId: string, config?: Partial<CursorConfig>) {
    this.canvasId = canvasId;
    this.config = {
      updateInterval: 50, // Simple 50ms interval for consistent updates
      cleanupThreshold: 10000, // Remove cursors after 10 seconds of inactivity
      maxCursors: 50,
      positionThreshold: 0, // Not used anymore - simple time-based throttling
      debounceDelay: 0, // Not used anymore
      ...config,
    };
  }

  private generatePosition(): CursorPosition {
    return {
      x: 0,
      y: 0,
      timestamp: Date.now(),
    };
  }

  private getCursorPath(userId?: string): string {
    const basePath = `${CURSOR_COLLECTION}/${this.canvasId}`;
    return userId ? `${basePath}/${userId}` : basePath;
  }

  async setUser(user: User): Promise<void> {
    this.currentUser = user;
    this.userColor = generateUserColor(user.uid);

    // Set up disconnect handler to clean up cursor when user leaves
    const userCursorRef = ref(realtimeDb, this.getCursorPath(user.uid));
    onDisconnect(userCursorRef).remove();

    // Initialize cursor with all required fields for efficient updates
    const initialCursor = {
      userId: user.uid,
      displayName: user.displayName || user.email?.split("@")[0] || "Anonymous",
      color: this.userColor,
      photoURL: user.photoURL,
      currentProject: this.canvasId,
      currentPage: null, // Will be set by updateCurrentPage
      x: 0,
      y: 0,
      viewport: { x: 0, y: 0, scale: 1 }, // Store user's viewport for accurate cursor rendering
      timestamp: Date.now(),
      lastSeen: Date.now(),
      isOnline: true,
    };

    await set(userCursorRef, initialCursor);

    // Start position tracking
    this.startTracking();
  }

  private startTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Disabled automatic interval updates - only update on actual mouse movement
    // this.updateInterval = setInterval(() => {
    //   // This will be called by the canvas component with actual mouse position
    //   // For now, we'll just update the timestamp if we have a recent position
    //   if (this.lastPosition && this.currentUser) {
    //     this.updateCursorPosition(this.lastPosition);
    //   }
    // }, this.config.updateInterval);
  }

  updateCursorPosition(
    position: CursorPosition,
    viewport?: { x: number; y: number; scale: number }
  ): void {
    if (!this.currentUser) {
      return;
    }

    // Filter out off-screen positions (indicates mouse left canvas)
    if (position.x < -500 || position.y < -500) {
      // Instead of clearing the entire cursor, just mark it as off-screen
      // This preserves user metadata (displayName, color, etc.)
      const cursorRef = ref(
        realtimeDb,
        this.getCursorPath(this.currentUser.uid)
      );

      // Update only the position to indicate off-screen, preserve user data

      update(cursorRef, {
        x: -1000, // Off-screen marker
        y: -1000, // Off-screen marker
        timestamp: Date.now(),
      }).catch((error) => {
        console.error("Error updating off-screen cursor:", error);
      });
      return;
    }

    // Store the latest update (similar to shape throttling)
    this.pendingUpdate = position;
    this.pendingViewport = viewport; // Store viewport with cursor position

    const now = Date.now();
    const remaining = 100 - (now - this.lastCall); // 100ms throttling like shapes

    if (remaining <= 0) {
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }
      this.lastCall = now;
      this.performCursorUpdate();
    } else if (!this.timeout) {
      this.timeout = setTimeout(() => {
        this.lastCall = Date.now();
        this.timeout = null;
        this.performCursorUpdate();
      }, remaining);
    }
  }

  updateCurrentPage(pageId: string | null): void {
    if (!this.currentUser) {
      return;
    }

    const cursorRef = ref(realtimeDb, this.getCursorPath(this.currentUser.uid));

    update(cursorRef, {
      currentPage: pageId,
      lastSeen: Date.now(),
    }).catch((error) => {
      console.error("Error updating current page:", error);
    });
  }

  private performCursorUpdate(): void {
    if (!this.currentUser || !this.pendingUpdate) return;

    const position = this.pendingUpdate;
    const viewport = this.pendingViewport;
    const timestamp = Date.now();

    this.lastPosition = {
      ...position,
      timestamp,
    };

    const cursorRef = ref(realtimeDb, this.getCursorPath(this.currentUser.uid));

    // Include viewport with cursor position for synchronized rendering
    const updateData: {
      x: number;
      y: number;
      timestamp: number;
      viewport?: { x: number; y: number; scale: number };
    } = {
      x: Math.round(position.x * 100) / 100, // Round to 2 decimal places
      y: Math.round(position.y * 100) / 100, // Round to 2 decimal places
      timestamp: timestamp, // Use consistent field name for cleanup logic
    };

    // Include viewport if provided for accurate cursor positioning across zoom levels
    if (viewport) {
      updateData.viewport = {
        x: Math.round(viewport.x * 100) / 100,
        y: Math.round(viewport.y * 100) / 100,
        scale: Math.round(viewport.scale * 1000) / 1000,
      };
    }

    // Use update to only modify position fields, preserving user metadata
    update(cursorRef, updateData).catch((error) => {
      console.error("Error updating cursor position:", error);
    });

    // Clear pending updates
    this.pendingUpdate = null;
    this.pendingViewport = undefined;
  }

  subscribeToCanvasCursors(
    callback: (cursors: CanvasCursorState) => void,
    currentPageId?: string | null
  ): () => void {
    const cursorsRef = ref(realtimeDb, this.getCursorPath());

    const unsubscribe = onValue(
      cursorsRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          callback({});
          return;
        }

        const cursors: CanvasCursorState = {};

        // Process each user's cursor data
        Object.entries(data).forEach(([userId, cursorData]) => {
          if (cursorData && typeof cursorData === "object") {
            const cursor = cursorData as Partial<UserCursor>;

            // Filter by current page if specified
            if (currentPageId && cursor.currentPage !== currentPageId) {
              return; // Skip cursors from other pages
            }

            // Check if cursor is still fresh (within cleanup threshold)
            const now = Date.now();
            const timestamp = cursor.timestamp || 0;

            if (
              timestamp > 0 &&
              now - timestamp < this.config.cleanupThreshold
            ) {
              // Don't show cursors that are off-screen (marked with -1000)
              const x = cursor.x || 0;
              const y = cursor.y || 0;

              if (x !== -1000 && y !== -1000) {
                cursors[userId] = {
                  userId,
                  displayName: cursor.displayName || "Anonymous",
                  color: cursor.color || "#000000",
                  photoURL: cursor.photoURL || null,
                  currentProject: cursor.currentProject || null,
                  currentPage: cursor.currentPage || null,
                  x,
                  y,
                  viewport: cursor.viewport, // Include user's viewport for accurate cursor rendering
                  timestamp,
                  isOnline: true,
                };
              }
            }
          }
        });

        // Clean up old cursors (limit to maxCursors most recent)
        const cursorEntries = Object.entries(cursors);
        if (cursorEntries.length > this.config.maxCursors) {
          cursorEntries.sort(
            ([, a], [, b]) => (b.timestamp || 0) - (a.timestamp || 0)
          );

          const recentCursors: CanvasCursorState = {};
          cursorEntries
            .slice(0, this.config.maxCursors)
            .forEach(([userId, cursor]) => {
              recentCursors[userId] = cursor;
            });

          callback(recentCursors);
        } else {
          callback(cursors);
        }
      },
      (error) => {
        // Only log non-permission errors to avoid console spam during logout
        if ((error as { code?: string }).code !== "permission_denied") {
          console.error("Error listening to cursor updates:", error);
        }
        callback({});
      }
    );

    this.listeners.set("canvas-cursors", unsubscribe);
    return unsubscribe;
  }

  clearUserCursor(): void {
    if (!this.currentUser) return;

    const cursorRef = ref(realtimeDb, this.getCursorPath(this.currentUser.uid));
    // Set to null only when user actually logs out/disconnects
    set(cursorRef, null).catch((error) => {
      // Only log non-permission errors to avoid console spam during logout
      if ((error as { code?: string }).code !== "permission_denied") {
        console.error("Error clearing cursor:", error);
      }
    });

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    this.currentUser = null;
    this.lastPosition = null;
    this.lastUpdateTime = 0;
    this.pendingUpdate = null;
  }

  unsubscribeAll(): void {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  getCurrentUserColor(): string {
    return this.userColor;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }
}

// Singleton instance for the main canvas
export const cursorManager = new CursorManager("main-collaborative-canvas");

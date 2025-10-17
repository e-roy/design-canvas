import { ref, set, update, onValue, onDisconnect } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import {
  CursorPosition,
  CanvasCursorState,
  generateUserColor,
  CursorConfig,
} from "@/types";
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
      displayName: user.displayName || "Anonymous",
      color: this.userColor,
      photoURL: user.photoURL,
      currentProject: this.canvasId,
      x: 0,
      y: 0,
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

  updateCursorPosition(position: CursorPosition): void {
    if (!this.currentUser) {
      return;
    }

    // Filter out off-screen positions (indicates mouse left canvas)
    if (position.x < -500 || position.y < -500) {
      // Clear cursor by setting it to null
      const cursorRef = ref(
        realtimeDb,
        this.getCursorPath(this.currentUser.uid)
      );
      set(cursorRef, null).catch((error) => {
        console.error("Error clearing cursor:", error);
      });
      return;
    }

    // Store the latest update (similar to shape throttling)
    this.pendingUpdate = position;

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

  private performCursorUpdate(): void {
    if (!this.currentUser || !this.pendingUpdate) return;

    const position = this.pendingUpdate;
    const timestamp = Date.now();

    this.lastPosition = {
      ...position,
      timestamp,
    };

    const cursorRef = ref(realtimeDb, this.getCursorPath(this.currentUser.uid));

    // Minimal payload for fastest writes - only essential position data
    const updateData = {
      x: Math.round(position.x * 100) / 100, // Round to 2 decimal places
      y: Math.round(position.y * 100) / 100, // Round to 2 decimal places
      t: timestamp, // Shortened field name
    };

    // Use update to only modify position fields, preserving user metadata
    update(cursorRef, updateData).catch((error) => {
      console.error("Error updating cursor position:", error);
    });

    // Clear pending update
    this.pendingUpdate = null;
  }

  subscribeToCanvasCursors(
    callback: (cursors: CanvasCursorState) => void
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
            // Handle both old format (with position object) and new format (flat properties)
            let x, y, timestamp, displayName, color, photoURL, currentProject;

            if ("position" in cursorData && cursorData.position) {
              // Old format with position object (for backward compatibility)
              const cursor = cursorData as {
                displayName?: string;
                color?: string;
                photoURL?: string | null;
                currentProject?: string | null;
                position: {
                  x?: number;
                  y?: number;
                  timestamp?: number | { toMillis?: () => number };
                };
              };
              x = cursor.position?.x || 0;
              y = cursor.position?.y || 0;
              displayName = cursor.displayName || "Anonymous";
              color = cursor.color || "#000000";
              photoURL = cursor.photoURL || null;
              currentProject = cursor.currentProject || null;

              // Handle timestamp
              const cursorTimestamp = cursor.position?.timestamp || 0;
              timestamp =
                typeof cursorTimestamp === "object" && cursorTimestamp?.toMillis
                  ? cursorTimestamp.toMillis()
                  : typeof cursorTimestamp === "number"
                  ? cursorTimestamp
                  : 0;
            } else {
              // New optimized format with minimal fields
              const cursor = cursorData as {
                displayName?: string;
                color?: string;
                photoURL?: string | null;
                currentProject?: string | null;
                x?: number;
                y?: number;
                t?: number; // Shortened timestamp field
                timestamp?: number | { toMillis?: () => number };
              };
              x = cursor.x || 0;
              y = cursor.y || 0;
              displayName = cursor.displayName || "Anonymous";
              color = cursor.color || "#000000";
              photoURL = cursor.photoURL || null;
              currentProject = cursor.currentProject || null;

              // Handle timestamp - check both 't' and 'timestamp' fields
              const cursorTimestamp = cursor.t || cursor.timestamp || 0;
              timestamp =
                typeof cursorTimestamp === "object" && cursorTimestamp?.toMillis
                  ? cursorTimestamp.toMillis()
                  : typeof cursorTimestamp === "number"
                  ? cursorTimestamp
                  : 0;
            }

            // Check if cursor is still fresh (within cleanup threshold)
            const now = Date.now();

            if (
              timestamp > 0 &&
              now - timestamp < this.config.cleanupThreshold
            ) {
              cursors[userId] = {
                userId,
                displayName,
                color,
                photoURL,
                currentProject,
                x,
                y,
                timestamp: timestamp || 0,
                isOnline: true,
              };
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

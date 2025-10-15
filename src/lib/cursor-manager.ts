import {
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp,
} from "firebase/database";
import { realtimeDb } from "./firebase";
import {
  UserCursor,
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
  private listeners: Map<string, () => void> = new Map();
  private config: CursorConfig;

  constructor(canvasId: string, config?: Partial<CursorConfig>) {
    this.canvasId = canvasId;
    this.config = {
      updateInterval: 16, // Update every 16ms for smooth 60fps responsiveness
      cleanupThreshold: 10000, // Remove cursors after 10 seconds of inactivity
      maxCursors: 50,
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

    // Start position tracking
    this.startTracking();
  }

  private startTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      // This will be called by the canvas component with actual mouse position
      // For now, we'll just update the timestamp if we have a recent position
      if (this.lastPosition && this.currentUser) {
        this.updateCursorPosition(this.lastPosition);
      }
    }, this.config.updateInterval);
  }

  updateCursorPosition(position: CursorPosition): void {
    if (!this.currentUser) {
      return;
    }

    // Update if enough time has passed since last update (for smooth responsiveness)
    if (
      this.lastPosition &&
      Date.now() - this.lastPosition.timestamp < this.config.updateInterval
    ) {
      return;
    }

    this.lastPosition = {
      ...position,
      timestamp: Date.now(),
    };

    const userCursor: UserCursor = {
      userId: this.currentUser.uid,
      displayName: this.currentUser.displayName || "Anonymous",
      color: this.userColor,
      photoURL: this.currentUser.photoURL,
      currentProject: this.canvasId,
      x: this.lastPosition.x,
      y: this.lastPosition.y,
      timestamp: this.lastPosition.timestamp,
      isOnline: true,
    };

    const cursorRef = ref(realtimeDb, this.getCursorPath(this.currentUser.uid));

    set(cursorRef, {
      ...userCursor,
      timestamp: serverTimestamp(),
    }).catch((error) => {
      console.error("Error updating cursor position:", error);
    });
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
              // New format with flat properties
              const cursor = cursorData as {
                displayName?: string;
                color?: string;
                photoURL?: string | null;
                currentProject?: string | null;
                x?: number;
                y?: number;
                timestamp?: number | { toMillis?: () => number };
              };
              x = cursor.x || 0;
              y = cursor.y || 0;
              displayName = cursor.displayName || "Anonymous";
              color = cursor.color || "#000000";
              photoURL = cursor.photoURL || null;
              currentProject = cursor.currentProject || null;

              // Handle timestamp
              const cursorTimestamp = cursor.timestamp || 0;
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
        console.error("Error listening to cursor updates:", error);
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
      console.error("Error clearing cursor:", error);
    });

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.currentUser = null;
    this.lastPosition = null;
  }

  unsubscribeAll(): void {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
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

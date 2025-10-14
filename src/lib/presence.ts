import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { UserPresence, ProjectPresence, BaseUser } from "@/types";

const PRESENCE_COLLECTION = "presence";
const PROJECT_PRESENCE_COLLECTION = "project_presence";

export class PresenceManager {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentUser: UserPresence | null = null;
  private sessionId: string;
  private listeners: Map<string, () => void> = new Map();

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateHeartbeatInterval(): number {
    // Random interval between 25-35 seconds to avoid all users updating at once
    return 25000 + Math.random() * 10000;
  }

  private generateOfflineThreshold(): number {
    // Users are considered offline after 45 seconds of no heartbeat
    return 45000;
  }

  async setUserPresence(
    user: BaseUser,
    projectId?: string | null
  ): Promise<void> {
    if (!user.uid) return;

    this.currentUser = {
      ...user,
      isOnline: true,
      lastSeen: new Date(),
      sessionId: this.sessionId,
      currentProject: projectId || null,
    };

    try {
      const userDocRef = doc(db, PRESENCE_COLLECTION, user.uid);

      await setDoc(
        userDocRef,
        {
          ...this.currentUser,
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );

      // Update project presence if viewing a specific project
      if (projectId) {
        await this.updateProjectPresence(projectId, user);
      }

      // Start heartbeat if not already running
      if (!this.heartbeatInterval) {
        this.startHeartbeat();
      }
    } catch (error) {
      console.error("❌ Error setting user presence:", error);
    }
  }

  private async updateProjectPresence(
    projectId: string,
    user: BaseUser
  ): Promise<void> {
    try {
      const projectDocRef = doc(db, PROJECT_PRESENCE_COLLECTION, projectId);

      await setDoc(
        projectDocRef,
        {
          projectId,
          users: {
            [user.uid]: {
              uid: user.uid,
              displayName: user.displayName,
              photoURL: user.photoURL,
              isOnline: true,
              lastSeen: serverTimestamp(),
              sessionId: this.sessionId,
            },
          },
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error updating project presence:", error);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.currentUser) {
        await this.setUserPresence(
          this.currentUser,
          this.currentUser.currentProject
        );
      }
    }, this.generateHeartbeatInterval());
  }

  async clearUserPresence(): Promise<void> {
    if (!this.currentUser) return;

    try {
      // Mark user as offline
      const userDocRef = doc(db, PRESENCE_COLLECTION, this.currentUser.uid);
      await setDoc(
        userDocRef,
        {
          isOnline: false,
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );

      // Remove from project presence if applicable
      if (this.currentUser.currentProject) {
        await this.removeFromProjectPresence(
          this.currentUser.currentProject,
          this.currentUser.uid
        );
      }

      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      this.currentUser = null;
    } catch (error) {
      console.error("Error clearing user presence:", error);
    }
  }

  private async removeFromProjectPresence(
    projectId: string,
    userId: string
  ): Promise<void> {
    try {
      const projectDocRef = doc(db, PROJECT_PRESENCE_COLLECTION, projectId);
      const projectDoc = await getDocs(
        query(
          collection(db, PROJECT_PRESENCE_COLLECTION),
          where("projectId", "==", projectId)
        )
      );

      if (!projectDoc.empty) {
        const data = projectDoc.docs[0].data() as ProjectPresence;
        const { [userId]: removed, ...remainingUsers } = data.users;

        if (Object.keys(remainingUsers).length === 0) {
          // If no users left, delete the project presence document
          await deleteDoc(projectDocRef);
        } else {
          // Update with remaining users
          await setDoc(projectDocRef, {
            projectId,
            users: remainingUsers,
            lastUpdated: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      console.error("Error removing from project presence:", error);
    }
  }

  subscribeToAllUsers(callback: (users: UserPresence[]) => void): () => void {
    // Try to use the query, but handle the case where index isn't built yet
    try {
      const q = query(
        collection(db, PRESENCE_COLLECTION),
        where("isOnline", "==", true),
        orderBy("lastSeen", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const users: UserPresence[] = snapshot.docs.map((doc) => ({
          ...doc.data(),
          lastSeen:
            doc.data().lastSeen instanceof Date
              ? doc.data().lastSeen
              : (doc.data().lastSeen as { toDate?: () => Date })?.toDate?.() ||
                new Date(),
        })) as UserPresence[];

        callback(users);
      });

      this.listeners.set("all-users", unsubscribe);
      return unsubscribe;
    } catch (error) {
      // If index isn't built yet, fall back to empty array
      console.error("Presence query failed:", error);
      callback([]);
      const unsubscribe = () => {};
      this.listeners.set("all-users", unsubscribe);
      return unsubscribe;
    }
  }

  subscribeToProjectUsers(
    projectId: string,
    callback: (users: UserPresence[]) => void
  ): () => void {
    // For project presence, we don't need an index since it's just filtering by projectId
    const q = query(
      collection(db, PROJECT_PRESENCE_COLLECTION),
      where("projectId", "==", projectId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback([]);
        return;
      }

      const data = snapshot.docs[0].data() as ProjectPresence;
      const users: UserPresence[] = Object.values(data.users).map(
        (user: Omit<UserPresence, "currentProject" | "email">) => ({
          ...user,
          email: null, // Email not stored in project presence for privacy
          lastSeen:
            user.lastSeen instanceof Date
              ? user.lastSeen
              : (user.lastSeen as { toDate?: () => Date })?.toDate?.() ||
                new Date(),
          currentProject: projectId,
        })
      );

      callback(users);
    });

    this.listeners.set(`project-${projectId}`, unsubscribe);
    return unsubscribe;
  }

  unsubscribeAll(): void {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }

  getCurrentUser(): UserPresence | null {
    return this.currentUser;
  }
}

// Singleton instance
export const presenceManager = new PresenceManager();

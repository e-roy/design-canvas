import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { CanvasDocument, StoredShape, UserCursor } from "@/types";

const CANVAS_DOCUMENTS_COLLECTION = "canvas_documents";
const CANVAS_SHAPES_COLLECTION = "canvas_shapes";
const USER_CURSORS_COLLECTION = "user_cursors";

// Helper function to check if error is authentication-related
const isAuthError = (error: unknown): boolean => {
  return (
    error instanceof Error &&
    ((error as { code?: string }).code === "permission-denied" ||
      error.message.includes("Missing or insufficient permissions"))
  );
};

export class CanvasService {
  private listeners: Map<string, () => void> = new Map();

  async createCanvas(
    name: string,
    description: string | undefined,
    createdBy: string,
    isPublic: boolean = false,
    documentId?: string
  ): Promise<string> {
    const finalDocumentId = documentId || this.generateId();
    const now = new Date();

    const canvasDocument: Omit<CanvasDocument, "id"> = {
      name,
      description,
      createdBy,
      createdAt: now,
      updatedAt: now,
      lastEditedBy: createdBy,
      collaborators: [createdBy],
      isPublic,
      version: 1,
    };

    await setDoc(
      doc(db, CANVAS_DOCUMENTS_COLLECTION, finalDocumentId),
      canvasDocument
    );

    return finalDocumentId;
  }

  async loadCanvas(
    documentId: string
  ): Promise<{ document: CanvasDocument; shapes: StoredShape[] } | null> {
    try {
      const docRef = doc(db, CANVAS_DOCUMENTS_COLLECTION, documentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const document = { id: documentId, ...docSnap.data() } as CanvasDocument;

      // Load shapes
      const shapesQuery = query(
        collection(db, CANVAS_SHAPES_COLLECTION),
        where("documentId", "==", documentId),
        orderBy("zIndex", "asc")
      );

      const shapesSnap = await getDocs(shapesQuery);
      const shapes = shapesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StoredShape[];

      return { document, shapes };
    } catch (error) {
      console.error("Error loading canvas:", error);
      return null;
    }
  }

  async saveShape(
    documentId: string,
    shape: Omit<StoredShape, "id" | "createdAt" | "updatedAt" | "updatedBy">
  ): Promise<string> {
    try {
      const shapeId = this.generateId();
      const now = new Date();

      // Filter out undefined values for Firestore
      const filteredShape = Object.fromEntries(
        Object.entries(shape).filter(([, value]) => value !== undefined)
      );

      const storedShape: StoredShape = {
        ...filteredShape,
        id: shapeId,
        createdAt: now,
        updatedAt: now,
        updatedBy: shape.createdBy,
      } as StoredShape;

      await setDoc(doc(db, CANVAS_SHAPES_COLLECTION, shapeId), {
        ...storedShape,
        documentId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update document version and last edited info
      await updateDoc(doc(db, CANVAS_DOCUMENTS_COLLECTION, documentId), {
        updatedAt: serverTimestamp(),
        lastEditedBy: shape.createdBy,
        version: Date.now(), // Simple versioning
      });

      return shapeId;
    } catch (error) {
      // Handle authentication errors gracefully
      if (isAuthError(error)) {
        console.warn(
          "Cannot save shape: User not authenticated or insufficient permissions"
        );
        throw new Error("Authentication required to save shapes");
      } else {
        console.error("Error saving shape:", error);
        throw error;
      }
    }
  }

  async updateShape(
    shapeId: string,
    updates: Partial<
      Pick<
        StoredShape,
        | "x"
        | "y"
        | "width"
        | "height"
        | "radius"
        | "text"
        | "fontSize"
        | "fill"
        | "stroke"
        | "strokeWidth"
        | "rotation"
        | "zIndex"
      >
    >,
    updatedBy: string
  ): Promise<void> {
    try {
      // Filter out undefined values for Firestore
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined)
      );

      await updateDoc(doc(db, CANVAS_SHAPES_COLLECTION, shapeId), {
        ...filteredUpdates,
        updatedAt: serverTimestamp(),
        updatedBy,
      });
    } catch (error) {
      // Handle authentication errors gracefully
      if (isAuthError(error)) {
        console.warn(
          "Cannot update shape: User not authenticated or insufficient permissions"
        );
      } else {
        console.error("Error updating shape:", error);
        throw error;
      }
    }
  }

  async deleteShape(
    shapeId: string,
    documentId: string,
    updatedBy: string
  ): Promise<void> {
    try {
      await deleteDoc(doc(db, CANVAS_SHAPES_COLLECTION, shapeId));

      // Update document metadata
      await updateDoc(doc(db, CANVAS_DOCUMENTS_COLLECTION, documentId), {
        updatedAt: serverTimestamp(),
        lastEditedBy: updatedBy,
        version: Date.now(),
      });
    } catch (error) {
      // Handle authentication errors gracefully
      if (isAuthError(error)) {
        console.warn(
          "Cannot delete shape: User not authenticated or insufficient permissions"
        );
      } else {
        console.error("Error deleting shape:", error);
        throw error;
      }
    }
  }

  async updateViewport(
    documentId: string,
    viewport: { x: number; y: number; scale: number },
    updatedBy: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, CANVAS_DOCUMENTS_COLLECTION, documentId), {
        viewport: viewport,
        updatedAt: serverTimestamp(),
        lastEditedBy: updatedBy,
        version: Date.now(),
      });
    } catch (error) {
      // Handle authentication errors gracefully
      if (isAuthError(error)) {
        console.warn(
          "Cannot update viewport: User not authenticated or insufficient permissions"
        );
      } else {
        console.error("Error updating viewport:", error);
        throw error;
      }
    }
  }

  async addCollaborator(
    documentId: string,
    userId: string,
    addedBy: string
  ): Promise<void> {
    try {
      const docRef = doc(db, CANVAS_DOCUMENTS_COLLECTION, documentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as CanvasDocument;
        const collaborators = [...new Set([...data.collaborators, userId])];

        await updateDoc(docRef, {
          collaborators,
          updatedAt: serverTimestamp(),
          lastEditedBy: addedBy,
          version: Date.now(),
        });
      }
    } catch (error) {
      // Handle authentication errors gracefully
      if (isAuthError(error)) {
        console.warn(
          "Cannot add collaborator: User not authenticated or insufficient permissions"
        );
      } else {
        console.error("Error adding collaborator:", error);
        throw error;
      }
    }
  }

  async removeCollaborator(
    documentId: string,
    userId: string,
    removedBy: string
  ): Promise<void> {
    try {
      const docRef = doc(db, CANVAS_DOCUMENTS_COLLECTION, documentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as CanvasDocument;
        const collaborators = data.collaborators.filter((id) => id !== userId);

        await updateDoc(docRef, {
          collaborators,
          updatedAt: serverTimestamp(),
          lastEditedBy: removedBy,
          version: Date.now(),
        });
      }
    } catch (error) {
      // Handle authentication errors gracefully
      if (isAuthError(error)) {
        console.warn(
          "Cannot remove collaborator: User not authenticated or insufficient permissions"
        );
      } else {
        console.error("Error removing collaborator:", error);
        throw error;
      }
    }
  }

  subscribeToCanvas(
    documentId: string,
    onUpdate: (data: {
      document: CanvasDocument;
      shapes: StoredShape[];
    }) => void
  ): () => void {
    let docUnsubscribe: (() => void) | null = null;
    let shapesUnsubscribe: (() => void) | null = null;
    let currentDocument: CanvasDocument | null = null;
    let currentShapes: StoredShape[] | null = null;

    // Helper function to call onUpdate with current data
    const notifyUpdate = () => {
      if (currentDocument && currentShapes !== null) {
        onUpdate({ document: currentDocument, shapes: currentShapes });
      }
    };

    // Check if user is authenticated before proceeding
    if (!auth.currentUser) {
      console.warn("Cannot subscribe to canvas: User not authenticated");
      return () => {}; // Return empty cleanup function
    }

    // Check if document exists first
    getDoc(doc(db, CANVAS_DOCUMENTS_COLLECTION, documentId))
      .then(async (docSnap) => {
        if (docSnap.exists()) {
          currentDocument = {
            id: documentId,
            ...docSnap.data(),
          } as CanvasDocument;

          // Load initial shapes
          const shapesQuery = query(
            collection(db, CANVAS_SHAPES_COLLECTION),
            where("documentId", "==", documentId),
            orderBy("zIndex", "asc")
          );

          const shapesSnap = await getDocs(shapesQuery);
          currentShapes = shapesSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as StoredShape[];

          // Notify initial state
          notifyUpdate();

          // Subscribe to document changes
          docUnsubscribe = onSnapshot(
            doc(db, CANVAS_DOCUMENTS_COLLECTION, documentId),
            (doc) => {
              if (doc.exists()) {
                currentDocument = {
                  id: documentId,
                  ...doc.data(),
                } as CanvasDocument;
                notifyUpdate();
              }
            }
          );

          // Subscribe to shapes changes
          shapesUnsubscribe = onSnapshot(shapesQuery, (snapshot) => {
            currentShapes = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as StoredShape[];

            notifyUpdate();
          });
        }
      })
      .catch((error) => {
        // Handle authentication errors gracefully
        if (isAuthError(error)) {
          console.warn(
            "Cannot access canvas: User not authenticated or insufficient permissions"
          );
        } else {
          console.error("Error checking document existence:", error);
        }
      });

    this.listeners.set(`canvas-${documentId}`, () => {
      if (docUnsubscribe) docUnsubscribe();
      if (shapesUnsubscribe) shapesUnsubscribe();
    });

    return () => {
      if (docUnsubscribe) docUnsubscribe();
      if (shapesUnsubscribe) shapesUnsubscribe();
      this.listeners.delete(`canvas-${documentId}`);
    };
  }

  subscribeToUserCursors(
    documentId: string,
    onUpdate: (cursors: UserCursor[]) => void
  ): () => void {
    // Check if user is authenticated before proceeding
    if (!auth.currentUser) {
      console.warn("Cannot subscribe to user cursors: User not authenticated");
      return () => {}; // Return empty cleanup function
    }

    const cursorsQuery = query(
      collection(db, USER_CURSORS_COLLECTION),
      where("documentId", "==", documentId)
    );

    const unsubscribe = onSnapshot(
      cursorsQuery,
      (snapshot) => {
        const cursors = snapshot.docs.map((doc) => ({
          userId: doc.id,
          ...doc.data(),
        })) as UserCursor[];

        onUpdate(cursors);
      },
      (error) => {
        // Handle authentication errors gracefully
        if (isAuthError(error)) {
          console.warn(
            "Cannot access user cursors: User not authenticated or insufficient permissions"
          );
        } else {
          console.error("Error subscribing to user cursors:", error);
        }
      }
    );

    this.listeners.set(`cursors-${documentId}`, unsubscribe);
    return unsubscribe;
  }

  async updateUserCursor(
    documentId: string,
    userId: string,
    userName: string,
    x: number,
    y: number
  ): Promise<void> {
    try {
      await setDoc(doc(db, USER_CURSORS_COLLECTION, userId), {
        documentId,
        userName,
        x,
        y,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      // Handle authentication errors gracefully
      if (isAuthError(error)) {
        console.warn(
          "Cannot update user cursor: User not authenticated or insufficient permissions"
        );
      } else {
        console.error("Error updating user cursor:", error);
        throw error;
      }
    }
  }

  unsubscribeAll(): void {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const canvasService = new CanvasService();

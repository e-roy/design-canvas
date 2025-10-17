import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { CanvasDocument, StoredShape, StoredShapeWithId } from "@/types";
import { updateShapeTx, updateShape } from "@/services/shapeTransactions";

const CANVAS_DOCUMENTS_COLLECTION = "canvas_documents";
const CANVAS_SHAPES_COLLECTION = "canvas_shapes";

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
  ): Promise<{ document: CanvasDocument; shapes: StoredShapeWithId[] } | null> {
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
        where("canvasId", "==", "default") // Filter by canvasId for forward compatibility
      );

      const shapesSnap = await getDocs(shapesQuery);
      const shapes = shapesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StoredShapeWithId[];

      // Sort by zIndex
      shapes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

      return { document, shapes };
    } catch (error) {
      console.error("Error loading canvas:", error);
      return null;
    }
  }

  async saveShape(
    documentId: string,
    shape: Omit<
      StoredShape,
      "id" | "createdAt" | "updatedAt" | "updatedBy" | "version"
    >
  ): Promise<string> {
    try {
      const shapeId = this.generateId();

      // Filter out undefined values for Firestore
      const filteredShape = Object.fromEntries(
        Object.entries(shape).filter(([, value]) => value !== undefined)
      );

      const storedShape = {
        ...filteredShape,
        canvasId: "default", // Set default canvasId for forward compatibility
        version: 1, // Initial version
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: shape.createdBy,
      };

      const firestoreDoc = {
        ...storedShape,
        documentId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, CANVAS_SHAPES_COLLECTION, shapeId), firestoreDoc);

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
        | "visible"
        | "zIndex"
      >
    >,
    updatedBy: string
  ): Promise<void> {
    try {
      // Use regular update for frequent operations (better performance)
      // Transactions are used only for final commits and critical operations
      await updateShape(shapeId, updates, updatedBy);
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

  async updateShapeWithTransaction(
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
        | "startX"
        | "startY"
        | "endX"
        | "endY"
        | "fill"
        | "stroke"
        | "strokeWidth"
        | "rotation"
        | "visible"
        | "zIndex"
        | "canvasId"
      >
    >,
    updatedBy: string
  ): Promise<void> {
    try {
      // Use transaction for critical operations (final commits, important changes)
      await updateShapeTx(shapeId, updates, updatedBy);
    } catch (error) {
      // Handle authentication errors gracefully
      if (isAuthError(error)) {
        console.warn(
          "Cannot update shape: User not authenticated or insufficient permissions"
        );
        throw new Error("Authentication required to update shapes");
      }
      console.error(`Error updating shape ${shapeId}:`, error);
      throw error;
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
      shapes: StoredShapeWithId[];
    }) => void
  ): () => void {
    let docUnsubscribe: (() => void) | null = null;
    let shapesUnsubscribe: (() => void) | null = null;
    let currentDocument: CanvasDocument | null = null;
    let currentShapes: StoredShapeWithId[] | null = null;

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
            where("canvasId", "==", "default") // Filter by canvasId for forward compatibility
          );

          const shapesSnap = await getDocs(shapesQuery);
          currentShapes = shapesSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as StoredShapeWithId[];

          // Sort by zIndex
          currentShapes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

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
            })) as StoredShapeWithId[];

            // Sort by zIndex
            currentShapes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

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

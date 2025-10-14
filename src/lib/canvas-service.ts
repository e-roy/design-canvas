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
import { db } from "./firebase";
import { CanvasDocument, StoredShape, UserCursor } from "@/types";

const CANVAS_DOCUMENTS_COLLECTION = "canvas_documents";
const CANVAS_SHAPES_COLLECTION = "canvas_shapes";
const USER_CURSORS_COLLECTION = "user_cursors";

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
    // Filter out undefined values for Firestore
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await updateDoc(doc(db, CANVAS_SHAPES_COLLECTION, shapeId), {
      ...filteredUpdates,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  async deleteShape(
    shapeId: string,
    documentId: string,
    updatedBy: string
  ): Promise<void> {
    await deleteDoc(doc(db, CANVAS_SHAPES_COLLECTION, shapeId));

    // Update document metadata
    await updateDoc(doc(db, CANVAS_DOCUMENTS_COLLECTION, documentId), {
      updatedAt: serverTimestamp(),
      lastEditedBy: updatedBy,
      version: Date.now(),
    });
  }

  async updateViewport(
    documentId: string,
    viewport: { x: number; y: number; scale: number },
    updatedBy: string
  ): Promise<void> {
    await updateDoc(doc(db, CANVAS_DOCUMENTS_COLLECTION, documentId), {
      viewport: viewport,
      updatedAt: serverTimestamp(),
      lastEditedBy: updatedBy,
      version: Date.now(),
    });
  }

  async addCollaborator(
    documentId: string,
    userId: string,
    addedBy: string
  ): Promise<void> {
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
  }

  async removeCollaborator(
    documentId: string,
    userId: string,
    removedBy: string
  ): Promise<void> {
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

    // Check if document exists first
    getDoc(doc(db, CANVAS_DOCUMENTS_COLLECTION, documentId))
      .then((docSnap) => {
        if (docSnap.exists()) {
          const document = {
            id: documentId,
            ...docSnap.data(),
          } as CanvasDocument;

          // Subscribe to document changes
          docUnsubscribe = onSnapshot(
            doc(db, CANVAS_DOCUMENTS_COLLECTION, documentId),
            (doc) => {
              if (doc.exists()) {
                const updatedDocument = {
                  id: documentId,
                  ...doc.data(),
                } as CanvasDocument;
                onUpdate({ document: updatedDocument, shapes: [] });
              }
            }
          );

          // Subscribe to shapes changes
          const shapesQuery = query(
            collection(db, CANVAS_SHAPES_COLLECTION),
            where("documentId", "==", documentId),
            orderBy("zIndex", "asc")
          );

          shapesUnsubscribe = onSnapshot(shapesQuery, (snapshot) => {
            const shapes = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as StoredShape[];

            onUpdate({ document, shapes });
          });
        }
      })
      .catch((error) => {
        console.error("Error checking document existence:", error);
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
    const cursorsQuery = query(
      collection(db, USER_CURSORS_COLLECTION),
      where("documentId", "==", documentId)
    );

    const unsubscribe = onSnapshot(cursorsQuery, (snapshot) => {
      const cursors = snapshot.docs.map((doc) => ({
        userId: doc.id,
        ...doc.data(),
      })) as UserCursor[];

      onUpdate(cursors);
    });

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
    await setDoc(doc(db, USER_CURSORS_COLLECTION, userId), {
      documentId,
      userName,
      x,
      y,
      timestamp: serverTimestamp(),
    });
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

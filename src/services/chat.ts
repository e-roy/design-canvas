import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ChatMessage, ChatMessageDoc } from "@/types/chat";

const CHAT_COLLECTION = "canvasChats";

/**
 * Save a chat message to Firestore
 */
export async function saveMessage(
  userId: string,
  message: Omit<ChatMessage, "id">
): Promise<string> {
  try {
    const messagesRef = collection(db, `${CHAT_COLLECTION}/${userId}/messages`);

    const messageData: ChatMessageDoc = {
      role: message.role,
      content: message.content,
      timestamp: Timestamp.now(),
      userId: message.userId,
    };

    const docRef = await addDoc(messagesRef, messageData);
    return docRef.id;
  } catch (error) {
    console.error("Error saving message:", error);
    throw new Error("Failed to save message");
  }
}

/**
 * Load chat history for a user
 */
export async function loadChatHistory(userId: string): Promise<ChatMessage[]> {
  try {
    const messagesRef = collection(db, `${CHAT_COLLECTION}/${userId}/messages`);
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as ChatMessageDoc;
      return {
        id: doc.id,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp,
        userId: data.userId,
      };
    });
  } catch (error) {
    console.error("Error loading chat history:", error);
    throw new Error("Failed to load chat history");
  }
}

/**
 * Clear all chat messages for a user
 */
export async function clearChatHistory(userId: string): Promise<void> {
  try {
    const messagesRef = collection(db, `${CHAT_COLLECTION}/${userId}/messages`);
    const querySnapshot = await getDocs(messagesRef);

    // Use batch delete for better performance
    const batch = writeBatch(db);
    querySnapshot.docs.forEach((document) => {
      batch.delete(document.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error("Error clearing chat history:", error);
    throw new Error("Failed to clear chat history");
  }
}

/**
 * Subscribe to real-time chat message updates
 */
export function subscribeToChatMessages(
  userId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe {
  const messagesRef = collection(db, `${CHAT_COLLECTION}/${userId}/messages`);
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ChatMessage[] = snapshot.docs.map((doc) => {
        const data = doc.data() as ChatMessageDoc;
        return {
          id: doc.id,
          role: data.role,
          content: data.content,
          timestamp: data.timestamp,
          userId: data.userId,
        };
      });
      callback(messages);
    },
    (error) => {
      console.error("Error in chat subscription:", error);
    }
  );
}

/**
 * Delete a specific message
 */
export async function deleteMessage(
  userId: string,
  messageId: string
): Promise<void> {
  try {
    const messageRef = doc(
      db,
      `${CHAT_COLLECTION}/${userId}/messages/${messageId}`
    );
    await deleteDoc(messageRef);
  } catch (error) {
    console.error("Error deleting message:", error);
    throw new Error("Failed to delete message");
  }
}


import type { Timestamp } from "firebase/firestore";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date | Timestamp;
  userId?: string;
}

export interface ChatSession {
  userId: string;
  messages: ChatMessage[];
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

// Type for ChatMessage stored in Firestore (without the id field which is the document ID)
export type ChatMessageDoc = Omit<ChatMessage, "id">;

"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useUserStore } from "@/store/user-store";
import {
  saveMessage,
  loadChatHistory,
  clearChatHistory as clearChatHistoryService,
} from "@/services/chat";
import type { ChatMessage } from "@/types/chat";
import type { CommandExecutorContext } from "@/lib/ai-command-executor";
import type { NodeDoc } from "@/types/page";

interface UseAiChatOptions {
  onMessagesChange?: (messages: ChatMessage[]) => void;
  commandContext?: CommandExecutorContext;
  nodes?: NodeDoc[]; // Current nodes on the canvas for manipulation
}

interface UseAiChatReturn {
  messages: ChatMessage[];
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  error: Error | null;
  handleSubmit: (e: React.FormEvent) => void;
  sendQuickMessage: (message: string) => Promise<void>;
  clearChat: () => Promise<void>;
  isInitializing: boolean;
  executedCommands: number;
  queueLength: number;
}

// Helper function to convert UIMessage to ChatMessage
function uiMessageToChatMessage(msg: UIMessage): ChatMessage {
  // Extract text content from parts
  const textParts = msg.parts.filter((part) => part.type === "text");
  let content = textParts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }
      return "";
    })
    .join("");

  // If no text content but there are tool-result parts, extract those
  if (!content && msg.role === "assistant") {
    const toolResultParts = msg.parts.filter(
      (part) => part.type === "tool-result"
    );
    if (toolResultParts.length > 0) {
      content = toolResultParts
        .map((part) => {
          if (part.type === "tool-result" && "output" in part) {
            // Tool results should contain the confirmation messages from our tools
            return typeof part.output === "string" ? part.output : "✓ Done";
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");
    }
  }

  return {
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    content,
    timestamp: new Date(),
    userId: "", // Will be set by the caller
  };
}

// Helper function to convert ChatMessage to UIMessage
function chatMessageToUIMessage(msg: ChatMessage): UIMessage {
  return {
    id: msg.id,
    role: msg.role,
    parts: [{ type: "text", text: msg.content }],
  };
}

export function useAiChat(options?: UseAiChatOptions): UseAiChatReturn {
  const { user } = useUserStore();
  const [input, setInput] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [executedCommandCount, setExecutedCommandCount] = useState(0);

  // Track the last message count to detect new messages
  const lastMessageCountRef = useRef(0);
  // Track loaded message IDs to avoid re-saving them
  const loadedMessageIdsRef = useRef<Set<string>>(new Set());
  // Queue for pending messages
  const messageQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);

  // Create transport for the chat with context
  const transport = new DefaultChatTransport({
    api: "/api/chat",
    headers: {
      "Content-Type": "application/json",
    },
    // Customize the fetch to include context
    fetch: async (url, init) => {
      const body = JSON.parse((init?.body as string) || "{}");

      // Get context values
      const userId = user?.uid || "";
      const currentPageId = options?.commandContext?.currentPageId || "";
      const canvasId = options?.commandContext?.canvasId || "";
      const nodes = options?.nodes || [];

      const contextPayload = {
        ...body,
        context: {
          userId,
          currentPageId,
          canvasId,
          nodes, // Include nodes for manipulation commands
        },
      };

      const response = await fetch(url, {
        ...init,
        body: JSON.stringify(contextPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Chat API error:", errorText);
      }

      return response;
    },
  });

  // Use the useChat hook from AI SDK
  // Note: onToolCall not needed - tools execute server-side
  const {
    messages: uiMessages,
    sendMessage,
    setMessages: setUIMessages,
    error: chatError,
    status,
  } = useChat({
    transport,
    messages: [],
  });

  const isLoading =
    status === "streaming" ||
    status === "submitted" ||
    messageQueueRef.current.length > 0;
  const error = chatError || null;
  const executedCommands = executedCommandCount;

  // Convert UI messages to our ChatMessage format
  const messages: ChatMessage[] = uiMessages.map((msg) => {
    const chatMsg = uiMessageToChatMessage(msg);
    chatMsg.userId = user?.uid || "";
    return chatMsg;
  });

  // Load chat history on mount
  useEffect(() => {
    if (!user) {
      setIsInitializing(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const history = await loadChatHistory(user.uid);

        // Track loaded message IDs to prevent re-saving
        loadedMessageIdsRef.current = new Set(history.map((msg) => msg.id));

        // Convert ChatMessage to UI message format
        const uiMsgs = history.map(chatMessageToUIMessage);
        setUIMessages(uiMsgs);

        // Update the last message count
        lastMessageCountRef.current = uiMsgs.length;
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    loadHistory();
  }, [user, setUIMessages]);

  // Save NEW messages to Firebase (not ones that were just loaded)
  useEffect(() => {
    if (!user || messages.length === 0 || isInitializing) return;

    // Only save if we have new messages (count increased)
    if (messages.length <= lastMessageCountRef.current) return;

    const saveMessagesToFirebase = async () => {
      // Save all new messages (ones beyond the last count)
      const newMessages = messages.slice(lastMessageCountRef.current);

      for (const msg of newMessages) {
        // Skip if this message was loaded from Firebase
        if (loadedMessageIdsRef.current.has(msg.id)) continue;

        try {
          await saveMessage(user.uid, {
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            userId: user.uid,
          });

          // Mark this message as saved
          loadedMessageIdsRef.current.add(msg.id);
        } catch (err) {
          console.error("Failed to save message to Firebase:", err);
        }
      }

      // Update the last count
      lastMessageCountRef.current = messages.length;
    };

    // Debounce the save operation
    const timeoutId = setTimeout(saveMessagesToFirebase, 500);
    return () => clearTimeout(timeoutId);
  }, [messages, user, isInitializing]);

  // Process message queue
  const processMessageQueue = useCallback(async () => {
    if (
      isProcessingQueueRef.current ||
      messageQueueRef.current.length === 0 ||
      status === "streaming" ||
      status === "submitted"
    ) {
      return;
    }

    isProcessingQueueRef.current = true;
    const nextMessage = messageQueueRef.current.shift();

    if (nextMessage) {
      try {
        await sendMessage({
          role: "user",
          parts: [{ type: "text", text: nextMessage }],
        });
      } catch (err) {
        console.error("Failed to send message from queue:", err);
        // Re-add the message to the front of the queue on error
        messageQueueRef.current.unshift(nextMessage);
      }
    }

    isProcessingQueueRef.current = false;
  }, [sendMessage, status]);

  // Watch for when the chat becomes available and process queue
  useEffect(() => {
    if (
      status !== "streaming" &&
      status !== "submitted" &&
      messageQueueRef.current.length > 0
    ) {
      processMessageQueue();
    }
  }, [status, processMessageQueue]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !input.trim()) return;

      const messageText = input.trim();
      setInput("");

      // Add to queue if currently processing
      if (status === "streaming" || status === "submitted") {
        messageQueueRef.current.push(messageText);
        return;
      }

      // Send immediately if idle
      await sendMessage({
        role: "user",
        parts: [{ type: "text", text: messageText }],
      });
    },
    [user, input, sendMessage, status]
  );

  // Send a quick message without using the input field
  const sendQuickMessage = useCallback(
    async (message: string) => {
      if (!user || !message.trim()) return;

      // Add to queue if currently processing
      if (status === "streaming" || status === "submitted") {
        messageQueueRef.current.push(message.trim());
        return;
      }

      // Send immediately if idle
      await sendMessage({
        role: "user",
        parts: [{ type: "text", text: message.trim() }],
      });
    },
    [user, sendMessage, status]
  );

  const clearChat = useCallback(async () => {
    if (!user) return;

    try {
      await clearChatHistoryService(user.uid);
      setUIMessages([]);
      setExecutedCommandCount(0);

      // Reset tracking refs
      lastMessageCountRef.current = 0;
      loadedMessageIdsRef.current.clear();
      messageQueueRef.current = [];
      isProcessingQueueRef.current = false;
    } catch (err) {
      console.error("Failed to clear chat:", err);
    }
  }, [user, setUIMessages]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    handleSubmit,
    sendQuickMessage,
    clearChat,
    isInitializing,
    executedCommands,
    queueLength: messageQueueRef.current.length,
  };
}

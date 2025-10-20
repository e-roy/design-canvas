"use client";

import React, { memo, useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageSquare, Trash2, Send, Loader2, Bot, User } from "lucide-react";
import { useAiChat } from "@/hooks/useAiChat";
import type { CommandExecutorContext } from "@/lib/ai-command-executor";
import type { NodeDoc } from "@/types/page";

interface AiChatPanelProps {
  commandContext?: CommandExecutorContext;
  nodes?: NodeDoc[]; // Current nodes for manipulation commands
}

export const AiChatPanel = memo(function AiChatPanel({
  commandContext,
  nodes = [],
}: AiChatPanelProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Use our custom hook with Firebase persistence
  const {
    messages,
    input,
    setInput,
    isLoading,
    error,
    handleSubmit,
    sendQuickMessage,
    clearChat,
    isInitializing,
    executedCommands: _executedCommands,
    queueLength,
  } = useAiChat({ commandContext, nodes });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleClearChat = async () => {
    await clearChat();
    setShowClearDialog(false);
  };

  // Handle quick action button click - send message directly
  const handleQuickAction = (command: string) => {
    sendQuickMessage(command);
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="border-0 shadow-none flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4" />
              <span>AI Assistant</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              className="h-8 text-xs"
              disabled={messages.length === 0 || isInitializing}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        </CardHeader>

        <Separator />

        {/* Messages Area */}
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            {isInitializing ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 py-8">
                <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                <h3 className="font-semibold text-sm mb-2">
                  AI Canvas Assistant
                </h3>
                <p className="text-xs max-w-xs mb-4">
                  Ask me to create shapes, arrange layouts, or modify elements
                  on your canvas.
                </p>
                <ScrollArea className="h-[calc(100vh-550px)] w-full">
                  <div className="space-y-2 w-full max-w-sm px-4 pb-4">
                    <p className="text-xs font-medium mb-2">Basic Shapes:</p>
                    {[
                      "Create a red circle at 200, 200",
                      "Add a blue rectangle at 400, 200",
                      "Make a text that says Hello World at 500, 100",
                      "Draw a line from 0, 0 to 200, 200",
                      "Create a green triangle at 400, 300",
                      "Add a frame at 600, 400 with size 300x300",
                      "Create a 3x3 grid of squares at 100, 100",
                    ].map((command, index) => (
                      <Button
                        key={`basic-${index}`}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs h-auto py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-300 dark:hover:border-blue-700 whitespace-normal text-left"
                        onClick={() => handleQuickAction(command)}
                        disabled={isLoading}
                      >
                        <span className="break-words">{command}</span>
                      </Button>
                    ))}

                    <p className="text-xs font-medium mb-2 mt-4">
                      Complex Components:
                    </p>
                    {[
                      "Create a login form at 100, 100",
                      "Create a navigation bar at 100, 50 with Home, About, Services, Contact",
                      "Create a card at 500, 100 titled Dashboard with description Welcome to your dashboard",
                      "Create a button at 300, 300 that says Click Me",
                      "Create a dashboard titled Sales Overview with 4 cards at 200, 200",
                    ].map((command, index) => (
                      <Button
                        key={`complex-${index}`}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs h-auto py-2 px-3 hover:bg-purple-50 dark:hover:bg-purple-950 hover:text-purple-700 dark:hover:text-purple-300 hover:border-purple-300 dark:hover:border-purple-700 whitespace-normal text-left"
                        onClick={() => handleQuickAction(command)}
                        disabled={isLoading}
                      >
                        <span className="break-words">{command}</span>
                      </Button>
                    ))}

                    <p className="text-xs font-medium mb-2 mt-4">
                      Manipulation & Layout:
                    </p>
                    {[
                      "Move the circle to 500, 500",
                      "Resize the rectangle to 200x150",
                      "Rotate the shape 45 degrees",
                      "Change the circle color to red",
                      "Delete that shape",
                    ].map((command, index) => (
                      <Button
                        key={`manip-${index}`}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs h-auto py-2 px-3 hover:bg-green-50 dark:hover:bg-green-950 hover:text-green-700 dark:hover:text-green-300 hover:border-green-300 dark:hover:border-green-700 whitespace-normal text-left"
                        onClick={() => handleQuickAction(command)}
                        disabled={isLoading}
                      >
                        <span className="break-words">{command}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="space-y-4">
                {messages
                  .filter((message) => message.content.trim().length > 0)
                  .map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                      <div
                        className={`flex flex-col max-w-[80%] ${
                          message.role === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`rounded-lg px-3 py-2 text-sm ${
                            message.role === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                      </div>
                      {message.role === "user" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {queueLength > 0
                          ? `Processing... (${queueLength} queued)`
                          : "Thinking..."}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Error Display */}
          {error && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20">
              <Badge variant="destructive" className="text-xs">
                Error: {error.message}
              </Badge>
            </div>
          )}

          <Separator />

          {/* Input Area */}
          <div className="flex-shrink-0 p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask AI to create or modify canvas elements..."
                className="flex-1 text-sm"
                disabled={isLoading || isInitializing}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                size="sm"
                className="px-3"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Clear Chat Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your chat messages with the AI
              assistant. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearChat}>
              Clear Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

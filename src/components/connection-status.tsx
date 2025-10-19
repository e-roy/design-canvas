"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ConnectionState = "online" | "offline" | "reconnecting";

export function ConnectionStatus() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("online");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Monitor Firebase Realtime Database connection state
    const connectedRef = ref(realtimeDb, ".info/connected");

    let reconnectTimer: NodeJS.Timeout | null = null;

    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const isConnected = snapshot.val() === true;

      if (isConnected) {
        // Clear any reconnect timer
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }

        setConnectionState("online");
        // Hide the indicator after 2 seconds when online
        setTimeout(() => setIsVisible(false), 2000);
      } else {
        // Show reconnecting state immediately
        setConnectionState("reconnecting");
        setIsVisible(true);

        // If still not connected after 3 seconds, show offline
        reconnectTimer = setTimeout(() => {
          setConnectionState("offline");
        }, 3000);
      }
    });

    // Show the indicator initially
    setIsVisible(true);

    return () => {
      unsubscribe();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, []);

  // Always render but control visibility with opacity and pointer-events
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-all duration-300 border",
            isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
            connectionState === "online" &&
              "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
            connectionState === "reconnecting" &&
              "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800",
            connectionState === "offline" &&
              "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
          )}
        >
          {connectionState === "online" && (
            <>
              <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Connected
              </span>
            </>
          )}
          {connectionState === "reconnecting" && (
            <>
              <RefreshCw className="w-4 h-4 text-yellow-600 dark:text-yellow-400 animate-spin" />
              <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                Reconnecting...
              </span>
            </>
          )}
          {connectionState === "offline" && (
            <>
              <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-red-700 dark:text-red-300">
                Offline
              </span>
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="text-xs">
          {connectionState === "online" && (
            <p>Connected to server. Your changes are being saved.</p>
          )}
          {connectionState === "reconnecting" && (
            <p>
              Attempting to reconnect to server. Changes will sync when
              reconnected.
            </p>
          )}
          {connectionState === "offline" && (
            <p>
              Disconnected from server. Changes will be saved locally and synced
              when reconnected.
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

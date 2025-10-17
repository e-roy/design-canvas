"use client";

import { useState, memo, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useUserStore } from "@/store";
import { useCursorStore } from "@/store/cursor-store";
import { cursorManager } from "@/lib/cursor-manager";
import { canvasService } from "@/lib/canvas-service";

import { logout } from "@/lib/firebase/auth";

export const UserAvatar = memo(function UserAvatar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { user, clearUser } = useUserStore();
  const { clearCursors } = useCursorStore();

  const handleLogout = useCallback(async () => {
    try {
      // Clear cursor data and unsubscribe from all listeners before signing out
      cursorManager.clearUserCursor();
      cursorManager.unsubscribeAll();
      canvasService.unsubscribeAll();

      // Sign out from Firebase
      await signOut(auth);
      await logout();
      router.refresh();

      // Clear user from store
      clearUser();
      clearCursors();

      // Small delay to ensure all Firebase connections are properly closed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Redirect to login
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [router, clearUser, clearCursors]);

  const getInitials = useCallback(
    (name: string | null, email: string | null) => {
      if (name) {
        return name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
      }
      if (email) {
        return email[0].toUpperCase();
      }
      return "U";
    },
    []
  );

  const userInitials = useMemo(
    () => (user ? getInitials(user.displayName, user.email) : "U"),
    [user, getInitials]
  );

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative w-full h-auto p-3 justify-start"
        >
          <div className="flex items-center space-x-3 w-full">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage
                src={user.photoURL || ""}
                alt={user.displayName || ""}
              />
              <AvatarFallback className="bg-blue-500 text-white text-sm">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start min-w-0 flex-1 text-left">
              <p className="text-sm font-medium leading-none truncate w-full text-left">
                {user.displayName || "User"}
              </p>
              <p className="text-xs text-muted-foreground leading-none mt-1 truncate w-full text-left">
                {user.email}
              </p>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.displayName || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-300 dark:focus:bg-red-900/20"
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

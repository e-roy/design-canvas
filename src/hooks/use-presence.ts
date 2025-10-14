import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { presenceManager } from "@/lib/presence";
import { useUserStore } from "@/store/user-store";
import { UserPresence, UsePresenceReturn, BaseUser } from "@/types";

export function usePresence(projectId?: string): UsePresenceReturn {
  const { user, setUser } = useUserStore();
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [projectUsers, setProjectUsers] = useState<UserPresence[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  // Convert Firebase user to our BaseUser format
  const convertFirebaseUserToPresence = useCallback(
    (firebaseUser: FirebaseUser | null): BaseUser | null => {
      if (!firebaseUser) return null;

      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      };
    },
    []
  );

  // Set user presence when user changes
  useEffect(() => {
    if (user) {
      const presenceUser = convertFirebaseUserToPresence({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      } as FirebaseUser);

      if (presenceUser) {
        presenceManager.setUserPresence(presenceUser, projectId || undefined);
        setIsOnline(true);
      }
    } else {
      presenceManager.clearUserPresence();
      setIsOnline(false);
    }
  }, [user, projectId, convertFirebaseUserToPresence]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const presenceUser = convertFirebaseUserToPresence(firebaseUser);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });

        if (presenceUser) {
          presenceManager.setUserPresence(presenceUser, projectId || undefined);
          setIsOnline(true);
        }
      } else {
        setUser(null);
        presenceManager.clearUserPresence();
        setIsOnline(false);
      }
    });

    return () => unsubscribeAuth();
  }, [setUser, projectId, convertFirebaseUserToPresence]);

  // Subscribe to all online users
  useEffect(() => {
    const unsubscribe = presenceManager.subscribeToAllUsers((onlineUsers) => {
      setUsers(onlineUsers);
    });

    return unsubscribe;
  }, []);

  // Subscribe to project users if projectId is provided
  useEffect(() => {
    if (projectId) {
      const unsubscribe = presenceManager.subscribeToProjectUsers(
        projectId,
        (projectOnlineUsers) => {
          setProjectUsers(projectOnlineUsers);
        }
      );

      return unsubscribe;
    } else {
      setProjectUsers([]);
    }
  }, [projectId]);

  // Handle page visibility changes (user switching tabs/windows)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        const presenceUser = convertFirebaseUserToPresence({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        } as FirebaseUser);

        if (presenceUser) {
          presenceManager.setUserPresence(presenceUser, projectId || undefined);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, projectId, convertFirebaseUserToPresence]);

  // Handle beforeunload (user closing tab/window)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        // Note: This is a fire-and-forget call since the page is unloading
        presenceManager.clearUserPresence().catch(console.error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      presenceManager.unsubscribeAll();
    };
  }, []);

  const setProjectPresence = useCallback(
    (newProjectId: string | null) => {
      if (!user) return;

      const presenceUser = convertFirebaseUserToPresence({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      } as FirebaseUser);

      if (presenceUser) {
        presenceManager.setUserPresence(
          presenceUser,
          newProjectId || undefined
        );
      }
    },
    [user, convertFirebaseUserToPresence]
  );

  return {
    users,
    projectUsers,
    isOnline,
    setProjectPresence,
  };
}

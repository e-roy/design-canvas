// Base user data (without runtime presence properties)
export interface BaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Full presence data with runtime properties
export interface UserPresence extends BaseUser {
  isOnline: boolean;
  lastSeen: Date;
  currentProject?: string | null; // Project ID they're currently viewing
  sessionId: string; // Unique session identifier
}

export interface ProjectPresence {
  projectId: string;
  users: Record<string, Omit<UserPresence, "currentProject" | "email">>;
  lastUpdated: Date;
}

// Hook return types
export interface UsePresenceReturn {
  users: UserPresence[];
  projectUsers: UserPresence[];
  isOnline: boolean;
  setProjectPresence: (projectId: string | null) => void;
}

// Utility types
export interface PresenceConfig {
  heartbeatInterval: number; // milliseconds
  offlineThreshold: number; // milliseconds
}

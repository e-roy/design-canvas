/**
 * Firebase Admin SDK initialization for server-side operations
 */

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App;
let adminDb: Firestore;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment
 *
 * To use with Firebase Emulators in development:
 * Set FIRESTORE_EMULATOR_HOST=localhost:8080 in your .env.local file
 */
export function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // Check if already initialized
  const apps = getApps();
  if (apps.length > 0) {
    adminApp = apps[0];
    return adminApp;
  }

  // Initialize with service account or default credentials
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Parse service account JSON from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    console.warn(
      "FIREBASE_SERVICE_ACCOUNT not found. " +
        "Please set it in your .env.local file for server-side Firestore writes. " +
        "See docs/ai-tool-setup.md for instructions."
    );
    // Try to initialize with just project ID (will likely fail for writes)
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }

  return adminApp;
}

/**
 * Get Firestore instance for Admin SDK
 */
export function getAdminFirestore(): Firestore {
  if (adminDb) {
    return adminDb;
  }

  const app = getAdminApp();
  adminDb = getFirestore(app);

  return adminDb;
}

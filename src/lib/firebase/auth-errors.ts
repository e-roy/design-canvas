/**
 * Maps Firebase authentication error codes to user-friendly messages
 * @param error - The Firebase error object
 * @returns A user-friendly error message
 */
export function getAuthErrorMessage(error: unknown): string {
  // Suppress Firebase error logging to avoid console spam
  if (
    error instanceof Error &&
    (error.message.includes("auth/") || error.message.includes("Firebase:"))
  ) {
    // Don't log Firebase errors as they're handled gracefully
    console.debug(
      "Firebase auth error handled:",
      error.message.split("auth/")[1] || error.message
    );
  }

  if (!(error instanceof Error)) {
    return "An unexpected error occurred. Please try again.";
  }

  // Extract error code from Firebase error message
  const errorCode = error.message.match(/auth\/[^)]+/)?.[0];

  switch (errorCode) {
    case "auth/user-not-found":
      return "No account found with this email address. Please check your email or sign up for a new account.";

    case "auth/wrong-password":
      return "Incorrect password. Please try again or reset your password.";

    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/user-disabled":
      return "This account has been disabled. Please contact support for assistance.";

    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";

    case "auth/weak-password":
      return "Password should be at least 6 characters long.";

    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Please contact support.";

    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later or reset your password.";

    case "auth/network-request-failed":
      return "Network error. Please check your internet connection and try again.";

    case "auth/requires-recent-login":
      return "This operation requires recent authentication. Please log in again.";

    case "auth/user-token-expired":
      return "Your session has expired. Please log in again.";

    case "auth/invalid-credential":
      return "Invalid email or password. Please check your credentials and try again.";

    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";

    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled. Please try again.";

    case "auth/popup-blocked":
      return "Pop-up was blocked by your browser. Please allow pop-ups and try again.";

    case "auth/credential-already-in-use":
      return "This credential is already associated with another account.";

    case "auth/invalid-verification-code":
      return "Invalid verification code. Please check and try again.";

    case "auth/invalid-verification-id":
      return "Invalid verification ID. Please try again.";

    default:
      // If it's a Firebase auth error but not one we recognize, show a generic message
      if (error.message.includes("auth/")) {
        return "Authentication failed. Please check your credentials and try again.";
      }

      // For non-Firebase errors, return the original message
      return error.message || "An unexpected error occurred. Please try again.";
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { authMiddleware } from "next-firebase-auth-edge";

export async function middleware(request: NextRequest) {
  // Skip middleware when using Firebase emulators
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    return NextResponse.next();
  }

  return authMiddleware(request, {
    loginPath: "/api/login",
    logoutPath: "/api/logout",
    refreshTokenPath: "/api/refresh-token",
    apiKey: process.env.FIREBASE_API_KEY!,
    enableCustomToken: true,
    cookieName: "AuthToken",
    cookieSignatureKeys: [process.env.COOKIE_SECRET!],
    cookieSerializeOptions: {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 12 * 60 * 60 * 24, // Twelve days
    },
    serviceAccount: {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
    handleValidToken: async () => {
      // User is authenticated, allow access to dashboard
      return NextResponse.next();
    },
    handleInvalidToken: async () => {
      // User is not authenticated, redirect to login page
      console.log("Invalid token");
      return NextResponse.redirect(new URL("/login", request.url));
    },
    handleError: async (error) => {
      console.error("Authentication error", { error });
      return NextResponse.redirect(new URL("/login", request.url));
    },
  });
}

export const config = {
  matcher: [
    "/canvas/:path*",
    "/canvas-refactored/:path*",
    "/api/login",
    "/api/logout",
    "/api/refresh-token",
  ],
};

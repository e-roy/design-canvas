import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CollabCanvas — Design Together, Smarter",
  description:
    "CollabCanvas lets teams co-create beautiful designs in real time — with AI that helps you ideate, refine, and ship faster.",
  keywords: [
    "collaborative design",
    "real-time collaboration",
    "AI design assistant",
    "team design",
    "design canvas",
  ],
  authors: [{ name: "CollabCanvas" }],
  creator: "CollabCanvas",
  publisher: "CollabCanvas",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://design-canvas-ruddy.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "CollabCanvas — Design Together, Smarter",
    description:
      "CollabCanvas lets teams co-create beautiful designs in real time — with AI that helps you ideate, refine, and ship faster.",
    url: "https://design-canvas-ruddy.vercel.app",
    siteName: "CollabCanvas",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CollabCanvas — Design Together, Smarter",
    description:
      "CollabCanvas lets teams co-create beautiful designs in real time — with AI that helps you ideate, refine, and ship faster.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === "development";
  return (
    <html lang="en">
      <head>
        {/* The script will only be loaded in development */}
        {isDev && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script
            crossOrigin="anonymous"
            src="//unpkg.com/react-scan/dist/auto.global.js"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider delayDuration={0}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </TooltipProvider>
      </body>
    </html>
  );
}

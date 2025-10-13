"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function CanvasPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.push("/login");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Design Canvas</h1>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Online: {onlineUsers.length}
              </span>
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 3).map((user, index) => (
                  <div
                    key={index}
                    className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs text-white font-medium"
                  >
                    {user.charAt(0).toUpperCase()}
                  </div>
                ))}
                {onlineUsers.length > 3 && (
                  <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 font-medium">
                    +{onlineUsers.length - 3}
                  </div>
                )}
              </div>
            </div>

            <Button asChild variant="outline" size="sm">
              <Link href="/">← Back to Home</Link>
            </Button>

            <UserAvatar />
          </div>
        </div>
      </header>

      {/* Canvas Area */}
      <main className="flex-1 relative">
        <div className="absolute inset-0 bg-white dark:bg-gray-800">
          {/* Canvas will be implemented here */}
          <div className="flex items-center justify-center h-full">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="text-center">
                  Canvas Coming Soon
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  The collaborative canvas will be implemented here with:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Pan and zoom functionality</li>
                  <li>• Shape creation tools</li>
                  <li>• Real-time collaboration</li>
                  <li>• Live cursors and presence</li>
                </ul>
                <Button onClick={() => setIsConnected(!isConnected)}>
                  {isConnected ? "Disconnect" : "Connect"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Toolbar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Rectangle
            </Button>
            <Button variant="outline" size="sm">
              Circle
            </Button>
            <Button variant="outline" size="sm">
              Text
            </Button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />
            <Button variant="outline" size="sm">
              Select
            </Button>
            <Button variant="outline" size="sm">
              Pan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

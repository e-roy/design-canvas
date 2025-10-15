import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300 dark:text-gray-600 mb-4">
            404
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto rounded-full"></div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
            {`Oops! The page you're looking for doesn't exist.`}
          </p>
          <p className="text-gray-500 dark:text-gray-400">
            It might have been moved, deleted, or you entered the wrong URL.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button asChild size="lg" className="flex items-center gap-2">
            <Link href="/">
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </Button>
        </div>

        {/* Search Suggestion */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Looking for something?
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Try searching for what you need or browse our main sections:
          </p>
          <div className="space-y-2">
            <Link
              href="/login"
              className="block text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              → Login
            </Link>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="mt-12 opacity-20">
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div
              className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Design Canvas
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Collaborate in real-time on a shared design canvas. Create, edit,
            and iterate together with your team.
          </p>

          <div className="flex gap-4 justify-center mb-12">
            <Button asChild size="lg">
              <Link href="/login">Get Started</Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-3">
                Real-time Collaboration
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Work together with live cursors, presence awareness, and instant
                synchronization.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-3">Intuitive Canvas</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Pan, zoom, and create shapes with a smooth and responsive design
                interface.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-3">Secure & Fast</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Built with modern web technologies for security, performance,
                and reliability.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

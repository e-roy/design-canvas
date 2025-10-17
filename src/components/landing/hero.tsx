"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { landingPageContent } from "@/components/landing/content";

export function Hero() {
  const { scrollY } = useScroll();
  const shouldReduceMotion = useReducedMotion();

  // Parallax and float effects - disabled when reduced motion is preferred
  const parallaxY = useTransform(
    scrollY,
    [0, 500],
    [0, shouldReduceMotion ? 0 : -12]
  );
  const floatY = useTransform(
    scrollY,
    [0, 1000],
    [0, shouldReduceMotion ? 0 : 2]
  );

  // Animation variants following the exact choreography specified
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.02,
      y: -2,
      transition: { duration: 0.2 },
    },
    tap: { scale: 0.98 },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-white pt-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-50 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Text Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-10"
          >
            {/* Eyebrow */}
            <motion.div variants={itemVariants}>
              <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                {landingPageContent.hero.eyebrow}
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
              style={{ color: "#0F172A" }}
            >
              <span className="block">{landingPageContent.hero.h1}</span>
            </motion.h1>

            {/* Subhead */}
            <motion.p
              variants={itemVariants}
              className="text-xl md:text-2xl text-slate-600 leading-relaxed max-w-2xl"
            >
              {landingPageContent.hero.subhead}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  asChild
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-4 h-auto shadow-lg hover:shadow-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Link href="/login">
                    {landingPageContent.hero.primaryCta}
                  </Link>
                </Button>
              </motion.div>
              {/* <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 text-lg px-8 py-4 h-auto shadow-md hover:shadow-lg transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  <Link href="#features">
                    {landingPageContent.hero.secondaryCta}
                  </Link>
                </Button>
              </motion.div> */}
            </motion.div>

            {/* Trust Line */}
            <motion.div variants={itemVariants} className="pt-8">
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <span className="font-medium">Trusted by teams at</span>
                <div className="flex items-center space-x-4 grayscale opacity-60">
                  <span className="font-semibold">Acme</span>
                  <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                  <span className="font-semibold">Northstar</span>
                  <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                  <span className="font-semibold">Helix</span>
                  <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                  <span className="font-semibold">Brightly</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Enhanced Mockup */}
          <motion.div
            style={{ y: parallaxY }}
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div style={{ y: floatY }} className="relative">
              {/* Enhanced Mockup Container */}
              <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 shadow-2xl border border-slate-200">
                {/* Browser Header */}
                <div className="flex items-center space-x-2 mb-6">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="flex-1 bg-white rounded px-3 py-1 text-sm text-slate-600 border border-slate-200">
                    CollabCanvas
                  </div>
                </div>

                {/* Enhanced Canvas Mockup */}
                <div className="bg-white rounded-lg p-6 min-h-[450px] relative overflow-hidden border border-slate-200">
                  {/* Grid Background */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="grid grid-cols-12 grid-rows-12 h-full w-full">
                      {Array.from({ length: 144 }).map((_, i) => (
                        <div key={i} className="border border-slate-200"></div>
                      ))}
                    </div>
                  </div>

                  {/* Enhanced Mock Shapes */}
                  <div className="relative z-10 space-y-6">
                    {/* Header Section */}
                    <div className="flex items-center justify-between mb-8">
                      <div className="w-40 h-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                        <span className="text-slate-600 text-sm font-medium">
                          Project Dashboard
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            A
                          </span>
                        </div>
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            S
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="space-y-6">
                      {/* Hero Section */}
                      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 border border-slate-200">
                        <div className="space-y-4">
                          <div className="w-3/4 h-6 bg-slate-200 rounded"></div>
                          <div className="w-1/2 h-4 bg-slate-200 rounded"></div>
                          <div className="flex space-x-3 pt-2">
                            <div className="w-24 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                Get Started
                              </span>
                            </div>
                            <div className="w-20 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
                              <span className="text-slate-600 text-xs">
                                Learn More
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-20 bg-green-50 rounded-xl flex items-center justify-center border border-green-200">
                          <div className="text-center">
                            <div className="w-8 h-8 bg-green-500 rounded-lg mx-auto mb-2"></div>
                            <span className="text-green-800 text-xs font-medium">
                              Design
                            </span>
                          </div>
                        </div>
                        <div className="h-20 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-200">
                          <div className="text-center">
                            <div className="w-8 h-8 bg-blue-500 rounded-lg mx-auto mb-2"></div>
                            <span className="text-blue-800 text-xs font-medium">
                              Collaborate
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Text Content */}
                      <div className="space-y-3">
                        <div className="w-full h-4 bg-slate-200 rounded"></div>
                        <div className="w-4/5 h-4 bg-slate-200 rounded"></div>
                        <div className="w-3/5 h-4 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Mock Cursors */}
                  <div className="absolute top-12 right-12 w-5 h-5 bg-blue-600 rounded-full shadow-lg animate-pulse">
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap shadow-lg">
                      Sarah
                    </div>
                    <div className="absolute top-1 left-1 w-3 h-3 bg-blue-600 rounded-full"></div>
                  </div>
                  <div
                    className="absolute bottom-16 left-16 w-5 h-5 bg-green-600 rounded-full shadow-lg animate-pulse"
                    style={{ animationDelay: "0.5s" }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap shadow-lg">
                      Alex
                    </div>
                    <div className="absolute top-1 left-1 w-3 h-3 bg-green-600 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Enhanced Floating Elements */}
              <div className="absolute -top-6 -right-6 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shadow-lg border border-blue-200">
                <div className="w-6 h-6 bg-blue-600 rounded-full"></div>
              </div>
              <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shadow-lg border border-green-200">
                <div className="w-6 h-6 bg-green-600 rounded-full"></div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

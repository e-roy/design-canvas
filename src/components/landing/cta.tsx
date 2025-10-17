"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { landingPageContent } from "@/components/landing/content";

const cardVariants = {
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

export function CTA() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-green-50 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-blue-50 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-8 relative z-10">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
        >
          <Card className="p-12 md:p-16 text-center bg-gradient-to-br from-blue-50 to-green-50 border-2 border-blue-200 shadow-2xl relative overflow-hidden">
            {/* Card Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-10 left-10 w-20 h-20 bg-blue-600 rounded-full"></div>
              <div className="absolute bottom-10 right-10 w-16 h-16 bg-green-600 rounded-full"></div>
              <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-blue-400 rounded-full"></div>
            </div>

            <div className="relative z-10 space-y-10">
              {/* Decorative Icon */}
              <motion.div
                animate={
                  shouldReduceMotion
                    ? {}
                    : {
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1],
                        transition: {
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut" as const,
                        },
                      }
                }
                className="flex justify-center mb-6"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-8 h-8 text-blue-600" />
                </div>
              </motion.div>

              {/* Heading */}
              <h2
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
                style={{ color: "#0F172A" }}
              >
                {landingPageContent.cta.h2}
              </h2>

              {/* Subtext */}
              <p className="text-xl md:text-2xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
                {landingPageContent.cta.subtext}
              </p>

              {/* CTA Button */}
              <motion.div
                variants={buttonVariants}
                whileHover={shouldReduceMotion ? {} : "hover"}
                whileTap={shouldReduceMotion ? {} : "tap"}
                className="pt-6"
              >
                <Button
                  asChild
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xl font-semibold px-12 py-6 h-auto shadow-xl hover:shadow-2xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Link href="/login" className="flex items-center">
                    {landingPageContent.cta.button}
                    <ArrowRight className="ml-3 w-6 h-6" />
                  </Link>
                </Button>
              </motion.div>

              {/* Trust Indicators */}
              <div className="pt-8">
                <div className="flex items-center justify-center space-x-8 text-sm text-slate-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Free forever plan</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Setup in 2 minutes</span>
                  </div>
                </div>
              </div>

              {/* Decorative Element */}
              <div className="w-full h-1 bg-gradient-to-r from-blue-600 to-green-600 rounded-full mx-auto max-w-md"></div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-blue-600 rounded-full opacity-20"></div>
            <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-green-600 rounded-full opacity-20"></div>
            <div className="absolute top-1/2 -right-6 w-6 h-6 bg-blue-400 rounded-full opacity-30"></div>
            <div className="absolute top-1/4 -left-6 w-6 h-6 bg-green-400 rounded-full opacity-30"></div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

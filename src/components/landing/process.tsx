"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Sparkles } from "lucide-react";
import { landingPageContent } from "@/components/landing/content";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.2,
    },
  },
};

const stepVariants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const badgeVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.4,
      delay: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const iconVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.4,
      delay: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// Icon mapping for each step
const stepIcons = {
  "Create a canvas": Plus,
  "Collaborate live": Users,
  "Boost with AI": Sparkles,
};

export function Process() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-20 bg-slate-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/6 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-1/3 right-1/6 w-96 h-96 bg-green-50 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          transition={{
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1] as const,
          }}
          className="text-center mb-20"
        >
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            style={{ color: "#0F172A" }}
          >
            {landingPageContent.process.h2}
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Get started with CollabCanvas in three simple steps
          </p>
        </motion.div>

        {/* Process Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"
        >
          {landingPageContent.process.steps.map((step, index) => {
            const IconComponent =
              stepIcons[step.title as keyof typeof stepIcons];

            return (
              <motion.div
                key={step.title}
                variants={stepVariants}
                className="relative group"
              >
                {/* Step Number Badge */}
                <motion.div
                  variants={badgeVariants}
                  className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20"
                >
                  <Badge className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xl font-bold w-16 h-16 rounded-full flex items-center justify-center shadow-xl border-4 border-white">
                    {index + 1}
                  </Badge>
                </motion.div>

                {/* Step Card */}
                <Card className="p-8 pt-16 h-full border-2 border-slate-200 bg-white/90 backdrop-blur-sm hover:border-blue-300 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                  {/* Card Background Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-green-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  <div className="relative z-10 space-y-6">
                    {/* Icon */}
                    <motion.div
                      variants={iconVariants}
                      className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300 shadow-lg group-hover:shadow-xl mx-auto"
                    >
                      <IconComponent className="w-8 h-8 text-blue-600 group-hover:text-blue-700 transition-colors duration-300" />
                    </motion.div>

                    {/* Content */}
                    <div className="space-y-4 text-center">
                      <h3
                        className="text-2xl font-bold group-hover:text-blue-600 transition-colors duration-300"
                        style={{ color: "#0F172A" }}
                      >
                        {step.title}
                      </h3>
                      <p className="text-slate-600 leading-relaxed text-lg">
                        {step.description}
                      </p>
                    </div>

                    {/* Decorative Element */}
                    <div className="w-full h-1 bg-gradient-to-r from-blue-600 to-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  {/* Floating Elements */}
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110"></div>
                  <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110"></div>
                </Card>

                {/* Enhanced Connecting Line (except for last item) */}
                {index < landingPageContent.process.steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 lg:-right-8 transform -translate-y-1/2 z-10">
                    <div className="flex items-center space-x-2">
                      <div className="w-12 lg:w-16 h-0.5 bg-gradient-to-r from-blue-600 to-green-600"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          transition={{
            duration: 0.6,
            delay: 0.6,
            ease: [0.22, 1, 0.36, 1] as const,
          }}
          className="text-center mt-20"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 shadow-lg max-w-2xl mx-auto">
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: "#0F172A" }}
            >
              Ready to get started?
            </h3>
            <p className="text-slate-600 mb-6">
              Join thousands of teams already using CollabCanvas to design
              better, together.
            </p>
            <motion.div
              whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
              className="inline-block"
            >
              <a
                href="/login"
                className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Start Your First Canvas
                <svg
                  className="ml-2 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

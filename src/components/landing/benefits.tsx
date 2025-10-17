"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Users, Sparkles, Zap, Cloud } from "lucide-react";
import { landingPageContent } from "@/components/landing/content";

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

const iconVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.4,
      delay: 0.2,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// Icon mapping for each benefit
const benefitIcons = {
  "Real-Time Collaboration": Users,
  "AI Design Assistant": Sparkles,
  "Simple Yet Powerful": Zap,
  "Cloud-Synced": Cloud,
};

export function Benefits() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-blue-50 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-green-50 rounded-full blur-3xl opacity-40"></div>
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
            {landingPageContent.benefits.h2}
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Discover the features that make CollabCanvas the perfect choice for
            modern design teams
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {landingPageContent.benefits.cards.map((benefit) => {
            const IconComponent =
              benefitIcons[benefit.title as keyof typeof benefitIcons];

            return (
              <motion.div
                key={benefit.title}
                variants={cardVariants}
                whileHover={
                  shouldReduceMotion
                    ? {}
                    : {
                        y: -8,
                        transition: { duration: 0.2 },
                      }
                }
                className="group"
              >
                <Card className="p-8 h-full border-2 border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm relative overflow-hidden">
                  {/* Card Background Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-green-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  <div className="relative z-10 space-y-6">
                    {/* Icon */}
                    <motion.div
                      variants={iconVariants}
                      className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300 shadow-lg group-hover:shadow-xl"
                    >
                      <IconComponent className="w-8 h-8 text-blue-600 group-hover:text-blue-700 transition-colors duration-300" />
                    </motion.div>

                    {/* Content */}
                    <div className="space-y-3">
                      <h3
                        className="text-xl font-bold group-hover:text-blue-600 transition-colors duration-300"
                        style={{ color: "#0F172A" }}
                      >
                        {benefit.title}
                      </h3>
                      <p className="text-slate-600 leading-relaxed text-base">
                        {benefit.description}
                      </p>
                    </div>

                    {/* Decorative Element */}
                    <div className="w-full h-1 bg-gradient-to-r from-blue-600 to-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  {/* Floating Elements */}
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110"></div>
                  <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110"></div>
                </Card>
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
            delay: 0.4,
            ease: [0.22, 1, 0.36, 1] as const,
          }}
          className="text-center mt-16"
        >
          <p className="text-lg text-slate-600 mb-6">
            Ready to experience these benefits for yourself?
          </p>
          <motion.div
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            className="inline-block"
          >
            <a
              href="#pricing"
              className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Get Started Free
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
        </motion.div>
      </div>
    </section>
  );
}

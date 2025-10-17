"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Quote, Star, Users } from "lucide-react";
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

const quoteVariants = {
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

export function Testimonials() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/6 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-1/4 right-1/6 w-96 h-96 bg-green-50 rounded-full blur-3xl opacity-30"></div>
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
            {landingPageContent.testimonials.h2}
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            See what designers are saying about CollabCanvas
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {landingPageContent.testimonials.quotes.map((testimonial, index) => (
            <motion.div
              key={index}
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
              <Card className="p-8 h-full border-2 border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm relative overflow-hidden">
                {/* Card Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-green-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="relative z-10 space-y-6">
                  {/* Quote Icon */}
                  <motion.div
                    variants={quoteVariants}
                    className="absolute top-6 right-6 opacity-20 group-hover:opacity-40 transition-opacity duration-300"
                  >
                    <Quote className="w-12 h-12 text-blue-600" />
                  </motion.div>

                  {/* Quote Text */}
                  <blockquote className="text-lg text-slate-700 leading-relaxed font-medium pr-8">
                    &ldquo;{testimonial.text}&rdquo;
                  </blockquote>

                  {/* Author Section */}
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center space-x-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-blue-600 font-bold text-lg">
                          {testimonial.author
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>

                      <div className="flex-1">
                        <div
                          className="font-bold text-lg"
                          style={{ color: "#0F172A" }}
                        >
                          {testimonial.author}
                        </div>
                        <div className="text-slate-600 font-medium">
                          {testimonial.role}
                        </div>
                      </div>
                    </div>

                    {/* Rating Stars */}
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, starIndex) => (
                        <Star
                          key={starIndex}
                          className="w-4 h-4 text-yellow-400 fill-current"
                        />
                      ))}
                      <span className="text-sm text-slate-500 ml-2">5.0</span>
                    </div>
                  </div>

                  {/* Decorative Element */}
                  <div className="w-full h-1 bg-gradient-to-r from-blue-600 to-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110"></div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          transition={{
            duration: 0.6,
            delay: 0.4,
            ease: [0.22, 1, 0.36, 1] as const,
          }}
          className="text-center mt-20"
        >
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8 border border-slate-200 shadow-lg max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div
                  className="text-3xl font-bold mb-2"
                  style={{ color: "#0F172A" }}
                >
                  10,000+
                </div>
                <div className="text-slate-600 font-medium">
                  Active Designers
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center shadow-lg">
                    <Star className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div
                  className="text-3xl font-bold mb-2"
                  style={{ color: "#0F172A" }}
                >
                  4.9/5
                </div>
                <div className="text-slate-600 font-medium">Average Rating</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center shadow-lg">
                    <Quote className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div
                  className="text-3xl font-bold mb-2"
                  style={{ color: "#0F172A" }}
                >
                  50+
                </div>
                <div className="text-slate-600 font-medium">Countries</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  Users,
  Sparkles,
  Zap,
  Cloud,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { landingPageContent } from "@/components/landing/content";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.2,
    },
  },
};

const rowVariants = {
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

const imageVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const textVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      delay: 0.12,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// Icon mapping for each feature
const featureIcons = {
  "Smart Layout Suggestions": Sparkles,
  "AI Design Assistant": Users,
  "Version History & Comments": Cloud,
  "Multiplayer Editing": Zap,
};

// Feature-specific mockup data
const featureMockups = {
  "Smart Layout Suggestions": {
    elements: [
      {
        type: "bar",
        color: "gradient-blue-green",
        width: "w-full",
        height: "h-6",
      },
      {
        type: "bar",
        color: "gradient-green-blue",
        width: "w-3/4",
        height: "h-6",
      },
    ],
    cursors: [],
  },
  "AI Design Assistant": {
    elements: [
      { type: "button", color: "blue", width: "w-20", height: "h-8", delay: 0 },
      {
        type: "button",
        color: "green",
        width: "w-16",
        height: "h-8",
        delay: 0.5,
        margin: "ml-4",
      },
      {
        type: "button",
        color: "purple",
        width: "w-24",
        height: "h-8",
        delay: 1,
        margin: "ml-8",
      },
    ],
    cursors: [],
  },
  "Version History & Comments": {
    elements: [
      { type: "pulse", color: "blue", size: "w-3 h-3", delay: 0 },
      { type: "pulse", color: "green", size: "w-3 h-3", delay: 0.5 },
      { type: "pulse", color: "purple", size: "w-3 h-3", delay: 1 },
    ],
    cursors: [],
  },
  "Multiplayer Editing": {
    elements: [
      { type: "circle", color: "blue", size: "w-6 h-6" },
      { type: "circle", color: "green", size: "w-6 h-6" },
      { type: "circle", color: "purple", size: "w-6 h-6" },
    ],
    cursors: [
      { color: "blue", position: "top-4 right-4", name: "Sarah" },
      { color: "green", position: "bottom-4 left-4", name: "Alex" },
    ],
  },
};

export function Features() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="features" className="py-20 bg-white relative overflow-hidden">
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
            {landingPageContent.features.h2}
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Powerful features designed to enhance your creative workflow
          </p>
        </motion.div>

        {/* Feature Rows */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          className="space-y-24"
        >
          {landingPageContent.features.blocks.map((feature, index) => {
            const IconComponent =
              featureIcons[feature.title as keyof typeof featureIcons];
            const mockupData =
              featureMockups[feature.title as keyof typeof featureMockups];

            return (
              <motion.div
                key={feature.title}
                variants={rowVariants}
                className={`grid lg:grid-cols-2 gap-16 items-center ${
                  index % 2 === 1 ? "lg:grid-flow-col-dense" : ""
                }`}
              >
                {/* Enhanced Image */}
                <motion.div
                  variants={imageVariants}
                  className={`${index % 2 === 1 ? "lg:col-start-2" : ""}`}
                >
                  <Card className="p-8 border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 hover:border-blue-300 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                    {/* Card Background Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-green-50/30 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>

                    <div className="relative z-10">
                      {/* Feature Icon */}
                      <div className="flex items-center justify-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center shadow-lg">
                          <IconComponent className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>

                      <div className="aspect-video bg-white rounded-xl flex items-center justify-center relative overflow-hidden border border-slate-200 shadow-lg">
                        {/* Mock Feature Interface */}
                        <div className="w-full h-full p-6">
                          {/* Mock UI Elements */}
                          <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="w-24 h-6 bg-slate-200 rounded-lg"></div>
                              <div className="w-8 h-8 bg-blue-600 rounded-full shadow-lg"></div>
                            </div>

                            {/* Content Area */}
                            <div className="space-y-3">
                              <div className="w-full h-4 bg-slate-200 rounded"></div>
                              <div className="w-3/4 h-4 bg-slate-200 rounded"></div>
                              <div className="w-1/2 h-4 bg-slate-200 rounded"></div>
                            </div>

                            {/* Feature-specific mockup */}
                            <div className="mt-6 space-y-2">
                              {mockupData.elements.map((element, elemIndex) => {
                                const baseClasses = `${
                                  "width" in element
                                    ? element.width
                                    : element.size
                                } ${
                                  "height" in element
                                    ? element.height
                                    : element.size
                                } rounded-lg`;
                                const marginClass =
                                  "margin" in element
                                    ? element.margin || ""
                                    : "";
                                const delayStyle =
                                  "delay" in element && element.delay
                                    ? { animationDelay: `${element.delay}s` }
                                    : {};

                                let colorClass = "";
                                if (element.color === "gradient-blue-green") {
                                  colorClass =
                                    "bg-gradient-to-r from-blue-500 to-green-500";
                                } else if (
                                  element.color === "gradient-green-blue"
                                ) {
                                  colorClass =
                                    "bg-gradient-to-r from-green-500 to-blue-500";
                                } else {
                                  colorClass = `bg-${element.color}-500`;
                                }

                                if (element.type === "pulse") {
                                  return (
                                    <div
                                      key={elemIndex}
                                      className="flex space-x-1"
                                    >
                                      <div
                                        className={`${baseClasses} ${colorClass} animate-pulse`}
                                        style={delayStyle}
                                      ></div>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={elemIndex}
                                    className={`${marginClass}`}
                                  >
                                    <div
                                      className={`${baseClasses} ${colorClass} shadow-lg`}
                                    ></div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Mock Cursors */}
                        {mockupData.cursors.map((cursor, cursorIndex) => (
                          <div
                            key={cursorIndex}
                            className={`absolute ${cursor.position} w-4 h-4 bg-${cursor.color}-600 rounded-full shadow-lg animate-pulse`}
                          >
                            <div
                              className={`absolute -top-6 left-1/2 transform -translate-x-1/2 bg-${cursor.color}-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap`}
                            >
                              {cursor.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Floating Elements */}
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-600 rounded-full opacity-0 hover:opacity-100 transition-all duration-300 transform hover:scale-110"></div>
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-green-600 rounded-full opacity-0 hover:opacity-100 transition-all duration-300 transform hover:scale-110"></div>
                  </Card>
                </motion.div>

                {/* Enhanced Text Content */}
                <motion.div
                  variants={textVariants}
                  className={`${index % 2 === 1 ? "lg:col-start-1" : ""}`}
                >
                  <div className="space-y-8">
                    {/* Feature Badge */}
                    <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Feature {index + 1}
                    </div>

                    <h3
                      className="text-3xl lg:text-4xl font-bold leading-tight"
                      style={{ color: "#0F172A" }}
                    >
                      {feature.title}
                    </h3>
                    <p className="text-xl text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Feature Benefits */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span className="text-slate-700 font-medium">
                          Enhanced productivity
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span className="text-slate-700 font-medium">
                          Seamless collaboration
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <span className="text-slate-700 font-medium">
                          Intuitive user experience
                        </span>
                      </div>
                    </div>

                    {/* Learn More Link */}
                    <motion.div
                      whileHover={shouldReduceMotion ? {} : { x: 4 }}
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200"
                    >
                      Learn more
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </motion.div>
                  </div>
                </motion.div>
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
          className="text-center mt-20"
        >
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8 border border-slate-200 shadow-lg max-w-3xl mx-auto">
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: "#0F172A" }}
            >
              Ready to experience these features?
            </h3>
            <p className="text-slate-600 mb-6">
              Start your free trial today and see how CollabCanvas can transform
              your design workflow.
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
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap } from "lucide-react";
import { landingPageContent } from "@/components/landing/content";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
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
      delay: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export function Pricing() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="pricing"
      className="py-20 bg-slate-50 relative overflow-hidden"
    >
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
            {landingPageContent.pricing.h2}
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Choose the perfect plan for your team&apos;s design needs
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {landingPageContent.pricing.plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={cardVariants}
              whileHover={
                shouldReduceMotion
                  ? {}
                  : {
                      y: -8,
                      transition: { duration: 0.2 },
                    }
              }
              className={`relative group ${plan.popular ? "md:-mt-6" : ""}`}
            >
              {/* Popular Badge */}
              {"badge" in plan && plan.badge && (
                <motion.div
                  variants={badgeVariants}
                  className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20"
                >
                  <motion.div
                    animate={
                      shouldReduceMotion
                        ? {}
                        : {
                            scale: [1, 1.05, 1],
                            transition: {
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut" as const,
                            },
                          }
                    }
                  >
                    <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 text-sm font-bold shadow-xl border-4 border-white">
                      <Star className="w-4 h-4 mr-2" />
                      {"badge" in plan ? plan.badge : ""}
                    </Badge>
                  </motion.div>
                </motion.div>
              )}

              <Card
                className={`p-8 h-full border-2 transition-all duration-300 relative overflow-hidden ${
                  plan.popular
                    ? "border-blue-600 bg-white shadow-2xl ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-xl"
                }`}
              >
                {/* Card Background Gradient */}
                <div
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    plan.popular
                      ? "bg-gradient-to-br from-blue-50/50 to-green-50/50 opacity-100"
                      : "bg-gradient-to-br from-blue-50/30 to-green-50/30 opacity-0 group-hover:opacity-100"
                  }`}
                ></div>

                <div className="relative z-10 space-y-8">
                  {/* Plan Header */}
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                          plan.popular
                            ? "bg-gradient-to-br from-blue-100 to-blue-200"
                            : "bg-gradient-to-br from-slate-100 to-slate-200"
                        }`}
                      >
                        {plan.name === "Free" && (
                          <Zap className="w-6 h-6 text-slate-600" />
                        )}
                        {plan.name === "Pro" && (
                          <Star className="w-6 h-6 text-blue-600" />
                        )}
                        {plan.name === "Team" && (
                          <Check className="w-6 h-6 text-green-600" />
                        )}
                      </div>
                    </div>

                    <h3
                      className="text-2xl font-bold mb-3"
                      style={{ color: "#0F172A" }}
                    >
                      {plan.name}
                    </h3>
                    <div
                      className="text-5xl font-bold mb-2"
                      style={{ color: "#0F172A" }}
                    >
                      {plan.price}
                    </div>
                    {plan.name !== "Free" && (
                      <p className="text-slate-600 text-sm">per month</p>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-4">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.div
                        key={featureIndex}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.3,
                          delay: featureIndex * 0.1,
                          ease: [0.22, 1, 0.36, 1] as const,
                        }}
                        className="flex items-start space-x-3"
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            plan.popular ? "bg-blue-100" : "bg-green-100"
                          }`}
                        >
                          <Check
                            className={`w-3 h-3 ${
                              plan.popular ? "text-blue-600" : "text-green-600"
                            }`}
                          />
                        </div>
                        <span className="text-slate-700 font-medium">
                          {feature}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <div className="pt-4">
                    <motion.div
                      whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                    >
                      <Button
                        asChild
                        className={`w-full h-12 text-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-offset-2 ${
                          plan.popular
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl focus:ring-blue-500"
                            : plan.name === "Free"
                            ? "bg-slate-900 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl focus:ring-slate-500"
                            : "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl focus:ring-green-500"
                        }`}
                        size="lg"
                      >
                        <Link href="/login">{plan.cta}</Link>
                      </Button>
                    </motion.div>
                  </div>

                  {/* Decorative Element */}
                  <div
                    className={`w-full h-1 rounded-full ${
                      plan.popular
                        ? "bg-gradient-to-r from-blue-600 to-green-600"
                        : "bg-gradient-to-r from-slate-300 to-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    }`}
                  ></div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110"></div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110"></div>
              </Card>
            </motion.div>
          ))}
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 shadow-lg max-w-3xl mx-auto">
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: "#0F172A" }}
            >
              Not sure which plan is right for you?
            </h3>
            <p className="text-slate-600 mb-6">
              Start with our free plan and upgrade anytime. No credit card
              required.
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
                Start Free Today
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

"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Mail,
  Twitter,
  Github,
  Linkedin,
  Heart,
} from "lucide-react";
import { landingPageContent } from "@/components/landing/content";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export function Footer() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <footer className="bg-slate-900 text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/6 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/6 w-96 h-96 bg-green-900/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-20 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          className="space-y-12"
        >
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand Section */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-2 space-y-6"
            >
              <div className="space-y-4">
                <h3 className="text-3xl font-bold text-white">CollabCanvas</h3>
                <p className="text-slate-300 leading-relaxed text-lg max-w-md">
                  {landingPageContent.footer.tagline}
                </p>
              </div>

              {/* Newsletter Signup */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">
                  Stay Updated
                </h4>
                <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <motion.div
                    whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                  >
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 whitespace-nowrap">
                      Subscribe
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </motion.div>
                </div>
                <p className="text-sm text-slate-400">
                  Get the latest updates and design tips delivered to your
                  inbox.
                </p>
              </div>
            </motion.div>

            {/* Product Links */}
            <motion.div variants={itemVariants} className="space-y-6">
              <h4 className="text-lg font-semibold text-white">Product</h4>
              <div className="space-y-3">
                <Link
                  href="#features"
                  className="block text-slate-300 hover:text-white transition-colors duration-200 hover:translate-x-1 transform"
                >
                  Features
                </Link>
                <Link
                  href="#pricing"
                  className="block text-slate-300 hover:text-white transition-colors duration-200 hover:translate-x-1 transform"
                >
                  Pricing
                </Link>
                <Link
                  href="#testimonials"
                  className="block text-slate-300 hover:text-white transition-colors duration-200 hover:translate-x-1 transform"
                >
                  Testimonials
                </Link>
                <Link
                  href="#faq"
                  className="block text-slate-300 hover:text-white transition-colors duration-200 hover:translate-x-1 transform"
                >
                  FAQ
                </Link>
              </div>
            </motion.div>

            {/* Legal & Support */}
            <motion.div variants={itemVariants} className="space-y-6">
              <h4 className="text-lg font-semibold text-white">Support</h4>
              <div className="space-y-3">
                {landingPageContent.footer.links.map((link, index) => (
                  <Link
                    key={index}
                    href="#"
                    className="block text-slate-300 hover:text-white transition-colors duration-200 hover:translate-x-1 transform"
                  >
                    {link}
                  </Link>
                ))}
                <Link
                  href="mailto:support@collabcanvas.com"
                  className="block text-slate-300 hover:text-white transition-colors duration-200 hover:translate-x-1 transform"
                >
                  Contact Us
                </Link>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Follow Us</h4>
                <div className="flex space-x-4">
                  <motion.a
                    href="#"
                    whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                    className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-blue-600 transition-all duration-200"
                  >
                    <Twitter className="w-5 h-5" />
                  </motion.a>
                  <motion.a
                    href="#"
                    whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                    className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-blue-600 transition-all duration-200"
                  >
                    <Github className="w-5 h-5" />
                  </motion.a>
                  <motion.a
                    href="#"
                    whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                    className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-blue-600 transition-all duration-200"
                  >
                    <Linkedin className="w-5 h-5" />
                  </motion.a>
                  <motion.a
                    href="#"
                    whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                    className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-blue-600 transition-all duration-200"
                  >
                    <Mail className="w-5 h-5" />
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Separator */}
          <Separator className="bg-slate-700" />

          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <motion.div
              variants={itemVariants}
              className="text-center md:text-left text-slate-400"
            >
              <p className="flex items-center justify-center md:justify-start">
                {landingPageContent.footer.copyright}
                <Heart className="w-4 h-4 text-red-500 mx-1" />
                Made with love for designers everywhere
              </p>
            </motion.div>

            {/* CTA Button */}
            <motion.div variants={itemVariants} className="flex-shrink-0">
              <motion.div
                whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
              >
                <Button
                  asChild
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Link href="/login">
                    Get Started Free
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}

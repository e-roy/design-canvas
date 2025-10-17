"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { landingPageContent } from "@/components/landing/content";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const shouldReduceMotion = useReducedMotion();

  // Scroll progress and height animations
  const progress = useTransform(scrollY, [0, 100], [0, 1]);
  const height = useTransform(scrollY, [0, 50], [80, 64]);

  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      setIsScrolled(latest > 20);
    });

    return unsubscribe;
  }, [scrollY]);

  // Close mobile menu when clicking outside or on a link
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest("[data-mobile-menu]")) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <motion.nav
        style={{ height }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-4">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link
                href="/"
                className="text-xl font-bold transition-colors duration-200"
                style={{ color: isScrolled ? "#0F172A" : "#FFFFFF" }}
              >
                {landingPageContent.navbar.logo}
              </Link>
            </motion.div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              {landingPageContent.navbar.links.map((link, index) => (
                <motion.div
                  key={link}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link
                    href={
                      link === "Login" ? "/login" : `#${link.toLowerCase()}`
                    }
                    className={`transition-colors duration-200 relative group ${
                      isScrolled
                        ? "text-slate-600 hover:text-slate-900"
                        : "text-white/90 hover:text-white"
                    }`}
                  >
                    {link}
                    <span
                      className={`absolute -bottom-1 left-0 w-0 h-0.5 transition-all duration-200 group-hover:w-full ${
                        isScrolled ? "bg-blue-600" : "bg-white"
                      }`}
                    />
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Desktop CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="hidden md:block"
            >
              <Button
                asChild
                className={`transition-all duration-200 ${
                  isScrolled
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm"
                }`}
              >
                <Link href="/login">{landingPageContent.navbar.cta}</Link>
              </Button>
            </motion.div>

            {/* Mobile Menu Button */}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="md:hidden p-2 rounded-lg transition-colors duration-200"
              style={{
                color: isScrolled ? "#0F172A" : "#FFFFFF",
                backgroundColor: isScrolled
                  ? "transparent"
                  : "rgba(255, 255, 255, 0.1)",
              }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <motion.div
          data-mobile-menu
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: isMobileMenuOpen ? 1 : 0,
            height: isMobileMenuOpen ? "auto" : 0,
          }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="md:hidden overflow-hidden bg-white/95 backdrop-blur-md border-b border-slate-200"
        >
          <div className="px-6 py-4 space-y-4">
            {landingPageContent.navbar.links.map((link, index) => (
              <motion.div
                key={link}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: isMobileMenuOpen ? 1 : 0,
                  x: isMobileMenuOpen ? 0 : -20,
                }}
                transition={{
                  duration: 0.3,
                  delay: isMobileMenuOpen ? index * 0.1 : 0,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Link
                  href={link === "Login" ? "/login" : `#${link.toLowerCase()}`}
                  className="block text-slate-700 hover:text-blue-600 transition-colors duration-200 py-2 text-lg font-medium"
                  onClick={handleLinkClick}
                >
                  {link}
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: isMobileMenuOpen ? 1 : 0,
                x: isMobileMenuOpen ? 0 : -20,
              }}
              transition={{
                duration: 0.3,
                delay: isMobileMenuOpen ? 0.4 : 0,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="pt-4"
            >
              <Button
                asChild
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                onClick={handleLinkClick}
              >
                <Link href="/login">{landingPageContent.navbar.cta}</Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.nav>

      {/* Scroll Progress Bar */}
      {!shouldReduceMotion && (
        <motion.div
          style={{ scaleX: progress }}
          className="fixed top-0 left-0 right-0 h-0.5 bg-blue-600/30 origin-left z-50"
        />
      )}
    </>
  );
}

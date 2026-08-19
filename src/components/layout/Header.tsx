"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Bird } from "lucide-react";
import { NAV_LINKS } from "@/lib/utils";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-espresso/10">
      <div className="w-full max-w-[1728.11px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[52px] min-h-[44px]">
          {/* Logo with Ovo font */}
          <Link
            href="/"
            className="flex items-center gap-2 group flex-shrink-0"
            aria-label="West Bengal Avian Society home"
          >
            <motion.div
              whileHover={{ rotate: -8 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Bird className="w-6 h-6 text-forest" aria-hidden="true" />
            </motion.div>
            <span className="font-serif text-lg sm:text-xl md:text-2xl text-forest font-bold tracking-tight whitespace-nowrap">
              West Bengal Avian Society
            </span>
          </Link>

          {/* Navigation with Mulish Medium + Hover Underline Effect */}
          <nav
            className="hidden md:flex items-center gap-6 lg:gap-8 h-full"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans font-medium text-xs lg:text-sm text-espresso/80 hover:text-forest transition-colors relative py-1 group inline-flex items-center"
              >
                <span>{link.label}</span>
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-forest rounded-full transition-all duration-300 ease-out group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Action button */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/find-your-bird"
              className="hidden sm:inline-flex stamp-button text-xs px-4 py-1.5 rounded-full shadow-xs"
            >
              Find Your Bird ♥
            </Link>
            <button
              className="md:hidden p-1.5 text-forest"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-cream border-b border-espresso/10"
            aria-label="Mobile navigation"
          >
            <div className="px-4 py-4 space-y-3 font-sans font-medium text-sm">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-espresso/80 hover:text-forest transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/find-your-bird"
                className="block py-2 text-terracotta font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                Find Your Bird ♥
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

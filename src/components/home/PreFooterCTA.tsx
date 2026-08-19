"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, MessageCircle } from "lucide-react";

export default function PreFooterCTA() {
  return (
    <section className="bg-terracotta section-padding text-cream relative overflow-hidden">
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ rotate: -3 }}
          whileHover={{ rotate: 3 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="inline-block mb-6"
        >
          <div className="bg-cream/10 backdrop-blur-sm rounded-2xl p-8 border border-cream/20 shadow-lg">
            <Mail className="w-12 h-12 mx-auto mb-4 text-cream/80" aria-hidden="true" />
            <h2 className="font-serif text-3xl md:text-4xl mb-3">Questions About Birds?</h2>
            <p className="text-cream/80 max-w-md mx-auto mb-6">
              Whether you&apos;re a first-time owner or an experienced aviculturist, we&apos;re here to help.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-cream text-terracotta font-semibold rounded-full hover:bg-cream-dark transition-colors">
                <MessageCircle className="w-4 h-4" />
                Get in Touch
              </Link>
              <Link href="/find-your-bird" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-cream text-cream font-semibold rounded-full hover:bg-cream/10 transition-colors">
                Find Your Bird ♥
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Pinned paper social links */}
        <div className="mt-8 inline-block bg-cream text-espresso rounded-lg px-6 py-4 shadow-md rotate-1 transform">
          <p className="text-sm font-semibold mb-2">Follow our flock</p>
          <div className="flex items-center justify-center gap-4 text-sm text-espresso/70">
            <span>Instagram</span>
            <span>·</span>
            <span>Pinterest</span>
            <span>·</span>
            <span>YouTube</span>
          </div>
        </div>
      </div>
    </section>
  );
}

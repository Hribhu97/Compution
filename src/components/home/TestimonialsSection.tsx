"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Testimonial } from "@/lib/types";

export default function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="section-padding">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl md:text-4xl text-forest mb-3">Kind Words</h2>
          <p className="text-espresso/70">From bird lovers who found their perfect match.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="paper-card p-6 relative"
            >
              <Quote className="w-8 h-8 text-terracotta/30 absolute top-4 right-4" aria-hidden="true" />
              <p className="text-espresso/80 leading-relaxed mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
              <footer className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-olive/20 flex items-center justify-center text-forest font-serif font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <cite className="not-italic font-semibold text-forest">{t.name}</cite>
                  <p className="text-olive text-sm">{t.bird} owner</p>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

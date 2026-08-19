"use client";

import { motion } from "framer-motion";
import { FEEDING_STEPS } from "@/lib/utils";

export default function FeedingProcess() {
  return (
    <section className="bg-olive section-padding text-cream relative overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl md:text-4xl mb-3">The Feeding Process</h2>
          <p className="text-cream/70 max-w-lg mx-auto">
            Five simple steps to keep your bird well-nourished and thriving.
          </p>
        </div>

        <div className="relative">
          {/* Dashed path line */}
          <div className="absolute left-6 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 border-l-2 border-dashed border-cream/30" aria-hidden="true" />

          <div className="space-y-8">
            {FEEDING_STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative flex items-start gap-4 md:gap-0 ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                <div className="md:w-1/2" />
                <div className="absolute left-4 md:left-1/2 md:-translate-x-1/2 w-5 h-5 rounded-full bg-terracotta border-2 border-cream flex items-center justify-center z-10">
                  <span className="text-[10px] font-bold">{step.step}</span>
                </div>
                <div className={`md:w-1/2 pl-12 md:pl-0 ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <h3 className="font-serif text-lg font-semibold mb-1">{step.title}</h3>
                  <p className="text-cream/70 text-sm">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

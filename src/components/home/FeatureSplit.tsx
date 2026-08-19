"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Home, Utensils, Heart, Stethoscope } from "lucide-react";
import { Bird } from "@/lib/types";
import { CARE_BASICS } from "@/lib/utils";
import BirdHeroMedia from "@/components/birds/BirdHeroMedia";

const iconMap: Record<string, React.ReactNode> = {
  home: <Home className="w-6 h-6" />,
  utensils: <Utensils className="w-6 h-6" />,
  heart: <Heart className="w-6 h-6" />,
  stethoscope: <Stethoscope className="w-6 h-6" />,
};

export default function FeatureSplit({ featuredBird }: { featuredBird: Bird }) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 w-full">
      {/* Featured Bird Column */}
      <div className="bg-cream px-[19px] py-[96px] flex flex-col justify-center">
        <div className="max-w-xl">
          <p className="text-olive text-xs sm:text-sm uppercase tracking-widest font-semibold mb-2">
            Featured Bird of the Week
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-forest font-medium tracking-tight mb-2">
            {featuredBird.name}
          </h2>
          <p className="font-serif italic text-espresso/70 text-sm mb-4">
            {featuredBird.scientificName}
          </p>
          <p className="text-espresso/80 text-sm sm:text-base leading-relaxed mb-8 max-w-lg">
            {featuredBird.description}
          </p>

          <div className="w-full max-w-md mb-8">
            <BirdHeroMedia
              heroImage={featuredBird.heroImage}
              name={featuredBird.name}
              scientificName={featuredBird.scientificName}
              videoUrl={featuredBird.videoUrl}
              slug={featuredBird.slug}
            />
          </div>

          <div>
            <Link
              href={`/birds/${featuredBird.slug}`}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-forest/80 text-forest text-sm font-medium hover:bg-forest hover:text-cream transition-all duration-200"
            >
              View Full Profile →
            </Link>
          </div>
        </div>
      </div>

      {/* Care Basics Column */}
      <div className="bg-forest px-[19px] py-[96px] text-cream flex flex-col justify-between">
        <div className="max-w-xl">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-cream font-medium tracking-tight mb-3">
            Bird Care Basics
          </h2>
          <p className="text-cream/75 text-sm sm:text-base max-w-md leading-relaxed mb-8">
            Essential knowledge every bird owner should have before bringing home a new companion.
          </p>

          {/* 4 Essential Care Pillars / Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CARE_BASICS.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="bg-forest-light/60 border border-cream/15 rounded-2xl p-5 hover:border-cream/30 hover:bg-forest-light/80 transition-all duration-300 shadow-sm"
              >
                <div className="text-terracotta-light mb-3" aria-hidden="true">
                  {iconMap[item.icon]}
                </div>
                <h3 className="font-serif text-lg font-semibold text-cream mb-1">
                  {item.title}
                </h3>
                <p className="text-cream/75 text-sm leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="pt-10">
          <Link
            href="/care"
            className="inline-flex items-center gap-2 text-terracotta-light hover:text-cream transition-colors text-sm sm:text-base font-semibold group"
          >
            <span>Read Full Care Guide</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

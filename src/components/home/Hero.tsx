"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useSpring, type Variants } from "framer-motion";
import { ArrowDown, Sparkles } from "lucide-react";
import BotanicalAccent from "@/components/ui/BotanicalAccent";

// Framer-style staggered entrance variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.215, 0.61, 0.355, 1],
    },
  },
};

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Parallax layers
  const videoY = useTransform(smoothProgress, [0, 1], ["0%", "28%"]);
  const videoScale = useTransform(smoothProgress, [0, 1], [1, 1.15]);
  const contentY = useTransform(smoothProgress, [0, 1], ["0%", "-18%"]);
  const contentOpacity = useTransform(smoothProgress, [0, 0.7, 1], [1, 0.8, 0]);
  const accentY1 = useTransform(smoothProgress, [0, 1], ["0%", "-50%"]);
  const accentY2 = useTransform(smoothProgress, [0, 1], ["0%", "35%"]);
  const scrollIndicatorOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[calc(100svh-4rem)] md:min-h-[calc(100svh-5rem)] flex items-center justify-center section-padding overflow-hidden"
    >
      {/* Parallax Background Video Layer */}
      <motion.div
        style={{ y: videoY, scale: videoScale }}
        className="absolute inset-0 w-full h-[120%] -top-[10%] overflow-hidden pointer-events-none"
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
          <source
            src="https://videos.pexels.com/video-files/10041603/10041603-hd_1920_1080_24fps.mp4"
            type="video/mp4"
          />
        </video>

        {/* Multi-gradient botanical scrim for contrast and legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-cream/80 via-cream/65 to-cream/95 backdrop-blur-[1.5px]" />
        <div className="absolute inset-0 bg-radial from-transparent via-cream/30 to-cream/80 pointer-events-none" />
      </motion.div>

      {/* Floating Botanical Parallax Accents */}
      <motion.div
        style={{ y: accentY1 }}
        animate={{
          rotate: [0, 4, -4, 0],
          transition: { duration: 8, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute top-8 right-8 md:top-16 md:right-20 z-10 pointer-events-none"
      >
        <BotanicalAccent className="w-20 h-20 md:w-28 md:h-28 opacity-25 text-olive" />
      </motion.div>

      <motion.div
        style={{ y: accentY2 }}
        animate={{
          rotate: [45, 50, 40, 45],
          transition: { duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 },
        }}
        className="absolute bottom-16 left-8 md:bottom-20 md:left-20 z-10 pointer-events-none"
      >
        <BotanicalAccent className="w-16 h-16 md:w-24 md:h-24 opacity-25 text-olive rotate-45" />
      </motion.div>

      {/* Hero Foreground Content with Smooth Parallax */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto text-center relative z-20 py-8"
      >
        {/* Subtle pill tag */}
        <motion.div variants={itemVariants} className="inline-flex items-center justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold tracking-wider uppercase bg-forest/10 text-forest border border-forest/20 backdrop-blur-md shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-terracotta" />
            Field Guide &amp; Aviary Companion
          </span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          variants={itemVariants}
          className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-forest leading-[1.1] tracking-tight mb-6 drop-shadow-xs"
        >
          Discover your perfect{" "}
          <span className="text-terracotta italic font-normal">feathered friend.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          variants={itemVariants}
          className="text-espresso/80 text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
        >
          A handcrafted encyclopedia of pet birds — with verified profiles, expert care
          guides, and everything you need for lifelong companionship.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
        >
          <motion.div
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Link
              href="/birds"
              className="stamp-button text-base px-8 py-4 shadow-lg shadow-terracotta/25 hover:shadow-xl hover:shadow-terracotta/35 transition-shadow"
            >
              Explore Bird Profiles
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Link
              href="/find-your-bird"
              className="ghost-button text-base px-8 py-4 bg-cream/70 backdrop-blur-md hover:bg-forest hover:text-cream shadow-xs transition-all"
            >
              Take the Species Quiz
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll Down Prompt Indicator */}
      <motion.div
        style={{ opacity: scrollIndicatorOpacity }}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none text-olive/80"
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest text-espresso/60">
          Scroll to explore
        </span>
        <ArrowDown className="w-4 h-4 text-espresso/60" />
      </motion.div>
    </section>
  );
}

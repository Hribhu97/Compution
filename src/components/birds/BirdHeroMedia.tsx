"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Volume2, VolumeX } from "lucide-react";

interface BirdHeroMediaProps {
  heroImage: string;
  name: string;
  scientificName: string;
  videoUrl?: string;
  slug?: string;
}

export default function BirdHeroMedia({
  heroImage,
  name,
  scientificName,
  videoUrl,
  slug,
}: BirdHeroMediaProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Compute candidate video sources automatically based on videoUrl, slug, or aliases
  const resolvedVideoSources = (() => {
    const sources: string[] = [];
    if (videoUrl) sources.push(videoUrl);
    if (slug) {
      sources.push(`/videos/${slug}.webm`);
      sources.push(`/videos/${slug}.mp4`);
      sources.push(`/video/${slug}.webm`);
      sources.push(`/video/${slug}.mp4`);
      // Common aliases
      if (slug === "budgerigar") {
        sources.push("/videos/budgie.webm");
        sources.push("/video/budgie.webm");
      }
    }
    return Array.from(new Set(sources));
  })();

  const hasCandidate = resolvedVideoSources.length > 0 && !videoError;

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg bg-forest/5 group">
      {/* Background Image (Always present as instant fallback and while video loads) */}
      <Image
        src={heroImage}
        alt={`${name} (${scientificName})`}
        fill
        className={`object-cover transition-opacity duration-500 ${
          videoLoaded && hasCandidate ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
      />

      {/* Video layer if candidates exist */}
      {hasCandidate && (
        <video
          ref={videoRef}
          poster={heroImage}
          autoPlay
          loop
          playsInline
          muted={isMuted}
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          {resolvedVideoSources.map((src) => (
            <source key={src} src={src} type={src.endsWith(".mp4") ? "video/mp4" : "video/webm"} />
          ))}
        </video>
      )}

      {/* Floating Sound Control (Only visible when video is active and playing) */}
      {hasCandidate && videoLoaded && (
        <button
          type="button"
          onClick={toggleMute}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-forest/80 backdrop-blur-md text-cream hover:bg-forest text-xs font-medium transition-all shadow-md active:scale-95 cursor-pointer"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-terracotta-light" />
              <span>Unmute</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-cream" />
              <span>Mute</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

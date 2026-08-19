"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { Bird, Category } from "@/lib/types";
import BottomSheet from "@/components/ui/BottomSheet";

export default function BirdDirectory({
  birds,
  categories,
}: {
  birds: Bird[];
  categories: Category[];
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sheetBird, setSheetBird] = useState<Bird | null>(null);

  const tabs = [{ slug: "all", name: "All" }, ...categories.map((c) => ({ slug: c.slug, name: c.name }))];

  const filtered = birds.filter((b) => {
    const matchCat = activeTab === "all" || b.categorySlug === activeTab;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.name.toLowerCase().includes(q) ||
      b.scientificName.toLowerCase().includes(q) ||
      b.colors.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <section className="section-padding bg-cream-dark/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl md:text-4xl text-forest mb-3">Bird Directory</h2>
          <p className="text-espresso/70 max-w-xl mx-auto">
            Browse our field guide of pet birds, organized by category with verified Wikipedia data.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-olive" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by name, color, origin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-full border border-espresso/15 bg-cream text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-terracotta/50"
            aria-label="Search birds"
          />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8" role="tablist" aria-label="Bird categories">
          {tabs.map((tab) => (
            <button
              key={tab.slug}
              role="tab"
              aria-selected={activeTab === tab.slug}
              onClick={() => setActiveTab(tab.slug)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === tab.slug
                  ? "bg-forest text-cream"
                  : "bg-cream text-espresso/70 hover:bg-cream-dark border border-espresso/10"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <p className="text-center text-espresso/60 py-12">No birds found matching your search.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((bird) => (
              <motion.div
                key={bird.id}
                layout
                className="paper-card overflow-hidden group cursor-pointer"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setSheetBird(bird);
                  } else {
                    setExpandedId(expandedId === bird.id ? null : bird.id);
                  }
                }}
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={bird.heroImage}
                    alt={bird.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 bg-forest/80 text-cream text-xs rounded-full font-semibold">
                    {bird.category}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-xl text-forest font-semibold">{bird.name}</h3>
                  <p className="text-olive text-sm italic mb-2">{bird.scientificName}</p>
                  <p className="text-espresso/70 text-sm line-clamp-2">{bird.description}</p>

                  {/* Desktop expand */}
                  <AnimatePresence>
                    {expandedId === bird.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="hidden md:block overflow-hidden"
                      >
                        <div className="pt-4 mt-4 border-t border-espresso/10 grid grid-cols-2 gap-3 text-sm">
                          <div><span className="field-label">Origin</span><p className="field-value">{bird.origin}</p></div>
                          <div><span className="field-label">Care Level</span><p className="field-value">{bird.careLevel}</p></div>
                          <div><span className="field-label">Lifespan</span><p className="field-value">{bird.lifespan}</p></div>
                          <div><span className="field-label">Temperament</span><p className="field-value">{bird.temperament}</p></div>
                        </div>
                        <Link
                          href={`/birds/${bird.slug}`}
                          className="inline-block mt-4 text-terracotta font-semibold text-sm hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Full Profile →
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="hidden md:flex items-center justify-center mt-3 text-olive">
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${expandedId === bird.id ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link href="/birds" className="ghost-button">View All Birds</Link>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {sheetBird && (
        <BottomSheet open={!!sheetBird} onClose={() => setSheetBird(null)} title={sheetBird.name}>
          <div className="relative h-48 rounded-xl overflow-hidden mb-4">
            <Image src={sheetBird.heroImage} alt={sheetBird.name} fill className="object-cover" sizes="100vw" />
          </div>
          <p className="text-olive italic text-sm mb-3">{sheetBird.scientificName}</p>
          <p className="text-espresso/80 text-sm mb-4">{sheetBird.description}</p>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><span className="field-label">Origin</span><p>{sheetBird.origin}</p></div>
            <div><span className="field-label">Care Level</span><p>{sheetBird.careLevel}</p></div>
            <div><span className="field-label">Lifespan</span><p>{sheetBird.lifespan}</p></div>
            <div><span className="field-label">Temperament</span><p>{sheetBird.temperament}</p></div>
          </div>
          <Link href={`/birds/${sheetBird.slug}`} className="stamp-button w-full text-center block">
            View Full Profile
          </Link>
        </BottomSheet>
      )}
    </section>
  );
}

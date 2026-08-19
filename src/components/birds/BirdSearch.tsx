"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { Bird, Category } from "@/lib/types";

export default function BirdSearch({
  birds,
  categories,
}: {
  birds: Bird[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return birds.filter((b) => {
      const matchCat = category === "all" || b.categorySlug === category;
      if (!q) return matchCat;
      return (
        matchCat &&
        (b.name.toLowerCase().includes(q) ||
          b.scientificName.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.colors.toLowerCase().includes(q) ||
          b.origin.toLowerCase().includes(q))
      );
    });
  }, [birds, query, category]);

  const tabs = [{ slug: "all", name: "All" }, ...categories.map((c) => ({ slug: c.slug, name: c.name }))];

  return (
    <div>
      <div className="relative max-w-lg mx-auto mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-olive" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search birds by name, color, origin..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-full border border-espresso/15 bg-cream text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-terracotta/50"
          aria-label="Search birds"
        />
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-4" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.slug}
            role="tab"
            aria-selected={category === tab.slug}
            onClick={() => setCategory(tab.slug)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              category === tab.slug
                ? "bg-forest text-cream"
                : "bg-cream text-espresso/70 hover:bg-cream-dark border border-espresso/10"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {query && (
        <p className="text-center text-espresso/60 text-sm mb-4">
          {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
        </p>
      )}

      {query && results.length > 0 && (
        <div className="max-w-lg mx-auto bg-cream rounded-xl shadow-lg border border-espresso/10 overflow-hidden mb-6">
          {results.map((bird) => (
            <Link
              key={bird.id}
              href={`/birds/${bird.slug}`}
              className="flex items-center gap-3 p-3 hover:bg-cream-dark transition-colors border-b border-espresso/5 last:border-0"
            >
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <Image src={bird.heroImage} alt="" fill className="object-cover" sizes="48px" />
              </div>
              <div>
                <p className="font-semibold text-forest text-sm">{bird.name}</p>
                <p className="text-olive text-xs">{bird.category} · {bird.origin}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

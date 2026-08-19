import Link from "next/link";
import Image from "next/image";
import { createMetadata } from "@/lib/seo";
import { getBirds, getCategories } from "@/lib/data-provider";
import BirdSearch from "@/components/birds/BirdSearch";

export const metadata = createMetadata({
  title: "Bird Profiles",
  description: "Browse our complete directory of pet bird profiles with verified Wikipedia data.",
  path: "/birds",
});

export default async function BirdsPage() {
  const [birds, categories] = await Promise.all([getBirds(), getCategories()]);

  return (
    <div className="section-padding">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl md:text-5xl text-forest mb-4">Bird Profiles</h1>
          <p className="text-espresso/70 max-w-2xl mx-auto">
            Explore our complete field guide of pet birds. Every profile is built from verified Wikipedia data.
          </p>
        </div>

        <BirdSearch birds={birds} categories={categories} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {birds.map((bird) => (
            <Link
              key={bird.id}
              href={`/birds/${bird.slug}`}
              className="paper-card overflow-hidden group"
            >
              <div className="relative h-52 overflow-hidden">
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
                {bird.featured && (
                  <span className="absolute top-3 right-3 px-3 py-1 bg-terracotta/90 text-cream text-xs rounded-full font-semibold">
                    Featured
                  </span>
                )}
              </div>
              <div className="p-5">
                <h2 className="font-serif text-xl text-forest font-semibold group-hover:text-terracotta transition-colors">
                  {bird.name}
                </h2>
                <p className="text-olive text-sm italic mb-2">{bird.scientificName}</p>
                <p className="text-espresso/70 text-sm line-clamp-2">{bird.description}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-olive">
                  <span>{bird.careLevel}</span>
                  <span>·</span>
                  <span>{bird.origin}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

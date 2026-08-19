import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createMetadata, birdJsonLd } from "@/lib/seo";
import { getBirdBySlug, getBirds, getAllBirdSlugs } from "@/lib/data-provider";
import BirdHeroMedia from "@/components/birds/BirdHeroMedia";

export async function generateStaticParams() {
  return getAllBirdSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bird = await getBirdBySlug(slug);
  if (!bird) return {};
  return createMetadata({
    title: bird.name,
    description: bird.description,
    path: `/birds/${bird.slug}`,
    image: bird.heroImage,
  });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-espresso/10">
      <dt className="field-label mb-1">{label}</dt>
      <dd className="field-value">{value || "Information currently unavailable."}</dd>
    </div>
  );
}

export default async function BirdProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bird = await getBirdBySlug(slug);
  if (!bird) notFound();

  const allBirds = await getBirds();
  const related = allBirds
    .filter((b) => b.categorySlug === bird.categorySlug && b.id !== bird.id)
    .slice(0, 3);

  const jsonLd = birdJsonLd(bird);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="section-padding">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-sm text-olive mb-6">
            <Link href="/birds" className="hover:text-forest">Bird Profiles</Link>
            <span className="mx-2">/</span>
            <span className="text-espresso">{bird.name}</span>
          </nav>

          {/* Hero */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
            <BirdHeroMedia
              heroImage={bird.heroImage}
              name={bird.name}
              scientificName={bird.scientificName}
              videoUrl={bird.videoUrl}
              slug={bird.slug}
            />
            <div>
              <span className="inline-block px-3 py-1 bg-forest/10 text-forest text-xs rounded-full font-semibold mb-3">
                {bird.category}
              </span>
              <h1 className="font-serif text-4xl md:text-5xl text-forest mb-2">{bird.name}</h1>
              <p className="text-olive italic text-lg mb-4">{bird.scientificName}</p>
              <p className="text-espresso/80 leading-relaxed mb-6">{bird.description}</p>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-cream-dark rounded-full text-sm font-semibold text-espresso">
                  {bird.careLevel}
                </span>
                <span className="px-4 py-2 bg-cream-dark rounded-full text-sm text-espresso/70">
                  {bird.conservationStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 paper-card p-8 mb-12">
            <dl>
              <Field label="Origin" value={bird.origin} />
              <Field label="Native Range" value={bird.nativeRange} />
              <Field label="Colors" value={bird.colors} />
              <Field label="Height" value={bird.height} />
              <Field label="Weight" value={bird.weight} />
              <Field label="Lifespan" value={bird.lifespan} />
            </dl>
            <dl>
              <Field label="Habitat" value={bird.habitat} />
              <Field label="Diet" value={bird.diet} />
              <Field label="Temperament" value={bird.temperament} />
              <Field label="Behavior" value={bird.behavior} />
              <Field label="Care Level" value={bird.careLevel} />
              <Field label="Where to Find" value={bird.whereToFind} />
            </dl>
          </div>

          {/* Feeding Guide */}
          <div className="bg-olive/10 rounded-2xl p-8 mb-12">
            <h2 className="font-serif text-2xl text-forest mb-4">Feeding Guide</h2>
            <p className="text-espresso/80 leading-relaxed">{bird.feedingGuide}</p>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div>
              <h2 className="font-serif text-2xl text-forest mb-6">Related {bird.category}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {related.map((r) => (
                  <Link key={r.id} href={`/birds/${r.slug}`} className="paper-card overflow-hidden group">
                    <div className="relative h-32 overflow-hidden">
                      <Image src={r.heroImage} alt={r.name} fill className="object-cover group-hover:scale-105 transition-transform" sizes="33vw" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-serif text-lg text-forest group-hover:text-terracotta transition-colors">{r.name}</h3>
                      <p className="text-olive text-xs italic">{r.scientificName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </>
  );
}

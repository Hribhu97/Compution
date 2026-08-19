import Image from "next/image";
import Link from "next/link";
import { createMetadata } from "@/lib/seo";
import { getArticles } from "@/lib/data-provider";
import { formatDate } from "@/lib/utils";

export const metadata = createMetadata({
  title: "Blog",
  description: "Bird care tips, guides, and stories from The Aviary journal.",
  path: "/blog",
});

export default async function BlogPage() {
  const articles = await getArticles();

  return (
    <div className="section-padding">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-serif text-4xl md:text-5xl text-forest mb-4 text-center">From the Aviary</h1>
        <p className="text-espresso/70 text-center max-w-2xl mx-auto mb-12">
          Tips, guides, and stories to help you on your bird-keeping journey.
        </p>

        {articles.length === 0 ? (
          <p className="text-center text-espresso/60 py-12">No articles published yet. Check back soon!</p>
        ) : (
          <div className="space-y-8">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/blog/${article.slug}`}
                className="paper-card overflow-hidden flex flex-col md:flex-row group"
              >
                <div className="relative w-full md:w-72 h-48 md:h-auto flex-shrink-0 overflow-hidden">
                  <Image
                    src={article.coverImage}
                    alt={article.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 288px"
                  />
                </div>
                <div className="p-6 flex flex-col justify-center">
                  <span className="text-olive text-xs uppercase tracking-wider font-semibold">{article.category}</span>
                  <h2 className="font-serif text-2xl text-forest font-semibold mt-1 mb-2 group-hover:text-terracotta transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-espresso/70 line-clamp-2 mb-3">{article.excerpt}</p>
                  <div className="flex items-center gap-3 text-sm text-espresso/50">
                    <span>{article.author}</span>
                    <span>·</span>
                    <time>{formatDate(article.publishedAt)}</time>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

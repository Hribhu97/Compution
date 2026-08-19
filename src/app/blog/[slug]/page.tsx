import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createMetadata } from "@/lib/seo";
import { getArticleBySlug, getAllArticleSlugs } from "@/lib/data-provider";
import { formatDate } from "@/lib/utils";

export async function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  return createMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/blog/${article.slug}`,
    image: article.coverImage,
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const paragraphs = article.content.split("\n\n");

  return (
    <article className="section-padding">
      <div className="max-w-3xl mx-auto">
        <nav aria-label="Breadcrumb" className="text-sm text-olive mb-6">
          <Link href="/blog" className="hover:text-forest">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-espresso">{article.title}</span>
        </nav>

        <header className="mb-8">
          <span className="text-olive text-xs uppercase tracking-wider font-semibold">{article.category}</span>
          <h1 className="font-serif text-4xl md:text-5xl text-forest mt-2 mb-4">{article.title}</h1>
          <div className="flex items-center gap-3 text-sm text-espresso/50">
            <span>{article.author}</span>
            <span>·</span>
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          </div>
        </header>

        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-lg mb-10">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        <div className="prose prose-lg max-w-none">
          {paragraphs.map((para, i) => {
            if (para.startsWith("## ")) {
              return (
                <h2 key={i} className="font-serif text-2xl text-forest mt-8 mb-4">
                  {para.replace("## ", "")}
                </h2>
              );
            }
            if (para.startsWith("- ")) {
              const items = para.split("\n").filter((l) => l.startsWith("- "));
              return (
                <ul key={i} className="list-disc pl-6 space-y-1 text-espresso/80 mb-4">
                  {items.map((item, j) => (
                    <li key={j}>{item.replace("- ", "")}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={i} className="text-espresso/80 leading-relaxed mb-4">
                {para}
              </p>
            );
          })}
        </div>
      </div>
    </article>
  );
}

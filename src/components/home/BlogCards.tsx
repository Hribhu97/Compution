"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { Article } from "@/lib/types";

export default function BlogCards({ articles }: { articles: Article[] }) {
  return (
    <section className="section-padding bg-cream-dark/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl md:text-4xl text-forest mb-3">From the Aviary</h2>
          <p className="text-espresso/70">Tips, guides, and stories from our journal.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {articles.slice(0, 4).map((article, i) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={`/blog/${article.slug}`} className="paper-card overflow-hidden block group h-full">
                <div className="relative h-40 overflow-hidden">
                  <Image
                    src={article.coverImage}
                    alt={article.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <span className="text-olive text-xs uppercase tracking-wider font-semibold">{article.category}</span>
                  <h3 className="font-serif text-lg text-forest font-semibold mt-1 mb-2 line-clamp-2 group-hover:text-terracotta transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-espresso/60 text-sm line-clamp-2">{article.excerpt}</p>
                  <time className="text-espresso/40 text-xs mt-2 block">{formatDate(article.publishedAt)}</time>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/blog" className="ghost-button">Read All Articles</Link>
        </div>
      </div>
    </section>
  );
}

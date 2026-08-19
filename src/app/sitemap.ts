import { MetadataRoute } from "next";
import { getAllBirdSlugs, getAllArticleSlugs } from "@/lib/data-provider";
import { SITE_URL } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const birdSlugs = getAllBirdSlugs();
  const articleSlugs = getAllArticleSlugs();

  const staticPages = ["", "/birds", "/care", "/habitats", "/blog", "/contact", "/find-your-bird"].map(
    (path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    })
  );

  const birdPages = birdSlugs.map((slug) => ({
    url: `${SITE_URL}/birds/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const articlePages = articleSlugs.map((slug) => ({
    url: `${SITE_URL}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...birdPages, ...articlePages];
}

import { Bird, Category, Article, Testimonial, Resource } from "./types";
import birdsData from "./data/birds.json";
import categoriesData from "./data/categories.json";
import articlesData from "./data/articles.json";
import testimonialsData from "./data/testimonials.json";
import resourcesData from "./data/resources.json";
import { createClient } from "./supabase/client";

const birds = birdsData as Bird[];
const categories = categoriesData as Category[];
const articles = articlesData as Article[];
const testimonials = testimonialsData as Testimonial[];
const resources = resourcesData as Resource[];

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co"
  );
}

export async function getBirds(): Promise<Bird[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("birds").select("*").order("name");
      if (!error && data?.length) return data as Bird[];
    } catch {
      /* fall through to JSON */
    }
  }
  return birds;
}

export async function getBirdBySlug(slug: string): Promise<Bird | undefined> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("birds").select("*").eq("slug", slug).single();
      if (!error && data) return data as Bird;
    } catch {
      /* fall through */
    }
  }
  return birds.find((b) => b.slug === slug);
}

export async function getFeaturedBird(): Promise<Bird | undefined> {
  const all = await getBirds();
  return all.find((b) => b.featured) ?? all[0];
}

export async function getBirdsByCategory(categorySlug: string): Promise<Bird[]> {
  const all = await getBirds();
  if (categorySlug === "all") return all;
  return all.filter((b) => b.categorySlug === categorySlug);
}

export async function searchBirds(query: string): Promise<Bird[]> {
  const all = await getBirds();
  const q = query.toLowerCase().trim();
  if (!q) return all;
  return all.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.scientificName.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      b.colors.toLowerCase().includes(q) ||
      b.origin.toLowerCase().includes(q)
  );
}

export async function getCategories(): Promise<Category[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (!error && data?.length) return data as Category[];
    } catch {
      /* fall through */
    }
  }
  return categories;
}

export async function getArticles(): Promise<Article[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .order("publishedAt", { ascending: false });
      if (!error && data?.length) return data as Article[];
    } catch {
      /* fall through */
    }
  }
  return articles.filter((a) => a.status === "published");
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("articles").select("*").eq("slug", slug).single();
      if (!error && data) return data as Article;
    } catch {
      /* fall through */
    }
  }
  return articles.find((a) => a.slug === slug);
}

export async function getTestimonials(): Promise<Testimonial[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("approved", true)
        .order("createdAt", { ascending: false });
      if (!error && data?.length) return data as Testimonial[];
    } catch {
      /* fall through */
    }
  }
  return testimonials.filter((t) => t.approved);
}

export async function getResources(): Promise<Resource[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("resources").select("*").order("title");
      if (!error && data?.length) return data as Resource[];
    } catch {
      /* fall through */
    }
  }
  return resources;
}

export function getAllBirdSlugs(): string[] {
  return birds.map((b) => b.slug);
}

export function getAllArticleSlugs(): string[] {
  return articles.filter((a) => a.status === "published").map((a) => a.slug);
}

export { birds, categories, articles, testimonials, resources };

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface Bird {
  id: string;
  name: string;
  slug: string;
  scientificName: string;
  category: string;
  categorySlug: string;
  origin: string;
  nativeRange: string;
  colors: string;
  height: string;
  weight: string;
  lifespan: string;
  habitat: string;
  diet: string;
  feedingGuide: string;
  temperament: string;
  behavior: string;
  careLevel: string;
  whereToFind: string;
  conservationStatus: string;
  heroImage: string;
  videoUrl?: string;
  gallery: string[];
  featured: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  author: string;
  publishedAt: string;
  status: "draft" | "published";
}

export interface Testimonial {
  id: string;
  name: string;
  avatar: string;
  quote: string;
  bird: string;
  approved: boolean;
  createdAt: string;
}

export interface Resource {
  id: string;
  title: string;
  type: "guide" | "checklist" | "video" | "article";
  description: string;
  url: string;
  thumbnail: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: { label: string; value: string; scores: Record<string, number> }[];
}

export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface NewsletterForm {
  email: string;
}

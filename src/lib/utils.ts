export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).replace(/\s+\S*$/, "") + "…";
}

export const SITE_NAME = "West Bengal Avian Society";
export const SITE_DESCRIPTION =
  "Discover your perfect feathered friend. Handcrafted bird care guides, verified profiles, and expert resources by West Bengal Avian Society.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/birds", label: "Bird Profiles" },
  { href: "/care", label: "Care & Feeding" },
  { href: "/habitats", label: "Habitats" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export const FEEDING_STEPS = [
  { step: 1, title: "Choose Quality Food", description: "Select species-appropriate seed mix or pellets from a reputable source." },
  { step: 2, title: "Fresh Daily", description: "Provide fresh food each morning and remove uneaten portions by evening." },
  { step: 3, title: "Add Fresh Produce", description: "Supplement with washed vegetables, fruits, and leafy greens." },
  { step: 4, title: "Provide Clean Water", description: "Change water at least twice daily. Use clean, shallow dishes." },
  { step: 5, title: "Monitor & Adjust", description: "Watch eating habits and adjust portions to maintain healthy weight." },
];

export const CARE_BASICS = [
  { icon: "home", title: "Safe Housing", description: "Proper cage size, placement, and accessories" },
  { icon: "utensils", title: "Balanced Diet", description: "Species-specific nutrition and fresh water" },
  { icon: "heart", title: "Social Needs", description: "Interaction, enrichment, and companionship" },
  { icon: "stethoscope", title: "Health Checks", description: "Regular observation and avian vet visits" },
];

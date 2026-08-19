import Hero from "@/components/home/Hero";
import FeatureSplit from "@/components/home/FeatureSplit";
import BirdDirectory from "@/components/home/BirdDirectory";
import FeedingProcess from "@/components/home/FeedingProcess";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import BlogCards from "@/components/home/BlogCards";
import PreFooterCTA from "@/components/home/PreFooterCTA";
import WavyDivider from "@/components/ui/WavyDivider";
import {
  getBirds,
  getCategories,
  getFeaturedBird,
  getTestimonials,
  getArticles,
} from "@/lib/data-provider";

export default async function HomePage() {
  const [birds, categories, featuredBird, testimonials, articles] = await Promise.all([
    getBirds(),
    getCategories(),
    getFeaturedBird(),
    getTestimonials(),
    getArticles(),
  ]);

  return (
    <>
      <Hero />
      <WavyDivider />
      {featuredBird && <FeatureSplit featuredBird={featuredBird} />}
      <WavyDivider flip color="fill-cream-dark/50" />
      <BirdDirectory birds={birds} categories={categories} />
      <WavyDivider color="fill-olive" />
      <FeedingProcess />
      <WavyDivider flip color="fill-cream" />
      <TestimonialsSection testimonials={testimonials} />
      <BlogCards articles={articles} />
      <PreFooterCTA />
    </>
  );
}

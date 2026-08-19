import { createMetadata } from "@/lib/seo";
import { getBirds } from "@/lib/data-provider";
import QuizEngine from "@/components/quiz/QuizEngine";

export const metadata = createMetadata({
  title: "Find Your Bird",
  description: "Take our quiz to discover the perfect pet bird for your lifestyle and experience level.",
  path: "/find-your-bird",
});

export default async function FindYourBirdPage() {
  const birds = await getBirds();

  return (
    <div className="section-padding">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl md:text-5xl text-forest mb-4">Find Your Bird</h1>
          <p className="text-espresso/70 max-w-2xl mx-auto">
            Answer a few questions about your lifestyle and preferences, and we&apos;ll recommend the perfect feathered companion.
          </p>
        </div>
        <QuizEngine birds={birds} />
      </div>
    </div>
  );
}

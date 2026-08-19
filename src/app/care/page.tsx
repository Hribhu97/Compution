import Link from "next/link";
import { createMetadata } from "@/lib/seo";
import { FEEDING_STEPS, CARE_BASICS } from "@/lib/utils";
import { Home, Utensils, Heart, Stethoscope } from "lucide-react";

export const metadata = createMetadata({
  title: "Care & Feeding",
  description: "Complete bird care and feeding guides for pet bird owners.",
  path: "/care",
});

const iconMap: Record<string, React.ReactNode> = {
  home: <Home className="w-8 h-8" />,
  utensils: <Utensils className="w-8 h-8" />,
  heart: <Heart className="w-8 h-8" />,
  stethoscope: <Stethoscope className="w-8 h-8" />,
};

export default function CarePage() {
  return (
    <div className="section-padding">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-4xl md:text-5xl text-forest mb-4 text-center">Care & Feeding</h1>
        <p className="text-espresso/70 text-center max-w-2xl mx-auto mb-12">
          Everything you need to know about keeping your feathered companion healthy, happy, and well-fed.
        </p>

        <section className="mb-16">
          <h2 className="font-serif text-2xl text-forest mb-6">Essential Care Pillars</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {CARE_BASICS.map((item) => (
              <div key={item.title} className="paper-card p-6">
                <div className="text-terracotta mb-3" aria-hidden="true">{iconMap[item.icon]}</div>
                <h3 className="font-serif text-xl text-forest mb-2">{item.title}</h3>
                <p className="text-espresso/70">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-serif text-2xl text-forest mb-6">The Feeding Process</h2>
          <div className="space-y-6">
            {FEEDING_STEPS.map((step) => (
              <div key={step.step} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-forest text-cream flex items-center justify-center font-bold flex-shrink-0">
                  {step.step}
                </div>
                <div>
                  <h3 className="font-serif text-lg text-forest font-semibold">{step.title}</h3>
                  <p className="text-espresso/70">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-serif text-2xl text-forest mb-6">Foods to Avoid</h2>
          <div className="bg-terracotta/10 rounded-2xl p-6 border border-terracotta/20">
            <ul className="space-y-2 text-espresso/80">
              <li>• <strong>Avocado</strong> — toxic to all birds</li>
              <li>• <strong>Chocolate</strong> — contains theobromine, which is lethal</li>
              <li>• <strong>Caffeine</strong> — causes cardiac distress</li>
              <li>• <strong>Alcohol</strong> — extremely dangerous even in small amounts</li>
              <li>• <strong>Salty foods</strong> — can cause sodium poisoning</li>
              <li>• <strong>Fruit pits and apple seeds</strong> — contain cyanide compounds</li>
            </ul>
          </div>
        </section>

        <section className="text-center">
          <h2 className="font-serif text-2xl text-forest mb-4">Species-Specific Guides</h2>
          <p className="text-espresso/70 mb-6">Each bird profile includes tailored feeding and care recommendations.</p>
          <Link href="/birds" className="stamp-button">Browse Bird Profiles</Link>
        </section>
      </div>
    </div>
  );
}

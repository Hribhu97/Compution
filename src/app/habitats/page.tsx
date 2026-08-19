import Link from "next/link";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Habitats",
  description: "Guide to creating the perfect habitat and cage setup for your pet bird.",
  path: "/habitats",
});

const HABITAT_GUIDES = [
  {
    title: "Indoor Cage Setup",
    description: "Choose the right cage size, bar spacing, and placement for your bird species. Include multiple perch diameters, food dishes, and enrichment toys.",
    tips: ["Minimum cage width = 1.5× wingspan", "Avoid drafts and direct sunlight", "Place in social areas of the home"],
  },
  {
    title: "Aviary Design",
    description: "For finches, doves, and small birds, an indoor or outdoor aviary provides space for natural behaviors like flying, foraging, and bathing.",
    tips: ["Minimum 6 ft long for small finches", "Include live or artificial plants", "Provide multiple feeding stations"],
  },
  {
    title: "Enrichment & Toys",
    description: "Mental stimulation prevents boredom and feather plucking. Rotate toys weekly and include foraging opportunities.",
    tips: ["Natural wood perches of varying sizes", "Foraging toys with hidden treats", "Mirrors for solo birds (species-dependent)"],
  },
  {
    title: "Safety Considerations",
    description: "Bird-proof your home before allowing out-of-cage time. Many common household items pose serious risks.",
    tips: ["Cover or turn off ceiling fans", "Close toilet lids and cover water containers", "Remove toxic houseplants from bird areas"],
  },
];

export default function HabitatsPage() {
  return (
    <div className="section-padding">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-4xl md:text-5xl text-forest mb-4 text-center">Habitats</h1>
        <p className="text-espresso/70 text-center max-w-2xl mx-auto mb-12">
          Create a safe, enriching environment where your bird can thrive — whether in a cage, aviary, or free-flight room.
        </p>

        <div className="space-y-8">
          {HABITAT_GUIDES.map((guide, i) => (
            <div key={guide.title} className="paper-card p-8">
              <span className="text-olive text-sm font-semibold uppercase tracking-wider">Guide {i + 1}</span>
              <h2 className="font-serif text-2xl text-forest mt-1 mb-3">{guide.title}</h2>
              <p className="text-espresso/80 leading-relaxed mb-4">{guide.description}</p>
              <ul className="space-y-1">
                {guide.tips.map((tip) => (
                  <li key={tip} className="text-espresso/70 text-sm flex items-start gap-2">
                    <span className="text-terracotta mt-0.5">✦</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-espresso/70 mb-4">Need species-specific habitat advice?</p>
          <Link href="/birds" className="ghost-button">View Bird Profiles</Link>
        </div>
      </div>
    </div>
  );
}

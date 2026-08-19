import { Metadata } from "next";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "./utils";

export function createMetadata({
  title,
  description,
  path = "",
  image,
}: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
}): Metadata {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const desc = description || SITE_DESCRIPTION;
  const url = `${SITE_URL}${path}`;
  const ogImage = image || `${SITE_URL}/og-default.jpg`;

  return {
    title: fullTitle,
    description: desc,
    openGraph: {
      title: fullTitle,
      description: desc,
      url,
      siteName: SITE_NAME,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: desc,
      images: [ogImage],
    },
    alternates: { canonical: url },
  };
}

export function birdJsonLd(bird: {
  name: string;
  scientificName: string;
  description: string;
  heroImage: string;
  slug: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: bird.name,
    description: bird.description,
    image: bird.heroImage,
    url: `${SITE_URL}/birds/${bird.slug}`,
    author: { "@type": "Organization", name: SITE_NAME },
  };
}

import { createMetadata } from "@/lib/seo";
import ContactClient from "./ContactClient";

export const metadata = createMetadata({
  title: "Contact",
  description: "Get in touch with The Aviary team for bird care questions and enquiries.",
  path: "/contact",
});

export default function ContactPage() {
  return <ContactClient />;
}

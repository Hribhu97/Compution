"use client";

import Link from "next/link";
import { useState } from "react";
import { Bird, Mail, Heart } from "lucide-react";
import { NAV_LINKS } from "@/lib/utils";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleNewsletter(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <footer className="bg-forest text-cream">
      <div className="max-w-7xl mx-auto section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Bird className="w-6 h-6" aria-hidden="true" />
              <span className="font-serif text-2xl font-bold tracking-tight text-cream">
                West Bengal Avian Society
              </span>
            </div>
            <p className="text-cream/70 text-sm leading-relaxed font-sans">
              Your handcrafted companion for discovering, caring for, and celebrating pet birds.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-lg font-bold tracking-tight mb-4">Explore</h3>
            <ul className="space-y-2 font-sans">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-cream/70 hover:text-cream text-sm transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/find-your-bird" className="text-cream/70 hover:text-cream text-sm transition-colors">
                  Find Your Bird
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-lg font-bold tracking-tight mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-cream/70 font-sans">
              <li><Link href="/care" className="hover:text-cream transition-colors">Care Guides</Link></li>
              <li><Link href="/habitats" className="hover:text-cream transition-colors">Habitat Setup</Link></li>
              <li><Link href="/birds" className="hover:text-cream transition-colors">Bird Directory</Link></li>
              <li><Link href="/blog" className="hover:text-cream transition-colors">Blog & Articles</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-lg font-bold tracking-tight mb-4">Newsletter</h3>
            <p className="text-cream/70 text-sm mb-3 font-sans">Weekly bird care tips delivered to your inbox.</p>
            <form onSubmit={handleNewsletter} className="flex gap-2" aria-label="Newsletter signup">
              <label htmlFor="footer-email" className="sr-only">Email address</label>
              <input
                id="footer-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-3 py-2 rounded-lg bg-cream/10 border border-cream/20 text-cream placeholder:text-cream/40 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta font-sans"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="px-4 py-2 bg-terracotta rounded-lg hover:bg-terracotta-light transition-colors disabled:opacity-50"
                aria-label="Subscribe to newsletter"
              >
                <Mail className="w-4 h-4" />
              </button>
            </form>
            {status === "success" && <p className="text-olive text-xs mt-2">Subscribed! Welcome aboard.</p>}
            {status === "error" && <p className="text-terracotta-light text-xs mt-2">Something went wrong. Try again.</p>}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-cream/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
          <p className="text-cream/50 text-sm">
            © {new Date().getFullYear()} West Bengal Avian Society. Bird data sourced from Wikipedia.
          </p>
          <p className="text-cream/50 text-sm flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-terracotta" aria-hidden="true" /> for bird lovers
          </p>
        </div>
      </div>
    </footer>
  );
}

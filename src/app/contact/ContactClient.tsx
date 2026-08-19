"use client";

import { useState } from "react";
import { MessageCircle, Mail, Send } from "lucide-react";

export default function ContactClient() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("success");
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="section-padding">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-4xl md:text-5xl text-forest mb-4 text-center">Contact Us</h1>
        <p className="text-espresso/70 text-center max-w-2xl mx-auto mb-12">
          Have a question about bird care? We&apos;d love to hear from you.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="paper-card p-6">
              <MessageCircle className="w-8 h-8 text-terracotta mb-3" aria-hidden="true" />
              <h2 className="font-serif text-xl text-forest mb-2">WhatsApp</h2>
              <p className="text-espresso/70 text-sm mb-3">Quick questions? Message us directly.</p>
              <a
                href="https://wa.me/1234567890?text=Hello%20The%20Aviary%20Guide!"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-forest font-semibold hover:text-terracotta transition-colors"
              >
                Chat on WhatsApp →
              </a>
            </div>

            <div className="paper-card p-6">
              <Mail className="w-8 h-8 text-terracotta mb-3" aria-hidden="true" />
              <h2 className="font-serif text-xl text-forest mb-2">Email</h2>
              <p className="text-espresso/70 text-sm mb-3">For detailed enquiries and partnerships.</p>
              <a href="mailto:hello@theaviaryguide.com" className="text-forest font-semibold hover:text-terracotta transition-colors">
                hello@theaviaryguide.com
              </a>
            </div>

            <div className="bg-forest/5 rounded-2xl p-6 border border-forest/10">
              <h2 className="font-serif text-lg text-forest mb-2">Download Our Checklist</h2>
              <p className="text-espresso/70 text-sm mb-3">
                New bird owner? Get our free preparation checklist.
              </p>
              <a href="/api/checklist" className="stamp-button text-sm inline-flex">
                Download Checklist
              </a>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="paper-card p-8 space-y-5" aria-label="Contact form">
            <div>
              <label htmlFor="name" className="field-label block mb-1">Name</label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-espresso/15 bg-cream focus:outline-none focus:ring-2 focus:ring-terracotta/50"
              />
            </div>
            <div>
              <label htmlFor="email" className="field-label block mb-1">Email</label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-espresso/15 bg-cream focus:outline-none focus:ring-2 focus:ring-terracotta/50"
              />
            </div>
            <div>
              <label htmlFor="subject" className="field-label block mb-1">Subject</label>
              <input
                id="subject"
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-espresso/15 bg-cream focus:outline-none focus:ring-2 focus:ring-terracotta/50"
              />
            </div>
            <div>
              <label htmlFor="message" className="field-label block mb-1">Message</label>
              <textarea
                id="message"
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-espresso/15 bg-cream focus:outline-none focus:ring-2 focus:ring-terracotta/50 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="stamp-button w-full justify-center disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {status === "loading" ? "Sending..." : "Send Message"}
            </button>
            {status === "success" && (
              <p className="text-forest text-sm text-center">Message sent! We&apos;ll get back to you soon.</p>
            )}
            {status === "error" && (
              <p className="text-terracotta text-sm text-center">Something went wrong. Please try again.</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

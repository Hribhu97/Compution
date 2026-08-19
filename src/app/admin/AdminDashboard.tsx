"use client";

import { useState } from "react";
import { Lock, LogOut, Bird, FileText, MessageSquare, BookOpen } from "lucide-react";
import { birds, categories, articles, testimonials, resources } from "@/lib/data-provider";

type Tab = "birds" | "categories" | "articles" | "testimonials" | "resources";

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("birds");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthenticated(true);
    } else {
      setError("Invalid password");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthenticated(false);
    setPassword("");
  }

  if (!authenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center section-padding">
        <form onSubmit={handleLogin} className="paper-card p-8 w-full max-w-sm space-y-4">
          <div className="text-center mb-4">
            <Lock className="w-10 h-10 text-forest mx-auto mb-2" aria-hidden="true" />
            <h1 className="font-serif text-2xl text-forest">Admin Login</h1>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full px-4 py-3 rounded-lg border border-espresso/15 bg-cream focus:outline-none focus:ring-2 focus:ring-terracotta/50"
            aria-label="Admin password"
          />
          {error && <p className="text-terracotta text-sm">{error}</p>}
          <button type="submit" className="stamp-button w-full justify-center">Login</button>
        </form>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "birds", label: "Birds", icon: <Bird className="w-4 h-4" />, count: birds.length },
    { id: "categories", label: "Categories", icon: <BookOpen className="w-4 h-4" />, count: categories.length },
    { id: "articles", label: "Articles", icon: <FileText className="w-4 h-4" />, count: articles.length },
    { id: "testimonials", label: "Testimonials", icon: <MessageSquare className="w-4 h-4" />, count: testimonials.length },
    { id: "resources", label: "Resources", icon: <BookOpen className="w-4 h-4" />, count: resources.length },
  ];

  return (
    <div className="section-padding">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl text-forest">Admin CMS</h1>
          <button onClick={handleLogout} className="flex items-center gap-2 text-espresso/60 hover:text-terracotta text-sm">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === tab.id ? "bg-forest text-cream" : "bg-cream text-espresso/70 border border-espresso/10"
              }`}
            >
              {tab.icon} {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="paper-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-forest/5">
                <tr>
                  {activeTab === "birds" && (
                    <>
                      <th className="text-left p-4 field-label">Name</th>
                      <th className="text-left p-4 field-label">Category</th>
                      <th className="text-left p-4 field-label">Care Level</th>
                      <th className="text-left p-4 field-label">Featured</th>
                    </>
                  )}
                  {activeTab === "categories" && (
                    <>
                      <th className="text-left p-4 field-label">Name</th>
                      <th className="text-left p-4 field-label">Slug</th>
                      <th className="text-left p-4 field-label">Description</th>
                    </>
                  )}
                  {activeTab === "articles" && (
                    <>
                      <th className="text-left p-4 field-label">Title</th>
                      <th className="text-left p-4 field-label">Category</th>
                      <th className="text-left p-4 field-label">Status</th>
                    </>
                  )}
                  {activeTab === "testimonials" && (
                    <>
                      <th className="text-left p-4 field-label">Name</th>
                      <th className="text-left p-4 field-label">Bird</th>
                      <th className="text-left p-4 field-label">Approved</th>
                    </>
                  )}
                  {activeTab === "resources" && (
                    <>
                      <th className="text-left p-4 field-label">Title</th>
                      <th className="text-left p-4 field-label">Type</th>
                      <th className="text-left p-4 field-label">URL</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeTab === "birds" && birds.map((b) => (
                  <tr key={b.id} className="border-t border-espresso/5 hover:bg-cream-dark/50">
                    <td className="p-4 font-semibold text-forest">{b.name}</td>
                    <td className="p-4">{b.category}</td>
                    <td className="p-4">{b.careLevel}</td>
                    <td className="p-4">{b.featured ? "★" : "—"}</td>
                  </tr>
                ))}
                {activeTab === "categories" && categories.map((c) => (
                  <tr key={c.id} className="border-t border-espresso/5 hover:bg-cream-dark/50">
                    <td className="p-4 font-semibold text-forest">{c.name}</td>
                    <td className="p-4">{c.slug}</td>
                    <td className="p-4 text-espresso/70">{c.description}</td>
                  </tr>
                ))}
                {activeTab === "articles" && articles.map((a) => (
                  <tr key={a.id} className="border-t border-espresso/5 hover:bg-cream-dark/50">
                    <td className="p-4 font-semibold text-forest">{a.title}</td>
                    <td className="p-4">{a.category}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs ${a.status === "published" ? "bg-forest/10 text-forest" : "bg-espresso/10 text-espresso/60"}`}>{a.status}</span></td>
                  </tr>
                ))}
                {activeTab === "testimonials" && testimonials.map((t) => (
                  <tr key={t.id} className="border-t border-espresso/5 hover:bg-cream-dark/50">
                    <td className="p-4 font-semibold text-forest">{t.name}</td>
                    <td className="p-4">{t.bird}</td>
                    <td className="p-4">{t.approved ? "✓" : "✗"}</td>
                  </tr>
                ))}
                {activeTab === "resources" && resources.map((r) => (
                  <tr key={r.id} className="border-t border-espresso/5 hover:bg-cream-dark/50">
                    <td className="p-4 font-semibold text-forest">{r.title}</td>
                    <td className="p-4">{r.type}</td>
                    <td className="p-4 text-espresso/60 truncate max-w-xs">{r.url}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-espresso/50 text-sm mt-6 text-center">
          CMS is in read-only demo mode with local JSON data. Connect Supabase for full CRUD operations.
        </p>
      </div>
    </div>
  );
}

# The Aviary Guide

A full-stack bird encyclopedia website with verified Wikipedia data, a cottagecore aesthetic, and a complete care guide system.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Framer Motion
- **Backend:** Supabase-ready (falls back to local JSON seed data)
- **Images:** Wikipedia/Wikimedia Commons only
- **Fonts:** Playfair Display (headings), Montserrat (body)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Environment Variables

Copy the example env file:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL (falls back to JSON if not set) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key (for admin writes) |
| `ADMIN_PASSWORD` | No | Admin CMS password (default: `aviary-admin-2026`) |
| `NEXT_PUBLIC_SITE_URL` | No | Site URL for SEO (default: `http://localhost:3000`) |

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
npm start
```

## Pages

| Route | Description |
|---|---|
| `/` | Home page with hero, featured bird, directory, feeding guide, testimonials, blog |
| `/birds` | Full bird profiles directory with search |
| `/birds/[slug]` | Individual bird profile with all structured fields |
| `/care` | Care & feeding guides |
| `/habitats` | Habitat setup guides |
| `/blog` | Blog listing |
| `/blog/[slug]` | Individual article |
| `/contact` | Contact form, WhatsApp, checklist download |
| `/find-your-bird` | Recommendation quiz with deterministic scoring |
| `/admin` | Protected CMS dashboard |

## Bird Data

12 birds across 4 categories (Parrots, Finches, Doves, Canaries), all with verified Wikipedia data:

- Cockatiel, Budgerigar, African Grey Parrot, Lovebird, Sun Conure, Eclectus Parrot
- Zebra Finch, Society Finch, Gouldian Finch
- Diamond Dove, Ring-necked Dove
- Canary

Fields without verified data show "Information currently unavailable."

## Supabase Setup (Production)

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the schema in `supabase/schema.sql` in the SQL editor
3. Set environment variables in `.env.local`
4. The app automatically uses Supabase when env vars are configured

## Admin CMS

Visit `/admin` and log in with the `ADMIN_PASSWORD` env var (default: `aviary-admin-2026`).

Currently displays read-only data from JSON. Full CRUD requires Supabase connection.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes (contact, newsletter, search, admin)
│   ├── birds/              # Bird directory & profiles
│   ├── blog/               # Blog listing & articles
│   ├── care/               # Care & feeding page
│   ├── habitats/           # Habitat guides
│   ├── contact/            # Contact page
│   ├── find-your-bird/     # Recommendation quiz
│   └── admin/              # Admin CMS
├── components/
│   ├── layout/             # Header, Footer
│   ├── home/               # Home page sections
│   ├── birds/              # Bird search & cards
│   ├── quiz/               # Quiz engine
│   └── ui/                 # Shared UI (skeleton, bottom sheet, dividers)
└── lib/
    ├── data/               # JSON seed data
    ├── supabase/           # Supabase client & schema
    ├── data-provider.ts    # Data layer with Supabase fallback
    ├── quiz-scoring.ts     # Deterministic quiz scoring
    ├── seo.ts              # Metadata & JSON-LD helpers
    └── utils.ts            # Shared utilities
supabase/
└── schema.sql              # Production database schema
```

## Design

Whimsical Cottagecore × Storybook Rustic aesthetic:

- **Colors:** Cream `#F6F0E4`, Forest Green `#153F32`, Terracotta `#B86143`, Olive `#7F8560`, Espresso `#392B24`
- **Typography:** Playfair Display (serif headings), Montserrat (sans body)
- Organic shapes, wavy dividers, paper texture, botanical accents
- Framer Motion animations with reduced-motion support
- WCAG AA accessible, fully responsive

## License

Bird data sourced from [Wikipedia](https://en.wikipedia.org) under CC BY-SA. Images from [Wikimedia Commons](https://commons.wikimedia.org).

# Gusto's Guide

Seattle restaurant guide built from Augusto's saved places. House guides are public and read-only. Sign in with a name to mark Been / To go, rank places, upload photos, and keep your own lists. Demo friends are labeled demo and live in this browser.

## Run

```bash
npm install
npm run dev
```

The dev server is http://127.0.0.1:4179 .

```bash
npm run build
npm run lint
npm run preview
```

`npm run build` writes a static `dist/` folder. Routes use the URL hash (`#/guides`), so static hosts do not need SPA rewrites.

## Content

Source lists live in `data/places_categorized.json`, `data/guide_themes.json`, and `data/apple_page_provider_ids.json`.

```bash
npm run content
```

That regenerates `src/content/`. Launch places are resolved Seattle food and drink that are not excluded, closed, outside the city, or duplicates. Outside-Seattle places stay in `src/content/hidden.json` and are not linked. Copy is marked `copy_source: "draft"`. Catalog scores stay empty. Sign in as Augusto and use Rank to publish Gusto's Score (0–10, one decimal) in this browser. Yelp and OpenTable remain a separate 1–5 star line.

## Photos

1. Photos Augusto uploads while signed in as Augusto become the primary image, credited **Photo by Gusto**. Other signed-in people who marked a place Been can upload too. Files are resized to WebP in the browser and stored in IndexedDB.
2. `npm run wikimedia` saves licensed Wikimedia Commons photos into `public/photos/` with credit and license.
3. Everything else uses a labeled illustration.
4. `npm run photos` looks for `FOURSQUARE_API_KEY`. Without it, the script exits and does nothing.

## Supabase

Leave `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` unset to stay local. When both are set, sign-in uses Supabase email and password, and photo uploads also go to the `place-photos` bucket. Apply `supabase/schema.sql` first (tables, RLS, storage policies).

## Deploy

Framework preset Vite. Build command `npm run build`. Output directory `dist`. No environment variables are required for the local/demo mode.

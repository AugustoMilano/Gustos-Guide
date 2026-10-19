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
npm run test:e2e
npm run preview
```

`npm run test:e2e` runs the Playwright smoke suite in Chromium at 1440×900 and WebKit at 390×844. It expects the dev server on port 4179 and will reuse one that is already running.

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

Leave `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` unset to stay local. Demo friends, demo lists, and the demo plan only appear in that local mode.

When both are set, sign-in is an email magic link (PKCE, so the return URL is `?code=` on https://gustos-guide.pages.dev and does not collide with hash routes). Google and Sign in with Apple buttons stay hidden unless `VITE_AUTH_PROVIDERS` lists `google` and/or `apple`. The first sign-in on a browser that already has To go, Been, guides, or photos offers to import them. Apply `supabase/schema.sql` first. It is safe to re-run. It grants `anon` and `authenticated` itself, because new tables are not exposed automatically, and it turns on realtime for notifications and plans.

The publishable key (`sb_publishable_…`) is public and belongs in `VITE_SUPABASE_ANON_KEY`. Do not put a secret key in any `VITE_` variable. `@supabase/supabase-js` 2.118 sends that key as the `apikey` header and does not treat it as a bearer token.

## Deploy

See `DEPLOY.md`. The site is published to Cloudflare Pages with `npm run build` and `npm run deploy:cf` (`wrangler pages deploy dist --project-name gustos-guide`). Output directory `dist`. The sitemap default is `https://gustos-guide.pages.dev`. No environment variables are required for the local demo. Do not deploy from a cloud-agent session unless you mean to publish.

# Gusto's Guide

Seattle restaurant guide built from Augusto's saved places. House guides are public and read-only. Sign in to mark Been / To go, rank places, upload photos, and keep your own lists. Friends, the feed, and plans come from real accounts.

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

That regenerates the Seattle files in `src/content/`. Do not run it to refresh the Eastside or Los Angeles lists. Seattle food and drink that are not excluded, closed, outside the city, or duplicates stay in `src/content/places.json`. Outside-Seattle places from that pass stay in `src/content/hidden.json` and are not linked. The Eastside list is `src/content/eastside.json`. Los Angeles is `src/content/la.json`, taken from Augusto's Apple Maps guide and kept to food and drink, one location per brand. San Francisco and the Peninsula share `src/content/sf.json`: city proper plus the folded North Bay and Yogurt Park stay `sf` (116 places), and Peninsula and South Bay places are `peninsula` (12). East Bay and North Bay are not their own areas. Copy is marked `copy_source: "draft"`. Catalog scores stay empty. Sign in as Augusto and use Rank or Quick score to publish Gusto's Score (0–10, one decimal). Golden Fork Top 25 (`#/top`) ranks the open region by that exact score. Seattle includes the Eastside. San Francisco includes the Peninsula. Yelp is the only outside rating, shown as a small gray line, and only when the number is credited to Yelp. Place and guide pages can save a 1080×1920 story image.

The header region name returns to Choose a city (`#/cities`). Seattle is a region: the coral pill switches Seattle and the Eastside. San Francisco is a region: the pill switches San Francisco and the Peninsula (`#/sf/...` and `#/peninsula/...`). An old `#/sf/place/...` URL for a Peninsula room redirects. Los Angeles is `#/la/...` and has no pill. Unprefixed URLs and `#/seattle/...` stay on Seattle. The last city you opened is stored in this browser.

## Photos

1. Photos Augusto uploads while signed in as Augusto become the primary image, credited **Photo by Gusto**. Other signed-in people who marked a place Been can upload too. Files are resized to WebP in the browser and stored in IndexedDB.
2. `npm run wikimedia` saves licensed Wikimedia Commons photos into `public/photos/` with credit and license.
3. Everything else uses a labeled illustration.
4. `npm run photos` looks for `FOURSQUARE_API_KEY`. Without it, the script exits and does nothing.

## Supabase

Leave `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` unset to stay local. Seeded friends stay off unless you start the dev server with `VITE_DEMO_FRIENDS=1`. Production builds ignore that flag.

When both are set, sign-in is an email magic link (PKCE). The return URL is the current origin plus the current path, so `?code=` stays in the query string and does not collide with hash routes. `VITE_AUTH_PROVIDERS` is a comma list. `x` shows Continue with X above the email field and returns to that same origin. `google` and `apple` stay hidden unless they are listed. A new X account stores the X name, handle (`preferred_username` or `user_name`), and avatar on the profile. Public terms and privacy live at `/terms` and `/privacy`. The first sign-in on a browser that already has To go, Been, guides, or photos offers to import them. Apply `supabase/schema.sql` first. It is safe to re-run. House collections are in that file. A database created before them also needs `supabase/migrations/20261021080000_collections.sql`. A database that already has collections needs `supabase/migrations/20261022040000_collections_city_peninsula.sql` before a Peninsula collection can be saved. `20261022041000_cheap_eats_peninsula.sql` does not insert a row: the Peninsula has no open $ places, and the San Francisco Cheap eats list (including Yogurt Park) is left as stored. It grants `anon` and `authenticated` itself, because new tables are not exposed automatically, and it turns on realtime for notifications and plans.

The publishable key (`sb_publishable_…`) is public and belongs in `VITE_SUPABASE_ANON_KEY`. Do not put a secret key in any `VITE_` variable. `@supabase/supabase-js` 2.118 sends that key as the `apikey` header and does not treat it as a bearer token.

## Deploy

See `DEPLOY.md`. The site is published to Cloudflare Pages with `npm run build` and `npm run deploy:cf` (`wrangler pages deploy dist --project-name gustos-guide`). Output directory `dist`. The public origin is `https://gustosguide.com`. No environment variables are required for the local demo. Do not deploy from a cloud-agent session unless you mean to publish.

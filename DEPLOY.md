# Deploy

The published site is Cloudflare Pages, project `gustos-guide`, at https://gustos-guide.pages.dev. The app is a static Vite build. Routes live in the URL hash (`#/explore`), so a host does not need an SPA rewrite.

## Cloudflare Pages (direct upload)

From a machine where Wrangler is logged in:

```bash
npm run build
npm run deploy:cf
```

`deploy:cf` runs `wrangler pages deploy dist --project-name gustos-guide`.

`npm run build` checks copy, writes `public/sitemap.xml` and Open Graph cards, typechecks, builds, then stamps `dist/sw.js` with the git commit. Set `SITE_URL` before the build if the sitemap should use another origin. The default is `https://gustos-guide.pages.dev`.

`public/_headers` is copied into `dist`. Files under `/assets/` (content-hashed) use `Cache-Control: public, max-age=31536000, immutable`. `/`, `/index.html`, and `/sw.js` use `Cache-Control: no-cache`, so the next visit revalidates the shell and the worker.

## Vercel

1. Push the branch, then import the repository in Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. `vercel.json` in the repo root records the same settings.

Set `SITE_URL` to the Vercel origin before `npm run build` so the sitemap matches that host.

Hash routes are not separate documents. Crawlers that ignore the hash will only see the shell. The sitemap still lists `#/guide/…` and `#/place/…` URLs. Open Graph tags are set in the browser after navigation; the shared images are `public/og/og.svg`, `public/og/place.svg`, and `public/og/guides/<slug>.svg`.

No environment variables are required for the local demo. Lists, ranks, notifications, and Gusto's Score stay in this browser.

## Supabase (optional)

Leave these unset to stay local:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

When both are set, sign-in uses Supabase email and password, and photo uploads also go to the `place-photos` bucket.

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql` (tables, row level security, storage policies).
3. Confirm the `place-photos` bucket exists. The schema creates it.
4. Add the two `VITE_` variables in the host's environment, then rebuild and upload.

Do not put the service-role key in `VITE_` variables. The anon key is the one the browser uses, and row level security is what limits it.

## Origin

Cursor Cloud Agents treat this repository as the source of truth. Publishing is a direct upload from another machine with `npm run deploy:cf`. Do not run that from an agent session unless you mean to publish.

## Install and offline

`public/manifest.webmanifest` makes the built site installable. `public/sw.js` is registered only in production, with `updateViaCache: 'none'`, so Vite's dev server is left alone and the browser does not keep an old worker script.

Each production build names the cache `gusto-<commit>`. Install calls `skipWaiting`. Activate deletes every other cache and calls `clients.claim`. A page that was already controlled reloads once when the new worker takes over, so it does not keep running the previous bundle. Returning to the tab also calls `registration.update()`.

Hashed `/assets/` responses are cache-first. The HTML shell is network-first, and a failed navigation falls back to the cached `index.html`. `sw.js` itself is always fetched from the network. Saved lists already live in `localStorage`, so they are still there when the shell loads offline.

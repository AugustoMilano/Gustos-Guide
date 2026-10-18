# Deploy

This session does not deploy. The app is a static Vite build. Routes live in the URL hash (`#/explore`), so a host does not need an SPA rewrite.

## Vercel

1. Push the branch, then import the repository in Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. `vercel.json` in the repo root records the same settings.

`npm run build` checks copy, writes `public/sitemap.xml` and Open Graph cards, typechecks, then builds. Set `SITE_URL` before the build if the sitemap should use your real origin. The default is `https://gustos-guide.vercel.app`.

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
4. Add the two `VITE_` variables in Vercel, then redeploy.

Do not put the service-role key in `VITE_` variables. The anon key is the one the browser uses, and row level security is what limits it.

## Origin

Cursor Cloud Agents treat this repository as the source of truth. After the branch is pushed, connect that same repository to Vercel with the Vite preset above. Do not run `vercel deploy` from the agent session unless you mean to publish.

## Install and offline

`public/manifest.webmanifest` makes the built site installable. `public/sw.js` is registered only in production, so Vite's dev server is left alone. The worker caches GET responses and falls back to `index.html`. Saved lists already live in `localStorage`, so they are still there when the shell loads offline.

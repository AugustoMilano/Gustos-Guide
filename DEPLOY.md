# Deploy

The published site is Cloudflare Pages, project `gustos-guide`. The public address is https://gustosguide.com (www redirects to the apex in the browser). https://gustos-guide.pages.dev still serves the same build. The app is a static Vite build. Guide routes live in the URL hash (`#/explore`), so a host does not need an SPA rewrite. `/terms` and `/privacy` are real HTML files.

## Cloudflare Pages (direct upload)

From a machine where Wrangler is logged in:

```bash
npm run build
npm run deploy:cf
```

`deploy:cf` runs `wrangler pages deploy dist --project-name gustos-guide`.

`npm run build` checks copy, writes the Terms and Privacy pages, writes `public/sitemap.xml` and Open Graph cards, typechecks, builds, then stamps `dist/sw.js` with the git commit. The sitemap, canonical URLs, and `robots.txt` use `https://gustosguide.com`. Set `SITE_URL` before the build only if a preview should list a different origin.

`public/_headers` is copied into `dist`. Files under `/assets/` (content-hashed) use `Cache-Control: public, max-age=31536000, immutable`. `/`, `/index.html`, and `/sw.js` use `Cache-Control: no-cache`, so the next visit revalidates the shell and the worker.

## Vercel

1. Push the branch, then import the repository in Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. `vercel.json` in the repo root records the same settings.

The committed sitemap uses https://gustosguide.com. Set `SITE_URL` before `npm run build` only for a one-off preview.

Hash routes are not separate documents. Crawlers that ignore the hash will only see the shell. The sitemap still lists `#/guide/…` and `#/place/…` URLs. Open Graph tags are set in the browser after navigation; the shared images are `public/og/og.svg`, `public/og/place.svg`, and `public/og/guides/<slug>.svg`.

No environment variables are required for the local demo. Lists, ranks, notifications, and Gusto's Score stay in this browser.

## Supabase

Leave these unset to stay on the local demo (demo friends included):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

When both are set at build time, the bundle signs in with an email magic link and does not show demo friends. Optional:

- `VITE_AUTH_PROVIDERS` — comma list. `x` shows Continue with X. `google` and `apple` show those buttons.

Magic link and every OAuth provider, including X, return to `{window.location.origin}/auth/callback`. That page forwards to `/` with the code in the query string, then the app exchanges it and opens the hash route the person started from. A sign-in started on gustosguide.com, www, or pages.dev comes back to that same host. www.gustosguide.com is sent to the apex before the app renders. The client uses PKCE (`flowType: 'pkce'`).

1. Apply `supabase/schema.sql` in the SQL editor or with psql. Re-running it is safe. It creates tables, grants, RLS, the private `place-photos` bucket, and realtime on `notifications`, `plans`, `plan_members`, and `plan_votes`. If profiles already exist, also run `supabase/migrations/20261019120000_handle_lowercase_first.sql` so new X handles keep their capitals (`AugustoTMilano` stays `augustotmilano` instead of `ugustoilano`).
2. Authentication → URL configuration: Site URL `https://gustosguide.com`. Redirect URLs: `https://gustosguide.com/**`, `https://www.gustosguide.com/**`, and `https://gustos-guide.pages.dev/**`. Those wildcards cover `/auth/callback`. The hash on a return URL is ignored when Supabase checks that list.
3. Authentication → Email: magic link on. The Magic Link template should keep `{{ .ConfirmationURL }}`. Password sign-in is unused.
4. The built-in mailer is for testing. It is rate-limited (often 2 emails per hour) and, on the free plan, only delivers to the project’s team until you set custom SMTP. Auth also has its own email rate limit (default 30 per hour) once SMTP is custom.
5. After the owner signs up once, in the SQL editor: `update public.profiles set is_owner = true where id = '<auth user uuid>';` The browser cannot set that flag. Only that account publishes Gusto's Score.
6. X / Twitter (OAuth 2.0) uses `external_x_enabled`, `external_x_client_id`, and `external_x_secret`. The provider callback is `https://<project-ref>.supabase.co/auth/v1/callback`. Terms and privacy for the X app are `https://gustosguide.com/terms` and `https://gustosguide.com/privacy`. This build sets `VITE_AUTH_PROVIDERS=x`. Google and Apple stay off until their client IDs exist.
7. Add the two `VITE_` variables in the host environment, then rebuild and upload.

Do not put a secret or service-role key in `VITE_` variables. The publishable key is what the browser sends as `apikey`. Row level security is what limits it.

## Origin

Cursor Cloud Agents treat this repository as the source of truth. Publishing is a direct upload from another machine with `npm run deploy:cf`. Do not run that from an agent session unless you mean to publish.

## Install and offline

`public/manifest.webmanifest` makes the built site installable. `public/sw.js` is registered only in production, with `updateViaCache: 'none'`, so Vite's dev server is left alone and the browser does not keep an old worker script.

Each production build names the cache `gusto-<commit>`. Install calls `skipWaiting`. Activate deletes every other cache and calls `clients.claim`. A page that was already controlled reloads once when the new worker takes over, so it does not keep running the previous bundle. Returning to the tab also calls `registration.update()`.

Hashed `/assets/` responses are cache-first. The HTML shell is network-first, and a failed navigation falls back to the cached `index.html`. `sw.js` itself is always fetched from the network. Saved lists already live in `localStorage`, so they are still there when the shell loads offline.

# Gusto's Guide

A personal restaurant guide for Augusto. Seattle house lists (sandwiches and pizza) are readable by anyone. Signing in with a name unlocks private lists, visit status, and new places. Everything you add stays in this browser.

House places use real Seattle addresses. Coordinates come from OpenStreetMap via Nominatim. Cards use drawn placeholders instead of hotlinked photos.

## Run locally

```bash
npm install
npm run dev
```

The dev server is http://127.0.0.1:4179 .

## Build

```bash
npm run build
```

Output is a static `dist/` folder. `npm run preview` serves that build.

```bash
npm run lint
```

## Deploy

The app is a fully static Vite build. Routing is in the URL hash (`#/guide/top-10-sandwiches`), so hosts do not need SPA rewrites. Asset paths are relative, which also works for GitHub Pages project sites.

### Vercel

1. Import the repository.
2. Framework preset: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.

### Netlify

1. Build command: `npm run build`.
2. Publish directory: `dist`.

### GitHub Pages

1. Build locally or in Actions with `npm run build`.
2. Publish the `dist/` directory (for project pages, the relative `base` in `vite.config.ts` is already `./`).

No environment variables or API keys are required. Geocoding for new places calls the public [Nominatim](https://nominatim.openstreetmap.org/) service from the browser (about one request a second). If that is blocked, type latitude and longitude by hand. Maps use OpenStreetMap data through CARTO tiles.

## Accounts later

`src/lib/storage.ts` is the only module that touches `localStorage`. Sign-in is a name on this device. A real account system can replace `storage.signIn`, `storage.loadUser`, and `storage.saveUser` without rewriting the screens.

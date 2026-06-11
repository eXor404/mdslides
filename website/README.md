# mdslides — product website

Single-page Astro site at `mdslides.mdstack.dev`. Lean long-scroll layout:
hero → live deck demo → install → CLI. Shares the design system of the
[mdstack](https://mdstack.dev) site — same tokens, fonts, theme toggle, and
signature pink→orange→yellow gradient.

## Develop

```bash
npm install
npm run dev
```

The dev server does **not** regenerate the embedded deck. Build it once with
`npm run build:demo` so the `#demo` iframe has something to show during dev.

## Build

```bash
npm run build      # full build: deck demo + version fetch + astro build
npm run build:fast # skip the deck-demo step (faster, but the iframe is empty)
npm run build:demo # rebuild only the embedded deck
```

The `build` script runs three steps:

1. `scripts/build-deck-demo.mjs` — invokes the local `mdslides` CLI
   (`mdslides build ./fixtures`) against `fixtures/slides.md`, then stages the
   self-contained output under `public/deck-demo/` and rewrites its absolute
   asset paths so it works behind the homepage `<iframe>`.
2. `scripts/fetch-version.mjs` — fetches the latest `@exor404/mdslides`
   version from the npm registry and caches it under `.cache/version.json`.
   The site reads it at build time; nothing is fetched on the client.
3. `astro build` — emits the static site to `dist/`.

`public/deck-demo/` and `fixtures/dist/` are generated and git-ignored.

## Deploy

Any static host. The `dist/` directory is self-contained.

- Vercel / Cloudflare Pages: build command `npm run build`, output `dist/`.
- The repo root contains the `mdslides` CLI used by step 1 — clone the whole
  repo on the deploy box, not just the `website/` folder.
- `Dockerfile` + `nginx.conf` build a static nginx image. nginx sends
  `X-Frame-Options: SAMEORIGIN`, which the same-origin deck iframe relies on.

## The showcase deck

`fixtures/slides.md` is a real mdslides deck — a presentation *about* mdslides,
written in the format it documents. Editing it changes the embedded demo on the
next `npm run build:demo`. `fixtures/mdslides.config.js` sets its brand and
theme.

## Customizing

Single edit points worth knowing:

- `src/lib/links.ts` — `REPO_URL`, `DOCS_URL`, `MDSTACK_URL`, and other links.
  Swap `DOCS_URL` when a dedicated docs site is live.
- `src/styles/tokens.css` — design tokens mirrored from
  `app/src/themes/angular.css`. If the angular theme drifts, update both.
- `src/lib/install-tabs.ts` — the install commands in the hero card.
- `fixtures/slides.md` — the deck shown in the `#demo` iframe.

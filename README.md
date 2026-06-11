# mdslides

> Markdown in, presentation out.

The slides sibling of [mdstack](https://github.com/eXor404/mdstack). Point it
at a folder — `mdslides` scaffolds a starter `slides.md`, then presents it in a
dev server or builds a self-contained `dist/` you can host anywhere static.

> **Status:** pre-1.0, provisional. CLI flags and markdown conventions may
> change before `0.x → 1.0`.

## Quick start

```bash
npx @exor404/mdslides@latest
```

No install step. It **asks for a name**, scaffolds `<name>/<name>.md` (three
sample slides — a title page, a list, and a help slide) plus a
`mdslides.config.js`, and opens the dev server. The name defaults to the current
folder, so pressing Enter at `Name your presentation (chemistry):` gives you
`chemistry/chemistry.md`. That file *is* your deck — edit it and the slides
live-reload.

Point it at a folder for the other commands:

```bash
npx @exor404/mdslides ./chemistry          # present (dev server, live-reload)
npx @exor404/mdslides build ./chemistry    # static build → ./chemistry/dist/
npx @exor404/mdslides preview ./chemistry  # serve the built dist/
npx @exor404/mdslides export ./chemistry   # → chemistry.pdf (one page per slide)
```

Already have a deck? Point straight at the file: `npx @exor404/mdslides ./chemistry.md`.

> **Heads-up:** `npm install @exor404/mdslides` only *installs* the package —
> running the CLI (via `npx`, as above) is what scaffolds and presents. Using
> `npx` also keeps the engine's dependencies in npx's cache instead of bloating
> a project's `node_modules`.

Prefer a global command? `npm i -g @exor404/mdslides` makes `mdslides` available
directly (`mdslides ./chemistry`).

Try the bundled example from a clone:

```bash
npm install
npm run dev        # opens ./example
```

## Install

The package is published on the public npm registry as
[`@exor404/mdslides`](https://www.npmjs.com/package/@exor404/mdslides). Pick the
option that suits you:

**No install (recommended).** `npx` fetches and caches the latest version, then
runs it — nothing is added to your project:

```bash
npx @exor404/mdslides@latest          # prompts for a name, scaffolds + presents
```

**Global install.** Puts an `mdslides` command on your `PATH`:

```bash
npm install -g @exor404/mdslides
mdslides ./chemistry                  # then use it anywhere
mdslides --help                       # (or run with no folder to start fresh)
```

Update later with `npm update -g @exor404/mdslides`; remove with
`npm uninstall -g @exor404/mdslides`.

**As a project dependency.** Add it to a repo so collaborators get the same
version via `npm install`:

```bash
npm install -D @exor404/mdslides
npx mdslides ./chemistry              # resolves from local node_modules
```

> Requires **Node 18+**. Installing the package pulls in its rendering engine
> (Astro, Shiki, KaTeX) — that's why `npx` is the lightest way to try it: those
> dependencies stay in npx's cache instead of your project's `node_modules`.

## The deck model

**One markdown file is the whole deck.** Every `#` (H1) heading starts a new
slide — write plain markdown in between. A standalone `---` line is an
explicit break (for a slide with no heading, or to split one section).

```markdown
# Presentation title
## A subtitle
**Your Name** · {{date}}

# Second slide
- a point
- another (bullets reveal one at a time)
```

### Title slide

The **first slide is the title slide** automatically: the `#` renders large,
`##` is the subtitle, and the last line becomes a byline pinned to the bottom —
write your presenter name(s) in markdown there. The `{{date}}` token resolves to
today's date. Opt a slide out with `<!-- slide: plain -->`, or mark another
slide as a title with `<!-- slide: title -->`.

## Supported markdown (the lean subset)

Only what slides actually need:

- Headings, paragraphs, **bold**, *italic*, ~~strike~~, ==highlight==
- Lists (reveal one item at a time — see [Reveal & motion](#reveal--motion)), tables, blockquotes
- `inline code` and fenced code blocks (syntax-highlighted via [Shiki](https://shiki.style))
- Math — `$inline$` and `$$block$$` via KaTeX
- Images (relative paths resolve from the deck folder)

Fence a block with a language for syntax highlighting:

````markdown
```js
export default { theme: 'angular' };
```
````

## Presenting

| Key | Action |
| --- | --- |
| `→` `space` `PageDn` | next slide / reveal next fragment |
| `←` `PageUp` | previous |
| `Home` / `End` | first / last slide |
| `O` | overview grid (click a slide to jump) |
| `F` | fullscreen |
| `.` | black screen |
| `?` | help |

The URL hash tracks the current slide (`#/3`) so deep links work.

### Reveal & motion

Slides build themselves as you talk:

- **Content fades in** when a slide opens — headings, paragraphs, images, code,
  tables and quotes rise into place with a light stagger.
- **Lists reveal step by step.** Every list item is hidden when the slide opens
  and appears one at a time on `→` / `space`; `←` steps back. Once all items
  are shown, the next press advances to the following slide. This is automatic —
  you don't need to mark anything.
- **Manual fragments.** Append `{.fragment}` to any other line (a paragraph,
  a heading) to hold it back and reveal it on a later press, in document order
  alongside the list items.

In the **overview grid** and **PDF export**, everything is shown at once. Motion
respects the OS "reduce motion" setting.

### Per-slide directives

A leading comment configures one slide:

```markdown
# A slide
<!-- slide: center bg=#1a0b2e -->
```

- `center` — vertically + horizontally centered
- `bg=<color|url(...)>` — slide background

## Configuration

First run drops a `mdslides.config.js` next to your deck:

```js
export default {
  brand: { text: 'mdslides' },   // bottom-left wordmark; '' to hide
  theme: 'angular',              // built-in: 'angular'
  transition: 'fade',            // 'fade' | 'slide' | 'none'
};
```

## PDF export

`mdslides export` renders the `/print` route (one slide per page, all
fragments shown). It uses [Playwright](https://playwright.dev) if installed
(`npm i -D playwright && npx playwright install chromium`); otherwise open
`/print` in a browser and use **Save as PDF**.

## Requirements

Node 18+.

## Contributing & docs

Maintainer and technical docs live in [`docs/`](docs):

- [Releasing & publishing](docs/releasing.md) — the npm publish pipeline, the
  `NPM_TOKEN` secret, and how to cut a release.

## License

MIT

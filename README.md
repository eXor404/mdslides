# mdslides

> Markdown in, presentation out.

The slides sibling of [mdstack](https://github.com/eXor404/mdstack). Point it
at a folder — `mdslides` scaffolds a starter `slides.md`, then presents it in a
dev server or builds a self-contained `dist/` you can host anywhere static.

> **Status:** pre-1.0, provisional. CLI flags and markdown conventions may
> change before `0.x → 1.0`.

## Quick start

```bash
mdslides ./chemistry          # scaffolds a project, then presents it
```

Point `mdslides` at a folder and it scaffolds a project: it **asks for a
name**, writes `<name>.md` (e.g. `chemistry.md`) with three sample slides — a
title page, a list, and a help slide — plus a `mdslides.config.js`, then opens
the dev server. The name defaults to the folder, so pressing Enter at
`Name your presentation (chemistry):` gives you `chemistry/chemistry.md`. That
file *is* your deck — edit it and the slides live-reload.

```bash
mdslides ./chemistry          # present (dev server, live-reload)
mdslides build ./chemistry    # static build → ./chemistry/dist/
mdslides preview ./chemistry  # serve the built dist/
mdslides export ./chemistry   # → chemistry.pdf (one page per slide)
```

Already have a deck? Point straight at the file: `mdslides ./chemistry.md`.

Try the bundled example:

```bash
npm install
npm run dev        # opens ./example
```

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

## Releasing

Releases are automated by a tag-triggered GitHub Actions pipeline
([`.github/workflows/package-publish.yml`](.github/workflows/package-publish.yml)) —
the same model as mdstack's release workflow. Pushing a `v*` tag builds and
publishes the package to **GitHub Packages** (GitHub's npm registry) using the
built-in `GITHUB_TOKEN`, so there's no secret to configure.

To cut a release:

```bash
npm version patch          # bumps package.json (0.1.0 → 0.1.1) and commits
git push origin main       # push the version-bump commit
git push origin v0.1.1     # push the tag → the pipeline publishes
```

`npm version` creates the matching `vX.Y.Z` tag for you. The workflow refuses
to publish if the tag and `package.json` version disagree, so they can't drift.

> **Installing a published version.** GitHub Packages is private to the scope's
> registry, so consumers add one line to their `.npmrc`:
> ```
> @exor404:registry=https://npm.pkg.github.com
> ```
> and authenticate with a GitHub token that has `read:packages`. Then
> `npm i @exor404/mdslides` resolves from GitHub Packages.

## Requirements

Node 18+.

## License

MIT

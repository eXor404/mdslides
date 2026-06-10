# mdslides

> Drop a single markdown file, get a slide deck.

The slides sibling of [mdstack](https://github.com/eXor404/mdstack). Point it
at one `.md` file and `mdslides` either presents it in a dev server or builds a
self-contained `dist/` you can host anywhere static.

> **Status:** pre-1.0, provisional. CLI flags and markdown conventions may
> change before `0.x → 1.0`.

## Quick start

```bash
mdslides ./slides.md          # present (dev server, live-reload)
mdslides build ./slides.md    # static build → ./dist/
mdslides preview ./slides.md  # serve the built dist/
mdslides export ./slides.md   # → slides.pdf (one page per slide)
```

Try the example:

```bash
npm install
npm run dev        # opens example/slides.md
```

## The deck model

**One `.md` file is the whole deck.** Every `#` (H1) heading starts a new
slide — write plain markdown in between. A standalone `---` line is an
explicit break (for a slide with no heading, or to split one section).

```markdown
# Title slide
A one-line hook.

# Second slide
- a point
- another {.fragment}
```

## Supported markdown (the lean subset)

Only what slides actually need:

- Headings, paragraphs, **bold**, *italic*, ~~strike~~, ==highlight==
- Lists, tables, blockquotes
- `inline code` and fenced code blocks (with a copy button)
- Math — `$inline$` and `$$block$$` via KaTeX
- Images (relative paths resolve from the deck folder)

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

### Fragments

Append `{.fragment}` to any line to reveal it on a later press.

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

## License

MIT

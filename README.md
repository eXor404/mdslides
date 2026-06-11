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

Releases go to the **public npm registry** (npmjs.com), so anyone can
`npx @exor404/mdslides`. A tag-triggered GitHub Actions pipeline
([`.github/workflows/package-publish.yml`](.github/workflows/package-publish.yml))
does the publishing for you: it runs **only when you push a `v*` tag**, verifies
the tag matches `package.json`, and runs `npm publish` against npmjs.com using an
automation token stored as the `NPM_TOKEN` repository secret.

### How the pipeline works

```
push tag v0.1.3 ──► GitHub Actions ──► checkout ──► setup Node 22
                                          │
                                          ├─ guard: tag (v0.1.3) must equal
                                          │   package.json "version" (0.1.3),
                                          │   else the run fails
                                          │
                                          └─ npm publish  (auth: NPM_TOKEN)
                                                  └──► npmjs.com
```

The version guard means the git tag and the published version can never drift —
if they disagree, the run stops before publishing.

### One-time setup

You only do this once. It wires an npm token into the repo so Actions can publish
on your behalf.

1. **Create an npm automation token.** On npmjs.com: avatar → **Access Tokens** →
   **Generate New Token** → **Automation** (or a **Granular** token scoped to the
   `@exor404/mdslides` package with **Read and write**). Copy the value — npm
   shows it only once.
2. **Add it to GitHub as a secret.** Repo → **Settings** → **Secrets and
   variables** → **Actions** → **New repository secret**. Name it exactly
   `NPM_TOKEN`, paste the token, **Add secret**. (It's a *secret*, not a
   *variable* — secrets are encrypted and hidden from logs.)

> The very first version must exist on npm before automation can update it.
> If the package isn't published yet, do one manual publish first:
> `npm login && npm publish --access public`.

### Cutting a release

Once the secret is in place, every release is three commands:

```bash
npm version patch          # bumps package.json (0.1.2 → 0.1.3) and commits + tags v0.1.3
git push origin main       # push the version-bump commit
git push origin v0.1.3     # push the tag → the pipeline publishes
```

`npm version patch` (or `minor` / `major`) bumps `package.json`, makes the commit,
and creates the matching `vX.Y.Z` tag in one step. Pushing that tag is what
triggers the workflow. Watch it run under the repo's **Actions** tab; when it goes
green the new version is live on npm.

**Prefer to bump by hand?** Edit `"version"` in `package.json`, then:

```bash
git commit -am "🔖 Release 0.1.3"
git tag v0.1.3             # must match package.json exactly, or the guard fails
git push && git push --tags
```

## Requirements

Node 18+.

## License

MIT

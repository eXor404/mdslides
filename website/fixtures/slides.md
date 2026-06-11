# mdslides

## Markdown in, presentation out.

**A deck that explains itself** · {{date}}

# One file is the deck

<!-- slide: center -->

No slide objects. No drag handles. No `.pptx`.

Just **one markdown file** — every `#` heading starts a new slide.

You're reading slide two of the file that drew it. {.fragment}

# Write a slide

Type markdown. Get a slide.

```markdown
# Second slide
## with a subtitle

- a point
- another point
- ==the one that matters==
```

That block on the left? It renders as the slide on the right — live, as you save. {.fragment}

# Bullets reveal themselves

Lists build **one press at a time** — no markup needed:

- Open the slide and the heading fades in
- Press `→` and this appears
- Press again for the next idea
- `←` steps back through them

Then add a held line with `{.fragment}`. {.fragment}

# The lean subset

Only what slides actually need:

- **bold**, *italic*, ~~strikethrough~~, ==highlight==
- lists, tables, blockquotes, images
- `inline code` and fenced blocks
- math, server-rendered

| Key | Does |
| --- | --- |
| `→` `space` | next |
| `O` | overview |
| `F` | fullscreen |

# Code, properly lit

<!-- slide: bg=#0a0a12 -->

Fenced blocks are tokenized by **Shiki** — the same engine VS Code uses:

```js
export default {
  brand: { text: 'mdslides' },
  theme: 'angular',
  transition: 'fade',
};
```

Drop a language after the fence and it just lights up. {.fragment}

# Math that renders

Inline like $e^{i\pi} + 1 = 0$, or a centered block:

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

KaTeX renders it server-side — **no MathJax flash**, fonts auto-bundled.

# Present like you mean it

<!-- slide: center -->

| Key | Action |
| --- | --- |
| `→` `space` `PageDn` | next slide / reveal |
| `←` `PageUp` | back |
| `O` | overview grid — jump anywhere |
| `F` | fullscreen |
| `.` | black the screen |
| `?` | help |

The URL hash tracks your slide, so `#/3` deep-links straight here.

# Then ship it

Three ways out, same one file:

```bash
mdslides ./slides.md          # present (live-reload dev server)
mdslides build ./slides.md    # self-contained dist/ → host anywhere
mdslides export ./slides.md   # slides.pdf, one page per slide
```

Static HTML or PDF — no runtime, no account, no lock-in. {.fragment}

# Your turn

<!-- slide: center bg=#140a1e -->

### `npx @exor404/mdslides`

It asks for a name, scaffolds a starter deck, and opens it.

**The next slide you make starts with `#`.**

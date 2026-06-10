# mdslides

### Drop one markdown file. Get a slide deck.

A zero-config presentation CLI — the slides sibling of **mdstack**.

<!-- slide: center -->

# How it works

One `.md` file is the whole deck.

- Every `#` heading starts a **new slide**
- Write plain markdown in between
- `mdslides ./slides.md` and you're presenting

# Navigation

Drive the deck from the keyboard:

| Key | Action |
| --- | --- |
| `→` `space` | next slide / fragment |
| `←` | previous |
| `O` | overview grid |
| `F` | fullscreen |
| `.` | black screen |

# Fragments

Reveal points one press at a time:

- First this shows {.fragment}
- ==then this== {.fragment}
- and finally **this** {.fragment}

Add `{.fragment}` to any line.

# The lean subset

Only the things slides actually need:

- **bold**, *italic*, ~~strike~~, ==highlight==
- lists, tables, blockquotes
- `inline code` and fenced blocks
- images

```js
export default {
  brand: { text: 'mdslides' },
  theme: 'angular',
};
```

# Math

Inline like $a^2 + b^2 = c^2$, or a centered block:

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

# Images

![A sample slide graphic](./images/sample.svg)

Relative paths resolve from the deck folder.

# Per-slide layout

<!-- slide: center -->

This slide is **centered** with `<!-- slide: center -->`.

You can also set a background: `<!-- slide: bg=#1a0b2e -->`.

# Export

Build a self-contained site, or export to PDF:

```bash
mdslides ./slides.md          # present (dev server)
mdslides build ./slides.md    # static dist/
mdslides export ./slides.md   # slides.pdf (one page per slide)
```

# Thanks

<!-- slide: center -->

### Now edit `example/slides.md` and watch it reload.

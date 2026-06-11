import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import remarkHighlight from '../../integrations/remark-highlight.js';
import rehypeShiki from '../../integrations/rehype-shiki.js';

const DEFAULT_CONFIG = {
  brand: { text: 'mdslides' },
  theme: 'angular',
  transition: 'fade',
};

export async function loadDeckConfig() {
  const source = process.env.MD_SOURCE;
  if (!source) return DEFAULT_CONFIG;
  const cfgPath = resolve(source, 'mdslides.config.js');
  if (!existsSync(cfgPath)) return DEFAULT_CONFIG;
  try {
    const mod = await import(pathToFileURL(cfgPath).href);
    const user = mod.default ?? {};
    return {
      ...DEFAULT_CONFIG,
      ...user,
      brand: { ...DEFAULT_CONFIG.brand, ...(user.brand ?? {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

// Rewrite relative image URLs to absolute-from-source-root, so they resolve
// through the asset middleware / build copy. The deck file sits at the source
// root, so a relative URL resolves against `source`.
function remarkImagePaths() {
  const source = process.env.MD_SOURCE;
  const ABSOLUTE_OR_PROTOCOL = /^(?:[a-z][a-z0-9+\-.]*:|\/\/|\/|#|data:)/i;
  const rewrite = (url) => {
    if (!url || ABSOLUTE_OR_PROTOCOL.test(url)) return url;
    const cleaned = url.replace(/[?#].*$/, '');
    const trailing = url.slice(cleaned.length);
    const abs = resolve(source, cleaned);
    const withSep = source.endsWith(sep) ? source : source + sep;
    if (abs !== source && !abs.startsWith(withSep)) return url;
    return '/' + relative(source, abs).split(sep).join('/') + trailing;
  };
  const visit = (node) => {
    if (node.type === 'image') node.url = rewrite(node.url);
    if (Array.isArray(node.children)) node.children.forEach(visit);
  };
  return (tree) => visit(tree);
}

// `Text {.fragment}` → add class `fragment` to the containing element and
// strip the marker. Fragments reveal one step at a time during the talk.
function rehypeFragments() {
  const walk = (node, parent) => {
    if (node.type === 'text' && node.value.includes('{.fragment}')) {
      node.value = node.value.replace(/\s*\{\.fragment\}/g, '');
      if (parent && parent.type === 'element') {
        const props = (parent.properties ||= {});
        const cls = props.className;
        props.className = Array.isArray(cls) ? [...cls, 'fragment'] : cls ? [cls, 'fragment'] : ['fragment'];
      }
    }
    if (Array.isArray(node.children)) node.children.forEach((c) => walk(c, node));
  };
  return (tree) => walk(tree, null);
}

// Every list item is a fragment by default: lists start hidden when the slide
// opens and reveal one bullet at a time on Space / →, reusing the same
// `.fragment` machinery as manual `{.fragment}` markers.
function addClass(node, name) {
  const props = (node.properties ||= {});
  const cls = props.className;
  if (Array.isArray(cls)) { if (!cls.includes(name)) cls.push(name); }
  else if (cls) { if (cls !== name) props.className = [cls, name]; }
  else props.className = [name];
}
function rehypeListFragments() {
  const walk = (node) => {
    if (node.type === 'element' && node.tagName === 'li') addClass(node, 'fragment');
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };
  return (tree) => walk(tree);
}

// Content-slide layout: pull the heading into a fixed top-left header, then
// split the body into a left column (prose / bullets) and a right column
// (media — images, fenced code, tables, block math). Only runs when the
// vfile is tagged `slideLayout: 'content'` (title / centered slides skip it).
function hasClass(node, name) {
  const c = node.properties?.className;
  if (Array.isArray(c)) return c.includes(name);
  if (typeof c === 'string') return c.split(/\s+/).includes(name);
  return false;
}
function realChildren(node) {
  return (node.children ?? []).filter((k) => !(k.type === 'text' && !k.value.trim()));
}
function isMedia(node) {
  if (node.type !== 'element') return false;
  const t = node.tagName;
  if (t === 'img' || t === 'pre' || t === 'table' || t === 'figure') return true;
  if (hasClass(node, 'math-display') || hasClass(node, 'katex-display')) return true;
  // A paragraph whose sole content is an image or a block of display math.
  if (t === 'p') {
    const kids = realChildren(node);
    if (kids.length === 1 && kids[0].type === 'element') {
      const k = kids[0];
      if (k.tagName === 'img') return true;
      if (hasClass(k, 'math-display') || hasClass(k, 'katex-display')) return true;
    }
  }
  return false;
}
function el(tagName, className, children) {
  return { type: 'element', tagName, properties: { className }, children };
}
function rehypeSlideLayout() {
  return (tree, file) => {
    if (file?.data?.slideLayout !== 'content') return;
    const kids = realChildren(tree);

    let head = null;
    const rest = [];
    for (const n of kids) {
      if (!head && n.type === 'element' && /^h[1-6]$/.test(n.tagName)) head = n;
      else rest.push(n);
    }

    const left = [];
    const right = [];
    for (const n of rest) (isMedia(n) ? right : left).push(n);

    const hasLeft = left.length > 0;
    const hasRight = right.length > 0;
    const variant = hasLeft && hasRight ? 'has-media' : hasRight ? 'media-only' : 'no-media';

    const cols = [];
    if (hasLeft || !hasRight) cols.push(el('div', ['col-left'], left));
    if (hasRight) cols.push(el('div', ['col-right'], right));
    const body = el('div', ['slide-body', variant], cols);

    tree.children = head ? [el('header', ['slide-head'], [head]), body] : [body];
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkHighlight)
  .use(remarkImagePaths)
  .use(remarkRehype)
  .use(rehypeKatex)
  .use(rehypeShiki)
  .use(rehypeFragments)
  .use(rehypeListFragments)
  .use(rehypeSlideLayout)
  .use(rehypeStringify);

async function renderMarkdown(md, layout) {
  const file = await processor.process({ value: md, data: { slideLayout: layout } });
  return String(file);
}

// Per-slide directive: `<!-- slide: center bg=#0d0d0d -->`.
// Supported tokens: `title`, `plain`, `center`, `bg=<color|url(...)>`,
// `class=<name>`.
function extractDirectives(chunk) {
  const directives = { center: false, bg: null, classes: [], title: false, plain: false };
  const stripped = chunk.replace(/<!--\s*slide:([^>]*?)-->\s*/i, (_m, body) => {
    for (const tok of body.trim().split(/\s+/)) {
      if (!tok) continue;
      if (tok === 'center') directives.center = true;
      else if (tok === 'title') directives.title = true;
      else if (tok === 'plain') directives.plain = true;
      else if (tok.startsWith('bg=')) directives.bg = tok.slice(3);
      else if (tok.startsWith('class=')) directives.classes.push(tok.slice(6));
    }
    return '';
  });
  return { directives, body: stripped };
}

// Today's date, e.g. "June 10, 2026". Computed per run (dev reloads pick up
// the current day; a static build freezes it at build time).
function todayLong() {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Split the deck into slides. A new slide starts at every `#` (H1) heading.
// A standalone `---` line is also an explicit break (escape hatch for a
// title slide with no heading, or splitting one section across slides).
function splitSlides(src) {
  // Drop a leading YAML frontmatter block, if any.
  let text = src.replace(/^﻿/, '');
  text = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

  const lines = text.split(/\r?\n/);
  const chunks = [];
  let current = [];
  let inFence = false;

  const flush = () => {
    const joined = current.join('\n').trim();
    if (joined) chunks.push(joined);
    current = [];
  };

  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    const isH1 = !inFence && /^#\s+/.test(line);
    const isBreak = !inFence && /^---\s*$/.test(line);
    if (isH1 && current.some((l) => l.trim())) {
      flush();
    } else if (isBreak) {
      flush();
      continue; // the rule itself is not content
    }
    current.push(line);
  }
  flush();
  return chunks;
}

export async function loadSlides() {
  const deckFile = process.env.MD_FILE;
  if (!deckFile) {
    throw new Error('MD_FILE not set — run mdslides via the CLI (e.g. `npx mdslides ./slides.md`).');
  }
  const src = readFileSync(deckFile, 'utf8');
  const today = todayLong();
  const chunks = splitSlides(src);

  const slides = [];
  for (let i = 0; i < chunks.length; i++) {
    const { directives, body } = extractDirectives(chunks[i]);
    // `{{date}}` → today's date (any slide).
    const withDate = body.replace(/\{\{\s*date\s*\}\}/g, today);
    // The first slide is the presentation title slide by default; opt out
    // with `<!-- slide: plain -->`, or force elsewhere with `title`.
    const isTitle = directives.title || (i === 0 && !directives.plain);
    // Everything that isn't a title or an explicitly centered slide gets the
    // structured content layout (top-left title + text-left / media-right).
    const isContent = !isTitle && !directives.center;
    const html = await renderMarkdown(withDate, isContent ? 'content' : 'plain');
    slides.push({ html, ...directives, title: isTitle, content: isContent });
  }
  return slides;
}

// Deck title = text of the first H1, else the filename.
export function deckTitle(slides) {
  for (const s of slides) {
    const m = s.html.match(/<h1[^>]*>(.*?)<\/h1>/is);
    if (m) return m[1].replace(/<[^>]+>/g, '').trim();
  }
  return 'mdslides';
}

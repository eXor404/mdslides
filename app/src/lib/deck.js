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

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkHighlight)
  .use(remarkImagePaths)
  .use(remarkRehype)
  .use(rehypeKatex)
  .use(rehypeFragments)
  .use(rehypeStringify);

async function renderMarkdown(md) {
  const file = await processor.process(md);
  return String(file);
}

// Per-slide directive: `<!-- slide: center bg=#0d0d0d -->`.
// Supported tokens: `center`, `bg=<color|url(...)>`, `class=<name>`.
function extractDirectives(chunk) {
  const directives = { center: false, bg: null, classes: [] };
  const stripped = chunk.replace(/<!--\s*slide:([^>]*?)-->\s*/i, (_m, body) => {
    for (const tok of body.trim().split(/\s+/)) {
      if (!tok) continue;
      if (tok === 'center') directives.center = true;
      else if (tok.startsWith('bg=')) directives.bg = tok.slice(3);
      else if (tok.startsWith('class=')) directives.classes.push(tok.slice(6));
    }
    return '';
  });
  return { directives, body: stripped };
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
  const chunks = splitSlides(src);

  const slides = [];
  for (const chunk of chunks) {
    const { directives, body } = extractDirectives(chunk);
    const html = await renderMarkdown(body);
    slides.push({ html, ...directives });
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

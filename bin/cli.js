#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, isAbsolute, relative, basename, extname } from 'node:path';
import { existsSync, statSync, writeFileSync, readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { findChrome, printUrlToPdf } from '../app/integrations/pdf-export.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_ROOT = resolve(__dirname, '..', 'app');

const VALID_COMMANDS = new Set(['dev', 'build', 'preview', 'export']);
const VALID_THEMES = new Set(['angular']);
const DEFAULT_THEME = 'angular';
const CONFIG_FILENAME = 'mdslides.config.js';

const DEFAULT_CONFIG = `// mdslides deck config — edit to customize the look of your deck.
// Re-run mdslides after saving to apply changes.

export default {
  brand: {
    // Wordmark shown in the bottom-left corner. Set to '' to hide.
    text: 'mdslides',
  },

  // Theme. Built-in: 'angular' (default).
  theme: 'angular',

  // Slide transition: 'fade' | 'slide' | 'none'.
  transition: 'fade',
};
`;

function fail(msg) {
  console.error(`mdslides: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let cmd = 'dev';
  let theme = null;
  let file;

  if (args[0] && VALID_COMMANDS.has(args[0])) {
    cmd = args.shift();
  }

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--theme' || a === '-t') {
      theme = args[++i];
      if (!theme) fail('--theme requires a value');
    } else if (a.startsWith('--theme=')) {
      theme = a.slice('--theme='.length);
    } else if (!file) {
      file = a;
    } else {
      fail(`Unexpected argument: ${a}`);
    }
  }

  if (!file) {
    fail('Missing target.\nUsage: mdslides [dev|build|preview|export] [--theme <name>] <folder|file.md>');
  }

  return { cmd, theme, file };
}

// The primary model: point at a folder. mdslides looks for an existing deck
// (slides.md / index.md / any .md), and otherwise scaffolds a new project —
// asking for a name and dropping a `<name>.md` starter (3 sample slides) you
// then edit. A direct path to a .md file is also accepted (scaffolded as-is).
async function resolveDeck(input) {
  let abs = isAbsolute(input) ? input : resolve(process.cwd(), input);

  if (existsSync(abs) && statSync(abs).isDirectory()) {
    abs = findDeckInDir(abs) ?? (await scaffoldProject(abs));
  } else if (!existsSync(abs)) {
    // A non-existent path: a `.md` file gets scaffolded under that exact name;
    // anything else is treated as a new project folder to create a deck in.
    abs = extname(abs).toLowerCase() === '.md'
      ? scaffoldDeck(abs)
      : await scaffoldProject(abs);
  }

  if (!existsSync(abs) || !statSync(abs).isFile()) {
    fail(`Deck not found: ${abs}`);
  }
  return abs;
}

// Find an existing deck in a folder: prefer slides.md / index.md, then fall
// back to the first .md file present (so a `chemistry.md` is picked up too).
function findDeckInDir(dir) {
  for (const name of ['slides.md', 'index.md']) {
    const p = resolve(dir, name);
    if (existsSync(p)) return p;
  }
  const md = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.md')).sort();
  return md.length ? resolve(dir, md[0]) : null;
}

// Turn a free-text presentation name into a safe filename stem.
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Ask a question on the terminal, returning the trimmed answer (or `def` if
// there's no answer / no interactive TTY, e.g. when run in CI).
function ask(question, def) {
  if (!process.stdin.isTTY) return Promise.resolve(def);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => {
    let done = false;
    const finish = (val) => { if (!done) { done = true; rl.close(); res(val); } };
    rl.question(question, (ans) => finish(ans.trim() || def));
    // EOF (piped/closed stdin) → fall back to the default instead of hanging.
    rl.on('close', () => finish(def));
  });
}

// Scaffold a new project inside `dir`: prompt for a presentation name and
// write `<name>.md` with the starter deck. The folder's own name is the
// default, so `mdslides ./chemistry` + Enter → chemistry/chemistry.md.
async function scaffoldProject(dir) {
  const fallback = slugify(basename(dir)) || 'slides';
  const answer = await ask(`Name your presentation (${fallback}): `, fallback);
  const stem = slugify(answer.replace(/\.md$/i, '')) || fallback;
  return scaffoldDeck(resolve(dir, `${stem}.md`));
}

function scaffoldDeck(deckPath) {
  const templatePath = resolve(__dirname, 'templates', 'slides.md');
  try {
    mkdirSync(dirname(deckPath), { recursive: true });
    const content = readFileSync(templatePath, 'utf8');
    writeFileSync(deckPath, content, 'utf8');
    const rel = relative(process.cwd(), deckPath) || deckPath;
    console.log(`mdslides: created ${rel} (3 sample slides) — edit it and the deck live-reloads`);
    return deckPath;
  } catch (err) {
    fail(`couldn't create a starter deck: ${err.message}`);
  }
}

function ensureDefaultConfig(source) {
  const configPath = resolve(source, CONFIG_FILENAME);
  if (existsSync(configPath)) return;
  try {
    writeFileSync(configPath, DEFAULT_CONFIG, 'utf8');
    const rel = relative(process.cwd(), configPath) || configPath;
    console.log(`mdslides: created ${rel} with defaults — edit it to customize`);
  } catch (err) {
    console.warn(`mdslides: couldn't write default config: ${err.message}`);
  }
}

async function loadUserConfig(source) {
  const configPath = resolve(source, CONFIG_FILENAME);
  if (!existsSync(configPath)) return {};
  try {
    const mod = await import(pathToFileURL(configPath).href);
    return mod.default ?? {};
  } catch (err) {
    console.warn(`mdslides: couldn't load ${CONFIG_FILENAME}: ${err.message}`);
    return {};
  }
}

const { cmd, theme: cliTheme, file } = parseArgs(process.argv);
const deckFile = await resolveDeck(file);
const source = dirname(deckFile);

ensureDefaultConfig(source);
const userConfig = await loadUserConfig(source);

const theme = cliTheme || userConfig.theme || DEFAULT_THEME;
if (!VALID_THEMES.has(theme)) fail(`Unknown theme: ${theme}. Available: ${[...VALID_THEMES].join(', ')}`);

process.env.MD_SOURCE = source;
process.env.MD_FILE = deckFile;
process.env.MD_THEME = theme;

const astro = await import('astro');
const outDir = resolve(source, 'dist');

try {
  if (cmd === 'dev') {
    await astro.dev({ root: APP_ROOT });
  } else if (cmd === 'build') {
    await astro.build({ root: APP_ROOT, outDir });
    console.log(`\nmdslides: built to ${outDir}`);
  } else if (cmd === 'preview') {
    await astro.preview({ root: APP_ROOT, outDir });
  } else if (cmd === 'export') {
    await astro.build({ root: APP_ROOT, outDir });
    await exportPdf({ outDir, deckFile });
    process.exit(0);
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}

// PDF export: serve the built deck on a throwaway local server and print the
// /print route (one slide per page) to PDF with headless Chrome. Falls back to
// Playwright if present, then to manual instructions.
async function exportPdf({ outDir, deckFile }) {
  const pdfPath = resolve(source, basename(deckFile).replace(/\.md$/i, '') + '.pdf');
  const printHtml = resolve(outDir, 'print', 'index.html');
  if (!existsSync(printHtml)) fail('print route was not built — cannot export.');

  const chrome = findChrome();
  const hasPlaywright = await canImport('playwright');

  if (!chrome && !hasPlaywright) {
    console.log(
      '\nmdslides: no headless browser found — skipping automatic PDF.\n' +
      '  Option A: install Google Chrome (or set CHROME_PATH to a Chromium binary), then re-run export.\n' +
      '  Option B: npm i -D playwright && npx playwright install chromium, then re-run export.\n' +
      `  Option C: npx mdslides preview ${relative(process.cwd(), deckFile)}, open /print, and use the browser's "Save as PDF".`
    );
    return;
  }

  // Throwaway preview server on a random free port so /_astro, /images, and
  // KaTeX fonts resolve over http (file:// would break absolute asset paths).
  const server = await astro.preview({
    root: APP_ROOT,
    outDir,
    logLevel: 'error',
    server: { host: 'localhost', port: 0 },
  });
  const port = server.port ?? 4321;
  const url = `http://localhost:${port}/print/`;

  try {
    if (chrome) {
      await printUrlToPdf(chrome, url, pdfPath);
    } else {
      await playwrightPdf(url, pdfPath);
    }
    console.log(`\nmdslides: exported ${relative(process.cwd(), pdfPath)}`);
  } catch (err) {
    console.error(`\nmdslides: PDF export failed — ${err.message}`);
  } finally {
    // Fire-and-forget: the preview server can keep the event loop alive and
    // its stop() may not settle, so don't await it — the caller's
    // process.exit(0) tears everything down cleanly right after.
    try { server.stop?.(); } catch {}
  }
}

async function canImport(spec) {
  try {
    await import(spec);
    return true;
  } catch {
    return false;
  }
}

async function playwrightPdf(url, pdfPath) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.pdf({ path: pdfPath, width: '1280px', height: '720px', printBackground: true });
  } finally {
    await browser.close();
  }
}

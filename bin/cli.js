#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, isAbsolute, relative, basename, extname } from 'node:path';
import { existsSync, statSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';

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

// The primary model: point at a (usually empty) folder. mdslides looks for
// slides.md / index.md, and scaffolds a starter slides.md if there's none.
// A direct path to a .md file is also accepted.
function resolveDeck(input) {
  let abs = isAbsolute(input) ? input : resolve(process.cwd(), input);

  if (existsSync(abs) && statSync(abs).isDirectory()) {
    const candidates = ['slides.md', 'index.md'];
    const found = candidates.map((c) => resolve(abs, c)).find((p) => existsSync(p));
    abs = found ?? scaffoldDeck(resolve(abs, 'slides.md'));
  } else if (!existsSync(abs)) {
    // A non-existent path: treat as a .md file to create, or a folder to
    // create a deck in if it has no .md extension.
    abs = extname(abs).toLowerCase() === '.md'
      ? scaffoldDeck(abs)
      : scaffoldDeck(resolve(abs, 'slides.md'));
  }

  if (!existsSync(abs) || !statSync(abs).isFile()) {
    fail(`Deck not found: ${abs}`);
  }
  return abs;
}

function scaffoldDeck(deckPath) {
  const templatePath = resolve(__dirname, 'templates', 'slides.md');
  try {
    mkdirSync(dirname(deckPath), { recursive: true });
    const content = readFileSync(templatePath, 'utf8');
    writeFileSync(deckPath, content, 'utf8');
    const rel = relative(process.cwd(), deckPath) || deckPath;
    console.log(`mdslides: created ${rel} — edit the title, subtitle, presenter and date, then it reloads`);
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
const deckFile = resolveDeck(file);
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
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}

// PDF export: render the print route in headless Chromium (Playwright,
// optional). If Playwright isn't installed, fall back to instructions.
async function exportPdf({ outDir, deckFile }) {
  const pdfPath = resolve(source, basename(deckFile).replace(/\.md$/i, '') + '.pdf');
  const printHtml = resolve(outDir, 'print', 'index.html');
  if (!existsSync(printHtml)) fail('print route was not built — cannot export.');

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.log(
      '\nmdslides: Playwright not installed — skipping automatic PDF.\n' +
      '  Option A: npm i -D playwright && npx playwright install chromium, then re-run export.\n' +
      `  Option B: npx mdslides preview ${relative(process.cwd(), deckFile)}, open /print, and use the browser's "Save as PDF".`
    );
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(printHtml).href, { waitUntil: 'networkidle' });
  await page.pdf({
    path: pdfPath,
    width: '1280px',
    height: '720px',
    printBackground: true,
    pageRanges: '',
  });
  await browser.close();
  console.log(`\nmdslides: exported ${relative(process.cwd(), pdfPath)}`);
}

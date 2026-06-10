#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, isAbsolute, relative, basename, extname, join } from 'node:path';
import { existsSync, statSync, writeFileSync, readFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { tmpdir } from 'node:os';

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
      await chromePdf(chrome, url, pdfPath);
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

function whichSync(bin) {
  try {
    return execSync(`command -v ${bin}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch {
    return null;
  }
}

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const found = whichSync(bin);
    if (found) return found;
  }
  return null;
}

function chromePdf(chrome, url, pdfPath) {
  return new Promise((res, rej) => {
    try { if (existsSync(pdfPath)) rmSync(pdfPath); } catch {}
    const profile = mkdtempSync(join(tmpdir(), 'mdslides-'));
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--no-pdf-header-footer',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=5000',
      `--user-data-dir=${profile}`,
      `--print-to-pdf=${pdfPath}`,
      url,
    ];
    const ps = spawn(chrome, args, { stdio: 'ignore' });

    // Recent Chrome (`--headless=new`) does the print-to-pdf but doesn't always
    // exit, so don't rely on the process exiting: wait until the PDF file size
    // settles, then kill Chrome and resolve.
    let done = false;
    let lastSize = -1;
    let stable = 0;
    const finish = (err) => {
      if (done) return;
      done = true;
      clearInterval(poll);
      clearTimeout(timer);
      try { ps.kill('SIGKILL'); } catch {}
      try { rmSync(profile, { recursive: true, force: true }); } catch {}
      err ? rej(err) : res();
    };
    const poll = setInterval(() => {
      if (!existsSync(pdfPath)) return;
      let size = 0;
      try { size = statSync(pdfPath).size; } catch { return; }
      if (size > 0 && size === lastSize) {
        if (++stable >= 3) finish();
      } else {
        stable = 0;
        lastSize = size;
      }
    }, 300);
    const timer = setTimeout(() => finish(new Error('Chrome timed out after 45s')), 45000);

    ps.on('error', finish);
    ps.on('exit', (code) => {
      if (existsSync(pdfPath)) finish();
      else finish(new Error(`Chrome exited with code ${code} without producing a PDF`));
    });
  });
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

// Builds the showcase deck with the local mdslides CLI and stages it as a
// self-contained folder under public/deck-demo/, ready to be embedded in the
// homepage <iframe>. The deck's own keyboard nav, reveal animations and
// overview grid all work inside the frame.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(websiteRoot, '..');
const cliPath = path.join(repoRoot, 'bin', 'cli.js');
const fixtureDir = path.join(websiteRoot, 'fixtures');
const fixtureDistDir = path.join(fixtureDir, 'dist');
const outDir = path.join(websiteRoot, 'public', 'deck-demo');
const BASE = '/deck-demo';

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

// The deck builds with absolute asset paths (/_astro/…, /favicon.svg). Served
// from /deck-demo/ behind the iframe, rewrite them so they resolve correctly.
function rewriteAssetPaths(root) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) { rewriteAssetPaths(p); continue; }
    if (!/\.(html|css|js)$/.test(entry.name)) continue;
    const orig = fs.readFileSync(p, 'utf8');
    let out = orig;
    // CSS url(/_astro/…) → url(/deck-demo/_astro/…)
    out = out.replace(/url\((['"]?)\/(_astro\/[^)'"]+)\1\)/g, (_, q, rest) => `url(${q}${BASE}/${rest}${q})`);
    // attr="/_astro/…" → attr="/deck-demo/_astro/…"
    out = out.replace(/(["'])\/(_astro\/[^"']+)\1/g, (_, q, rest) => `${q}${BASE}/${rest}${q}`);
    // single-file public assets at the root
    out = out.replace(/(["'])\/(favicon\.svg|robots\.txt|sitemap\.xml)\1/g, (_, q, rest) => `${q}${BASE}/${rest}${q}`);
    if (out !== orig) fs.writeFileSync(p, out, 'utf8');
  }
}

async function main() {
  if (!fs.existsSync(cliPath)) {
    console.error(`[deck-demo] cannot find local CLI at ${cliPath}`);
    console.error('[deck-demo] clone the whole mdslides repo, not just website/.');
    process.exit(1);
  }

  rmrf(fixtureDistDir);
  console.log('[deck-demo] building showcase deck…');
  try {
    await execFileP(process.execPath, [cliPath, 'build', fixtureDir], {
      cwd: repoRoot,
      env: { ...process.env, NODE_ENV: 'production' },
      maxBuffer: 1024 * 1024 * 32,
    });
  } catch (err) {
    console.error('[deck-demo] build failed:', err.message);
    console.error(err.stdout?.toString() ?? '');
    console.error(err.stderr?.toString() ?? '');
    process.exit(1);
  }

  rmrf(outDir);
  copyDirSync(fixtureDistDir, outDir);
  rewriteAssetPaths(outDir);
  rmrf(fixtureDistDir);
  console.log(`[deck-demo] wrote ${path.relative(websiteRoot, outDir)}/`);
}

main();

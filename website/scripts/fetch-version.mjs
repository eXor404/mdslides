// Fetch latest @exor404/mdslides version at build time and cache to .cache/version.json.
// Falls back silently — the site reads the cache if present, otherwise uses a hardcoded value.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.resolve(__dirname, '../.cache');
const cachePath = path.join(cacheDir, 'version.json');

const REGISTRY = 'https://registry.npmjs.org/@exor404/mdslides/latest';

async function main() {
  try {
    const res = await fetch(REGISTRY, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`registry responded ${res.status}`);
    const data = await res.json();
    if (typeof data.version !== 'string') throw new Error('no version in payload');
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify({ version: data.version, fetched: new Date().toISOString() }, null, 2));
    console.log(`[fetch-version] cached @exor404/mdslides@${data.version}`);
  } catch (err) {
    console.warn(`[fetch-version] skipped (${err.message}); site will use fallback or existing cache`);
  }
}

main();

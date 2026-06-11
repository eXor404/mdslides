import { promises as fs, mkdtempSync, rmSync } from 'node:fs';
import { resolve, relative, extname, join, dirname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { findChrome, printUrlToPdf } from './pdf-export.js';

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

const EXCLUDED_TOP = new Set(['dist', 'node_modules', '.git', '.astro', '.vscode', '.idea']);
const EXCLUDED_FILES = new Set([
  'mdslides.config.js',
  // Project scaffolding that lives alongside the deck (npm create … layout) —
  // never part of the presentation, so keep it out of the built dist/.
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
]);

function isExcludedRel(rel) {
  if (!rel || rel === '.' || rel === '..') return true;
  if (EXCLUDED_FILES.has(rel)) return true;
  const parts = rel.split(/[\\/]/);
  if (parts[0].startsWith('.')) return true;
  if (EXCLUDED_TOP.has(parts[0])) return true;
  return false;
}

// Copy every non-.md file from the source folder so a built deck is
// self-contained (images, fonts, video…).
async function* walkAssets(root, current = root) {
  let entries;
  try {
    entries = await fs.readdir(current, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(current, entry.name);
    const rel = relative(root, full);
    if (isExcludedRel(rel)) continue;
    if (entry.isDirectory()) {
      yield* walkAssets(root, full);
    } else if (entry.isFile() && extname(entry.name).toLowerCase() !== '.md') {
      yield { full, rel };
    }
  }
}

export default function mdslidesAssets() {
  const source = process.env.MD_SOURCE;
  const deckFile = process.env.MD_FILE;
  if (!source) {
    throw new Error('mdslides: MD_SOURCE env var not set — run via the mdslides CLI.');
  }

  return {
    name: 'mdslides:assets',
    hooks: {
      'astro:server:setup': ({ server }) => {
        // PDF export endpoint: prints the live /print route to PDF with
        // headless Chrome and streams it back as a download. This is the deck
        // PDF button's primary path — browser-independent and pixel-accurate
        // (Safari/Chrome ⌘P can't reliably size or color slide pages).
        server.middlewares.use(async (req, res, next) => {
          const path = (req.url || '').split('?')[0];
          if (path !== '/__export.pdf') return next();
          const chrome = findChrome();
          if (!chrome) {
            res.statusCode = 501;
            res.end('No headless Chrome found. Install Google Chrome or set CHROME_PATH.');
            return;
          }
          const host = req.headers.host || 'localhost';
          const name = deckFile ? basename(deckFile).replace(/\.md$/i, '') : 'slides';
          const dir = mkdtempSync(join(tmpdir(), 'mdslides-pdf-'));
          const pdfPath = join(dir, `${name}.pdf`);
          try {
            await printUrlToPdf(chrome, `http://${host}/print/`, pdfPath);
            const data = await fs.readFile(pdfPath);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${name}.pdf"`);
            res.setHeader('Content-Length', String(data.length));
            res.end(data);
          } catch (err) {
            res.statusCode = 500;
            res.end(`PDF export failed: ${err.message}`);
          } finally {
            try { rmSync(dir, { recursive: true, force: true }); } catch {}
          }
        });

        // Live-reload when the deck markdown changes (it lives outside Astro's
        // own watched tree, so add it explicitly).
        if (deckFile) {
          server.watcher.add(deckFile);
          server.watcher.on('change', (changed) => {
            if (resolve(changed) === resolve(deckFile)) {
              server.ws.send({ type: 'full-reload' });
            }
          });
        }

        // Serve source-folder assets in dev.
        server.middlewares.use(async (req, res, next) => {
          if (!req.url || (req.method && req.method !== 'GET' && req.method !== 'HEAD')) {
            return next();
          }
          let pathname;
          try {
            pathname = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
          } catch {
            return next();
          }
          if (!pathname || pathname === '/' || pathname.endsWith('/')) return next();
          const ext = extname(pathname).toLowerCase();
          if (!ext || ext === '.md') return next();
          if (pathname.startsWith('/@') || pathname.startsWith('/_astro/') || pathname.startsWith('/node_modules/')) {
            return next();
          }

          const rel = pathname.replace(/^\/+/, '');
          if (isExcludedRel(rel)) return next();

          const filePath = resolve(source, rel);
          const sourceWithSep = source.endsWith(sep) ? source : source + sep;
          if (filePath !== source && !filePath.startsWith(sourceWithSep)) return next();

          try {
            const stat = await fs.stat(filePath);
            if (!stat.isFile()) return next();
            res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
            res.setHeader('Content-Length', String(stat.size));
            res.setHeader('Cache-Control', 'no-cache');
            if (req.method === 'HEAD') {
              res.end();
              return;
            }
            res.end(await fs.readFile(filePath));
          } catch {
            return next();
          }
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const log = logger?.info?.bind(logger) ?? console.log;
        let count = 0;
        for await (const { full, rel } of walkAssets(source)) {
          const dest = join(outDir, rel);
          await fs.mkdir(dirname(dest), { recursive: true });
          await fs.copyFile(full, dest);
          count++;
        }
        if (count > 0) log(`copied ${count} asset${count === 1 ? '' : 's'} from source folder`);
      },
    },
  };
}

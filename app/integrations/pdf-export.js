// Shared headless-Chrome PDF helper, used by both the `mdslides export` CLI
// command and the dev server's /__export.pdf endpoint.
import { spawn, execSync } from 'node:child_process';
import { existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function whichSync(bin) {
  try {
    return execSync(`command -v ${bin}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch {
    return null;
  }
}

export function findChrome() {
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

// Print a URL to `pdfPath` with headless Chrome. Recent Chrome
// (`--headless=new`) does the print but doesn't reliably exit, so we wait for
// the PDF's size to settle, then kill the process — robust across versions.
export function printUrlToPdf(chrome, url, pdfPath) {
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
      err ? rej(err) : res(pdfPath);
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

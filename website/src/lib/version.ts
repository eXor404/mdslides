import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cachePath = path.resolve(__dirname, '../../.cache/version.json');

export const FALLBACK_VERSION = '0.1.3';

export function getNpmVersion(): string {
  try {
    if (fs.existsSync(cachePath)) {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (typeof data.version === 'string' && data.version.length > 0) {
        return data.version;
      }
    }
  } catch {
    // fall through
  }
  return FALLBACK_VERSION;
}

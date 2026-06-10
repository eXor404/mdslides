import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import mdslidesAssets from './integrations/mdslides-assets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const theme = process.env.MD_THEME || 'angular';
const themeFile = resolve(__dirname, 'src', 'themes', `${theme}.css`);

export default defineConfig({
  // Markdown is rendered by src/lib/deck.js (a dedicated unified pipeline),
  // not Astro's content layer — so there's no markdown config here.
  integrations: [mdslidesAssets()],
  vite: {
    resolve: {
      alias: {
        '~theme': themeFile,
      },
    },
    server: {
      // mdslides is a local CLI; deps live above APP_ROOT (or hoisted under
      // npx). Disable strict fs serving so KaTeX fonts and source-folder
      // assets resolve regardless of where they're installed.
      fs: { strict: false },
    },
  },
});

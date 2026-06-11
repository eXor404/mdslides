// Syntax-highlight fenced code blocks with Shiki.
//
// We keep the deck's own `<pre><code>` wrapper (so the theme's border, radius,
// padding and dark background still apply) and only swap the code's children
// for Shiki's colored token spans. Spans carry inline `color` styles, so no
// extra theme CSS is needed. Code blocks with no language — or an unknown one —
// are left untouched.
import { codeToHast } from 'shiki';

const THEME = 'github-dark';

function rawText(node) {
  if (node.type === 'text') return node.value;
  if (Array.isArray(node.children)) return node.children.map(rawText).join('');
  return '';
}

function langOf(codeEl) {
  const cls = codeEl.properties?.className;
  const list = Array.isArray(cls) ? cls : cls ? [cls] : [];
  const hit = list.map(String).find((c) => c.startsWith('language-'));
  return hit ? hit.slice('language-'.length) : null;
}

export default function rehypeShiki() {
  // Collect <pre><code> blocks first, then highlight them (async).
  return async (tree) => {
    const blocks = [];
    const visit = (node) => {
      if (
        node.type === 'element' &&
        node.tagName === 'pre' &&
        node.children?.[0]?.type === 'element' &&
        node.children[0].tagName === 'code'
      ) {
        blocks.push(node.children[0]);
        return; // don't descend into code
      }
      if (Array.isArray(node.children)) node.children.forEach(visit);
    };
    visit(tree);

    await Promise.all(
      blocks.map(async (code) => {
        const lang = langOf(code);
        if (!lang) return;
        const source = rawText(code).replace(/\n$/, '');
        try {
          const hast = await codeToHast(source, { lang, theme: THEME });
          const pre = hast.children.find((c) => c.tagName === 'pre');
          const inner = pre?.children.find((c) => c.tagName === 'code');
          if (inner) code.children = inner.children;
        } catch {
          // Unknown language → leave the code block as plain text.
        }
      })
    );
  };
}

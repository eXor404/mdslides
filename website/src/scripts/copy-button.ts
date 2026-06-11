// Copy-to-clipboard for any [data-copy] element. The element's data-copy attribute
// holds the text to copy; if empty, it falls back to the textContent of the element
// referenced by data-copy-target (a CSS selector).

function showCopiedState(button: HTMLElement) {
  button.classList.add('is-copied');
  button.setAttribute('aria-label', 'Copied');
  window.clearTimeout((button as any)._copyTimer);
  (button as any)._copyTimer = window.setTimeout(() => {
    button.classList.remove('is-copied');
    button.setAttribute('aria-label', button.dataset.copyLabel || 'Copy');
  }, 1500);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
    return ok;
  }
}

function getCopyText(button: HTMLElement): string {
  const explicit = button.dataset.copy;
  if (explicit) return explicit;
  const targetSel = button.dataset.copyTarget;
  if (targetSel) {
    const target = document.querySelector(targetSel) as HTMLElement | null;
    if (target) return target.innerText.trim();
  }
  return '';
}

function init() {
  document.querySelectorAll<HTMLElement>('[data-copy], [data-copy-target]').forEach((el) => {
    if ((el as any)._copyBound) return;
    (el as any)._copyBound = true;
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      const text = getCopyText(el);
      if (!text) return;
      const ok = await copyText(text);
      if (ok) showCopiedState(el);
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-init when other scripts inject copyable elements.
document.addEventListener('mdslides:rebind-copy', init);

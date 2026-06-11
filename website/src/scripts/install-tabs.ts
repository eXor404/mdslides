// Wires the install-card tab strip — swaps panels and updates the copy button payload.

function init() {
  document.querySelectorAll<HTMLElement>('[data-install-card]').forEach((card) => {
    if ((card as any)._installBound) return;
    (card as any)._installBound = true;

    const tabs = Array.from(card.querySelectorAll<HTMLButtonElement>('[data-install-tab]'));
    const panels = Array.from(card.querySelectorAll<HTMLElement>('[data-install-panel]'));
    const copyBtn = card.querySelector<HTMLButtonElement>('.copy-btn');

    function activate(id: string) {
      tabs.forEach((t) => {
        const active = t.dataset.installTab === id;
        t.setAttribute('aria-selected', String(active));
        t.tabIndex = active ? 0 : -1;
      });
      panels.forEach((p) => {
        const active = p.dataset.installPanel === id;
        p.hidden = !active;
        if (active && copyBtn) {
          const text = p.innerText.trim();
          copyBtn.dataset.copy = text;
        }
      });
    }

    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        const id = tab.dataset.installTab;
        if (id) activate(id);
      });
      tab.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const next = tabs[(idx + dir + tabs.length) % tabs.length];
        const id = next.dataset.installTab;
        if (id) {
          activate(id);
          next.focus();
        }
      });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

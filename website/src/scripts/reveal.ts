// Fade-in-on-view system. Anything with [data-reveal] starts hidden and
// reveals when it scrolls into view. Anything inside [data-reveal-load]
// reveals immediately on first paint with cascading --reveal-delay.

function init() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

  if (reduced) {
    items.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const loadGroup: HTMLElement[] = [];
  const observed: HTMLElement[] = [];
  items.forEach((el) => {
    if (el.closest('[data-reveal-load]')) loadGroup.push(el);
    else observed.push(el);
  });

  // Reveal items in [data-reveal-load] right after first paint.
  requestAnimationFrame(() => {
    loadGroup.forEach((el) => el.classList.add('is-revealed'));
  });

  if (!('IntersectionObserver' in window)) {
    observed.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-revealed');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  observed.forEach((el) => io.observe(el));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

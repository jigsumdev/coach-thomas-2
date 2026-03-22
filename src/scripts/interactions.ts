'use strict';

/* ── Scroll-reveal via IntersectionObserver ── */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) {
        target.classList.add('visible');
        revealObserver.unobserve(target);
      }
    });
  },
  { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

/* ── Mobile navigation + focus trap ── */
(function () {
  const toggle = document.getElementById('js-menu-toggle') as HTMLButtonElement | null;
  const closeBtn = document.getElementById('js-menu-close') as HTMLButtonElement | null;
  const menu = document.getElementById('mobile-menu') as HTMLElement | null;
  const iconMenu = document.getElementById('js-icon-menu') as SVGElement | null;
  const iconX = document.getElementById('js-icon-close') as SVGElement | null;
  const label = document.getElementById('js-menu-label') as HTMLSpanElement | null;

  if (!toggle || !closeBtn || !menu || !iconMenu || !iconX || !label) return;

  let open = false;
  let onTabTrap: ((e: KeyboardEvent) => void) | undefined;

  function getFocusable(): HTMLElement[] {
    const sel =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(menu!.querySelectorAll(sel)).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.offsetParent !== null,
    );
  }

  function setOpen(state: boolean) {
    open = state;
    toggle!.setAttribute('aria-expanded', String(state));
    menu!.classList.toggle('open', state);
    iconMenu!.classList.toggle('hidden', state);
    iconX!.classList.toggle('hidden', !state);
    const isFr = document.documentElement.lang === 'fr';
    label!.textContent = state ? (isFr ? 'Fermer' : 'Close') : 'Menu';
    document.body.style.overflow = state ? 'hidden' : '';

    if (onTabTrap) {
      document.removeEventListener('keydown', onTabTrap);
      onTabTrap = undefined;
    }

    if (state) {
      closeBtn!.focus();
      onTabTrap = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !open) return;
        const els = getFocusable();
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', onTabTrap);
    } else {
      toggle!.focus();
    }
  }

  toggle.addEventListener('click', () => setOpen(!open));
  closeBtn.addEventListener('click', () => setOpen(false));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && open && setOpen(false));
})();

/* ── CTA spotlight glow ── */
(function () {
  const cta = document.getElementById('js-cta-primary') as HTMLElement | null;
  if (!cta) return;
  const glow = cta.querySelector('.spotlight-glow') as HTMLElement | null;
  if (!glow) return;

  cta.addEventListener('mousemove', (e) => {
    const rect = cta.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    glow.style.setProperty('--mx', `${x}%`);
    glow.style.setProperty('--my', `${y}%`);
    glow.style.setProperty('--mo', '1');
  });

  cta.addEventListener('mouseleave', () => {
    glow.style.setProperty('--mo', '0');
  });
})();

/* ── Signin booking modal ── */
(function () {
  if (!document.getElementById('js-typeform-cta')) return;

  void import('./booking').then(({ initBooking }) => {
    void initBooking();
  });
})();

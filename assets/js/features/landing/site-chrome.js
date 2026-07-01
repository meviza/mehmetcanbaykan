/**
 * site-chrome — Nav scroll efekti, mobile menu, smooth scroll, scroll-spy,
 * WhatsApp floating button, preloader gizleme.
 */
import { $, $$ } from '../../lib/components/index.js';

export function initSiteChrome() {
  // Yıl
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // Nav scroll
  const nav = $('#nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile nav
  const burger = $('#navBurger');
  const links = $('#navLinks');
  if (burger && links) {
    const setOpen = (open) => {
      burger.classList.toggle('is-open', open);
      links.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => setOpen(!burger.classList.contains('is-open')));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    setOpen(false);
  }

  // Smooth scroll
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.pageYOffset - 70;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // Scroll-spy
  initScrollSpy();
}

function initScrollSpy() {
  const links = $$('.nav-links a[href^="#"]');
  if (!links.length || !('IntersectionObserver' in window)) return;
  const sections = links
    .map(l => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = '#' + entry.target.id;
        links.forEach(l => {
          if (l.getAttribute('href') === id) l.setAttribute('aria-current', 'true');
          else l.removeAttribute('aria-current');
        });
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
  sections.forEach(s => obs.observe(s));
}
/**
 * Site geneli UI etkileşimleri:
 * - Yıl güncelleme
 * - Nav scroll efekti
 * - Mobile nav
 * - Smooth scroll
 * - Custom cursor (desktop)
 * - Sayaç animasyonları
 * - Hero parallax
 */

export function initSiteChrome() {
  // Yıl
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

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
    burger.addEventListener('click', () => {
      burger.classList.toggle('is-open');
      links.classList.toggle('is-open');
    });
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        burger.classList.remove('is-open');
        links.classList.remove('is-open');
      });
    });
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

  initCustomCursor();
  initCounters();
  initHeroTilt();
  initMagneticButtons();
  initParallax();
}

function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function $(sel, root = document) { return root.querySelector(sel); }

// Custom cursor
function initCustomCursor() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const cursor = $('#cursor');
  const follower = $('#cursorFollower');
  if (!cursor || !follower) return;

  let mx = 0, my = 0, fx = 0, fy = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
  });
  const tick = () => {
    fx += (mx - fx) * 0.15; fy += (my - fy) * 0.15;
    follower.style.left = fx + 'px'; follower.style.top = fy + 'px';
    requestAnimationFrame(tick);
  };
  tick();

  document.querySelectorAll('a, button, .service, .project, input, select, textarea').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
  });
}

// Sayaç animasyonu
function initCounters() {
  const counters = $$('[data-count]');
  if (!counters.length || !('IntersectionObserver' in window)) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animate(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  const animated = new WeakSet();
  function animate(el) {
    if (animated.has(el)) return;
    animated.add(el);
    const target = parseInt(el.dataset.count, 10) || 0;
    const start = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - start) / 1600);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(target * eased);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    };
    requestAnimationFrame(tick);
  }
  counters.forEach(c => obs.observe(c));
}

// Hero kart 3B tilt
function initHeroTilt() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const card = $('.hero-card-inner');
  const parent = card?.parentElement;
  if (!card || !parent) return;
  parent.addEventListener('mousemove', e => {
    const r = parent.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotate(${y * -4}deg) rotateX(${y * -6}deg) rotateY(${x * 6}deg)`;
  });
  parent.addEventListener('mouseleave', () => { card.style.transform = ''; });
}

// Magnetic butonlar
function initMagneticButtons() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  $$('.btn-primary, .nav-cta').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.2}px, ${(e.clientY - r.top - r.height / 2) * 0.2}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
}

// Hero parallax (desktop)
function initParallax() {
  if (!window.matchMedia('(min-width: 900px)').matches) return;
  const bg = $('.hero-bg');
  const section = $('.hero');
  if (!bg || !section) return;
  section.addEventListener('mousemove', e => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    bg.style.transform = `translate(${x}px, ${y}px)`;
  });
  section.addEventListener('mouseleave', () => { bg.style.transform = ''; });
}

/**
 * Ana sayfa girişi
 */
import { initSiteChrome } from './features/site.js';
import { initProjects } from './features/projects.js';
import { initContactForm } from './features/contact.js';
import { initHero3D } from './features/hero3d.js';
import { initConcepSlider } from './features/concept-slider.js';
import { initFaq } from './features/faq.js';
import { initCookieBar } from './features/cookie-bar.js';
import './lib/db.js'; // Supabase client başlat

function hidePreloader() {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    // En az 1.2s göster ki UI flash olmasın
    const elapsed = performance.now();
    const minDelay = Math.max(0, 1200 - elapsed);
    setTimeout(() => preloader.classList.add('is-done'), 300 + minDelay);
  }
}

async function init() {
  initCookieBar();
  initSiteChrome();
  initContactForm();
  initConcepSlider();
  initFaq();
  await initProjects();

  if (window.AOS) window.AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 });
  hidePreloader();

  // 3D Hero — render-blocking olmasın diye idle'da veya interaction sonrası yükle
  scheduleHero3D();
}

function scheduleHero3D() {
  const hero3d = document.getElementById('hero3d');
  if (!hero3d) return;

  const start = () => {
    loadThree()
      .then(() => initHero3D(hero3d))
      .catch(err => {
        console.warn('Three.js yüklenemedi:', err);
        hero3d.classList.add('hero3d-fallback');
      });
  };

  // Idle'da yükle (LCP için kritik olan metin + slider hemen görünür)
  if ('requestIdleCallback' in window) {
    requestIdleCallback(start, { timeout: 2000 });
  } else {
    setTimeout(start, 200);
  }

  // Kullanıcı scroll ederse veya 3 saniye beklerse zorla yükle
  let started = false;
  const forceStart = () => {
    if (started) return;
    started = true;
    start();
    window.removeEventListener('scroll', forceStart);
    window.removeEventListener('touchstart', forceStart);
  };
  window.addEventListener('scroll', forceStart, { once: true, passive: true });
  window.addEventListener('touchstart', forceStart, { once: true, passive: true });
  setTimeout(forceStart, 3000);
}

let threeLoadPromise = null;
function loadThree() {
  if (window.THREE) return Promise.resolve();
  if (threeLoadPromise) return threeLoadPromise;
  threeLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return threeLoadPromise;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
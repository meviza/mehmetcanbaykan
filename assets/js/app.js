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
    setTimeout(() => preloader.classList.add('is-done'), 300);
  }
}

async function init() {
  initCookieBar();
  initSiteChrome();
  initContactForm();

  // Three.js CDN yüklendikten sonra 3D sahneyi başlat
  if (!window.THREE) {
    await loadScript('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js');
  }
  const hero3d = document.getElementById('hero3d');
  if (hero3d) initHero3D(hero3d);

  initConcepSlider();
  initFaq();
  await initProjects();

  if (window.AOS) window.AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 });
  hidePreloader();
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
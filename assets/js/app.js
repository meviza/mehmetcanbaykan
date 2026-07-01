/**
 * Landing Page — Ana giriş noktası
 * ─────────────────────────────────────────────────────────
 * Yaşam döngüsü:
 *   1) loadTenant()  → tema + SEO uygula
 *   2) mountLanding() → DOM section'ları oluştur
 *   3) initSiteChrome() → nav, mobile menu, smooth scroll
 *   4) mountWhatsAppFloat() → sabit WA butonu
 *   5) initCookieBar() → KVKK bar
 *   6) scheduleHero3D() → idle'da Three.js yükle
 *   7) hidePreloader()
 *   8) Service Worker kayıt (HTTPS)
 * ─────────────────────────────────────────────────────────
 * ES Modules, require() YOK.
 */
import { loadTenant } from './lib/tenant.js';
import { mountLanding } from './features/landing/landing-builder.js';
import { initSiteChrome } from './features/landing/site-chrome.js';
import { mountWhatsAppFloat } from './features/landing/wa-float.js';
import { initCookieBar } from './features/landing/cookie-bar.js';
import { loadThree, scheduleIdleWork } from './lib/three-loader.js';

async function init() {
  // 1) Tenant
  await loadTenant();

  // 2) Section'ları mount et — main container, mount fonksiyonu id bazlı çalışır
  await mountLanding(document.getElementById('main'));

  // 3-5) Chrome + WA + Cookie
  initSiteChrome();
  mountWhatsAppFloat();
  initCookieBar();

  // 6) Hero 3D — idle'da yükle
  scheduleHero3D();

  // 7) Preloader gizle
  hidePreloader();

  // 8) Service Worker — geçici devre dışı (cache sorunu)
  // registerSW();
}

function scheduleHero3D() {
  const container = document.getElementById('hero3d');
  if (!container) return;

  const start = async () => {
    try {
      await loadThree();
      const mod = await import('./features/hero3d.js');
      mod.initHero3D(container);
    } catch (err) {
      console.warn('Three.js yüklenemedi, fallback aktif:', err);
      container.classList.add('hero3d-fallback');
    }
  };

  scheduleIdleWork(start, 2000);

  // İlk scroll/touch sonrası zorla başlat
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

function hidePreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;
  const minDelay = Math.max(0, 1200 - performance.now());
  setTimeout(() => preloader.classList.add('is-done'), 300 + minDelay);
}

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => setInterval(() => reg.update(), 60 * 60 * 1000))
      .catch(err => console.warn('SW kayıt hatası:', err));
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
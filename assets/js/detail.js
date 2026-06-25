/**
 * Proje detay sayfası girişi
 */
import { initSiteChrome } from './features/site.js';
import { initProjectDetail } from './features/project-detail.js';
import './lib/db.js';

function hidePreloader() {
  const p = document.getElementById('preloader');
  if (p) setTimeout(() => p.classList.add('is-done'), 200);
}

async function init() {
  initSiteChrome();
  if (window.AOS) window.AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 });
  await initProjectDetail();
  hidePreloader();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
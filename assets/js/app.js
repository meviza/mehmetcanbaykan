/**
 * Ana sayfa girişi
 */
import { initSiteChrome } from './features/site.js';
import { initProjects } from './features/projects.js';
import { initContactForm } from './features/contact.js';
import './lib/db.js'; // Supabase client başlat

function hidePreloader() {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => preloader.classList.add('is-done'), 300);
  }
}

async function init() {
  initSiteChrome();
  initContactForm();
  await initProjects();
  if (window.AOS) window.AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 });
  hidePreloader();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
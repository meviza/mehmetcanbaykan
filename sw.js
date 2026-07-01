/**
 * Service Worker — Mehmet Can Baykan Mimar
 *
 * Strateji:
 * - HTML, JSON: Network-first (içerik taze kalsın)
 * - CSS, JS, Fonts: Stale-while-revalidate (hızlı, arka planda güncelle)
 * - Görseller: Cache-first (hız için), max 60 gün
 * - Three.js CDN: Cache-first
 *
 * Versiyon değiştirince eski cache silinir.
 */
const VERSION = 'mcb-v1.0.0';
const RUNTIME = `runtime-${VERSION}`;
const STATIC  = `static-${VERSION}`;
const IMAGES  = `images-${VERSION}`;

const PRECACHE = [
  '/',
  '/index.html',
  '/admin.html',
  '/404.html',
  '/manifest.json',
  '/assets/css/tokens.css',
  '/assets/css/base.css',
  '/assets/css/layout.css',
  '/assets/css/components.css',
  '/assets/css/sections.css',
  '/assets/css/pages.css',
  '/assets/css/hero3d.css',
  '/assets/css/concept-slider.css',
  '/assets/css/cookie.css',
  '/assets/css/toast.css',
  '/assets/js/app.js',
  '/assets/js/config.js',
  '/assets/js/features/site.js',
  '/assets/js/features/projects.js',
  '/assets/js/features/contact.js',
  '/assets/js/features/hero3d.js',
  '/assets/js/features/concept-slider.js',
  '/assets/js/features/faq.js',
  '/assets/js/features/cookie-bar.js',
  '/assets/js/lib/ui.js',
  '/assets/js/lib/db.js',
  '/assets/js/lib/repo.js',
  '/assets/js/lib/auth.js',
  '/assets/js/lib/storage.js',
  '/assets/js/lib/forms.js',
  '/assets/js/lib/analytics.js',
  '/assets/images/favicon.svg',
  '/assets/images/og-cover.jpg',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
  'https://unpkg.com/aos@2.3.4/dist/aos.js',
  'https://unpkg.com/aos@2.3.4/dist/aos.css',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC)
      .then(cache => cache.addAll(PRECACHE).catch(() => {
        // Bazı kaynaklar yüklenemezse (network) yine de kurulsun
        return Promise.all(
          PRECACHE.map(url => fetch(url, { mode: 'no-cors' })
            .then(res => cache.put(url, res))
            .catch(() => null))
        );
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== STATIC && k !== RUNTIME && k !== IMAGES)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // GET değilse (POST, PUT) → skip
  if (request.method !== 'GET') return;

  // Supabase API → network-only (auth/DB taze olmalı)
  if (url.hostname.includes('supabase.co')) return;

  // HTML navigation → network-first
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Görseller → cache-first
  if (request.destination === 'image' || /\.(webp|jpg|jpeg|png|gif|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGES, 60 * 24 * 60 * 60));
    return;
  }

  // CSS, JS, Fonts → stale-while-revalidate
  if (['style', 'script', 'font', 'worker'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME));
    return;
  }

  // Diğer → network-first fallback
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(RUNTIME);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return caches.match('/404.html') || caches.match('/');
    }
    return new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request, cacheName, maxAge) {
  const cached = await caches.match(request);
  if (cached) {
    const dateHeader = cached.headers.get('date');
    if (dateHeader) {
      const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
      if (age < maxAge) return cached;
    } else {
      return cached;
    }
  }
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    return cached || new Response('Image offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(fresh => {
    cache.put(request, fresh.clone());
    return fresh;
  }).catch(() => cached);
  return cached || fetchPromise;
}
/**
 * three-loader — lazy load Three.js from CDN.
 * Returns a cached promise; multiple callers get the same instance.
 */
let threePromise = null;

export function loadThree() {
  if (typeof window !== 'undefined' && window.THREE) return Promise.resolve(window.THREE);
  if (threePromise) return threePromise;

  threePromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.THREE);
    s.onerror = () => reject(new Error('Three.js yüklenemedi'));
    document.head.appendChild(s);
  }).catch(err => {
    threePromise = null;
    throw err;
  });

  return threePromise;
}

export function scheduleIdleWork(fn, fallbackMs = 2000) {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(fn, { timeout: fallbackMs });
  } else {
    setTimeout(fn, 200);
  }
}
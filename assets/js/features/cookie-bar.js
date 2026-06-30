/**
 * KVKK / Çerez bildirim barı.
 * LocalStorage 'cookie-ack' v1 → gösterilmez.
 * Kabul/Reddet sonrası 365 gün saklanır.
 */

const STORAGE_KEY = 'mcb-cookie-ack-v1';

export function initCookieBar() {
  if (localStorage.getItem(STORAGE_KEY)) return;

  const bar = document.createElement('div');
  bar.className = 'cookie-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Çerez bildirimi');
  bar.innerHTML = `
    <div class="cookie-inner">
      <div class="cookie-text">
        <strong>Çerez Tercihleri</strong>
        <p>Sitemizde yalnızca deneyiminizi iyileştirmek için zorunlu ve işlevsel çerezler kullanılır. Detaylar için <a href="#gizlilik">Gizlilik Politikası</a>'nı inceleyebilirsiniz.</p>
      </div>
      <div class="cookie-actions">
        <button class="cookie-btn cookie-reject" data-action="reject">Yalnızca Zorunlu</button>
        <button class="cookie-btn cookie-accept" data-action="accept">Kabul Et</button>
      </div>
    </div>
  `;
  document.body.appendChild(bar);
  setTimeout(() => bar.classList.add('is-in'), 600);

  bar.querySelector('[data-action="accept"]').addEventListener('click', () => decide('accept'));
  bar.querySelector('[data-action="reject"]').addEventListener('click', () => decide('reject'));

  function decide(choice) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, ts: Date.now() }));
    bar.classList.remove('is-in');
    bar.classList.add('is-out');
    setTimeout(() => bar.remove(), 400);
  }
}
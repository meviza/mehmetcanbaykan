/**
 * cookie-bar — KVKK / Çerez bildirimi (localStorage).
 * 'mcb-cookie-ack-v1' anahtarı → 365 gün saklanır.
 */
import { el } from '../../lib/components/index.js';

const STORAGE_KEY = 'mcb-cookie-ack-v1';

export function initCookieBar() {
  if (localStorage.getItem(STORAGE_KEY)) return;

  const bar = el('div', { class: 'cookie-bar', role: 'region', 'aria-label': 'Çerez bildirimi' },
    el('div', { class: 'container-fluid cookie-inner' },
      el('div', { class: 'cookie-text' },
        el('strong', {}, 'Çerez Tercihleri'),
        el('p', { html: 'Sitemizde yalnızca deneyiminizi iyileştirmek için zorunlu ve işlevsel çerezler kullanılır. Detaylar için <a href="#gizlilik">Gizlilik Politikası</a>\'nı inceleyebilirsiniz.' })
      ),
      el('div', { class: 'cookie-actions' },
        el('button', { class: 'cookie-btn cookie-reject', dataset: { action: 'reject' } }, 'Yalnızca Zorunlu'),
        el('button', { class: 'cookie-btn cookie-accept', dataset: { action: 'accept' } }, 'Kabul Et')
      )
    )
  );

  document.body.appendChild(bar);
  setTimeout(() => bar.classList.add('is-in'), 600);

  const decide = (choice) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, ts: Date.now() }));
    bar.classList.remove('is-in');
    bar.classList.add('is-out');
    setTimeout(() => bar.remove(), 400);
  };

  bar.querySelector('[data-action="accept"]').addEventListener('click', () => decide('accept'));
  bar.querySelector('[data-action="reject"]').addEventListener('click', () => decide('reject'));
}
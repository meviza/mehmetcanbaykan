/**
 * faq-section — Accordion (native <details>).
 */
import { el, escapeHtml } from '../../../lib/components/index.js';
import { FAQ_ITEMS } from '../fallback-content.js';

export function buildFaq({ faqs }) {
  const list = (faqs && faqs.length) ? faqs : FAQ_ITEMS;

  const items = el('div', { class: 'faq-list' },
    ...list.map((item, i) => el('details', { class: 'faq-item', open: i === 0 },
      el('summary', {},
        el('span', {}, item.q),
        el('span', { class: 'faq-icon', 'aria-hidden': 'true' }, '+')
      ),
      el('div', { class: 'faq-body', html: `<p>${escapeHtml(item.a)}</p>` })
    ))
  );

  return el('section', { class: 'section', id: 'sss' },
    el('div', { class: 'container-fluid' },
      el('div', { class: 'section-head' },
        el('span', { class: 'section-tag' }, 'Sık Sorulan Sorular'),
        el('h2', { class: 'section-title', html: 'Aklınıza <em>gelenler</em>' }),
        el('p', { class: 'section-sub' }, 'Süreç, maliyet ve işleyiş hakkında kısa cevaplar.')
      ),
      items
    )
  );
}
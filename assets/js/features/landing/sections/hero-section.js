/**
 * hero-builder — ÜçD Three.js sahne + başlık + CTA + meta panel.
 * 3D sahne idle'da yüklenir, render-blocking değil.
 */
import { el } from '../../../lib/components/index.js';

export function buildHero({ tenant }) {
  const tag = tenant?.tagline || 'Mimarlık & Tasarım';

  const hero3d = el('div', { class: 'hero-3d', id: 'hero3d', 'aria-hidden': 'true' },
    el('div', { class: 'hero-3d-skeleton', html: `
      <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="skel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#c9a45a" stop-opacity="0.18"/>
            <stop offset="1" stop-color="#c9a45a" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect width="400" height="400" fill="url(#skel)"/>
        <g fill="none" stroke="#c9a45a" stroke-width="0.6" opacity="0.4">
          <rect x="150" y="100" width="60" height="220"/>
          <rect x="210" y="160" width="60" height="160"/>
          <line x1="150" y1="100" x2="270" y2="100"/>
          <line x1="150" y1="320" x2="270" y2="320"/>
        </g>
      </svg>
    ` })
  );

  const waPhone = (tenant?.contact?.whatsapp || '').replace(/\D/g, '');
  const waText = encodeURIComponent('Merhaba, ücretsiz ön görüşme için yazıyorum.');

  const ctas = el('div', { class: 'hero-actions' },
    el('a', {
      href: `https://wa.me/${waPhone}?text=${waText}`,
      target: '_blank', rel: 'noopener',
      class: 'btn btn-primary'
    },
      el('span', {}, 'Ücretsiz Ön Görüşme'),
      el('span', { html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>' })
    ),
    el('a', { href: '#konseptler', class: 'btn btn-ghost' },
      el('span', {}, 'Konseptleri İncele')
    )
  );

  const sub = tenant?.description
    || 'Restorasyondan iç mimariye, vaziyet planından peyzaja — malzemeyi, ışığı ve zamanı konuşturan projeler.';

  const text = el('div', { class: 'hero-text' },
    el('span', { class: 'eyebrow' }, tag),
    el('h1', { class: 'hero-title' },
      'Mimaride', el('br'),
      el('span', { class: 'hero-title-italic' }, 'sessiz'),
      ' bir ', el('em', {}, 'cesaret.'), '.'
    ),
    el('p', { class: 'hero-sub' }, sub),
    ctas
  );

  const metaPanel = el('aside', { class: 'hero-meta-panel' },
    el('div', { class: 'hmp-row' },
      el('div', {},
        el('span', { class: 'hmp-num' }, '10+'),
        el('span', { class: 'hmp-lbl' }, 'Yıl Deneyim')
      ),
      el('div', {},
        el('span', { class: 'hmp-num' }, tenant?.contact?.city || 'Siirt'),
        el('span', { class: 'hmp-lbl' }, 've çevresi')
      )
    ),
    el('div', { class: 'hmp-divider' }),
    el('div', { class: 'hmp-foot' },
      el('span', { class: 'hmp-dot' }),
      el('small', {}, 'Projeler için açık')
    )
  );

  const inner = el('div', { class: 'container-fluid hero-inner' }, text, metaPanel);
  const scroll = el('a', { href: '#konseptler', class: 'hero-scroll', 'aria-label': 'Aşağı kaydır' },
    el('span'), el('small', {}, 'Konseptler')
  );

  return el('section', { class: 'hero', id: 'home' },
    hero3d, el('div', { class: 'hero-grain', 'aria-hidden': 'true' }), inner, scroll
  );
}
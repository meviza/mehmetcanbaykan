/**
 * services-section — Hizmetler grid (DB veya fallback).
 * Her servis kartı → WhatsApp CTA (tenant numarası ile).
 */
import { el } from '../../../lib/components/index.js';
import { SERVICES as FALLBACK } from '../fallback-content.js';

const ICONS = {
  building: '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>',
  layers: '<path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
  sparkle: '<path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
};

export function buildServices({ services, tenant }) {
  const list = (services && services.length) ? services : FALLBACK;
  const waPhone = (tenant?.contact?.whatsapp || '').replace(/\D/g, '');

  const grid = el('div', { class: 'services' },
    ...list.map(svc => {
      const iconPath = ICONS[svc.icon] || ICONS.building;
      const waText = encodeURIComponent(`Merhaba, ${svc.title} hakkında bilgi almak istiyorum.`);
      return el('article', { class: 'service' },
        el('div', { class: 'service-icon', html: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5">${iconPath}</svg>` }),
        el('h3', {}, svc.title),
        el('p', {}, svc.description),
        el('a', {
          href: `https://wa.me/${waPhone}?text=${waText}`,
          class: 'service-link', target: '_blank', rel: 'noopener'
        }, 'Bilgi al →')
      );
    })
  );

  return el('section', { class: 'section', id: 'hizmetler' },
    el('div', { class: 'container-fluid' },
      el('div', { class: 'section-head' },
        el('span', { class: 'section-tag' }, 'Hizmetler'),
        el('h2', { class: 'section-title', html: 'Ne <em>yapıyorum</em>?' }),
        el('p', { class: 'section-sub' }, 'Her ölçekte, her aşamada — konseptten anahtar teslimine.')
      ),
      grid
    )
  );
}
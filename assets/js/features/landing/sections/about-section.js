/**
 * about-section — Hakkımda + stats grid.
 */
import { el } from '../../../lib/components/index.js';
import { STATS } from '../fallback-content.js';

export function buildAbout({ tenant }) {
  const stats = (tenant?.stats && tenant.stats.length) ? tenant.stats : STATS;

  const col1 = el('div', { class: 'col' },
    el('span', { class: 'section-tag' }, 'Hakkımda'),
    el('h2', { class: 'section-title', html: 'Mekâna <em>zaman</em> katmak.' }),
    el('p', { class: 'lead' },
      `Yıllardır ${tenant?.contact?.city || 'bölgede'} yaşayan ve çevrenin dokusunu, iklimini, malzeme geleneğini tanıyan bir mimar olarak; her projeyi `,
      el('strong', {}, 'yer, insan ve zaman'),
      ' üçgeninde ele alıyorum.'
    ),
    el('p', {}, 'Geleneksel taş ve ahşap yapılardan modern minimalist konutlara, kırsal peyzaj düzenlemelerinden kentsel iç mekân tasarımına kadar geniş bir yelpazede çalışıyorum. Amacım, ihtiyacınızı en yalın ve en dayanıklı biçimde buluşturan projeler üretmek.'),
    el('div', { class: 'signature' }, `— ${tenant?.founder?.name || tenant?.name || 'Mehmet Can Baykan'}`)
  );

  const col2 = el('div', { class: 'col stats' },
    ...stats.map(s => el('div', { class: 'stat-card' },
      el('div', {},
        el('span', { class: 'stat-num' }, s.num),
        s.plus ? el('span', { class: 'stat-plus' }, s.plus) : null
      ),
      el('div', { class: 'stat-label' }, s.label)
    ))
  );

  return el('section', { class: 'section', id: 'hakkimda' },
    el('div', { class: 'container-fluid two-col' }, col1, col2)
  );
}
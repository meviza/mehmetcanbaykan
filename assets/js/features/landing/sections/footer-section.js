/**
 * footer-section — Brand + nav + contact.
 */
import { el } from '../../../lib/components/index.js';

export function buildFooter({ tenant }) {
  const t = tenant || {};
  const waPhone = (t.contact?.whatsapp || '').replace(/\D/g, '');
  const phone = t.contact?.phone || '';
  const email = t.contact?.email || '';
  const instagram = t.contact?.instagram || '';
  const igHandle = instagram ? '@' + instagram.replace(/^@/, '').replace(/.*\//, '') : '';

  return el('footer', { class: 'footer' },
    el('div', { class: 'container-fluid footer-inner' },
      el('div', { class: 'footer-brand' },
        el('span', { class: 'brand-mark' }, initials(t.name || 'MCB')),
        el('p', {}, t.name || 'Mehmet Can Baykan', el('br'), 'Mimar — ', t.contact?.city || 'Siirt'),
        el('address', { class: 'footer-address' }, t.contact?.address || '')
      ),

      el('nav', { class: 'footer-links', 'aria-label': 'Footer' },
        el('a', { href: '#konseptler' }, 'Konseptler'),
        el('a', { href: '#hakkimda' }, 'Hakkımda'),
        el('a', { href: '#hizmetler' }, 'Hizmetler'),
        el('a', { href: '#surec' }, 'Süreç'),
        el('a', { href: '#sss' }, 'SSS'),
        el('a', { href: '#iletisim' }, 'İletişim')
      ),

      el('div', { class: 'footer-contact' },
        waPhone ? el('a', { href: `https://wa.me/${waPhone}`, target: '_blank', rel: 'noopener' }, phone || waPhone) : null,
        instagram ? el('a', { href: instagram.startsWith('http') ? instagram : `https://instagram.com/${igHandle.replace('@', '')}`, target: '_blank', rel: 'noopener' }, igHandle) : null,
        email ? el('a', { href: `mailto:${email}` }, email) : null,
        el('small', {}, `© ${new Date().getFullYear()} Tüm hakları saklıdır.`)
      )
    )
  );
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase();
}
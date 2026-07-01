/**
 * nav-builder — Üst navigasyon + WhatsApp CTA.
 * Hamburger menu (mobil), smooth-scroll, scroll-spy başka dosyada.
 */
import { el } from '../../../lib/components/index.js';

export function buildNav({ tenant }) {
  const links = [
    { href: '#konseptler', label: 'Konseptler' },
    { href: '#hakkimda', label: 'Hakkımda' },
    { href: '#hizmetler', label: 'Hizmetler' },
    { href: '#surec', label: 'Süreç' },
    { href: '#iletisim', label: 'İletişim' }
  ];

  const navLinks = el('nav', { class: 'nav-links', id: 'navLinks', 'aria-label': 'Ana menü' },
    ...links.map(l => el('a', { href: l.href }, l.label))
  );

  const brand = el('a', { href: '#home', class: 'brand' },
    el('span', { class: 'brand-mark' }, initials(tenant?.name || 'MCB')),
    el('span', { class: 'brand-text' },
      tenant?.name || 'Mehmet Can Baykan',
      el('small', {}, 'Mimar')
    )
  );

  const waMsg = encodeURIComponent('Merhaba, web sitenizden yazıyorum. Projem hakkında görüşmek isterim.');
  const waPhone = (tenant?.contact?.whatsapp || '').replace(/\D/g, '');
  const cta = el('a', {
    href: `https://wa.me/${waPhone}?text=${waMsg}`,
    class: 'btn btn-primary btn-sm nav-cta',
    target: '_blank', rel: 'noopener'
  }, 'İletişim');

  const burger = el('button', {
    class: 'nav-burger',
    id: 'navBurger',
    'aria-label': 'Menüyü aç',
    'aria-expanded': 'false',
    'aria-controls': 'navLinks'
  }, el('span'), el('span'), el('span'));

  return el('header', { class: 'nav', id: 'nav' },
    el('div', { class: 'container-fluid nav-inner' },
      brand, navLinks, cta, burger
    )
  );
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase();
}
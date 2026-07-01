/**
 * contact-section — İletişim kartları + form.
 * Form: submit_contact_form RPC + WhatsApp'a yönlendirme.
 * KVKK checkbox zorunlu.
 */
import { el, escapeHtml, toast } from '../../../lib/components/index.js';
import { submitContactForm } from '../../../lib/repo.js';
import { getTenant, whatsappLink } from '../../../lib/tenant.js';
import { SERVICES as FALLBACK_SERVICES } from '../fallback-content.js';

export function buildContact({ services, tenant }) {
  const t = tenant || getTenant() || {};
  const phone = t.contact?.phone || '';
  const waPhone = (t.contact?.whatsapp || '').replace(/\D/g, '');
  const email = t.contact?.email || '';
  const instagram = t.contact?.instagram || '';
  const waText = encodeURIComponent('Merhaba, web sitenizden yazıyorum.');

  // Sol kolon — hızlı iletişim kartları
  const waItem = el('a', {
    href: `https://wa.me/${waPhone}?text=${waText}`,
    class: 'contact-item', target: '_blank', rel: 'noopener'
  },
    el('span', { class: 'contact-icon', html: ICONS.whatsapp }),
    el('div', {},
      el('strong', {}, 'WhatsApp'),
      el('span', {}, phone || waPhone)
    ),
    el('span', { class: 'contact-arrow' }, '→')
  );

  const phoneItem = el('a', { href: `tel:${phone.replace(/\s/g, '')}`, class: 'contact-item' },
    el('span', { class: 'contact-icon', html: ICONS.phone }),
    el('div', {},
      el('strong', {}, 'Telefon'),
      el('span', {}, phone)
    ),
    el('span', { class: 'contact-arrow' }, '→')
  );

  const igItem = instagram ? el('a', {
    href: instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`,
    class: 'contact-item', target: '_blank', rel: 'noopener'
  },
    el('span', { class: 'contact-icon', html: ICONS.instagram }),
    el('div', {},
      el('strong', {}, 'Instagram'),
      el('span', {}, '@' + instagram.replace(/^@/, '').replace(/.*\//, ''))
    ),
    el('span', { class: 'contact-arrow' }, '→')
  ) : null;

  const emailItem = email ? el('a', { href: `mailto:${email}`, class: 'contact-item' },
    el('span', { class: 'contact-icon', html: ICONS.mail }),
    el('div', {},
      el('strong', {}, 'E-posta'),
      el('span', {}, email)
    ),
    el('span', { class: 'contact-arrow' }, '→')
  ) : null;

  const locationItem = el('div', { class: 'contact-item' },
    el('span', { class: 'contact-icon', html: ICONS.location }),
    el('div', {},
      el('strong', {}, 'Konum'),
      el('span', {}, t.contact?.city || 'Türkiye')
    )
  );

  const hoursItem = el('div', { class: 'contact-item' },
    el('span', { class: 'contact-icon', html: ICONS.clock }),
    el('div', {},
      el('strong', {}, 'Çalışma Saatleri'),
      el('span', {}, 'Pzt - Cmt · 09:00 - 19:00')
    )
  );

  const contactCard = el('div', { class: 'contact-card' },
    el('h3', {}, 'Hızlı İletişim'),
    waItem, phoneItem, igItem, emailItem, locationItem, hoursItem
  );

  // Sağ kolon — form
  const serviceList = (services && services.length) ? services : FALLBACK_SERVICES;
  const form = el('form', { class: 'contact-form', id: 'contactForm', novalidate: '' },
    el('h3', {}, 'Projenizden bahsedin'),
    el('p', { class: 'form-sub' }, 'Formu doldurun, WhatsApp üzerinden yanıt vereyim.'),

    el('div', { class: 'form-row' },
      el('label', { class: 'field', for: 'cf-name' },
        el('span', { class: 'field-label' }, 'Ad Soyad', el('span', { class: 'field-required' }, ' *')),
        el('input', { id: 'cf-name', type: 'text', name: 'name', required: '', autocomplete: 'name' })
      ),
      el('label', { class: 'field', for: 'cf-phone' },
        el('span', { class: 'field-label' }, 'Telefon', el('span', { class: 'field-required' }, ' *')),
        el('input', { id: 'cf-phone', type: 'tel', name: 'phone', required: '', autocomplete: 'tel', placeholder: '+90 5xx xxx xx xx' })
      )
    ),

    el('label', { class: 'field', for: 'cf-email' },
      el('span', { class: 'field-label' }, 'E-posta'),
      el('input', { id: 'cf-email', type: 'email', name: 'email', autocomplete: 'email' })
    ),

    el('label', { class: 'field', for: 'cf-service' },
      el('span', { class: 'field-label' }, 'Proje Türü', el('span', { class: 'field-required' }, ' *')),
      el('select', { id: 'cf-service', name: 'service', required: '' },
        el('option', { value: '' }, 'Seçiniz'),
        ...serviceList.map(s => el('option', { value: s.title }, s.title))
      )
    ),

    el('label', { class: 'field', for: 'cf-message' },
      el('span', { class: 'field-label' }, 'Mesajınız', el('span', { class: 'field-required' }, ' *')),
      el('textarea', { id: 'cf-message', name: 'message', rows: '4', required: '',
        placeholder: 'Arsa bilgisi, m², beklentiler, zamanlama...' })
    ),

    el('label', { class: 'form-kvkk', for: 'cf-kvkk' },
      el('input', { id: 'cf-kvkk', type: 'checkbox', name: 'kvkk', required: '' }),
      el('span', { html: '<a href="#gizlilik">KVKK aydınlatma metnini</a> okudum, kabul ediyorum.' })
    ),

    el('button', { type: 'submit', class: 'btn btn-primary btn-full' },
      el('span', {}, 'WhatsApp ile Gönder'),
      el('span', { html: ICONS.send })
    ),
    el('p', { class: 'form-note' }, 'Form WhatsApp\'a yönlendirir ve mesajınız güvenle kaydedilir.')
  );

  // Map card
  const lat = t.contact?.lat;
  const lng = t.contact?.lng;
  const mapSrc = (lat && lng)
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}`
    : 'https://www.openstreetmap.org/export/embed.html?layer=mapnik';

  const mapCard = el('div', { class: 'map-card' },
    el('div', { class: 'map-info' },
      el('h3', {}, 'Ofisimiz'),
      el('p', {}, t.contact?.address || 'Adres bilgisi yükleniyor...'),
      el('a', {
        class: 'map-link',
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.contact?.address || t.name || '')}`,
        target: '_blank', rel: 'noopener'
      }, el('span', { html: ICONS.location }), 'Google Maps\'te Aç')
    ),
    el('div', { class: 'map-frame' },
      el('iframe', {
        title: 'Ofis Konumu',
        src: mapSrc,
        loading: 'lazy',
        referrerpolicy: 'no-referrer-when-downgrade',
        allowfullscreen: ''
      })
    )
  );

  const grid = el('div', { class: 'container-fluid' },
    el('div', { class: 'section-head' },
      el('span', { class: 'section-tag' }, 'İletişim'),
      el('h2', { class: 'section-title', html: 'Projenizden <em>bahsedin</em>' }),
      el('p', { class: 'section-sub' }, 'En hızlı yol: WhatsApp. Birkaç cümle yeter, gerisini birlikte konuşuruz.')
    ),
    el('div', { class: 'contact-grid' }, contactCard, form),
    el('div', { class: 'contact-map' }, mapCard)
  );

  setTimeout(() => bindContactForm(form, t), 0);

  return el('section', { class: 'section', id: 'iletisim' }, grid);
}

function bindContactForm(form, tenant) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const kvkk = form.querySelector('#cf-kvkk');
    if (!kvkk?.checked) {
      toast('Devam etmek için KVKK onayı gerekiyor.', 'error');
      kvkk?.focus();
      return;
    }
    const payload = {
      sender_name: data.get('name')?.toString().trim() || '',
      sender_phone: data.get('phone')?.toString().trim() || '',
      sender_email: data.get('email')?.toString().trim() || '',
      service: data.get('service')?.toString().trim() || '',
      body: data.get('message')?.toString().trim() || '',
      project_interest: data.get('service')?.toString().trim() || ''
    };

    if (!payload.sender_name || !payload.sender_phone || !payload.service || !payload.body) {
      toast('Lütfen zorunlu alanları doldurun.', 'error');
      return;
    }

    const text = [
      'Merhaba, web sitenizden yazıyorum.',
      '',
      `Ad Soyad: ${payload.sender_name}`,
      `Telefon: ${payload.sender_phone}`,
      payload.sender_email ? `E-posta: ${payload.sender_email}` : null,
      `Proje Türü: ${payload.service}`,
      '',
      'Mesaj:',
      payload.body
    ].filter(Boolean).join('\n');

    const waUrl = `https://wa.me/${(tenant.contact?.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener');

    try {
      await submitContactForm(payload);
      toast('Mesajınız iletildi. WhatsApp üzerinden de yazabilirsiniz.', 'success');
      form.reset();
    } catch (err) {
      console.warn('DB kaydı başarısız:', err);
      toast('WhatsApp açıldı, ancak kayıt alınamadı.', 'info');
    }
  });
}

const ICONS = {
  whatsapp: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01a1.092 1.092 0 0 0-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>',
  location: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  send: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24z"/></svg>'
};
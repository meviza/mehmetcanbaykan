/**
 * Ayarlar — Tenant config (name, contact, theme colors)
 */
import { el, Field, Card, Button, Grid, toast } from '../lib/components/index.js';
import { getDb, uploadImage } from './api.js';
import { getTenant, applyTheme } from '../lib/tenant.js';

export async function renderAyarlar() {
  const c = await getDb();
  const tenant = getTenant() || {};
  const wrap = el('div', {});

  wrap.appendChild(el('div', { class: 'dash-view-head' },
    el('div', {},
      el('h2', {}, 'Ayarlar'),
      el('p', {}, 'Tenant bilgileri, iletişim ve tema renkleri.')
    )
  ));

  if (!c) {
    wrap.appendChild(el('div', { class: 'dash-empty' },
      el('h4', {}, 'Çevrimdışı'),
      el('p', {}, 'Ayarlar Supabase bağlantısı gerektirir.')
    ));
    return wrap;
  }

  // Tenant config yükle
  const { data: t, error } = await c.from('tenants').select('*').eq('id', tenant.id).single();
  if (error || !t) {
    wrap.appendChild(el('div', { class: 'dash-empty' }, el('h4', {}, 'Tenant bulunamadı')));
    return wrap;
  }

  const theme = t.theme || { colors: {}, fonts: {}, radius: {} };
  const contact = t.contact || {};
  const colors = theme.colors || {};

  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newTheme = {
      ...theme,
      colors: {
        ...colors,
        primary: fd.get('c_primary') || colors.primary,
        bg: fd.get('c_bg') || colors.bg,
        ink: fd.get('c_ink') || colors.ink,
        ink2: fd.get('c_ink2') || colors.ink2,
        primary2: fd.get('c_primary2') || colors.primary2
      }
    };
    const payload = {
      name: fd.get('name'),
      tagline: fd.get('tagline') || null,
      description: fd.get('description') || null,
      contact: {
        phone: fd.get('phone') || null,
        email: fd.get('email') || null,
        whatsapp: (fd.get('whatsapp') || '').replace(/\D/g, '') || null
      },
      theme: newTheme,
      seo: {
        title: fd.get('seo_title') || t.seo?.title,
        description: fd.get('seo_description') || t.seo?.description
      }
    };
    const { error: upErr } = await c.from('tenants').update(payload).eq('id', t.id);
    if (upErr) { toast(upErr.message, 'error'); return; }
    applyTheme(newTheme);
    toast('Ayarlar kaydedildi', 'success');
  } });

  const infoCard = Card({
    title: 'Genel Bilgiler',
    subtitle: 'Ofis adı ve açıklama',
    body: el('div', { class: 'dash-form-grid' },
      Field({ label: 'Ad', name: 'name', value: t.name, required: true }),
      Field({ label: 'Slogan', name: 'tagline', value: t.tagline }),
      Field({ label: 'Açıklama', name: 'description', value: t.description, textarea: true, className: 'span-2' })
    )
  });

  const contactCard = Card({
    title: 'İletişim',
    subtitle: 'Telefon, e-posta, WhatsApp',
    body: el('div', { class: 'dash-form-grid' },
      Field({ label: 'Telefon', name: 'phone', type: 'tel', value: contact.phone }),
      Field({ label: 'WhatsApp (90XXXXXXXXXX)', name: 'whatsapp', value: contact.whatsapp }),
      Field({ label: 'E-posta', name: 'email', type: 'email', value: contact.email, className: 'span-2' })
    )
  });

  const themeCard = Card({
    title: 'Tema Renkleri',
    subtitle: 'Anında uygulanır (canlı)',
    body: el('div', { class: 'dash-form-grid' },
      colorField('Ana Renk', 'c_primary', colors.primary),
      colorField('İkincil', 'c_primary2', colors.primary2),
      colorField('Arkaplan', 'c_bg', colors.bg),
      colorField('Yazı', 'c_ink', colors.ink),
      colorField('Yazı 2', 'c_ink2', colors.ink2)
    )
  });

  const seoCard = Card({
    title: 'SEO',
    subtitle: 'Meta başlık ve açıklama',
    body: el('div', { class: 'dash-form-grid' },
      Field({ label: 'Meta Title', name: 'seo_title', value: t.seo?.title, className: 'span-2' }),
      Field({ label: 'Meta Description', name: 'seo_description', value: t.seo?.description, textarea: true, className: 'span-2' })
    )
  });

  form.append(infoCard, contactCard, themeCard, seoCard,
    el('div', { style: { marginTop: '24px', display: 'flex', gap: '8px' } },
      Button({ label: 'Kaydet', variant: 'primary', type: 'submit', onclick: () => form.requestSubmit() })
    )
  );

  wrap.appendChild(form);
  return wrap;
}

function colorField(label, name, value) {
  return el('label', { class: 'field' },
    el('span', { class: 'field-label' }, label),
    el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
      el('input', {
        type: 'color', name, value: value || '#000000',
        style: { width: '40px', height: '38px', padding: '2px', background: 'transparent', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }
      }),
      el('input', { type: 'text', value: value || '', readonly: true, style: { flex: '1' } })
    )
  );
}
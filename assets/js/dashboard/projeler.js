/**
 * Projeler — CRUD (projects tablosu)
 */
import { el, Field, Modal, Button, toast, formatDate } from '../lib/components/index.js';
import { getDb, uploadImage } from './api.js';

const STATUS = ['inquiry', 'proposal', 'contracted', 'in_progress', 'completed', 'cancelled'];
const CATEGORIES = ['restorasyon', 'ic-tasarim', 'vaziyet', 'kat-plani', 'peyzaj', 'tas-ahsap', 'diger'];

export async function renderProjeler() {
  const c = await getDb();
  const wrap = el('div', {});

  wrap.appendChild(el('div', { class: 'dash-view-head' },
    el('div', {},
      el('h2', {}, 'Projeler'),
      el('p', {}, 'Portföydeki tüm projeler.')
    ),
    el('div', { class: 'dash-view-actions' },
      Button({ label: '+ Yeni Proje', variant: 'primary', size: 'sm', onclick: () => openForm(c, wrap) })
    )
  ));

  if (!c) {
    wrap.appendChild(emptyState('Çevrimdışı', 'Veriler yüklenemiyor.'));
    return wrap;
  }

  const panel = el('div', { class: 'dash-panel' },
    el('div', { class: 'dash-panel-body', id: 'projBody' })
  );
  wrap.appendChild(panel);
  const body = panel.querySelector('#projBody');
  body.appendChild(el('div', { class: 'dash-loading' }, 'Yükleniyor'));

  const { data, error } = await c.from('projects').select('*').order('created_at', { ascending: false });
  body.innerHTML = '';
  if (error) { body.appendChild(emptyState('Hata', error.message)); return wrap; }
  if (!data?.length) { body.appendChild(emptyState('Henüz proje yok', 'İlk projeyi ekleyin.')); return wrap; }

  const table = el('table', { class: 'dash-table' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'Görsel'),
      el('th', {}, 'Başlık'),
      el('th', {}, 'Kategori'),
      el('th', {}, 'Yıl'),
      el('th', {}, 'Konum'),
      el('th', {}, 'Durum'),
      el('th', {}, '')
    )),
    el('tbody', {}, ...data.map(p => row(p, c, wrap)))
  );
  body.appendChild(el('div', { class: 'dash-table-wrap' }, table));
  return wrap;
}

function row(p, c, wrap) {
  return el('tr', {},
    el('td', {},
      p.cover_image
        ? el('img', { src: p.cover_image, alt: p.title, style: { width: '48px', height: '32px', objectFit: 'cover', borderRadius: '4px' } })
        : el('span', { class: 'dash-item-meta' }, '—')
    ),
    el('td', {}, el('strong', {}, p.title), el('br'), el('small', { class: 'dash-item-meta' }, p.client_name || '')),
    el('td', {}, p.category_label || p.category || '—'),
    el('td', {}, String(p.year || '—')),
    el('td', {}, p.location || '—'),
    el('td', {}, el('span', { class: `dash-tag dash-tag-${p.status}` }, p.status)),
    el('td', {},
      el('div', { class: 'dash-table-actions' },
        Button({ label: 'Düzenle', variant: 'ghost', size: 'sm', onclick: () => openForm(c, wrap, p) }),
        Button({ label: 'Sil', variant: 'ghost', size: 'sm', onclick: () => remove(c, p, wrap) })
      )
    )
  );
}

function openForm(c, wrap, item = null) {
  const isEdit = !!item;
  let coverUrl = item?.cover_image || '';

  const fileField = el('label', { class: 'field span-2' },
    el('span', { class: 'field-label' }, 'Kapak Görseli'),
    el('input', { type: 'file', accept: 'image/*', onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        toast('Yükleniyor…', 'info', 1500);
        coverUrl = await uploadImage(f, 'projects');
        preview.src = coverUrl;
        preview.style.display = 'block';
        toast('Görsel yüklendi', 'success');
      } catch (err) { toast(err.message, 'error'); }
    }})
  );
  const preview = el('img', { class: 'dash-image-preview', src: coverUrl, style: { display: coverUrl ? 'block' : 'none' } });
  fileField.appendChild(preview);

  const form = el('form', { class: 'dash-form-grid', onsubmit: async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      slug: (fd.get('title') || '').toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now(),
      title: fd.get('title'),
      category: fd.get('category'),
      category_label: fd.get('category_label') || null,
      year: Number(fd.get('year') || new Date().getFullYear()),
      location: fd.get('location') || null,
      area: fd.get('area') || null,
      duration: fd.get('duration') || null,
      client_name: fd.get('client_name') || null,
      summary: fd.get('summary') || null,
      cover_image: coverUrl || null,
      status: fd.get('status'),
      is_published: fd.get('is_published') === 'on',
      is_featured: fd.get('is_featured') === 'on',
      display_order: Number(fd.get('display_order') || 0)
    };
    if (!payload.title || !payload.category) {
      toast('Başlık ve kategori zorunlu', 'error');
      return;
    }
    try {
      if (isEdit) {
        const { error } = await c.from('projects').update(payload).eq('id', item.id);
        if (error) throw error;
        toast('Güncellendi', 'success');
      } else {
        const { error } = await c.from('projects').insert(payload);
        if (error) throw error;
        toast('Eklendi', 'success');
      }
      modal.close();
      await renderProjeler().then(n => wrap.replaceWith(n));
    } catch (err) { toast(err.message, 'error'); }
  } },
    Field({ label: 'Başlık', name: 'title', value: item?.title, required: true }),
    Field({ label: 'Kategori', name: 'category', type: 'select', required: true, value: item?.category, options: CATEGORIES.map(c => ({ value: c, label: c })) }),
    Field({ label: 'Kategori Etiketi', name: 'category_label', value: item?.category_label, placeholder: 'Restorasyon' }),
    Field({ label: 'Yıl', name: 'year', type: 'number', value: item?.year || new Date().getFullYear() }),
    Field({ label: 'Konum', name: 'location', value: item?.location }),
    Field({ label: 'Alan (m²)', name: 'area', value: item?.area }),
    Field({ label: 'Süre', name: 'duration', value: item?.duration, placeholder: '6 ay' }),
    Field({ label: 'Müşteri', name: 'client_name', value: item?.client_name }),
    Field({ label: 'Durum', name: 'status', type: 'select', value: item?.status || 'inquiry', options: STATUS.map(s => ({ value: s, label: s })) }),
    Field({ label: 'Sıra', name: 'display_order', type: 'number', value: item?.display_order ?? 0 }),
    Field({ label: 'Özet', name: 'summary', value: item?.summary, textarea: true }),
    el('label', { class: 'field' },
      el('span', { class: 'field-label' }, 'Yayında'),
      el('input', { type: 'checkbox', name: 'is_published', checked: item?.is_published === true })
    ),
    el('label', { class: 'field' },
      el('span', { class: 'field-label' }, 'Öne Çıkan'),
      el('input', { type: 'checkbox', name: 'is_featured', checked: item?.is_featured === true })
    ),
    fileField
  );

  const modal = Modal({
    title: isEdit ? 'Proje Düzenle' : 'Yeni Proje',
    body: form,
    actions: [
      Button({ label: 'İptal', variant: 'ghost', onclick: () => modal.close() }),
      Button({ label: isEdit ? 'Güncelle' : 'Ekle', variant: 'primary', type: 'submit', onclick: () => form.requestSubmit() })
    ],
    open: true
  });
}

async function remove(c, p, wrap) {
  if (!confirm(`"${p.title}" silinsin mi?`)) return;
  const { error } = await c.from('projects').delete().eq('id', p.id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Silindi', 'success');
  await renderProjeler().then(n => wrap.replaceWith(n));
}

function emptyState(t, s) {
  return el('div', { class: 'dash-empty' }, el('h4', {}, t), el('p', {}, s));
}
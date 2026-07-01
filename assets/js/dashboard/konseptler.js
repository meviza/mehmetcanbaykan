/**
 * Konseptler — CRUD (concept_designs tablosu)
 */
import { el, Field, Modal, Button, toast, escapeHtml } from '../lib/components/index.js';
import { getDb, uploadImage } from './api.js';

export async function renderKonseptler() {
  const c = await getDb();
  const wrap = el('div', {});

  wrap.appendChild(el('div', { class: 'dash-view-head' },
    el('div', {},
      el('h2', {}, 'Konseptler'),
      el('p', {}, 'Slider için görselleri yönet.')
    ),
    el('div', { class: 'dash-view-actions' },
      Button({ label: '+ Yeni Konsept', variant: 'primary', size: 'sm', onclick: () => openForm(c, wrap) })
    )
  ));

  const list = el('div', { class: 'dash-list', id: 'conceptList' });
  wrap.appendChild(list);

  if (!c) {
    list.appendChild(emptyState('Çevrimdışı', 'Veriler yüklenemiyor.'));
    return wrap;
  }

  list.appendChild(el('div', { class: 'dash-loading' }, 'Yükleniyor'));
  const { data, error } = await c.from('concept_designs').select('*').order('display_order', { ascending: true });
  list.innerHTML = '';
  if (error) {
    toast(error.message, 'error');
    list.appendChild(emptyState('Hata', error.message));
    return wrap;
  }
  if (!data?.length) {
    list.appendChild(emptyState('Henüz konsept yok', 'İlk konsepti ekleyerek başlayın.'));
    return wrap;
  }
  data.forEach(item => list.appendChild(buildCard(item, c, wrap)));
  return wrap;
}

function buildCard(item, c, wrap) {
  const card = el('div', { class: 'dash-item', dataset: { id: item.id } },
    el('div', { class: 'dash-item-image', style: { backgroundImage: `url(${item.image_url})` } }),
    el('div', { class: 'dash-item-body' },
      el('h4', { class: 'dash-item-title' }, item.title),
      el('div', { class: 'dash-item-meta' }, `${item.category || '—'} · Sıra: ${item.display_order ?? 0}`),
      el('div', { class: 'dash-item-actions' },
        Button({ label: 'Düzenle', variant: 'ghost', size: 'sm', onclick: () => openForm(c, wrap, item) }),
        Button({ label: 'Sil', variant: 'ghost', size: 'sm', onclick: () => remove(c, item, wrap) })
      )
    )
  );
  return card;
}

function openForm(c, wrap, item = null) {
  const isEdit = !!item;
  let imageUrl = item?.image_url || '';

  const fileField = el('label', { class: 'field span-2' },
    el('span', { class: 'field-label' }, 'Görsel'),
    el('input', { type: 'file', accept: 'image/*', onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        toast('Yükleniyor…', 'info', 1500);
        imageUrl = await uploadImage(f, 'concepts');
        preview.src = imageUrl;
        preview.style.display = 'block';
        toast('Görsel yüklendi', 'success');
      } catch (err) { toast(err.message, 'error'); }
    }})
  );
  const preview = el('img', { class: 'dash-image-preview', src: imageUrl, style: { display: imageUrl ? 'block' : 'none' } });
  fileField.appendChild(preview);

  const form = el('form', { class: 'dash-form-grid', onsubmit: async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: fd.get('title'),
      category: fd.get('category'),
      hint: fd.get('hint') || null,
      image_url: imageUrl,
      display_order: Number(fd.get('display_order') || 0),
      is_published: fd.get('is_published') === 'on'
    };
    if (!payload.title || !payload.image_url) {
      toast('Başlık ve görsel zorunlu', 'error');
      return;
    }
    try {
      if (isEdit) {
        const { error } = await c.from('concept_designs').update(payload).eq('id', item.id);
        if (error) throw error;
        toast('Güncellendi', 'success');
      } else {
        const { error } = await c.from('concept_designs').insert(payload);
        if (error) throw error;
        toast('Eklendi', 'success');
      }
      modal.close();
      await renderKonseptler().then(n => { wrap.replaceWith(n); });
    } catch (err) { toast(err.message, 'error'); }
  } },
    Field({ label: 'Başlık', name: 'title', value: item?.title, required: true, placeholder: 'Modern Villa' }),
    Field({ label: 'Kategori', name: 'category', value: item?.category, required: true, placeholder: 'konut' }),
    Field({ label: 'İpucu', name: 'hint', value: item?.hint, placeholder: 'Alt metin' }),
    Field({ label: 'Sıra', name: 'display_order', type: 'number', value: item?.display_order ?? 0 }),
    el('label', { class: 'field' },
      el('span', { class: 'field-label' }, 'Yayında'),
      el('input', { type: 'checkbox', name: 'is_published', checked: item?.is_published !== false })
    ),
    fileField
  );

  const modal = Modal({
    title: isEdit ? 'Konsept Düzenle' : 'Yeni Konsept',
    body: form,
    actions: [
      Button({ label: 'İptal', variant: 'ghost', onclick: () => modal.close() }),
      Button({ label: isEdit ? 'Güncelle' : 'Ekle', variant: 'primary', type: 'submit', onclick: () => form.requestSubmit() })
    ],
    open: true
  });
}

async function remove(c, item, wrap) {
  if (!confirm(`"${item.title}" silinsin mi?`)) return;
  const { error } = await c.from('concept_designs').delete().eq('id', item.id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Silindi', 'success');
  await renderKonseptler().then(n => wrap.replaceWith(n));
}

function emptyState(title, sub) {
  return el('div', { class: 'dash-empty' },
    el('h4', {}, title),
    el('p', {}, sub)
  );
}
/**
 * Hizmetler — CRUD (services tablosu)
 */
import { el, Field, Modal, Button, toast } from '../lib/components/index.js';
import { getDb } from './api.js';

export async function renderHizmetler() {
  const c = await getDb();
  const wrap = el('div', {});

  wrap.appendChild(el('div', { class: 'dash-view-head' },
    el('div', {},
      el('h2', {}, 'Hizmetler'),
      el('p', {}, 'Sunulan hizmetleri yönet.')
    ),
    el('div', { class: 'dash-view-actions' },
      Button({ label: '+ Yeni Hizmet', variant: 'primary', size: 'sm', onclick: () => openForm(c, wrap) })
    )
  ));

  if (!c) {
    wrap.appendChild(emptyState('Çevrimdışı', 'Veriler yüklenemiyor.'));
    return wrap;
  }

  const list = el('div', { class: 'dash-list', id: 'srvList' });
  wrap.appendChild(list);
  list.appendChild(el('div', { class: 'dash-loading' }, 'Yükleniyor'));

  const { data, error } = await c.from('services').select('*').order('display_order', { ascending: true });
  list.innerHTML = '';
  if (error) { list.appendChild(emptyState('Hata', error.message)); return wrap; }
  if (!data?.length) { list.appendChild(emptyState('Henüz hizmet yok', 'İlk hizmeti ekleyin.')); return wrap; }

  data.forEach(s => list.appendChild(buildCard(s, c, wrap)));
  return wrap;
}

function buildCard(s, c, wrap) {
  return el('div', { class: 'dash-item' },
    el('div', { class: 'dash-item-body' },
      el('h4', { class: 'dash-item-title' }, s.title),
      el('p', { class: 'dash-item-meta' }, s.description || '—'),
      el('div', { class: 'dash-item-meta' }, `Icon: ${s.icon || '—'} · Sıra: ${s.display_order ?? 0}`),
      el('div', { class: 'dash-item-actions' },
        Button({ label: 'Düzenle', variant: 'ghost', size: 'sm', onclick: () => openForm(c, wrap, s) }),
        Button({ label: 'Sil', variant: 'ghost', size: 'sm', onclick: () => remove(c, s, wrap) })
      )
    )
  );
}

function openForm(c, wrap, item = null) {
  const isEdit = !!item;
  const form = el('form', { class: 'dash-form-grid', onsubmit: async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      slug: (fd.get('title') || '').toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      title: fd.get('title'),
      description: fd.get('description'),
      icon: fd.get('icon') || null,
      starting_price: fd.get('starting_price') || null,
      display_order: Number(fd.get('display_order') || 0),
      is_published: fd.get('is_published') === 'on'
    };
    try {
      if (isEdit) {
        const { error } = await c.from('services').update(payload).eq('id', item.id);
        if (error) throw error;
        toast('Güncellendi', 'success');
      } else {
        const { error } = await c.from('services').insert(payload);
        if (error) throw error;
        toast('Eklendi', 'success');
      }
      modal.close();
      await renderHizmetler().then(n => wrap.replaceWith(n));
    } catch (err) { toast(err.message, 'error'); }
  } },
    Field({ label: 'Başlık', name: 'title', value: item?.title, required: true }),
    Field({ label: 'Icon (lucide adı)', name: 'icon', value: item?.icon, placeholder: 'building' }),
    Field({ label: 'Başlangıç Fiyatı', name: 'starting_price', value: item?.starting_price, placeholder: '₺15.000+' }),
    Field({ label: 'Sıra', name: 'display_order', type: 'number', value: item?.display_order ?? 0 }),
    Field({ label: 'Açıklama', name: 'description', value: item?.description, textarea: true }),
    el('label', { class: 'field' },
      el('span', { class: 'field-label' }, 'Yayında'),
      el('input', { type: 'checkbox', name: 'is_published', checked: item?.is_published !== false })
    )
  );

  const modal = Modal({
    title: isEdit ? 'Hizmet Düzenle' : 'Yeni Hizmet',
    body: form,
    actions: [
      Button({ label: 'İptal', variant: 'ghost', onclick: () => modal.close() }),
      Button({ label: isEdit ? 'Güncelle' : 'Ekle', variant: 'primary', type: 'submit', onclick: () => form.requestSubmit() })
    ],
    open: true
  });
}

async function remove(c, s, wrap) {
  if (!confirm(`"${s.title}" silinsin mi?`)) return;
  const { error } = await c.from('services').delete().eq('id', s.id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Silindi', 'success');
  await renderHizmetler().then(n => wrap.replaceWith(n));
}

function emptyState(t, s) {
  return el('div', { class: 'dash-empty' }, el('h4', {}, t), el('p', {}, s));
}
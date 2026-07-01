/**
 * Müşteriler — CRUD (customers tablosu)
 */
import { el, Field, Modal, Button, toast, formatDate } from '../lib/components/index.js';
import { getDb } from './api.js';

export async function renderMusteriler() {
  const c = await getDb();
  const wrap = el('div', {});

  wrap.appendChild(el('div', { class: 'dash-view-head' },
    el('div', {},
      el('h2', {}, 'Müşteriler'),
      el('p', {}, 'Müşteri veritabanı.')
    ),
    el('div', { class: 'dash-view-actions' },
      Button({ label: '+ Yeni Müşteri', variant: 'primary', size: 'sm', onclick: () => openForm(c, wrap) })
    )
  ));

  if (!c) {
    wrap.appendChild(emptyState('Çevrimdışı', 'Veriler yüklenemiyor.'));
    return wrap;
  }

  const panel = el('div', { class: 'dash-panel' },
    el('div', { class: 'dash-panel-body' })
  );
  wrap.appendChild(panel);
  const body = panel.querySelector('.dash-panel-body');
  body.appendChild(el('div', { class: 'dash-loading' }, 'Yükleniyor'));

  const { data, error } = await c.from('customers').select('*').order('created_at', { ascending: false });
  body.innerHTML = '';
  if (error) { body.appendChild(emptyState('Hata', error.message)); return wrap; }
  if (!data?.length) { body.appendChild(emptyState('Henüz müşteri yok', 'İlk müşteriyi ekleyin.')); return wrap; }

  const table = el('table', { class: 'dash-table' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'Ad'),
      el('th', {}, 'Telefon'),
      el('th', {}, 'E-posta'),
      el('th', {}, 'Adres'),
      el('th', {}, 'Kayıt'),
      el('th', {}, '')
    )),
    el('tbody', {}, ...data.map(cu => el('tr', {},
      el('td', {}, el('strong', {}, cu.full_name)),
      el('td', {}, cu.phone || '—'),
      el('td', {}, cu.email || '—'),
      el('td', {}, cu.address || '—'),
      el('td', {}, formatDate(cu.created_at)),
      el('td', {},
        el('div', { class: 'dash-table-actions' },
          Button({ label: 'Düzenle', variant: 'ghost', size: 'sm', onclick: () => openForm(c, wrap, cu) }),
          Button({ label: 'Sil', variant: 'ghost', size: 'sm', onclick: () => remove(c, cu, wrap) })
        )
      )
    )))
  );
  body.appendChild(el('div', { class: 'dash-table-wrap' }, table));
  return wrap;
}

function openForm(c, wrap, item = null) {
  const isEdit = !!item;
  const form = el('form', { class: 'dash-form-grid', onsubmit: async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      full_name: fd.get('full_name'),
      phone: fd.get('phone') || null,
      email: fd.get('email') || null,
      address: fd.get('address') || null,
      notes: fd.get('notes') || null
    };
    if (!payload.full_name) { toast('Ad zorunlu', 'error'); return; }
    try {
      if (isEdit) {
        const { error } = await c.from('customers').update(payload).eq('id', item.id);
        if (error) throw error;
        toast('Güncellendi', 'success');
      } else {
        const { error } = await c.from('customers').insert(payload);
        if (error) throw error;
        toast('Eklendi', 'success');
      }
      modal.close();
      await renderMusteriler().then(n => wrap.replaceWith(n));
    } catch (err) { toast(err.message, 'error'); }
  } },
    Field({ label: 'Ad Soyad', name: 'full_name', value: item?.full_name, required: true }),
    Field({ label: 'Telefon', name: 'phone', value: item?.phone, type: 'tel' }),
    Field({ label: 'E-posta', name: 'email', value: item?.email, type: 'email' }),
    Field({ label: 'Adres', name: 'address', value: item?.address }),
    Field({ label: 'Notlar', name: 'notes', value: item?.notes, textarea: true })
  );

  const modal = Modal({
    title: isEdit ? 'Müşteri Düzenle' : 'Yeni Müşteri',
    body: form,
    actions: [
      Button({ label: 'İptal', variant: 'ghost', onclick: () => modal.close() }),
      Button({ label: isEdit ? 'Güncelle' : 'Ekle', variant: 'primary', type: 'submit', onclick: () => form.requestSubmit() })
    ],
    open: true
  });
}

async function remove(c, item, wrap) {
  if (!confirm(`"${item.full_name}" silinsin mi?`)) return;
  const { error } = await c.from('customers').delete().eq('id', item.id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Silindi', 'success');
  await renderMusteriler().then(n => wrap.replaceWith(n));
}

function emptyState(t, s) {
  return el('div', { class: 'dash-empty' }, el('h4', {}, t), el('p', {}, s));
}
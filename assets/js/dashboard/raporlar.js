/**
 * Raporlar — listele, durum/öncelik güncelle, ekle/sil
 */
import { el, Field, Modal, Button, toast, formatDate } from '../lib/components/index.js';
import { getDb } from './api.js';

const STATUS = ['todo', 'in_progress', 'blocked', 'done', 'cancelled'];
const STATUS_LABELS = { todo: 'Yapılacak', in_progress: 'Devam', blocked: 'Engelli', done: 'Tamam', cancelled: 'İptal' };
const KINDS = ['note', 'task', 'saha', 'teklif', 'sorun'];
const KIND_LABELS = { note: 'Not', task: 'Görev', saha: 'Saha', teklif: 'Teklif', sorun: 'Sorun' };

export async function renderRaporlar() {
  const c = await getDb();
  const wrap = el('div', {});

  wrap.appendChild(el('div', { class: 'dash-view-head' },
    el('div', {},
      el('h2', {}, 'Raporlar'),
      el('p', {}, 'Notlar, görevler ve saha raporları.')
    ),
    el('div', { class: 'dash-view-actions' },
      Button({ label: '+ Yeni Rapor', variant: 'primary', size: 'sm', onclick: () => openForm(c, wrap) })
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

  const { data, error } = await c.from('reports').select('*').order('created_at', { ascending: false });
  body.innerHTML = '';
  if (error) { body.appendChild(emptyState('Hata', error.message)); return wrap; }
  if (!data?.length) { body.appendChild(emptyState('Henüz rapor yok', 'İlk raporu ekleyin.')); return wrap; }

  const table = el('table', { class: 'dash-table' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'Tarih'),
      el('th', {}, 'Başlık'),
      el('th', {}, 'Tür'),
      el('th', {}, 'Öncelik'),
      el('th', {}, 'Termin'),
      el('th', {}, 'Durum'),
      el('th', {}, '')
    )),
    el('tbody', {}, ...data.map(r => row(r, c, wrap)))
  );
  body.appendChild(el('div', { class: 'dash-table-wrap' }, table));
  return wrap;
}

function row(r, c, wrap) {
  const priorityLabels = ['—', 'Düşük', 'Normal', 'Yüksek'];
  return el('tr', {},
    el('td', {}, formatDate(r.created_at)),
    el('td', {}, el('strong', {}, r.title), r.body && el('br'), r.body && el('small', { class: 'dash-item-meta' }, (r.body || '').slice(0, 60))),
    el('td', {}, KIND_LABELS[r.kind] || r.kind),
    el('td', {}, priorityLabels[r.priority] || '—'),
    el('td', {}, r.due_date || '—'),
    el('td', {}, el('span', { class: `dash-tag dash-tag-${r.status}` }, STATUS_LABELS[r.status] || r.status)),
    el('td', {},
      el('div', { class: 'dash-table-actions' },
        Button({ label: 'Düzenle', variant: 'ghost', size: 'sm', onclick: () => openForm(c, wrap, r) }),
        Button({ label: 'Sil', variant: 'ghost', size: 'sm', onclick: () => remove(c, r, wrap) })
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
      title: fd.get('title'),
      body: fd.get('body') || null,
      kind: fd.get('kind'),
      status: fd.get('status'),
      priority: Number(fd.get('priority') || 0),
      due_date: fd.get('due_date') || null
    };
    if (!payload.title) { toast('Başlık zorunlu', 'error'); return; }
    try {
      if (isEdit) {
        const { error } = await c.from('reports').update(payload).eq('id', item.id);
        if (error) throw error;
        toast('Güncellendi', 'success');
      } else {
        const { error } = await c.from('reports').insert(payload);
        if (error) throw error;
        toast('Eklendi', 'success');
      }
      modal.close();
      await renderRaporlar().then(n => wrap.replaceWith(n));
    } catch (err) { toast(err.message, 'error'); }
  } },
    Field({ label: 'Başlık', name: 'title', value: item?.title, required: true }),
    Field({ label: 'Tür', name: 'kind', type: 'select', value: item?.kind || 'note', options: KINDS.map(k => ({ value: k, label: KIND_LABELS[k] })) }),
    Field({ label: 'Durum', name: 'status', type: 'select', value: item?.status || 'todo', options: STATUS.map(s => ({ value: s, label: STATUS_LABELS[s] })) }),
    Field({ label: 'Öncelik', name: 'priority', type: 'select', value: String(item?.priority ?? 0), options: [
      { value: '0', label: '—' }, { value: '1', label: 'Düşük' }, { value: '2', label: 'Normal' }, { value: '3', label: 'Yüksek' }
    ]}),
    Field({ label: 'Termin', name: 'due_date', type: 'date', value: item?.due_date }),
    Field({ label: 'Detay', name: 'body', value: item?.body, textarea: true })
  );

  const modal = Modal({
    title: isEdit ? 'Rapor Düzenle' : 'Yeni Rapor',
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
  const { error } = await c.from('reports').delete().eq('id', item.id);
  if (error) { toast(error.message, 'error'); return; }
  toast('Silindi', 'success');
  await renderRaporlar().then(n => wrap.replaceWith(n));
}

function emptyState(t, s) {
  return el('div', { class: 'dash-empty' }, el('h4', {}, t), el('p', {}, s));
}
/**
 * Mesajlar — listele, durum güncelle, WhatsApp ile yanıtla
 */
import { el, Field, Modal, Button, toast, formatDateTime } from '../lib/components/index.js';
import { getDb } from './api.js';
import { whatsappLink } from '../lib/tenant.js';

const STATUS = ['new', 'read', 'replied', 'archived', 'spam'];
const STATUS_LABELS = { new: 'Yeni', read: 'Okundu', replied: 'Yanıtlandı', archived: 'Arşiv', spam: 'Spam' };

export async function renderMesajlar() {
  const c = await getDb();
  const wrap = el('div', {});

  wrap.appendChild(el('div', { class: 'dash-view-head' },
    el('div', {},
      el('h2', {}, 'Mesajlar'),
      el('p', {}, 'Web\'den gelen iletişim mesajları.')
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

  const { data, error } = await c.from('messages').select('*').order('created_at', { ascending: false }).limit(200);
  body.innerHTML = '';
  if (error) { body.appendChild(emptyState('Hata', error.message)); return wrap; }
  if (!data?.length) { body.appendChild(emptyState('Mesaj yok', 'Henüz iletişim mesajı alınmadı.')); return wrap; }

  const table = el('table', { class: 'dash-table' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'Tarih'),
      el('th', {}, 'Gönderen'),
      el('th', {}, 'Konu'),
      el('th', {}, 'Mesaj'),
      el('th', {}, 'Durum'),
      el('th', {}, '')
    )),
    el('tbody', {}, ...data.map(m => row(m, c, wrap)))
  );
  body.appendChild(el('div', { class: 'dash-table-wrap' }, table));
  return wrap;
}

function row(m, c, wrap) {
  return el('tr', {},
    el('td', {}, formatDateTime(m.created_at)),
    el('td', {},
      el('strong', {}, m.sender_name),
      m.sender_phone && el('br'),
      m.sender_phone && el('small', { class: 'dash-item-meta' }, m.sender_phone)
    ),
    el('td', {}, m.service_interest || '—'),
    el('td', {}, el('span', {}, (m.body || '').slice(0, 80) + ((m.body || '').length > 80 ? '…' : ''))),
    el('td', {}, el('span', { class: `dash-tag dash-tag-${m.status}` }, STATUS_LABELS[m.status] || m.status)),
    el('td', {},
      el('div', { class: 'dash-table-actions' },
        m.sender_phone && Button({
          label: 'WhatsApp',
          variant: 'primary',
          size: 'sm',
          onclick: () => window.open(whatsappLink(`Merhaba ${m.sender_name}, mesajınız için teşekkürler…`), '_blank')
        }),
        Button({ label: 'Görüntüle', variant: 'ghost', size: 'sm', onclick: () => openDetail(c, m, wrap) })
      )
    )
  );
}

function openDetail(c, m, wrap) {
  const statusField = Field({
    label: 'Durum',
    name: 'status',
    type: 'select',
    value: m.status,
    options: STATUS.map(s => ({ value: s, label: STATUS_LABELS[s] }))
  });
  const noteField = Field({ label: 'Admin Notu', name: 'admin_notes', value: m.admin_notes, textarea: true });

  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await c.from('messages').update({
      status: fd.get('status'),
      admin_notes: fd.get('admin_notes') || null,
      replied_at: fd.get('status') === 'replied' ? new Date().toISOString() : null
    }).eq('id', m.id);
    if (error) { toast(error.message, 'error'); return; }
    toast('Güncellendi', 'success');
    modal.close();
    await renderMesajlar().then(n => wrap.replaceWith(n));
  } },
    el('div', { class: 'dash-panel-head', style: { padding: 0, border: 'none' } },
      el('div', {},
        el('h3', { style: { margin: '0 0 4px' } }, m.sender_name),
        el('small', { class: 'dash-item-meta' }, `${m.sender_email || ''} ${m.sender_phone ? '· ' + m.sender_phone : ''}`)
      )
    ),
    el('div', { style: { padding: '12px 0', borderTop: '1px solid var(--color-line)', borderBottom: '1px solid var(--color-line)', margin: '12px 0' } },
      el('strong', {}, m.service_interest || 'Konu belirtilmemiş'),
      el('p', { style: { margin: '8px 0 0', color: 'var(--color-ink-2)' } }, m.body)
    ),
    statusField,
    noteField
  );

  const modal = Modal({
    title: 'Mesaj Detayı',
    body: form,
    actions: [
      m.sender_phone && Button({ label: 'WhatsApp Yanıtla', variant: 'primary', onclick: () => window.open(whatsappLink(`Merhaba ${m.sender_name}, mesajınız için teşekkürler…`), '_blank') }),
      Button({ label: 'İptal', variant: 'ghost', onclick: () => modal.close() }),
      Button({ label: 'Kaydet', variant: 'primary', type: 'submit', onclick: () => form.requestSubmit() })
    ],
    open: true
  });
}

function emptyState(t, s) {
  return el('div', { class: 'dash-empty' }, el('h4', {}, t), el('p', {}, s));
}
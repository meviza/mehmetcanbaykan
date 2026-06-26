/**
 * Messages view — list + detail modal
 */

import { el, Label, Select, Pill, Button } from '../../lib/components/atoms.js';
import { showModal, confirmDialog, toast } from '../../lib/components/modal.js';
import { renderRows } from '../../lib/components/table.js';
import { formatDateTime } from '../../lib/ui.js';
import * as repo from '../../lib/repo.js';

export const state = { messages: [], filter: 'all' };

const STATUS_FILTERS = [
  { value: 'all', label: 'Tümü' },
  { value: 'new', label: 'Yeni' },
  { value: 'read', label: 'Okunmuş' },
  { value: 'replied', label: 'Yanıtlanmış' },
  { value: 'archived', label: 'Arşivlenmiş' }
];

const MESSAGE_STATUSES = [
  { value: 'new', label: 'Yeni' },
  { value: 'read', label: 'Okundu' },
  { value: 'replied', label: 'Yanıtlandı' },
  { value: 'archived', label: 'Arşivlendi' }
];

export async function renderMessages() {
  const messages = await repo.listMessages().catch(() => []);
  state.messages = messages;
  renderList();
  bindFilter();
}

function bindFilter() {
  const filter = document.getElementById('messageFilter');
  if (!filter || filter.dataset.bound) return;
  filter.dataset.bound = '1';
  filter.innerHTML = STATUS_FILTERS.map(f =>
    `<option value="${f.value}">${f.label}</option>`).join('');
  filter.addEventListener('change', () => {
    state.filter = filter.value;
    renderList();
  });
}

function renderList() {
  const tbody = document.querySelector('#messagesTable tbody');
  if (!tbody) return;
  const filtered = state.filter === 'all'
    ? state.messages
    : state.messages.filter(m => (m.status || 'new') === state.filter);

  renderRows(tbody, filtered, [
    { key: 'sent_at', label: 'Tarih', render: m => formatDateTime(m.sent_at) },
    { key: 'sender_name', label: 'Ad', render: m => el('strong', {}, m.sender_name || m.customer?.name || '—') },
    { key: 'sender_phone', label: 'Telefon', render: m => m.sender_phone || m.customer?.phone || '—' },
    { key: 'service', label: 'Konu', render: m => m.service || '—' },
    {
      key: 'body',
      label: 'Mesaj',
      render: m => {
        const preview = (m.body || '').slice(0, 80);
        return el('small', {}, preview + ((m.body || '').length > 80 ? '…' : ''));
      }
    },
    { key: 'status', label: 'Durum', render: m => el('td', { html: Pill({ status: m.status || 'new' }) }) },
    { label: '', render: m => el('td', { class: 'actions' },
      el('button', { class: 'btn-view', 'data-action': 'view-message', 'data-id': m.id }, 'Gör'),
      el('button', { class: 'btn-delete', 'data-action': 'delete-message', 'data-id': m.id }, 'Sil')
    )}
  ], 'Mesaj bulunamadı.');

  bindActions(tbody);
}

function bindActions(tbody) {
  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
  });
}

async function handleAction(action, id) {
  const m = state.messages.find(x => x.id === id);
  if (action === 'view-message' && m) openMessageModal(m);
  else if (action === 'delete-message') {
    if (await confirmDialog('Bu mesajı silmek istediğinize emin misiniz?')) {
      try { await repo.deleteMessage(id); toast('Silindi.', 'success'); renderMessages(); }
      catch (e) { toast('Hata: ' + e.message, 'error'); }
    }
  }
}

function openMessageModal(m) {
  const phoneDigits = (m.sender_phone || m.customer?.phone || '').replace(/\D/g, '');
  const waUrl = phoneDigits ? `https://wa.me/${phoneDigits}` : null;

  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px;' },
    el('div', {}, el('strong', {}, 'Gönderen: '), m.sender_name || m.customer?.name || '—'),
    el('div', {}, el('strong', {}, 'Telefon: '), m.sender_phone || m.customer?.phone || '—'),
    el('div', {}, el('strong', {}, 'E-posta: '), m.sender_email || m.customer?.email || '—'),
    el('div', {}, el('strong', {}, 'Konu: '), m.service || '—'),
    el('div', {}, el('strong', {}, 'Tarih: '), formatDateTime(m.sent_at)),
    el('hr', { style: 'border-color:rgba(255,255,255,0.06);' }),
    el('div', {}, el('strong', {}, 'Mesaj:'),
      el('p', { style: 'margin-top:8px;color:rgba(246,243,238,0.8);white-space:pre-wrap;' }, m.body || '')),
    Label({ label: 'Durum', children:
      Select({ name: 'messageStatus', value: m.status || 'new', options: MESSAGE_STATUSES })
    }),
    Label({ label: 'Admin Notu', children:
      el('textarea', { id: 'messageNote', rows: 3 }, m.admin_note || '')
    })
  );

  const { close } = showModal({ title: 'Mesaj Detayı', body });

  function save() {
    const status = body.querySelector('[name=messageStatus]').value;
    const admin_note = body.querySelector('#messageNote').value;
    const patch = {
      status,
      admin_note,
      replied_at: status === 'replied' ? new Date().toISOString() : null
    };
    repo.updateMessage(m.id, patch)
      .then(() => { toast('Güncellendi.', 'success'); close(); renderMessages(); })
      .catch(e => toast('Hata: ' + e.message, 'error'));
  }

  const actions = body.closest('.modal-card')?.querySelector('.modal-actions');
  if (waUrl) {
    actions.appendChild(el('a', { href: waUrl, target: '_blank', rel: 'noopener',
      class: 'btn btn-primary btn-sm' }, "WhatsApp'tan Yanıtla"));
  }
  actions.appendChild(el('button', { class: 'btn btn-primary btn-sm', onclick: save }, 'Kaydet'));
}
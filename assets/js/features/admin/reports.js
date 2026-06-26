/**
 * Reports view — list + create/edit modal
 */

import { el, Label, Input, Select, Textarea, Pill } from '../../lib/components/atoms.js';
import { showModal, confirmDialog, toast } from '../../lib/components/modal.js';
import { renderRows } from '../../lib/components/table.js';
import { formatDate } from '../../lib/ui.js';
import * as repo from '../../lib/repo.js';

export const state = { reports: [], customers: [], projects: [] };

const TYPES = [
  ['gorev', 'Görev'], ['not', 'Not'], ['teklif', 'Teklif'],
  ['gorusme', 'Görüşme'], ['saha', 'Saha'], ['sozlesme', 'Sözleşme'],
  ['fatura', 'Fatura'], ['toplanti', 'Toplantı']
];

const STATUSES = [['open', 'Açık'], ['in-progress', 'Devam Ediyor'], ['done', 'Tamamlandı'], ['archived', 'Arşiv']];
const PRIORITIES = [['low', 'Düşük'], ['normal', 'Normal'], ['high', 'Yüksek'], ['urgent', 'Acil']];

export async function renderReports() {
  const reports = await repo.listReports().catch(() => []);
  state.reports = reports;
  if (!state.customers.length) state.customers = await repo.listCustomers().catch(() => []);
  if (!state.projects.length) state.projects = await repo.listAllProjects().catch(() => []);

  const tbody = document.querySelector('#reportsTable tbody');
  if (!tbody) return;

  renderRows(tbody, reports, [
    { key: 'created_at', label: 'Tarih', render: r => formatDate(r.created_at) },
    { key: 'title', label: 'Başlık', render: r => el('strong', {}, r.title) },
    { key: 'type', label: 'Tür', render: r => r.type },
    { key: 'customer', label: 'Müşteri', render: r => r.customer?.name || '—' },
    { key: 'project', label: 'Proje', render: r => r.project?.title || '—' },
    { key: 'status', label: 'Durum', render: r => el('td', { html: Pill({ status: r.status }) }) },
    { label: '', render: r => el('td', { class: 'actions' },
      el('button', { class: 'btn-edit', 'data-action': 'edit-report', 'data-id': r.id }, 'Düzenle'),
      el('button', { class: 'btn-delete', 'data-action': 'delete-report', 'data-id': r.id }, 'Sil')
    )}
  ], 'Henüz rapor yok.');

  bindActions(tbody);
  bindNewButton();
}

function bindNewButton() {
  const btn = document.getElementById('newReportBtn');
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', () => openReportModal(null));
}

function bindActions(tbody) {
  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
  });
}

async function handleAction(action, id) {
  const r = state.reports.find(x => x.id === id);
  if (action === 'edit-report' && r) openReportModal(r);
  else if (action === 'delete-report') {
    if (await confirmDialog('Bu raporu silmek istediğinize emin misiniz?')) {
      try { await repo.deleteReport(id); toast('Silindi.', 'success'); renderReports(); }
      catch (e) { toast('Hata: ' + e.message, 'error'); }
    }
  }
}

function openReportModal(report) {
  const isNew = !report;
  report = report || { title: '', type: 'not', body: '', status: 'open', priority: 'normal', due_date: '', customer_id: '', project_id: '' };

  const customerOpts = [{ value: '', label: '—' }, ...state.customers.map(c => ({ value: c.id, label: c.name }))];
  const projectOpts = [{ value: '', label: '—' }, ...state.projects.map(p => ({ value: p.id, label: p.title }))];

  const body = el('div', {},
    Label({ label: 'Başlık', required: true, children: Input({ name: 'title', required: true, value: report.title }) }),
    Label({ label: 'Tür', children: Select({ name: 'type', value: report.type, options: TYPES }) }),
    Label({ label: 'Öncelik', children: Select({ name: 'priority', value: report.priority, options: PRIORITIES }) }),
    Label({ label: 'Müşteri', children: Select({ name: 'customer_id', value: report.customer_id || '', options: customerOpts }) }),
    Label({ label: 'Proje', children: Select({ name: 'project_id', value: report.project_id || '', options: projectOpts }) }),
    Label({ label: 'Durum', children: Select({ name: 'status', value: report.status, options: STATUSES }) }),
    Label({ label: 'Termin', children: Input({ name: 'due_date', type: 'date', value: report.due_date || '' }) }),
    Label({ label: 'İçerik', children: Textarea({ name: 'body', value: report.body, rows: 5 }) })
  );

  const { close } = showModal({ title: isNew ? 'Yeni Rapor' : 'Raporu Düzenle', body });

  function submit() {
    const data = {};
    body.querySelectorAll('[name]').forEach(inp => { data[inp.name] = inp.value; });
    if (!data.title) { toast('Başlık zorunlu.', 'error'); return; }
    (isNew ? repo.createReport(data) : repo.updateReport(report.id, data))
      .then(() => { toast('Kaydedildi.', 'success'); close(); renderReports(); })
      .catch(e => toast('Hata: ' + e.message, 'error'));
  }
  const actions = body.closest('.modal-card')?.querySelector('.modal-actions');
  const submitBtn = el('button', { class: 'btn btn-primary btn-sm', onclick: submit }, isNew ? 'Oluştur' : 'Güncelle');
  if (actions) actions.appendChild(submitBtn);
}
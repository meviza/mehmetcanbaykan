/**
 * Audit Log view — filter + CSV export
 */
import { getClient } from '../lib/db.js';
import { escapeHtml } from '../lib/ui.js';

export async function renderAudit() {
  const root = document.getElementById('saView-audit');
  if (!root) return;
  root.innerHTML = `
    <div class="sa-panel">
      <div class="sa-panel-head">
        <h3>Audit Log <small id="saAuditCount">yükleniyor...</small></h3>
        <div class="sa-panel-actions">
          <select id="saAuditAction">
            <option value="all">Tüm Aksiyonlar</option>
            <option value="login">login</option>
            <option value="tenants">tenants</option>
            <option value="projects">projects</option>
            <option value="messages">messages</option>
            <option value="memberships">memberships</option>
          </select>
          <select id="saAuditRange">
            <option value="24h">Son 24 Saat</option>
            <option value="7d" selected>Son 7 Gün</option>
            <option value="30d">Son 30 Gün</option>
            <option value="all">Tüm Zamanlar</option>
          </select>
          <button class="sa-btn sa-btn-ghost sa-btn-sm" id="saExportCsv">CSV İndir</button>
        </div>
      </div>
      <div class="sa-table-wrap">
        <table class="sa-table" id="saAuditTable">
          <thead><tr><th>Zaman</th><th>Aktör</th><th>Aksiyon</th><th>Resource</th><th>Detay</th></tr></thead>
          <tbody><tr><td colspan="5" class="sa-empty">Yükleniyor...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;
  $('#saAuditAction')?.addEventListener('change', () => renderRows());
  $('#saAuditRange')?.addEventListener('change', () => renderRows());
  $('#saExportCsv')?.addEventListener('click', exportCsv);
  await renderRows();
}

let cache = [];

async function renderRows() {
  const tbody = document.querySelector('#saAuditTable tbody');
  if (!tbody) return;
  if (!cache.length) cache = await loadAudit();
  const action = $('#saAuditAction')?.value || 'all';
  const range = $('#saAuditRange')?.value || '7d';
  const since = rangeToDate(range);
  const filtered = cache.filter(a =>
    (action === 'all' || (a.action || '').includes(action)) &&
    (!since || new Date(a.created_at) >= since)
  );
  $('#saAuditCount').textContent = `${filtered.length} kayıt`;
  tbody.innerHTML = '';
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="sa-empty">Log bulunamadı.</td></tr>';
    return;
  }
  filtered.slice(0, 200).forEach(a => {
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${(a.created_at || '').replace('T', ' ').slice(0, 19)}</td>
        <td><code>${escapeHtml(a.actor_email || a.actor_id?.slice(0, 8) || '—')}</code></td>
        <td><span class="sa-pill sa-pill-${actionClass(a.action)}">${escapeHtml(a.action || '—')}</span></td>
        <td>${escapeHtml(a.resource_type || '—')} ${a.resource_id ? '#' + escapeHtml(String(a.resource_id).slice(0, 8)) : ''}</td>
        <td><code style="font-size:10px">${escapeHtml(JSON.stringify(a.details || {}).slice(0, 80))}</code></td>
      </tr>
    `);
  });
}

async function loadAudit() {
  const client = await getClient();
  if (!client) return mockAudit();
  const { data, error } = await client
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) { console.warn(error); return []; }
  return data || [];
}

function mockAudit() {
  return Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    action: ['tenants.update', 'projects.insert', 'messages.insert', 'memberships.update'][i % 4],
    resource_type: ['tenants', 'projects', 'messages', 'memberships'][i % 4],
    resource_id: 'id-' + i,
    actor_email: 'can.mimarlik.56@gmail.com',
    details: { op: 'UPDATE' },
    created_at: new Date(Date.now() - i * 3600 * 1000).toISOString()
  }));
}

function rangeToDate(range) {
  const now = Date.now();
  if (range === '24h') return new Date(now - 24 * 3600 * 1000);
  if (range === '7d') return new Date(now - 7 * 86400 * 1000);
  if (range === '30d') return new Date(now - 30 * 86400 * 1000);
  return null;
}

function actionClass(action) {
  if (!action) return 'archived';
  if (action.includes('delete')) return 'archived';
  if (action.includes('insert') || action.includes('create')) return 'on';
  if (action.includes('update')) return 'new';
  if (action.includes('login')) return 'todo';
  return 'pending';
}

function exportCsv() {
  const action = $('#saAuditAction')?.value || 'all';
  const range = $('#saAuditRange')?.value || '7d';
  const since = rangeToDate(range);
  const filtered = cache.filter(a =>
    (action === 'all' || (a.action || '').includes(action)) &&
    (!since || new Date(a.created_at) >= since)
  );
  const headers = ['created_at', 'actor_email', 'action', 'resource_type', 'resource_id', 'details'];
  const rows = filtered.map(a => [
    a.created_at, a.actor_email || '', a.action || '', a.resource_type || '',
    a.resource_id || '', JSON.stringify(a.details || {})
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
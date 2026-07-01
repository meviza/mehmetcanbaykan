/**
 * Tenants view — list + CRUD + theme editor
 */
import { getClient } from '../lib/db.js';
import { $, escapeHtml } from '../lib/ui.js';

const STATUSES = ['active', 'pending', 'suspended', 'archived'];
const PLANS = ['free', 'pro', 'enterprise'];

export async function renderTenants() {
  const root = document.getElementById('saView-tenants');
  if (!root) return;
  root.innerHTML = `
    <div class="sa-panel">
      <div class="sa-panel-head">
        <h3>Tüm Tenants <small id="saTenantsCount">yükleniyor...</small></h3>
        <div class="sa-panel-actions">
          <input type="search" id="saTenantSearch" placeholder="Ara: ad, slug..." />
          <select id="saTenantFilter">
            <option value="all">Tüm Durumlar</option>
            ${STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
          <button class="sa-btn sa-btn-primary sa-btn-sm" id="saNewTenantBtn">+ Yeni Tenant</button>
        </div>
      </div>
      <div class="sa-table-wrap">
        <table class="sa-table" id="saTenantsTable">
          <thead><tr><th>Slug</th><th>Ad</th><th>Plan</th><th>Durum</th><th>Tema</th><th>Oluşturma</th><th></th></tr></thead>
          <tbody><tr><td colspan="7" class="sa-empty">Yükleniyor...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;
  $('#saNewTenantBtn')?.addEventListener('click', () => openTenantModal(null));
  $('#saTenantSearch')?.addEventListener('input', () => renderRows());
  $('#saTenantFilter')?.addEventListener('change', () => renderRows());
  await renderRows();
}

let cache = [];

async function renderRows() {
  const tbody = document.querySelector('#saTenantsTable tbody');
  if (!tbody) return;
  if (!cache.length) {
    cache = await loadTenants();
  }
  const q = ($('#saTenantSearch')?.value || '').toLowerCase();
  const filter = $('#saTenantFilter')?.value || 'all';
  const filtered = cache.filter(t =>
    (filter === 'all' || t.status === filter) &&
    (!q || (t.slug + t.name).toLowerCase().includes(q))
  );

  $('#saTenantsCount').textContent = `${filtered.length} / ${cache.length}`;

  tbody.innerHTML = '';
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="sa-empty">Tenant bulunamadı.</td></tr>';
    return;
  }
  filtered.forEach(t => {
    const theme = t.theme?.colors?.primary || '—';
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td><code>${escapeHtml(t.slug)}</code></td>
        <td><strong>${escapeHtml(t.name)}</strong></td>
        <td><span class="sa-pill sa-pill-${t.plan}">${t.plan}</span></td>
        <td><span class="sa-pill sa-pill-${t.status === 'active' ? 'on' : (t.status === 'pending' ? 'new' : 'archived')}">${t.status}</span></td>
        <td>${theme !== '—' ? `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${theme};border:1px solid var(--sa-line-2);vertical-align:middle"></span>` : '—'}</td>
        <td>${(t.created_at || '').slice(0, 10)}</td>
        <td><div class="sa-row-actions">
          <button data-action="edit" data-id="${t.id}">Düzenle</button>
          <button data-action="toggle" data-id="${t.id}" data-status="${t.status}">${t.status === 'active' ? 'Askıya Al' : 'Aktifleştir'}</button>
          <button class="sa-danger" data-action="delete" data-id="${t.id}">Sil</button>
        </div></td>
      </tr>
    `);
  });

  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id, btn.dataset.status));
  });
}

async function loadTenants() {
  const client = await getClient();
  if (!client) return mockTenants();
  const { data, error } = await client.from('tenants').select('*').order('created_at', { ascending: false });
  if (error) { console.warn(error); return []; }
  return data || [];
}

function mockTenants() {
  return [
    { id: '1', slug: 'mehmetcanbaykan', name: 'Mehmet Can Baykan Mimar', plan: 'pro', status: 'active', theme: { colors: { primary: '#c9a45a' } }, created_at: '2024-01-15' },
    { id: '2', slug: 'demo-ofis', name: 'Demo Ofis', plan: 'free', status: 'pending', theme: { colors: { primary: '#3b82f6' } }, created_at: '2026-06-01' }
  ];
}

async function handleAction(action, id, status) {
  const t = cache.find(x => x.id === id);
  if (!t) return;
  if (action === 'edit') return openTenantModal(t);
  if (action === 'toggle') {
    const next = status === 'active' ? 'suspended' : 'active';
    await updateTenant(id, { status: next });
    cache = []; await renderRows();
    return toast('Durum güncellendi: ' + next, 'success');
  }
  if (action === 'delete') {
    if (!confirm(`"${t.name}" tenant'ı silinsin mi? Bu işlem geri alınamaz.`)) return;
    await deleteTenant(id);
    cache = []; await renderRows();
    return toast('Tenant silindi.', 'success');
  }
}

async function updateTenant(id, patch) {
  const client = await getClient();
  if (!client) return;
  const { error } = await client.from('tenants').update(patch).eq('id', id);
  if (error) throw error;
}

async function deleteTenant(id) {
  const client = await getClient();
  if (!client) return;
  const { error } = await client.from('tenants').delete().eq('id', id);
  if (error) throw error;
}

function openTenantModal(t) {
  const isNew = !t;
  t = t || { slug: '', name: '', legal_name: '', tagline: '', description: '', plan: 'free', status: 'pending', theme: { colors: { primary: '#c9a45a', bg: '#0a0a0b', ink: '#f4f1ea' } } };
  const colors = t.theme?.colors || {};
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px';
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--sa-bg-soft);border:1px solid var(--sa-line-2);border-radius:14px;width:100%;max-width:680px;max-height:90vh;overflow:auto';
  card.innerHTML = `
    <header style="padding:18px 22px;border-bottom:1px solid var(--sa-line);display:flex;justify-content:space-between;align-items:center">
      <h3 style="margin:0;font-size:16px">${isNew ? 'Yeni Tenant' : 'Düzenle: ' + escapeHtml(t.name)}</h3>
      <button id="saCloseModal" style="background:none;border:none;color:var(--sa-ink-2);font-size:22px;cursor:pointer">×</button>
    </header>
    <div style="padding:22px">
      <div class="sa-form-grid">
        <label><span>Slug *</span><input name="slug" value="${escapeHtml(t.slug)}" ${!isNew ? 'readonly' : ''} placeholder="ofis-adi"></label>
        <label><span>Ad *</span><input name="name" value="${escapeHtml(t.name)}" required></label>
        <label class="sa-full"><span>Yasal Ad</span><input name="legal_name" value="${escapeHtml(t.legal_name || '')}"></label>
        <label class="sa-full"><span>Tagline</span><input name="tagline" value="${escapeHtml(t.tagline || '')}"></label>
        <label><span>Plan</span><select name="plan">${PLANS.map(p => `<option value="${p}" ${t.plan === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
        <label><span>Durum</span><select name="status">${STATUSES.map(s => `<option value="${s}" ${t.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label class="sa-full" style="margin-top:8px"><span>Tema Renkleri</span></label>
        <label><span>Birincil</span><div class="sa-color-row"><input type="color" name="colorPrimary" value="${colors.primary || '#c9a45a'}"><input name="colorPrimaryHex" value="${colors.primary || '#c9a45a'}"></div></label>
        <label><span>Arkaplan</span><div class="sa-color-row"><input type="color" name="colorBg" value="${colors.bg || '#0a0a0b'}"><input name="colorBgHex" value="${colors.bg || '#0a0a0b'}"></div></label>
        <label><span>Yazı</span><div class="sa-color-row"><input type="color" name="colorInk" value="${colors.ink || '#f4f1ea'}"><input name="colorInkHex" value="${colors.ink || '#f4f1ea'}"></div></label>
      </div>
    </div>
    <footer style="padding:14px 22px;border-top:1px solid var(--sa-line);display:flex;justify-content:flex-end;gap:8px">
      <button class="sa-btn sa-btn-ghost sa-btn-sm" id="saCancelModal">İptal</button>
      <button class="sa-btn sa-btn-primary sa-btn-sm" id="saSaveTenant">${isNew ? 'Oluştur' : 'Güncelle'}</button>
    </footer>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  card.querySelector('#saCloseModal').onclick = close;
  card.querySelector('#saCancelModal').onclick = close;

  // Color picker ↔ hex senkron
  card.querySelectorAll('input[type=color]').forEach(c => {
    c.addEventListener('input', () => { c.nextElementSibling.value = c.value; });
  });
  card.querySelectorAll('input[name$="Hex"]').forEach(h => {
    h.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(h.value)) h.previousElementSibling.value = h.value; });
  });

  card.querySelector('#saSaveTenant').onclick = async () => {
    const data = {};
    card.querySelectorAll('input[name], select[name]').forEach(inp => { data[inp.name] = inp.value; });
    if (!data.slug || !data.name) return toast('Slug ve Ad zorunlu.', 'error');
    const payload = {
      slug: data.slug,
      name: data.name,
      legal_name: data.legal_name || null,
      tagline: data.tagline || null,
      plan: data.plan,
      status: data.status,
      theme: { ...(t.theme || {}), colors: { ...(t.theme?.colors || {}), primary: data.colorPrimaryHex, bg: data.colorBgHex, ink: data.colorInkHex } }
    };
    try {
      const client = await getClient();
      if (client) {
        if (isNew) {
          const { error } = await client.from('tenants').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await client.from('tenants').update(payload).eq('id', t.id);
          if (error) throw error;
        }
      }
      cache = []; await renderRows(); close();
      toast(isNew ? 'Tenant oluşturuldu.' : 'Tenant güncellendi.', 'success');
    } catch (e) { toast('Hata: ' + e.message, 'error'); }
  };
}

function toast(msg, type) {
  const root = document.getElementById('saToastRoot') || document.body;
  const t = document.createElement('div');
  t.className = 'sa-toast sa-' + (type || 'info');
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
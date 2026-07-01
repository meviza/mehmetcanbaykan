/**
 * Users view — list all profiles + memberships + role assignment
 */
import { getClient } from '../lib/db.js';
import { $, escapeHtml } from '../lib/ui.js';

export async function renderUsers() {
  const root = document.getElementById('saView-users');
  if (!root) return;
  root.innerHTML = `
    <div class="sa-panel">
      <div class="sa-panel-head">
        <h3>Tüm Kullanıcılar <small id="saUsersCount">yükleniyor...</small></h3>
        <div class="sa-panel-actions">
          <input type="search" id="saUserSearch" placeholder="Ara: email, ad..." />
          <select id="saRoleFilter">
            <option value="all">Tüm Roller</option>
            <option value="super_admin">super_admin</option>
            <option value="tenant_owner">tenant_owner</option>
            <option value="tenant_staff">tenant_staff</option>
            <option value="customer">customer</option>
          </select>
        </div>
      </div>
      <div class="sa-table-wrap">
        <table class="sa-table" id="saUsersTable">
          <thead><tr><th>Kullanıcı</th><th>Email</th><th>Tenant</th><th>Rol</th><th>Üyelik</th><th>Son Görülme</th><th></th></tr></thead>
          <tbody><tr><td colspan="7" class="sa-empty">Yükleniyor...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;
  $('#saUserSearch')?.addEventListener('input', () => renderRows());
  $('#saRoleFilter')?.addEventListener('change', () => renderRows());
  await renderRows();
}

let cache = [];

async function renderRows() {
  const tbody = document.querySelector('#saUsersTable tbody');
  if (!tbody) return;
  if (!cache.length) cache = await loadUsers();
  const q = ($('#saUserSearch')?.value || '').toLowerCase();
  const filter = $('#saRoleFilter')?.value || 'all';
  const filtered = cache.filter(u =>
    (filter === 'all' || u.role === filter) &&
    (!q || (u.email + (u.full_name || '')).toLowerCase().includes(q))
  );
  $('#saUsersCount').textContent = `${filtered.length} / ${cache.length}`;
  tbody.innerHTML = '';
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="sa-empty">Kullanıcı bulunamadı.</td></tr>';
    return;
  }
  filtered.forEach(u => {
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td><strong>${escapeHtml(u.full_name || '—')}</strong></td>
        <td><code>${escapeHtml(u.email)}</code></td>
        <td>${escapeHtml(u.tenant_name || '—')}</td>
        <td><span class="sa-pill sa-pill-${u.role || 'customer'}">${u.role || '—'}</span></td>
        <td>${u.is_active ? '<span class="sa-pill sa-pill-on">aktif</span>' : '<span class="sa-pill sa-pill-archived">pasif</span>'}</td>
        <td>${u.last_sign_in_at ? u.last_sign_in_at.slice(0, 10) : '—'}</td>
        <td><div class="sa-row-actions">
          <button data-action="change-role" data-id="${u.user_id}" data-membership="${u.membership_id}" data-tenant="${u.tenant_id}" data-role="${u.role || ''}">Rol Değiştir</button>
          <button data-action="toggle-active" data-id="${u.user_id}" data-membership="${u.membership_id}" data-active="${u.is_active}">${u.is_active ? 'Pasifleştir' : 'Aktifleştir'}</button>
        </div></td>
      </tr>
    `);
  });
  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset));
  });
}

async function loadUsers() {
  const client = await getClient();
  if (!client) return mockUsers();
  // profiles + memberships + auth.users email join
  const [{ data: profiles }, { data: memberships }, { data: tenants }] = await Promise.all([
    client.from('profiles').select('id, full_name, avatar_url'),
    client.from('memberships').select('id, user_id, tenant_id, role, is_active, created_at'),
    client.from('tenants').select('id, name')
  ]);
  const tenantMap = Object.fromEntries((tenants || []).map(t => [t.id, t.name]));
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

  // Email: supabase auth admin API gerekli, fallback olarak profile.full_name kullanıyoruz
  return (memberships || []).map(m => ({
    user_id: m.user_id,
    email: profileMap[m.user_id]?.full_name || m.user_id.slice(0, 8) + '…',
    full_name: profileMap[m.user_id]?.full_name,
    role: m.role,
    membership_id: m.id,
    tenant_id: m.tenant_id,
    tenant_name: tenantMap[m.tenant_id] || '—',
    is_active: m.is_active,
    last_sign_in_at: null
  }));
}

function mockUsers() {
  return [
    { user_id: 'u1', email: 'can.mimarlik.56@gmail.com', full_name: 'Mehmet Can Baykan', role: 'tenant_owner', membership_id: 'm1', tenant_id: 't1', tenant_name: 'Mehmet Can Baykan Mimar', is_active: true, last_sign_in_at: '2026-06-30' },
    { user_id: 'u2', email: 'admin@platform.com', full_name: 'Platform Admin', role: 'super_admin', membership_id: 'm2', tenant_id: null, tenant_name: '—', is_active: true, last_sign_in_at: '2026-07-01' }
  ];
}

async function handleAction({ action, id, membership, tenant, role, active }) {
  if (action === 'change-role') return openRoleModal({ membership, tenant, role });
  if (action === 'toggle-active') {
    const next = active === 'true' ? false : true;
    await setActive(membership, next);
    cache = []; await renderRows();
    return toast('Üyelik ' + (next ? 'aktifleştirildi' : 'pasifleştirildi'), 'success');
  }
}

async function setActive(membershipId, isActive) {
  const client = await getClient();
  if (!client) return;
  const { error } = await client.from('memberships').update({ is_active: isActive }).eq('id', membershipId);
  if (error) throw error;
}

const ROLES = ['super_admin', 'tenant_owner', 'tenant_staff', 'customer'];

function openRoleModal({ membership, tenant, role }) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px';
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--sa-bg-soft);border:1px solid var(--sa-line-2);border-radius:14px;width:100%;max-width:420px';
  card.innerHTML = `
    <header style="padding:18px 22px;border-bottom:1px solid var(--sa-line)">
      <h3 style="margin:0;font-size:16px">Rol Değiştir</h3>
    </header>
    <div style="padding:22px">
      <label style="display:flex;flex-direction:column;gap:8px">
        <span style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--sa-ink-2);font-weight:600">Yeni Rol</span>
        <select id="saNewRole" style="background:var(--sa-bg);border:1px solid var(--sa-line-2);color:var(--sa-ink);padding:10px 12px;border-radius:8px;font-family:inherit;font-size:13px">
          ${ROLES.map(r => `<option value="${r}" ${r === role ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </label>
      <p style="margin:14px 0 0;color:var(--sa-ink-2);font-size:12px">⚠️ Rol değişikliği audit log'a kaydedilir.</p>
    </div>
    <footer style="padding:14px 22px;border-top:1px solid var(--sa-line);display:flex;justify-content:flex-end;gap:8px">
      <button class="sa-btn sa-btn-ghost sa-btn-sm" id="saCancel">İptal</button>
      <button class="sa-btn sa-btn-primary sa-btn-sm" id="saSaveRole">Kaydet</button>
    </footer>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) close(); };
  card.querySelector('#saCancel').onclick = close;
  card.querySelector('#saSaveRole').onclick = async () => {
    const newRole = card.querySelector('#saNewRole').value;
    try {
      const client = await getClient();
      if (client) {
        const { error } = await client.from('memberships').update({ role: newRole }).eq('id', membership);
        if (error) throw error;
      }
      cache = []; await renderRows(); close();
      toast('Rol güncellendi: ' + newRole, 'success');
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
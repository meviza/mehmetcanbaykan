/**
 * System Health view
 * - DB connection check
 * - RLS policy health (super_admin bypass test)
 * - Recent errors (failed login attempts, RLS denials)
 */
import { getClient } from '../lib/db.js';
import { escapeHtml } from '../lib/ui.js';

export async function renderHealth() {
  const root = document.getElementById('saView-health');
  if (!root) return;
  root.innerHTML = `
    <div class="sa-stats" id="saHealthStats">
      <div class="sa-stat is-green"><span>DB</span><strong>—</strong><small>bağlantı durumu</small></div>
      <div class="sa-stat is-cyan"><span>RLS</span><strong>—</strong><small>policy bypass</small></div>
      <div class="sa-stat is-amber"><span>Session</span><strong>—</strong><small>aktif oturum</small></div>
      <div class="sa-stat is-red"><span>Hatalar (24h)</span><strong>—</strong><small>son gün</small></div>
    </div>
    <div class="sa-panel">
      <div class="sa-panel-head"><h3>Health Checks</h3></div>
      <div class="sa-panel-body" id="saHealthChecks"><p style="color:var(--sa-ink-3)">Kontrol ediliyor...</p></div>
    </div>
    <div class="sa-panel">
      <div class="sa-panel-head"><h3>Son Hatalar & Olaylar</h3></div>
      <div class="sa-table-wrap">
        <table class="sa-table" id="saHealthErrorsTable">
          <thead><tr><th>Zaman</th><th>Tip</th><th>Mesaj</th><th>Detay</th></tr></thead>
          <tbody><tr><td colspan="4" class="sa-empty">Yükleniyor...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;
  await runChecks();
  await loadRecentErrors();
}

async function runChecks() {
  const client = await getClient();
  const checks = [];
  const stats = document.querySelectorAll('#saHealthStats .sa-stat strong');

  // 1) DB connection
  let dbOk = false;
  if (client) {
    try {
      const { error } = await client.from('tenants').select('id', { count: 'exact', head: true });
      dbOk = !error;
      checks.push({ ok: dbOk, label: 'Supabase bağlantısı', detail: error?.message || 'Cevap alındı' });
    } catch (e) {
      checks.push({ ok: false, label: 'Supabase bağlantısı', detail: e.message });
    }
  } else {
    checks.push({ ok: false, label: 'Supabase bağlantısı', detail: 'Client oluşturulamadı (config devre dışı?)' });
  }
  stats[0].textContent = dbOk ? 'ONLINE' : 'OFFLINE';

  // 2) RLS bypass (super_admin)
  let rlsOk = false;
  if (client) {
    try {
      const { data, error } = await client.rpc('is_super_admin');
      rlsOk = !error && data === true;
      checks.push({ ok: rlsOk, label: 'RLS — is_super_admin()', detail: rlsOk ? 'true (bypass aktif)' : (error?.message || 'false döndü') });
    } catch (e) {
      checks.push({ ok: false, label: 'RLS — is_super_admin()', detail: e.message });
    }
  } else {
    checks.push({ ok: false, label: 'RLS — is_super_admin()', detail: 'Çevrimdışı mod' });
  }
  stats[1].textContent = rlsOk ? 'BYPASS' : 'BLOCKED';

  // 3) Session
  if (client) {
    const { data: { session } } = await client.auth.getSession();
    stats[2].textContent = session ? 'AKTİF' : 'YOK';
    checks.push({ ok: !!session, label: 'Auth session', detail: session?.user?.email || 'Oturum yok' });
  } else {
    stats[2].textContent = '—';
  }

  // 4) Recent errors from audit
  if (client) {
    const { count } = await client.from('audit_log').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 86400000).toISOString())
      .like('action', '%error%');
    stats[3].textContent = count || 0;
  } else {
    stats[3].textContent = '—';
  }

  // Render checks
  const wrap = document.getElementById('saHealthChecks');
  if (wrap) {
    wrap.innerHTML = checks.map(c => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--sa-line)">
        <span style="width:10px;height:10px;border-radius:50%;background:${c.ok ? 'var(--sa-green)' : 'var(--sa-red)'};box-shadow:0 0 8px ${c.ok ? 'var(--sa-green)' : 'var(--sa-red)'}"></span>
        <strong style="font-size:13px;min-width:220px">${escapeHtml(c.label)}</strong>
        <code style="font-size:11px;color:var(--sa-ink-2);font-family:var(--sa-mono)">${escapeHtml(c.detail)}</code>
      </div>
    `).join('');
  }
}

async function loadRecentErrors() {
  const tbody = document.querySelector('#saHealthErrorsTable tbody');
  if (!tbody) return;
  const client = await getClient();
  let errors = [];
  if (client) {
    const { data } = await client.from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    errors = (data || []).filter(a => /error|denied|fail|reject/i.test((a.action || '') + JSON.stringify(a.details || {})));
  } else {
    errors = mockErrors();
  }
  tbody.innerHTML = '';
  if (!errors.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="sa-empty">Hata kaydı yok ✓</td></tr>';
    return;
  }
  errors.forEach(e => {
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${(e.created_at || '').replace('T', ' ').slice(0, 19)}</td>
        <td><span class="sa-pill sa-pill-archived">${escapeHtml(e.action || '—')}</span></td>
        <td>${escapeHtml(e.actor_email || '—')}</td>
        <td><code style="font-size:10px">${escapeHtml(JSON.stringify(e.details || {}).slice(0, 100))}</code></td>
      </tr>
    `);
  });
}

function mockErrors() {
  return [
    { created_at: new Date(Date.now() - 3600 * 1000).toISOString(), action: 'auth.denied', actor_email: 'unknown@x.com', details: { reason: 'invalid_credentials' } },
    { created_at: new Date(Date.now() - 7200 * 1000).toISOString(), action: 'rls.rejected', actor_email: 'guest@x.com', details: { table: 'tenants', op: 'SELECT' } }
  ];
}
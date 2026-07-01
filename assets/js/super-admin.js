/**
 * SUPER ADMIN — entry point
 * Auth + is_super_admin() check + router
 */
import { getClient } from './lib/db.js';
import { signIn, signOut, getSession } from './lib/auth.js';
import { $ } from './lib/ui.js';
import { renderMetrics } from './super-admin/metrics.js';
import { renderTenants } from './super-admin/tenants.js';
import { renderUsers } from './super-admin/users.js';
import { renderAudit } from './super-admin/audit.js';
import { renderHealth } from './super-admin/health.js';

const VIEWS = {
  metrics: { title: 'Global Metrics',   sub: 'Platform genel görünüm',         render: renderMetrics },
  tenants: { title: 'Tenants',          sub: 'Tüm mimarlık ofislerini yönet',  render: renderTenants },
  users:   { title: 'Users',            sub: 'Kullanıcılar ve rol atamaları',  render: renderUsers },
  audit:   { title: 'Audit Log',        sub: 'Tüm kritik aksiyonların izi',    render: renderAudit },
  health:  { title: 'System Health',    sub: 'Veritabanı ve RLS sağlık',       render: renderHealth }
};

let currentUser = null;

export async function initSuperAdmin() {
  const client = await getClient();
  const state = $('#saConnectionState');
  if (state) {
    state.classList.toggle('is-online', !!client);
    state.innerHTML = client
      ? '<span class="sa-dot"></span>Çevrimiçi'
      : '<span class="sa-dot"></span>Çevrimdışı';
  }

  bindLogin();
  bindLogout();
  bindNav();
  bindBurger();

  try {
    const session = await getSession();
    if (session?.user) {
      const ok = await checkSuperAdmin(session.user);
      if (ok) onAuthSuccess(session.user);
      else showForbidden();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

async function checkSuperAdmin(user) {
  const client = await getClient();
  if (!client) {
    // Çevrimdışı modda UI gating: email allowlist ile basit kontrol
    const allowed = (window.SUPER_ADMIN_EMAILS || []);
    return allowed.includes(user.email);
  }
  // RLS-protected RPC: sadece super_admin true alır
  const { data, error } = await client.rpc('is_super_admin');
  if (error) { console.warn('is_super_admin:', error); return false; }
  return !!data;
}

function showLogin() {
  $('#saLogin').hidden = false;
  $('#saShell').hidden = true;
  $('#saForbidden').hidden = true;
}

function showForbidden() {
  $('#saLogin').hidden = true;
  $('#saShell').hidden = true;
  $('#saForbidden').hidden = false;
}

function onAuthSuccess(user) {
  currentUser = user;
  $('#saLogin').hidden = true;
  $('#saForbidden').hidden = true;
  $('#saShell').hidden = false;
  if (user.email) {
    $('#saUserEmail').textContent = user.email;
    $('#saUserName').textContent = user.email.split('@')[0];
    $('#saUserAvatar').textContent = user.email[0].toUpperCase() + (user.email[1] || '').toUpperCase();
  }
  switchView(currentView());
}

function bindLogin() {
  const form = $('#saLoginForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = new FormData(form);
    const email = (data.get('email') || '').toString().trim();
    const password = (data.get('password') || '').toString();
    const status = $('#saLoginStatus');
    if (status) status.textContent = 'Giriş yapılıyor…';
    try {
      const user = await signIn(email, password);
      const ok = await checkSuperAdmin(user);
      if (ok) onAuthSuccess(user);
      else { await signOut(); showForbidden(); }
    } catch (err) {
      if (status) status.textContent = err.message || 'Giriş başarısız';
    }
  });
}

function bindLogout() {
  $('#saLogoutBtn')?.addEventListener('click', async () => {
    try { await signOut(); } catch {}
    location.reload();
  });
}

function bindBurger() {
  const burger = $('#saBurger');
  const sidebar = $('#saSidebar');
  if (!burger || !sidebar) return;
  burger.addEventListener('click', () => {
    burger.classList.toggle('is-open');
    sidebar.classList.toggle('is-open');
  });
  // Sidebar link tıklandığında mobilde kapat
  sidebar.querySelectorAll('.sa-nav-item').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        burger.classList.remove('is-open');
        sidebar.classList.remove('is-open');
      }
    });
  });
}

function bindNav() {
  document.querySelectorAll('.sa-nav-item[data-view]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });
  window.addEventListener('hashchange', () => switchView(currentView()));
}

export function switchView(view) {
  if (!VIEWS[view]) view = 'metrics';
  document.querySelectorAll('.sa-nav-item[data-view]').forEach(item => {
    item.classList.toggle('is-active', item.dataset.view === view);
  });
  document.querySelectorAll('.sa-view').forEach(v => v.hidden = true);
  const target = document.getElementById('saView-' + view);
  if (target) target.hidden = false;
  const v = VIEWS[view];
  $('#saViewTitle').textContent = v.title;
  $('#saViewSub').textContent = v.sub;
  location.hash = '#' + view;
  v.render();
}

function currentView() {
  return (location.hash || '#metrics').replace('#', '');
}

export function getCurrentUser() { return currentUser; }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initSuperAdmin().catch(err => console.error('initSuperAdmin:', err)));
} else {
  initSuperAdmin().catch(err => console.error('initSuperAdmin:', err));
}
/**
 * Dashboard Entry — Auth check, routing
 * Layout shell.js'te, view'ler /dashboard/*.js'te
 */
import { $, el, toast } from './lib/components/index.js';
import { getSession } from './lib/auth.js';
import { loadTenant, getTenant } from './lib/tenant.js';
import { mountShell, setOnlineState } from './dashboard/shell.js';
import { renderPanel } from './dashboard/panel.js';
import { renderKonseptler } from './dashboard/konseptler.js';
import { renderHizmetler } from './dashboard/hizmetler.js';
import { renderProjeler } from './dashboard/projeler.js';
import { renderMusteriler } from './dashboard/musteriler.js';
import { renderMesajlar } from './dashboard/mesajlar.js';
import { renderRaporlar } from './dashboard/raporlar.js';
import { renderAyarlar } from './dashboard/ayarlar.js';

const VIEWS = {
  panel:      { title: 'Panel',      sub: 'Genel bakış',           render: renderPanel },
  konseptler: { title: 'Konseptler', sub: 'Slider görselleri',     render: renderKonseptler },
  hizmetler:  { title: 'Hizmetler',  sub: 'Sunulan hizmetler',     render: renderHizmetler },
  projeler:   { title: 'Projeler',   sub: 'Portföy & projeler',    render: renderProjeler },
  musteriler: { title: 'Müşteriler', sub: 'Müşteri veritabanı',    render: renderMusteriler },
  mesajlar:   { title: 'Mesajlar',   sub: 'Gelen iletişim',         render: renderMesajlar },
  raporlar:   { title: 'Raporlar',   sub: 'Notlar & görevler',     render: renderRaporlar },
  ayarlar:    { title: 'Ayarlar',    sub: 'Tenant yapılandırması',  render: renderAyarlar }
};

const root = $('#app');

async function init() {
  await loadTenant();
  const session = await getSession();
  if (session?.user) return bootShell(session.user);
  renderLogin();
}

function renderLogin() {
  root.innerHTML = '';
  const tenant = getTenant() || {};
  const screen = el('div', { class: 'login-screen' });

  const brand = el('div', { class: 'login-brand-panel' },
    el('div', { class: 'login-brand-top' },
      el('div', { class: 'login-brand-mark' }, 'MCB'),
      el('div', { class: 'login-brand-name' },
        el('strong', {}, tenant.name || 'Mehmet Can Baykan'),
        el('small', {}, 'Mimar · Admin')
      )
    ),
    el('div', { class: 'login-brand-center' },
      el('span', { class: 'login-brand-eyebrow' }, 'Yönetim Paneli'),
      el('h1', { class: 'login-brand-title', html: 'Mekânı <em>tasarlamak</em>, deneyimi yönetmek.' }),
      el('p', { class: 'login-brand-sub' }, tenant.tagline || 'Portföy, müşteriler, projeler ve iletişim — tümü tek bir yerden.')
    ),
    el('div', { class: 'login-brand-foot' },
      el('span', {}, 'Güvenli giriş'),
      el('span', {}, 'Tenant bazlı RLS'),
      el('span', {}, 'Supabase Auth')
    )
  );

  const formPanel = el('div', { class: 'login-form-panel' },
    el('div', { class: 'login-form-wrap' },
      el('div', { class: 'login-form-head' },
        el('h1', {}, 'Hoş geldiniz'),
        el('p', {}, 'Devam etmek için hesabınıza giriş yapın.')
      ),
      el('form', { class: 'login-form', id: 'loginForm', autocomplete: 'off', onsubmit: handleLogin },
        el('label', {},
          el('span', { class: 'field-label' }, 'E-posta'),
          el('input', { type: 'email', name: 'email', required: true, autocomplete: 'username', placeholder: 'ornek@email.com' })
        ),
        el('label', {},
          el('span', { class: 'field-label' }, 'Şifre'),
          el('input', { type: 'password', name: 'password', required: true, autocomplete: 'current-password', placeholder: '••••••••' })
        ),
        el('button', { type: 'submit', class: 'btn btn-primary btn-full', id: 'loginBtn' },
          el('span', { class: 'btn-content' }, el('span', { class: 'btn-label' }, 'Giriş Yap'))
        ),
        el('p', { class: 'login-form-status', id: 'loginStatus', role: 'status' })
      ),
      el('div', { class: 'login-form-foot' },
        '← ',
        el('a', { href: 'index.html' }, 'Siteye dön')
      )
    )
  );

  screen.append(brand, formPanel);
  root.appendChild(screen);
}

async function handleLogin(e) {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const email = (fd.get('email') || '').toString().trim();
  const password = (fd.get('password') || '').toString();
  const btn = $('#loginBtn');
  const status = $('#loginStatus');
  btn.disabled = true;
  status.textContent = 'Giriş yapılıyor…';
  try {
    const { signIn } = await import('./lib/auth.js');
    const user = await signIn(email, password);
    toast('Hoş geldiniz!', 'success');
    bootShell(user);
  } catch (err) {
    status.textContent = err.message || 'Giriş başarısız';
    toast('Giriş başarısız: ' + (err.message || err), 'error');
  } finally {
    btn.disabled = false;
  }
}

async function bootShell(user) {
  mountShell(user);
  const { getClient } = await import('./lib/db.js');
  const c = await getClient();
  setOnlineState(!!c);
  handleRoute();
  window.addEventListener('hashchange', handleRoute);
}

async function handleRoute() {
  const hash = (location.hash || '#panel').slice(1);
  const key = VIEWS[hash] ? hash : 'panel';
  const view = VIEWS[key];

  document.querySelectorAll('.dash-nav-item[data-view]').forEach(a => {
    a.classList.toggle('is-active', a.dataset.view === key);
  });
  const titleEl = $('#viewTitle');
  const subEl = $('#viewSub');
  if (titleEl) titleEl.textContent = view.title;
  if (subEl) subEl.textContent = view.sub;

  const content = $('#dashContent');
  if (!content) return;
  content.innerHTML = '';
  content.appendChild(el('div', { class: 'dash-loading' }, 'Yükleniyor'));

  try {
    const node = await view.render();
    content.innerHTML = '';
    if (node) content.appendChild(node);
  } catch (err) {
    content.innerHTML = '';
    content.appendChild(el('div', { class: 'dash-empty' },
      el('h4', {}, 'Bir hata oluştu'),
      el('p', {}, err.message || 'Sayfa yüklenemedi.')
    ));
    toast(err.message || 'Yükleme hatası', 'error');
    console.error(err);
  }
  $('#dashSidebar')?.classList.remove('is-open');
  $('#dashOverlay')?.classList.remove('is-open');
}

export function refresh() { return handleRoute(); }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init().catch(e => console.error(e)));
} else {
  init().catch(e => console.error(e));
}
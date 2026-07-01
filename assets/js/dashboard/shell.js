/**
 * Dashboard Shell — Sidebar + Topbar + Layout
 */
import { $, el } from '../lib/components/index.js';
import { signOut } from '../lib/auth.js';
import { getTenant } from '../lib/tenant.js';

const ICONS = {
  home:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  layers:   '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
  sparkle:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></svg>',
  building: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg>',
  user:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  mail:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>',
  chart:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  send:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  burger:   '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  logout:   '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>'
};

const NAV_ITEMS = [
  { hash: '#panel',      icon: 'home',     label: 'Panel',      section: 'Yönetim' },
  { hash: '#konseptler', icon: 'layers',   label: 'Konseptler', section: 'Yönetim' },
  { hash: '#hizmetler',  icon: 'sparkle',  label: 'Hizmetler',  section: 'Yönetim' },
  { hash: '#projeler',   icon: 'building', label: 'Projeler',   section: 'Yönetim' },
  { hash: '#musteriler', icon: 'user',     label: 'Müşteriler', section: 'Yönetim' },
  { hash: '#mesajlar',   icon: 'mail',     label: 'Mesajlar',   section: 'Yönetim' },
  { hash: '#raporlar',   icon: 'chart',    label: 'Raporlar',   section: 'Yönetim' },
  { hash: '#ayarlar',    icon: 'settings', label: 'Ayarlar',    section: 'Sistem' }
];

export function mountShell(user) {
  const root = $('#app');
  root.innerHTML = '';
  const tenant = getTenant() || {};

  const sidebar = el('aside', { class: 'dash-sidebar', id: 'dashSidebar' },
    el('div', { class: 'dash-sidebar-head' },
      el('div', { class: 'dash-sidebar-mark' }, 'MCB'),
      el('div', { class: 'dash-sidebar-name' },
        el('strong', {}, tenant.name || 'Admin'),
        el('small', {}, 'Yönetim Paneli')
      )
    ),
    buildNav(),
    el('div', { class: 'dash-sidebar-foot' },
      el('div', { class: 'dash-user' },
        el('div', { class: 'dash-user-avatar' }, (user.email || 'A')[0].toUpperCase()),
        el('div', { class: 'dash-user-info' },
          el('strong', {}, user.email?.split('@')[0] || 'Admin'),
          el('small', {}, user.email || '—')
        )
      ),
      el('button', { class: 'btn btn-ghost btn-sm btn-full', onclick: handleLogout },
        el('span', { class: 'btn-content' },
          el('span', { class: 'btn-icon', html: ICONS.logout }),
          el('span', { class: 'btn-label' }, 'Çıkış Yap')
        )
      )
    )
  );

  const topbar = el('header', { class: 'dash-topbar' },
    el('div', { class: 'dash-topbar-left' },
      el('button', { class: 'dash-burger', id: 'dashBurger', 'aria-label': 'Menüyü aç', onclick: toggleSidebar },
        el('span', { html: ICONS.burger })
      ),
      el('div', { class: 'dash-topbar-title' },
        el('h1', { id: 'viewTitle' }, 'Panel'),
        el('small', { id: 'viewSub' }, 'Genel bakış')
      )
    ),
    el('div', { class: 'dash-topbar-right' },
      el('span', { class: 'dash-online-state', id: 'onlineState' },
        el('span', { class: 'label-text' }, 'Çevrimiçi')
      )
    )
  );

  const main = el('main', { class: 'dash-main' },
    topbar,
    el('div', { class: 'dash-content', id: 'dashContent' })
  );

  const overlay = el('div', { class: 'dash-overlay', id: 'dashOverlay', onclick: toggleSidebar });

  root.append(overlay, el('div', { class: 'dash-shell' }, sidebar, main));
}

function buildNav() {
  const nav = el('nav', { class: 'dash-nav', 'aria-label': 'Yönetim menüsü' });
  let lastSection = '';
  NAV_ITEMS.forEach(it => {
    if (it.section !== lastSection) {
      nav.appendChild(el('div', { class: 'dash-nav-section' }, it.section));
      lastSection = it.section;
    }
    nav.appendChild(el('a', { href: it.hash, class: 'dash-nav-item', 'data-view': it.hash.slice(1) },
      el('span', { class: 'dash-nav-icon', html: ICONS[it.icon] || '' }),
      el('span', {}, it.label)
    ));
  });
  nav.appendChild(el('a', { href: 'index.html', class: 'dash-nav-item', target: '_blank' },
    el('span', { class: 'dash-nav-icon', html: ICONS.send }),
    el('span', {}, 'Siteyi Aç')
  ));
  return nav;
}

export function toggleSidebar() {
  $('#dashSidebar')?.classList.toggle('is-open');
  $('#dashOverlay')?.classList.toggle('is-open');
}

export function setOnlineState(online) {
  const el = $('#onlineState');
  if (!el) return;
  el.classList.toggle('is-online', !!online);
  const txt = el.querySelector('.label-text');
  if (txt) txt.textContent = online ? 'Çevrimiçi' : 'Çevrimdışı';
}

async function handleLogout() {
  try { await signOut(); } catch {}
  location.reload();
}
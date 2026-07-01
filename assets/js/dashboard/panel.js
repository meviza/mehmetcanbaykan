/**
 * Panel — istatistikler + son mesajlar + son raporlar
 */
import { el, Card, Grid } from '../lib/components/index.js';
import { getDb } from './api.js';

export async function renderPanel() {
  const c = await getDb();
  const wrap = el('div', {});

  if (!c) {
    wrap.appendChild(el('div', { class: 'dash-empty' },
      el('h4', {}, 'Çevrimdışı'),
      el('p', {}, 'Supabase bağlantısı yok — istatistikler görüntülenemiyor.')
    ));
    return wrap;
  }

  // Paralel fetch — RLS otomatik tenant filtresi uygular
  const [projects, customers, messages, reports] = await Promise.all([
    c.from('projects').select('id', { count: 'exact', head: true }),
    c.from('customers').select('id', { count: 'exact', head: true }),
    c.from('messages').select('*').order('created_at', { ascending: false }).limit(5),
    c.from('reports').select('id', { count: 'exact', head: true })
  ]);

  const newMsgCount = (messages.data || []).filter(m => m.status === 'new').length;
  const totalMsg = await c.from('messages').select('id', { count: 'exact', head: true });

  const stats = el('div', { class: 'dash-stats' },
    stat('Toplam Proje', projects.count ?? 0, 'building'),
    stat('Müşteriler', customers.count ?? 0, 'user'),
    stat('Toplam Mesaj', totalMsg.count ?? 0, 'mail'),
    stat('Yeni Mesaj', newMsgCount, 'mail', newMsgCount > 0 ? 'Bekleyen' : '—'),
    stat('Raporlar', reports.count ?? 0, 'chart')
  );
  wrap.appendChild(stats);

  const recent = el('div', { class: 'dash-panel' },
    el('div', { class: 'dash-panel-head' },
      el('h3', {}, 'Son Mesajlar'),
      el('a', { href: '#mesajlar', class: 'link' }, 'Tümü →')
    ),
    el('div', { class: 'dash-panel-body' },
      buildMsgTable(messages.data || [])
    )
  );
  wrap.appendChild(recent);
  return wrap;
}

function stat(label, value, icon, delta) {
  const icons = {
    building: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    mail: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>',
    chart: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>'
  };
  return el('div', { class: 'dash-stat' },
    el('div', { class: 'dash-stat-icon', html: icons[icon] || '' }),
    el('div', { class: 'dash-stat-label' }, label),
    el('div', { class: 'dash-stat-value' }, String(value ?? 0)),
    delta && el('div', { class: 'dash-stat-delta' }, delta)
  );
}

function buildMsgTable(rows) {
  if (!rows.length) return emptyState('Henüz mesaj yok', 'İletişim formundan gelen mesajlar burada görünecek.');
  const table = el('table', { class: 'dash-table' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'Tarih'),
      el('th', {}, 'Gönderen'),
      el('th', {}, 'Konu'),
      el('th', {}, 'Mesaj'),
      el('th', {}, 'Durum')
    )),
    el('tbody', {}, ...rows.map(r => el('tr', {},
      el('td', {}, formatDateTime(r.created_at)),
      el('td', {}, r.sender_name || '—'),
      el('td', {}, r.service_interest || '—'),
      el('td', {}, (r.body || '').slice(0, 60) + ((r.body || '').length > 60 ? '…' : '')),
      el('td', {}, el('span', { class: `dash-tag dash-tag-${r.status}` }, r.status))
    )))
  );
  return el('div', { class: 'dash-table-wrap' }, table);
}

function emptyState(title, sub) {
  return el('div', { class: 'dash-empty' },
    el('h4', {}, title),
    el('p', {}, sub)
  );
}
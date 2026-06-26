/**
 * Admin Dashboard view
 * Stats + recent messages + recent reports
 */

import { el } from '../../lib/components/atoms.js';
import { Pill } from '../../lib/components/atoms.js';
import * as repo from '../../lib/repo.js';
import { formatDate } from '../../lib/ui.js';

export async function renderDashboard() {
  const stats = await repo.getDashboardStats().catch(() => ({
    projectCount: 0, publishedCount: 0, newMessages: 0, openReports: 0
  }));

  const statsRow = document.querySelector('.stats-row');
  if (statsRow) {
    statsRow.innerHTML = '';
    [
      ['Toplam Proje', stats.projectCount],
      ['Yayında', stats.publishedCount],
      ['Yeni Mesaj', stats.newMessages],
      ['Açık Görev', stats.openReports]
    ].forEach(([label, value]) => {
      statsRow.appendChild(el('div', { class: 'stat-tile' },
        el('span', {}, label),
        el('strong', {}, String(value))
      ));
    });
  }

  const messages = await repo.listMessages().catch(() => []);
  const reports = await repo.listReports().catch(() => []);

  const msgsTbody = document.querySelector('#recentMessages tbody');
  if (msgsTbody) {
    msgsTbody.innerHTML = '';
    if (!messages.length) {
      msgsTbody.appendChild(el('tr', {}, el('td', { colspan: 5, class: 'empty-state' }, 'Henüz mesaj yok.')));
    } else {
      messages.slice(0, 5).forEach(m => {
        msgsTbody.appendChild(el('tr', {},
          el('td', {}, formatDate(m.sent_at)),
          el('td', {}, m.sender_name || m.customer?.name || '—'),
          el('td', {}, m.sender_phone || m.customer?.phone || '—'),
          el('td', {}, m.service || '—'),
          el('td', { html: Pill({ status: m.status || 'new' }) })
        ));
      });
    }
  }

  const repsTbody = document.querySelector('#recentReports tbody');
  if (repsTbody) {
    repsTbody.innerHTML = '';
    if (!reports.length) {
      repsTbody.appendChild(el('tr', {}, el('td', { colspan: 4, class: 'empty-state' }, 'Henüz rapor yok.')));
    } else {
      reports.slice(0, 5).forEach(r => {
        repsTbody.appendChild(el('tr', {},
          el('td', {}, formatDate(r.created_at)),
          el('td', {}, r.title),
          el('td', {}, r.type),
          el('td', { html: Pill({ status: r.status || 'open' }) })
        ));
      });
    }
  }

  const badge = document.getElementById('messagesBadge');
  if (badge) {
    badge.textContent = String(stats.newMessages);
    badge.hidden = stats.newMessages === 0;
  }
}
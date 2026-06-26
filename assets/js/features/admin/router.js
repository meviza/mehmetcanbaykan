/**
 * Admin router — view switching + data orchestration
 */

import * as dashboard from './dashboard.js';
import * as customers from './customers.js';
import * as projects from './projects.js';
import * as reports from './reports.js';
import * as messages from './messages.js';

const VIEWS = {
  dashboard: { title: 'Panel', sub: 'Genel bakış', render: () => dashboard.renderDashboard() },
  customers: { title: 'Müşteriler', sub: 'Tüm müşterileri yönet', render: () => customers.renderCustomers() },
  projects:  { title: 'Projeler',  sub: 'Tüm projeleri yönet',  render: () => projects.renderProjects() },
  messages:  { title: 'Mesajlar',  sub: 'Müşteri talepleri',   render: () => messages.renderMessages() },
  reports:   { title: 'Raporlar',  sub: 'Görevler, notlar',    render: () => reports.renderReports() }
};

export function switchView(view) {
  if (!VIEWS[view]) view = 'dashboard';
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.classList.toggle('is-active', item.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  const target = document.getElementById('view-' + view);
  if (target) target.hidden = false;
  const v = VIEWS[view];
  document.getElementById('viewTitle').textContent = v.title;
  document.getElementById('viewSub').textContent = v.sub;
  location.hash = '#' + view;
  v.render();
}

export function currentView() {
  return (location.hash || '#dashboard').replace('#', '');
}

export function bindNav() {
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });
  window.addEventListener('hashchange', () => switchView(currentView()));
}
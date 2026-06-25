/**
 * Admin Paneli
 * Görünümler: dashboard, customers, projects, projects-detail (permits), messages, reports
 */
import { getClient } from '../lib/db.js';
import { signIn, signOut, getSession } from '../lib/auth.js';
import { SUPABASE_CONFIG } from '../config.js';
import {
  $, $$, el, escapeHtml, formatDate, formatDateTime, toast, showModal, confirmDialog, statusPill
} from '../lib/ui.js';
import * as repo from '../lib/repo.js';

const VIEWS = {
  dashboard: { title: 'Panel', sub: 'Genel bakış', render: renderDashboard },
  customers: { title: 'Müşteriler', sub: 'Tüm müşterileri yönet', render: renderCustomers },
  projects: { title: 'Projeler', sub: 'Tüm projeleri yönet', render: renderProjects },
  messages: { title: 'Mesajlar', sub: 'Müşteri talepleri', render: renderMessages },
  reports: { title: 'Raporlar', sub: 'Görevler, notlar', render: renderReports }
};

let state = {
  user: null,
  data: { customers: [], projects: [], permits: [], messages: [], reports: [] }
};

export async function initAdmin() {
  // Oturum kontrolü
  try {
    const session = await getSession();
    if (session?.user) {
      onLoginSuccess(session.user);
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }

  bindLogin();
  bindNav();
  bindGlobalActions();
  bindModalClose();
}

function showLogin() {
  $('#loginScreen').hidden = false;
  $('#adminShell').hidden = true;
}

function onLoginSuccess(user) {
  state.user = user;
  $('#loginScreen').hidden = true;
  $('#adminShell').hidden = false;
  if (user.email) {
    $('#userEmail').textContent = user.email;
    $('#userName').textContent = user.email.split('@')[0];
    $('#userAvatar').textContent = user.email[0].toUpperCase();
  }
  // Çevrimiçi durum rozeti
  const stateBadge = $('#supabaseState');
  if (stateBadge) {
    stateBadge.textContent = 'Çevrimiçi (Supabase)';
    stateBadge.classList.add('is-online');
  }
  loadAllData();
}

function bindLogin() {
  const form = $('#loginForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = new FormData(form);
    const email = data.get('email')?.toString().trim();
    const password = data.get('password')?.toString();
    const status = $('#loginStatus');
    if (status) status.textContent = 'Giriş yapılıyor…';

    try {
      const user = await signIn(email, password);
      onLoginSuccess(user);
    } catch (err) {
      if (status) status.textContent = err.message || 'Giriş başarısız';
    }
  });
}

function bindGlobalActions() {
  $('#logoutBtn')?.addEventListener('click', async () => {
    try { await signOut(); } catch {}
    location.reload();
  });
}

function bindModalClose() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modal = $('.modal');
      if (modal) modal.remove();
    }
  });
}

function bindNav() {
  $$('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });
  window.addEventListener('hashchange', () => switchView(currentHash()));
  switchView(currentHash());
}

function currentHash() {
  return (location.hash || '#dashboard').replace('#', '');
}

function switchView(view) {
  if (!VIEWS[view]) view = 'dashboard';
  $$('.nav-item[data-view]').forEach(item => {
    item.classList.toggle('is-active', item.dataset.view === view);
  });
  $$('.view').forEach(v => v.hidden = true);
  const target = $(`#view-${view}`);
  if (target) target.hidden = false;
  const v = VIEWS[view];
  $('#viewTitle').textContent = v.title;
  $('#viewSub').textContent = v.sub;
  location.hash = '#' + view;
  v.render();
}

async function loadAllData() {
  try {
    const [customers, projects, messages, reports, permits] = await Promise.all([
      repo.listCustomers().catch(() => []),
      repo.listAllProjects().catch(() => []),
      repo.listMessages().catch(() => []),
      repo.listReports().catch(() => []),
      repo.listAllPermits().catch(() => [])
    ]);
    state.data = { customers, projects, messages, reports, permits };
  } catch (e) {
    console.error('Veri yükleme hatası:', e);
    toast('Veriler yüklenemedi: ' + e.message, 'error');
  }
  // Eğer dashboard görünürse yeniden render et
  if (!($('#view-dashboard')?.hidden ?? true)) renderDashboard();
}

// ============================================================================
// DASHBOARD
// ============================================================================
async function renderDashboard() {
  // Sayfa ilk kez açıldıysa veriyi çek
  if (!state.data.customers.length && !state.data.projects.length) {
    try {
      await loadAllData();
    } catch (e) { /* hata zaten loglandı */ }
  }
  const stats = await repo.getDashboardStats();
  set('statProjects', stats.projectCount);
  set('statPublished', stats.publishedCount);
  set('statMessages', stats.newMessages);
  set('statReports', stats.openReports);

  // Son mesajlar
  const recentMsgs = state.data.messages.slice(0, 5);
  const msgTbody = $('#recentMessages tbody');
  if (msgTbody) {
    msgTbody.innerHTML = recentMsgs.length
      ? recentMsgs.map(m => `
        <tr>
          <td>${formatDate(m.sent_at)}</td>
          <td>${escapeHtml(m.sender_name || m.customer?.name || '—')}</td>
          <td>${escapeHtml(m.sender_phone || m.customer?.phone || '—')}</td>
          <td>${escapeHtml(m.service || '—')}</td>
          <td>${statusPill(m.status || 'new')}</td>
        </tr>`).join('')
      : `<tr><td colspan="5" class="empty-state">Henüz mesaj yok.</td></tr>`;
  }

  // Son raporlar
  const recentReps = state.data.reports.slice(0, 5);
  const repTbody = $('#recentReports tbody');
  if (repTbody) {
    repTbody.innerHTML = recentReps.length
      ? recentReps.map(r => `
        <tr>
          <td>${formatDate(r.created_at)}</td>
          <td>${escapeHtml(r.title)}</td>
          <td>${escapeHtml(r.type)}</td>
          <td>${statusPill(r.status || 'open')}</td>
        </tr>`).join('')
      : `<tr><td colspan="4" class="empty-state">Henüz rapor yok.</td></tr>`;
  }

  // Sidebar badge
  const badge = $('#messagesBadge');
  if (badge) {
    badge.textContent = stats.newMessages;
    badge.hidden = stats.newMessages === 0;
  }
}

function set(id, val) { const el = $(`#${id}`); if (el) el.textContent = val; }

// ============================================================================
// CUSTOMERS
// ============================================================================
function renderCustomers() {
  const tbody = $('#customersTable tbody');
  if (!tbody) return;
  const list = state.data.customers;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Henüz müşteri yok.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(c => `
    <tr>
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td>${escapeHtml(c.type || 'individual')}</td>
      <td>${escapeHtml(c.phone || '—')}</td>
      <td>${escapeHtml(c.email || '—')}</td>
      <td>${escapeHtml(c.city || '—')}</td>
      <td class="actions">
        <button class="btn-view" data-action="view-customer" data-id="${c.id}">Detay</button>
        <button class="btn-edit" data-action="edit-customer" data-id="${c.id}">Düzenle</button>
        <button class="btn-delete" data-action="delete-customer" data-id="${c.id}">Sil</button>
      </td>
    </tr>
  `).join('');
  bindTableActions(tbody);
}

function openCustomerModal(customer) {
  const isNew = !customer;
  customer = customer || { name: '', type: 'individual', phone: '', email: '', city: 'Siirt', notes: '' };
  const body = el('form', { class: 'form-grid', id: 'customerForm' },
    el('label', { class: 'full' }, el('span', {}, 'Ad *'),
      el('input', { name: 'name', required: true, value: customer.name })),
    el('label', {}, el('span', {}, 'Tür'),
      el('select', { name: 'type' },
        el('option', { value: 'individual', selected: customer.type === 'individual' }, 'Bireysel'),
        el('option', { value: 'corporate', selected: customer.type === 'corporate' }, 'Kurumsal'))),
    el('label', {}, el('span', {}, 'Telefon'),
      el('input', { name: 'phone', value: customer.phone || '' })),
    el('label', {}, el('span', {}, 'E-posta'),
      el('input', { type: 'email', name: 'email', value: customer.email || '' })),
    el('label', {}, el('span', {}, 'Şehir'),
      el('input', { name: 'city', value: customer.city || 'Siirt' })),
    el('label', { class: 'full' }, el('span', {}, 'Adres'),
      el('input', { name: 'address', value: customer.address || '' })),
    el('label', { class: 'full' }, el('span', {}, 'Notlar'),
      el('textarea', { name: 'notes', rows: 3 }, customer.notes || '')),
    el('div', { class: 'full modal-actions' },
      el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: e => e.target.closest('.modal').remove() }, 'İptal'),
      el('button', { type: 'submit', class: 'btn btn-primary btn-sm' }, isNew ? 'Oluştur' : 'Güncelle'))
  );
  showModal({ title: isNew ? 'Yeni Müşteri' : 'Müşteriyi Düzenle', body });
  body.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(body).entries());
    try {
      if (isNew) await repo.createCustomer(data);
      else await repo.updateCustomer(customer.id, data);
      toast('Müşteri kaydedildi.', 'success');
      document.querySelector('.modal')?.remove();
      await loadAllData();
      renderCustomers();
    } catch (err) { toast('Hata: ' + err.message, 'error'); }
  });
}

// ============================================================================
// PROJECTS
// ============================================================================
function renderProjects() {
  const tbody = $('#projectsTable tbody');
  const search = $('#projectSearch');
  if (!tbody) return;

  const apply = () => {
    const q = search?.value?.toLowerCase() || '';
    const list = state.data.projects.filter(p => {
      if (!q) return true;
      return (p.title || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.customer_name || '').toLowerCase().includes(q);
    });
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Proje bulunamadı.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(p => `
      <tr>
        <td><code>${escapeHtml(p.id)}</code></td>
        <td><strong>${escapeHtml(p.title)}</strong></td>
        <td>${escapeHtml(p.category_label || p.category || '—')}</td>
        <td>${p.year || '—'}</td>
        <td>${escapeHtml(p.location || '—')}</td>
        <td>${escapeHtml(p.customer_name || '—')}</td>
        <td>${statusPill(p.is_published ? 'published' : 'draft')}</td>
        <td class="actions">
          <button class="btn-view" data-action="view-project" data-id="${p.id}">Gör</button>
          <button class="btn-edit" data-action="edit-project" data-id="${p.id}">Düzenle</button>
          <button class="btn-delete" data-action="delete-project" data-id="${p.id}">Sil</button>
        </td>
      </tr>
    `).join('');
    bindTableActions(tbody);
  };

  if (search && !search.dataset.bound) {
    search.addEventListener('input', apply);
    search.dataset.bound = '1';
  }
  $('#newProjectBtn')?.removeEventListener('click', openNewProject);
  $('#newProjectBtn')?.addEventListener('click', openNewProject);
  apply();
}

function openNewProject() { openProjectModal(null); }

function openProjectModal(project) {
  const isNew = !project;
  project = project || {
    id: 'proj-' + Date.now().toString(36),
    title: '', category: 'restorasyon', category_label: 'Restorasyon',
    year: new Date().getFullYear(), location: '', area: '', duration: '',
    status: 'devam-ediyor', summary: '', image: '', tags: [],
    content: { intro: '', climate: '', soil: '', neighborhood: '', regulations: '', equations: '', process: [], outcome: '' },
    is_published: false, customer_id: ''
  };

  const cats = [
    ['restorasyon', 'Restorasyon'],
    ['ic-tasarim', 'İç Tasarım'],
    ['vaziyet', 'Vaziyet'],
    ['kat-plani', 'Kat Planları'],
    ['peyzaj', 'Peyzaj'],
    ['tas-ahsap', 'Taş & Ahşap']
  ];
  const statuses = [
    ['devam-ediyor', 'Devam Ediyor'],
    ['tamamlandi', 'Tamamlandı'],
    ['beklemede', 'Beklemede'],
    ['iptal', 'İptal']
  ];

  const customerOptions = state.data.customers.map(c =>
    el('option', { value: c.id, selected: project.customer_id === c.id }, c.name + (c.phone ? ' (' + c.phone + ')' : ''))
  );

  const body = el('form', { class: 'form-grid', id: 'projectForm' },
    el('label', { class: 'full' }, el('span', {}, 'Başlık *'),
      el('input', { name: 'title', required: true, value: project.title })),
    el('label', {}, el('span', {}, 'ID (slug)'),
      el('input', { name: 'id', value: project.id, readonly: !isNew })),
    el('label', {}, el('span', {}, 'Müşteri *'),
      el('select', { name: 'customer_id', required: true },
        el('option', { value: '' }, 'Seçiniz...'),
        ...customerOptions)),
    el('label', {}, el('span', {}, 'Kategori *'),
      el('select', { name: 'category' },
        ...cats.map(([v, l]) => el('option', { value: v, selected: project.category === v }, l)))),
    el('label', {}, el('span', {}, 'Yıl'),
      el('input', { type: 'number', name: 'year', value: project.year || '' })),
    el('label', {}, el('span', {}, 'Konum'),
      el('input', { name: 'location', value: project.location || '' })),
    el('label', {}, el('span', {}, 'Alan'),
      el('input', { name: 'area', value: project.area || '' })),
    el('label', {}, el('span', {}, 'Süre'),
      el('input', { name: 'duration', value: project.duration || '' })),
    el('label', {}, el('span', {}, 'Durum'),
      el('select', { name: 'status' },
        ...statuses.map(([v, l]) => el('option', { value: v, selected: project.status === v }, l)))),
    el('label', { class: 'full' }, el('span', {}, 'Etiketler (virgülle)'),
      el('input', { name: 'tags', value: (project.tags || []).join(', ') })),
    el('label', { class: 'full' }, el('span', {}, 'Özet'),
      el('textarea', { name: 'summary', rows: 2 }, project.summary || '')),
    el('label', { class: 'full' }, el('span', {}, 'Kapak Görseli URL'),
      el('input', { name: 'image', value: project.image || '', placeholder: 'assets/images/projects/...' })),
    el('label', { class: 'full' }, el('span', {}, 'Giriş'),
      el('textarea', { name: 'intro', rows: 3 }, project.content?.intro || '')),
    el('label', { class: 'full' }, el('span', {}, 'İklim & Hava Koşulları'),
      el('textarea', { name: 'climate', rows: 3 }, project.content?.climate || '')),
    el('label', { class: 'full' }, el('span', {}, 'Zemin & Temel'),
      el('textarea', { name: 'soil', rows: 3 }, project.content?.soil || '')),
    el('label', { class: 'full' }, el('span', {}, 'Sokak & Mahalle Mimarisi'),
      el('textarea', { name: 'neighborhood', rows: 3 }, project.content?.neighborhood || '')),
    el('label', { class: 'full' }, el('span', {}, 'Mevzuat & Ruhsat Süreci'),
      el('textarea', { name: 'regulations', rows: 3 }, project.content?.regulations || '')),
    el('label', { class: 'full' }, el('span', {}, 'Mimari Denklemler'),
      el('textarea', { name: 'equations', rows: 3 }, project.content?.equations || '')),
    el('label', { class: 'full' }, el('span', {}, 'Süreç Adımları (her satır bir adım)'),
      el('textarea', { name: 'process', rows: 4 }, (project.content?.process || []).join('\n'))),
    el('label', { class: 'full' }, el('span', {}, 'Sonuç & Teslim'),
      el('textarea', { name: 'outcome', rows: 3 }, project.content?.outcome || '')),
    el('label', { class: 'checkbox full' },
      el('input', { type: 'checkbox', name: 'is_published', checked: project.is_published }),
      el('span', {}, 'Yayında')),
    el('div', { class: 'full modal-actions' },
      el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: e => e.target.closest('.modal').remove() }, 'İptal'),
      el('button', { type: 'submit', class: 'btn btn-primary btn-sm' }, isNew ? 'Oluştur' : 'Güncelle'))
  );

  showModal({ title: isNew ? 'Yeni Proje' : 'Projeyi Düzenle: ' + project.title, body });

  body.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(body).entries());
    const payload = {
      id: data.id,
      customer_id: data.customer_id || null,
      title: data.title,
      category: data.category,
      category_label: cats.find(c => c[0] === data.category)?.[1] || data.category,
      year: parseInt(data.year, 10) || null,
      location: data.location || null,
      area: data.area || null,
      duration: data.duration || null,
      status: data.status,
      summary: data.summary,
      image: data.image || null,
      tags: (data.tags || '').split(',').map(s => s.trim()).filter(Boolean),
      content: {
        intro: data.intro,
        climate: data.climate,
        soil: data.soil,
        neighborhood: data.neighborhood,
        regulations: data.regulations,
        equations: data.equations,
        process: (data.process || '').split('\n').map(s => s.trim()).filter(Boolean),
        outcome: data.outcome
      },
      is_published: body.querySelector('[name=is_published]').checked
    };

    try {
      if (isNew) await repo.createProject(payload);
      else await repo.updateProject(project.id, payload);
      toast('Proje kaydedildi.', 'success');
      document.querySelector('.modal')?.remove();
      await loadAllData();
      renderProjects();
    } catch (err) { toast('Hata: ' + err.message, 'error'); }
  });
}

// ============================================================================
// MESSAGES
// ============================================================================
function renderMessages() {
  const tbody = $('#messagesTable tbody');
  const filter = $('#messageFilter');
  if (!tbody) return;

  const apply = () => {
    const f = filter?.value || 'all';
    const list = state.data.messages.filter(m => f === 'all' || (m.status || 'new') === f);
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Mesaj bulunamadı.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(m => `
      <tr>
        <td>${formatDateTime(m.sent_at)}</td>
        <td><strong>${escapeHtml(m.sender_name || m.customer?.name || '—')}</strong></td>
        <td>${escapeHtml(m.sender_phone || m.customer?.phone || '—')}</td>
        <td>${escapeHtml(m.service || '—')}</td>
        <td><small>${escapeHtml((m.body || '').slice(0, 80))}${(m.body || '').length > 80 ? '…' : ''}</small></td>
        <td>${statusPill(m.status || 'new')}</td>
        <td class="actions">
          <button class="btn-view" data-action="view-message" data-id="${m.id}">Gör</button>
          <button class="btn-delete" data-action="delete-message" data-id="${m.id}">Sil</button>
        </td>
      </tr>
    `).join('');
    bindTableActions(tbody);
  };

  if (filter && !filter.dataset.bound) {
    filter.addEventListener('change', apply);
    filter.dataset.bound = '1';
  }
  apply();
}

function openMessageModal(m) {
  const phoneDigits = (m.sender_phone || m.customer?.phone || '').replace(/\D/g, '');
  const waUrl = phoneDigits ? `https://wa.me/${phoneDigits}` : '#';
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px;' },
    el('div', {}, el('strong', {}, 'Gönderen: '), escapeHtml(m.sender_name || m.customer?.name || '—')),
    el('div', {}, el('strong', {}, 'Telefon: '), escapeHtml(m.sender_phone || m.customer?.phone || '—')),
    el('div', {}, el('strong', {}, 'E-posta: '), escapeHtml(m.sender_email || m.customer?.email || '—')),
    el('div', {}, el('strong', {}, 'Konu: '), escapeHtml(m.service || '—')),
    el('div', {}, el('strong', {}, 'Müşteri: '), escapeHtml(m.customer?.name || '—')),
    el('div', {}, el('strong', {}, 'Tarih: '), formatDateTime(m.sent_at)),
    el('hr', { style: 'border-color:rgba(255,255,255,0.06);' }),
    el('div', {}, el('strong', {}, 'Mesaj:'),
      el('p', { style: 'margin-top:8px;color:rgba(246,243,238,0.8);white-space:pre-wrap;' }, m.body || '')),
    el('label', { style: 'display:flex;flex-direction:column;gap:6px;' },
      el('span', { style: 'font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(246,243,238,0.6);' }, 'Durum'),
      el('select', { id: 'messageStatus' },
        ['new', 'read', 'replied', 'archived'].map(s =>
          el('option', { value: s, selected: m.status === s }, s)))),
    el('label', { style: 'display:flex;flex-direction:column;gap:6px;' },
      el('span', { style: 'font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(246,243,238,0.6);' }, 'Admin Notu'),
      el('textarea', { id: 'messageNote', rows: 3 }, m.admin_note || '')),
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-ghost btn-sm', onclick: e => e.target.closest('.modal').remove() }, 'Kapat'),
      waUrl !== '#' ? el('a', { href: waUrl, target: '_blank', rel: 'noopener', class: 'btn btn-primary btn-sm' }, 'WhatsApp\'tan Yanıtla') : null,
      el('button', { class: 'btn btn-primary btn-sm', id: 'saveMessageBtn' }, 'Kaydet'))
  );
  showModal({ title: 'Mesaj Detayı', body });
  $('#saveMessageBtn')?.addEventListener('click', async () => {
    const patch = {
      status: $('#messageStatus').value,
      admin_note: $('#messageNote').value,
      replied_at: $('#messageStatus').value === 'replied' ? new Date().toISOString() : null
    };
    try {
      await repo.updateMessage(m.id, patch);
      toast('Mesaj güncellendi.', 'success');
      document.querySelector('.modal')?.remove();
      await loadAllData();
      renderMessages();
    } catch (err) { toast('Hata: ' + err.message, 'error'); }
  });
}

// ============================================================================
// REPORTS
// ============================================================================
function renderReports() {
  const tbody = $('#reportsTable tbody');
  if (!tbody) return;
  const list = state.data.reports;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Henüz rapor yok.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(r => `
    <tr>
      <td>${formatDate(r.created_at)}</td>
      <td><strong>${escapeHtml(r.title)}</strong></td>
      <td>${escapeHtml(r.type)}</td>
      <td>${escapeHtml(r.customer?.name || '—')}</td>
      <td>${escapeHtml(r.project?.title || '—')}</td>
      <td>${statusPill(r.status || 'open')}</td>
      <td class="actions">
        <button class="btn-edit" data-action="edit-report" data-id="${r.id}">Düzenle</button>
        <button class="btn-delete" data-action="delete-report" data-id="${r.id}">Sil</button>
      </td>
    </tr>
  `).join('');
  bindTableActions(tbody);

  $('#newReportBtn')?.removeEventListener('click', openNewReport);
  $('#newReportBtn')?.addEventListener('click', openNewReport);
}

function openNewReport() { openReportModal(null); }

function openReportModal(report) {
  const isNew = !report;
  report = report || { title: '', type: 'not', body: '', status: 'open', priority: 'normal', due_date: '', customer_id: '', project_id: '' };
  const types = [
    ['gorev', 'Görev'],
    ['not', 'Not'],
    ['teklif', 'Teklif'],
    ['gorusme', 'Görüşme'],
    ['saha', 'Saha'],
    ['sozlesme', 'Sözleşme'],
    ['fatura', 'Fatura'],
    ['toplanti', 'Toplantı']
  ];
  const statuses = [['open', 'Açık'], ['in-progress', 'Devam Ediyor'], ['done', 'Tamamlandı'], ['archived', 'Arşiv']];
  const priorities = [['low', 'Düşük'], ['normal', 'Normal'], ['high', 'Yüksek'], ['urgent', 'Acil']];

  const customerOpts = state.data.customers.map(c =>
    el('option', { value: c.id, selected: report.customer_id === c.id }, c.name));
  const projectOpts = state.data.projects.map(p =>
    el('option', { value: p.id, selected: report.project_id === p.id }, p.title));

  const body = el('form', { class: 'form-grid', id: 'reportForm' },
    el('label', { class: 'full' }, el('span', {}, 'Başlık *'),
      el('input', { name: 'title', required: true, value: report.title })),
    el('label', {}, el('span', {}, 'Tür'),
      el('select', { name: 'type' },
        ...types.map(([v, l]) => el('option', { value: v, selected: report.type === v }, l)))),
    el('label', {}, el('span', {}, 'Öncelik'),
      el('select', { name: 'priority' },
        ...priorities.map(([v, l]) => el('option', { value: v, selected: report.priority === v }, l)))),
    el('label', {}, el('span', {}, 'Müşteri'),
      el('select', { name: 'customer_id' },
        el('option', { value: '' }, '—'), ...customerOpts)),
    el('label', {}, el('span', {}, 'Proje'),
      el('select', { name: 'project_id' },
        el('option', { value: '' }, '—'), ...projectOpts)),
    el('label', {}, el('span', {}, 'Durum'),
      el('select', { name: 'status' },
        ...statuses.map(([v, l]) => el('option', { value: v, selected: report.status === v }, l)))),
    el('label', {}, el('span', {}, 'Termin'),
      el('input', { type: 'date', name: 'due_date', value: report.due_date || '' })),
    el('label', { class: 'full' }, el('span', {}, 'İçerik'),
      el('textarea', { name: 'body', rows: 5 }, report.body || '')),
    el('div', { class: 'full modal-actions' },
      el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: e => e.target.closest('.modal').remove() }, 'İptal'),
      el('button', { type: 'submit', class: 'btn btn-primary btn-sm' }, isNew ? 'Oluştur' : 'Güncelle'))
  );

  showModal({ title: isNew ? 'Yeni Rapor' : 'Raporu Düzenle', body });
  body.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(body).entries());
    const payload = {
      title: data.title,
      type: data.type,
      priority: data.priority,
      status: data.status,
      body: data.body,
      due_date: data.due_date || null,
      customer_id: data.customer_id || null,
      project_id: data.project_id || null
    };
    try {
      if (isNew) await repo.createReport(payload);
      else await repo.updateReport(report.id, payload);
      toast('Rapor kaydedildi.', 'success');
      document.querySelector('.modal')?.remove();
      await loadAllData();
      renderReports();
    } catch (err) { toast('Hata: ' + err.message, 'error'); }
  });
}

// ============================================================================
// TABLE ACTIONS
// ============================================================================
function bindTableActions(scope) {
  scope.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      handleAction(action, id);
    });
  });
}

async function handleAction(action, id) {
  switch (action) {
    case 'view-customer': {
      const c = state.data.customers.find(x => x.id === id);
      if (c) openCustomerModal(c);
      break;
    }
    case 'edit-customer': {
      const c = state.data.customers.find(x => x.id === id);
      if (c) openCustomerModal(c);
      break;
    }
    case 'delete-customer':
      if (await confirmDialog('Bu müşteriyi silmek istediğinize emin misiniz?')) {
        try { await repo.deleteCustomer(id); toast('Müşteri silindi.', 'success'); await loadAllData(); renderCustomers(); }
        catch (e) { toast('Hata: ' + e.message, 'error'); }
      }
      break;
    case 'view-project':
      window.open('project.html?id=' + encodeURIComponent(id), '_blank');
      break;
    case 'edit-project': {
      const p = state.data.projects.find(x => x.id === id);
      if (p) openProjectModal(p);
      break;
    }
    case 'delete-project':
      if (await confirmDialog('Bu projeyi silmek istediğinize emin misiniz?')) {
        try { await repo.deleteProject(id); toast('Proje silindi.', 'success'); await loadAllData(); renderProjects(); }
        catch (e) { toast('Hata: ' + e.message, 'error'); }
      }
      break;
    case 'view-message': {
      const m = state.data.messages.find(x => x.id === id);
      if (m) openMessageModal(m);
      break;
    }
    case 'delete-message':
      if (await confirmDialog('Bu mesajı silmek istediğinize emin misiniz?')) {
        try { await repo.deleteMessage(id); toast('Mesaj silindi.', 'success'); await loadAllData(); renderMessages(); }
        catch (e) { toast('Hata: ' + e.message, 'error'); }
      }
      break;
    case 'edit-report': {
      const r = state.data.reports.find(x => x.id === id);
      if (r) openReportModal(r);
      break;
    }
    case 'delete-report':
      if (await confirmDialog('Bu raporu silmek istediğinize emin misiniz?')) {
        try { await repo.deleteReport(id); toast('Rapor silindi.', 'success'); await loadAllData(); renderReports(); }
        catch (e) { toast('Hata: ' + e.message, 'error'); }
      }
      break;
  }
}

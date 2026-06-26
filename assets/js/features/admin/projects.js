/**
 * Projects view — list (searchable) + create/edit modal
 * En karmaşık view: kapak görseli upload + belge upload + 12 alan
 */

import { el, Label, Input, Select, Textarea, Pill } from '../../lib/components/atoms.js';
import { showModal, confirmDialog, toast } from '../../lib/components/modal.js';
import { renderRows } from '../../lib/components/table.js';
import { formatDate } from '../../lib/ui.js';
import * as repo from '../../lib/repo.js';
import { ImageUploader, DocumentUploader } from '../../lib/components/uploader.js';

export const state = { projects: [], customers: [], searchQuery: '' };

const CATEGORIES = [
  ['restorasyon', 'Restorasyon'], ['ic-tasarim', 'İç Tasarım'],
  ['vaziyet', 'Vaziyet'], ['kat-plani', 'Kat Planları'],
  ['peyzaj', 'Peyzaj'], ['tas-ahsap', 'Taş & Ahşap']
];

const STATUSES = [
  ['devam-ediyor', 'Devam Ediyor'],
  ['tamamlandi', 'Tamamlandı'],
  ['beklemede', 'Beklemede'],
  ['iptal', 'İptal']
];

export async function renderProjects() {
  const projects = await repo.listAllProjects().catch(() => []);
  state.projects = projects;
  if (!state.customers.length) state.customers = await repo.listCustomers().catch(() => []);

  applySearch();
  bindSearch();
  bindNewButton();
}

function bindSearch() {
  const search = document.getElementById('projectSearch');
  if (!search || search.dataset.bound) return;
  search.dataset.bound = '1';
  search.addEventListener('input', () => { state.searchQuery = search.value; applySearch(); });
}

function bindNewButton() {
  const btn = document.getElementById('newProjectBtn');
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', () => openProjectModal(null));
}

function applySearch() {
  const q = state.searchQuery?.toLowerCase() || '';
  const filtered = q
    ? state.projects.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.customer_name || '').toLowerCase().includes(q))
    : state.projects;

  const tbody = document.querySelector('#projectsTable tbody');
  if (!tbody) return;
  renderRows(tbody, filtered, [
    { key: 'id', label: 'ID', render: p => el('code', {}, p.id) },
    { key: 'title', label: 'Başlık', render: p => el('strong', {}, p.title) },
    { key: 'category', label: 'Kategori', render: p => p.category_label || p.category },
    { key: 'year', label: 'Yıl', render: p => p.year || '—' },
    { key: 'location', label: 'Konum', render: p => p.location || '—' },
    { key: 'customer', label: 'Müşteri', render: p => p.customer_name || '—' },
    { key: 'status', label: 'Durum', render: p => el('td', { html: Pill({ status: p.is_published ? 'published' : 'draft' }) }) },
    { label: '', render: p => el('td', { class: 'actions' },
      el('button', { class: 'btn-view', 'data-action': 'view-project', 'data-id': p.id }, 'Gör'),
      el('button', { class: 'btn-edit', 'data-action': 'edit-project', 'data-id': p.id }, 'Düzenle'),
      el('button', { class: 'btn-delete', 'data-action': 'delete-project', 'data-id': p.id }, 'Sil')
    )}
  ], 'Proje bulunamadı.');

  bindActions(tbody);
}

function bindActions(tbody) {
  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
  });
}

async function handleAction(action, id) {
  if (action === 'view-project') {
    window.open('project.html?id=' + encodeURIComponent(id), '_blank');
    return;
  }
  const p = state.projects.find(x => x.id === id);
  if (action === 'edit-project' && p) return openProjectModal(p);
  if (action === 'delete-project') {
    if (await confirmDialog('Bu projeyi silmek istediğinize emin misiniz?')) {
      try { await repo.deleteProject(id); toast('Silindi.', 'success'); renderProjects(); }
      catch (e) { toast('Hata: ' + e.message, 'error'); }
    }
  }
}

function openProjectModal(project) {
  const isNew = !project;
  project = project || {
    id: 'proj-' + Date.now().toString(36),
    title: '', category: 'restorasyon', category_label: 'Restorasyon',
    year: new Date().getFullYear(), location: '', area: '', duration: '',
    status: 'devam-ediyor', summary: '', image: '', tags: [],
    content: { intro: '', climate: '', soil: '', neighborhood: '',
               regulations: '', equations: '', process: [], outcome: '' },
    is_published: false, customer_id: ''
  };

  const customerOpts = [{ value: '', label: 'Seçiniz...' },
    ...state.customers.map(c => ({ value: c.id, label: c.name + (c.phone ? ` (${c.phone})` : '') }))];

  const uploaderState = { url: project.image };
  const docsState = { docs: [] };

  const body = el('div', {},
    el('div', { class: 'form-grid' },
      Label({ label: 'Başlık', required: true, full: true, children: Input({ name: 'title', required: true, value: project.title }) }),
      Label({ label: 'ID (slug)', children: Input({ name: 'id', value: project.id, readonly: !isNew }) }),
      Label({ label: 'Müşteri', required: true, children: Select({ name: 'customer_id', value: project.customer_id || '', options: customerOpts, required: true }) }),
      Label({ label: 'Kategori', children: Select({ name: 'category', value: project.category, options: CATEGORIES }) }),
      Label({ label: 'Yıl', children: Input({ name: 'year', type: 'number', value: project.year || '' }) }),
      Label({ label: 'Konum', children: Input({ name: 'location', value: project.location }) }),
      Label({ label: 'Alan', children: Input({ name: 'area', value: project.area }) }),
      Label({ label: 'Süre', children: Input({ name: 'duration', value: project.duration }) }),
      Label({ label: 'Durum', children: Select({ name: 'status', value: project.status, options: STATUSES }) }),
      Label({ label: 'Etiketler (virgülle)', full: true, children: Input({ name: 'tags', value: (project.tags || []).join(', ') }) }),
      Label({ label: 'Özet', full: true, children: Textarea({ name: 'summary', value: project.summary, rows: 2 }) }),
      el('div', { class: 'full' },
        el('span', { class: 'uploader-label' }, 'Kapak Görseli'),
        ImageUploader({ value: project.image, onChange: url => { uploaderState.url = url; } }).root,
        el('input', { type: 'hidden', name: 'image', value: project.image || '' })
      ),
      Label({ label: 'Giriş', full: true, children: Textarea({ name: 'intro', value: project.content?.intro, rows: 3 }) }),
      Label({ label: 'İklim & Hava', full: true, children: Textarea({ name: 'climate', value: project.content?.climate, rows: 2 }) }),
      Label({ label: 'Zemin & Temel', full: true, children: Textarea({ name: 'soil', value: project.content?.soil, rows: 2 }) }),
      Label({ label: 'Mahalle Mimarisi', full: true, children: Textarea({ name: 'neighborhood', value: project.content?.neighborhood, rows: 2 }) }),
      Label({ label: 'Mevzuat', full: true, children: Textarea({ name: 'regulations', value: project.content?.regulations, rows: 2 }) }),
      Label({ label: 'Mimari Denklemler', full: true, children: Textarea({ name: 'equations', value: project.content?.equations, rows: 2 }) }),
      Label({ label: 'Süreç Adımları', full: true, hint: 'Her satır bir adım', children: Textarea({ name: 'process', value: (project.content?.process || []).join('\n'), rows: 4 }) }),
      Label({ label: 'Sonuç & Teslim', full: true, children: Textarea({ name: 'outcome', value: project.content?.outcome, rows: 2 }) }),
      DocumentUploader({ onChange: docs => { docsState.docs = docs; } }).root
    )
  );

  const { close } = showModal({ title: isNew ? 'Yeni Proje' : 'Projeyi Düzenle: ' + project.title, body, maxWidth: '880px' });

  function submit() {
    const data = {};
    body.querySelectorAll('[name]').forEach(inp => {
      if (inp.type === 'checkbox') data[inp.name] = inp.checked;
      else data[inp.name] = inp.value;
    });
    if (!data.title) { toast('Başlık zorunlu.', 'error'); return; }
    if (!data.customer_id) { toast('Müşteri seçin.', 'error'); return; }

    data.image = uploaderState.url || null;
    const payload = {
      id: data.id,
      customer_id: data.customer_id,
      title: data.title,
      category: data.category,
      category_label: CATEGORIES.find(c => c[0] === data.category)?.[1] || data.category,
      year: parseInt(data.year, 10) || null,
      location: data.location, area: data.area, duration: data.duration,
      status: data.status, summary: data.summary, image: data.image,
      tags: (data.tags || '').split(',').map(s => s.trim()).filter(Boolean),
      content: {
        intro: data.intro, climate: data.climate, soil: data.soil,
        neighborhood: data.neighborhood, regulations: data.regulations,
        equations: data.equations,
        process: (data.process || '').split('\n').map(s => s.trim()).filter(Boolean),
        outcome: data.outcome
      },
      is_published: body.querySelector('[name=is_published]')?.checked || false
    };

    const promise = isNew ? repo.createProject(payload) : repo.updateProject(project.id, payload);
    promise.then(async (saved) => {
      const savedId = isNew ? saved.id : project.id;
      // Documents
      for (const doc of docsState.docs.filter(d => d.path)) {
        try {
          await repo.createDocument({
            project_id: savedId,
            name: doc.name, storage_path: doc.path,
            mime_type: doc.mime_type, size_bytes: doc.size,
            category: doc.category || 'diger'
          });
        } catch (err) { console.warn('Belge kaydı başarısız:', err); }
      }
      toast('Kaydedildi.', 'success'); close(); renderProjects();
    }).catch(e => toast('Hata: ' + e.message, 'error'));
  }

  const actions = body.closest('.modal-card')?.querySelector('.modal-actions');
  actions.appendChild(el('button', { class: 'btn btn-primary btn-sm', onclick: submit },
    isNew ? 'Oluştur' : 'Güncelle'));
}
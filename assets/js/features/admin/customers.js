/**
 * Customers view — list + create/edit modal
 */

import { el, Label, Input, Select, Textarea, Pill, Button } from '../../lib/components/atoms.js';
import { showModal, confirmDialog, toast } from '../../lib/components/modal.js';
import * as repo from '../../lib/repo.js';
import { renderRows } from '../../lib/components/table.js';

const COLUMNS = [
  { key: 'name', label: 'Ad' },
  { key: 'type', label: 'Tür' },
  { key: 'phone', label: 'Telefon' },
  { key: 'email', label: 'E-posta' },
  { key: 'city', label: 'Şehir' }
];

const ACTIONS = [
  { label: 'Düzenle', action: 'edit-customer', class: 'btn-edit' },
  { label: 'Sil', action: 'delete-customer', class: 'btn-delete' }
];

export async function renderCustomers() {
  const customers = await repo.listCustomers().catch(() => []);
  state.customers = customers;

  const tbody = document.querySelector('#customersTable tbody');
  if (!tbody) return;

  renderRows(tbody, customers, [
    ...COLUMNS.map(c => ({
      key: c.key,
      label: c.label,
      render: row => {
        if (c.key === 'name') return el('strong', {}, row.name || '—');
        return row[c.key] || '—';
      }
    })),
    {
      label: '',
      render: row => el('td', { class: 'actions' },
        ...ACTIONS.map(a => el('button', {
          class: a.class,
          'data-action': a.action,
          'data-id': row.id
        }, a.label))
      )
    }
  ], 'Henüz müşteri yok.');

  bindTableActions(tbody);
}

function bindTableActions(tbody) {
  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
  });
}

async function handleAction(action, id) {
  const c = state.customers.find(x => x.id === id);
  if (!c && action !== 'new-customer') return;
  if (action === 'edit-customer') openCustomerModal(c);
  else if (action === 'delete-customer') {
    if (await confirmDialog('Bu müşteriyi silmek istediğinize emin misiniz?')) {
      try { await repo.deleteCustomer(id); toast('Silindi.', 'success'); await refresh(); }
      catch (e) { toast('Hata: ' + e.message, 'error'); }
    }
  }
}

function openCustomerModal(customer) {
  const isNew = !customer;
  customer = customer || { name: '', type: 'individual', phone: '', email: '', city: 'Siirt', notes: '' };

  const body = el('div', {},
    Label({ label: 'Ad', required: true, children: Input({ name: 'name', required: true, value: customer.name }) }),
    Label({ label: 'Tür', children:
      Select({ name: 'type', value: customer.type, options: [
        { value: 'individual', label: 'Bireysel' },
        { value: 'corporate', label: 'Kurumsal' }
      ]})
    }),
    Label({ label: 'Telefon', children: Input({ name: 'phone', type: 'tel', value: customer.phone }) }),
    Label({ label: 'E-posta', children: Input({ name: 'email', type: 'email', value: customer.email }) }),
    Label({ label: 'Şehir', children: Input({ name: 'city', value: customer.city || 'Siirt' }) }),
    Label({ label: 'Notlar', children: Textarea({ name: 'notes', value: customer.notes }) })
  );

  const { close } = showModal({
    title: isNew ? 'Yeni Müşteri' : 'Müşteriyi Düzenle',
    body
  });

  // Bind submit
  body.querySelectorAll('input,textarea,select').forEach(inp => {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  });
  // Manual submit on button (modal already has actions — extend)
  // For simplicity, intercept the first form-like submit via Enter
  function submit() {
    const data = {};
    body.querySelectorAll('[name]').forEach(inp => {
      data[inp.name] = inp.type === 'checkbox' ? inp.checked : inp.value;
    });
    if (!data.name) { toast('Ad zorunlu.', 'error'); return; }
    (isNew ? repo.createCustomer(data) : repo.updateCustomer(customer.id, data))
      .then(() => { toast('Kaydedildi.', 'success'); close(); refresh(); })
      .catch(e => toast('Hata: ' + e.message, 'error'));
  }
  // Add submit button to modal
  const submitBtn = Button({ label: isNew ? 'Oluştur' : 'Güncelle', onclick: submit });
  const modalEl = body.closest('.modal-card');
  const actions = modalEl?.querySelector('.modal-actions');
  if (actions) actions.appendChild(submitBtn);
}

export async function refresh() {
  await renderCustomers();
}

// External state hook (admin index tarafından doldurulur)
export const state = { customers: [] };
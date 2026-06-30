/**
 * UI yardımcıları — DOM, toast, modal, formatters
 */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') node.innerHTML = v;
    else if (v != null) node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

export function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return iso; }
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return iso; }
}

// Toast bildirimleri (premium)
let toastContainer = null;
const TOAST_ICONS = { success: '✓', error: '!', warn: '⚠', info: 'i' };
export function toast(msg, type = 'info', ms = 4000) {
  if (!toastContainer) {
    toastContainer = el('div', { class: 'toast-root', id: 'toastRoot', 'aria-live': 'polite' });
    document.body.appendChild(toastContainer);
  }
  const t = el('div', { class: `toast toast-${type}` },
    el('span', { class: 'toast-icon' }, TOAST_ICONS[type] || 'i'),
    el('span', { class: 'toast-msg' }, msg),
    el('button', { class: 'toast-close', 'aria-label': 'Kapat', onclick: () => dismiss(t) }, '×')
  );
  toastContainer.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  if (ms > 0) setTimeout(() => dismiss(t), ms);
  return t;
}
function dismiss(t) {
  t.classList.remove('is-in');
  t.classList.add('is-out');
  setTimeout(() => t.remove(), 300);
}

// Modal (basit)
export function showModal({ title, body, actions }) {
  const overlay = el('div', { class: 'modal-overlay' });
  const card = el('div', { class: 'modal-card' });
  const close = () => modal.remove();

  card.appendChild(el('header', {},
    el('h3', {}, title),
    el('button', { class: 'modal-close', 'aria-label': 'Kapat', onclick: close }, '×')
  ));
  card.appendChild(el('div', { class: 'modal-body' }, body));

  if (actions && actions.length) {
    const footer = el('div', { class: 'modal-actions' });
    actions.forEach(a => footer.appendChild(a));
    card.appendChild(footer);
  }

  const modal = el('div', { class: 'modal' }, overlay, card);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
  document.body.appendChild(modal);
  return { close, modal };
}

export function confirmDialog(message) {
  return new Promise(resolve => {
    const yes = el('button', { class: 'btn btn-primary btn-sm', onclick: () => { modal.remove(); resolve(true); } }, 'Evet');
    const no = el('button', { class: 'btn btn-ghost btn-sm', onclick: () => { modal.remove(); resolve(false); } }, 'Hayır');
    const { modal } = showModal({ title: 'Onayla', body: el('p', {}, message), actions: [no, yes] });
  });
}

// Status pill
export function statusPill(status) {
  const map = {
    'yeni': 'new', 'new': 'new',
    'okundu': 'read', 'read': 'read',
    'yanitlandi': 'replied', 'replied': 'replied',
    'arsiv': 'archived', 'archived': 'archived',
    'acik': 'open', 'open': 'open',
    'devam-ediyor': 'open',
    'in-progress': 'open',
    'tamamlandi': 'done', 'done': 'done',
    'iptal': 'archived',
    'hazirlik': 'open',
    'basvuruldu': 'open',
    'incelemede': 'open',
    'eksik-evrak': 'open',
    'onaylandi': 'done',
    'reddedildi': 'archived',
    'published': 'published',
    'taslak': 'draft'
  };
  const cls = map[status] || 'open';
  return `<span class="pill pill-${cls}">${escapeHtml(status)}</span>`;
}

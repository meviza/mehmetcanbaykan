/**
 * Modal & dialog primitives
 * showModal, confirmDialog, toast
 */

import { el } from './atoms.js';

let toastContainer = null;

export function showModal({ title, body, actions, maxWidth = '720px' }) {
  const overlay = el('div', { class: 'modal-overlay', 'data-close': '' });
  const card = el('div', { class: 'modal-card', style: { maxWidth } });

  const close = () => { modal.remove(); document.removeEventListener('keydown', onEsc); };
  const onEsc = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onEsc);

  card.appendChild(el('header', {},
    el('h3', {}, title || ''),
    el('button', { class: 'modal-close', 'aria-label': 'Kapat', 'data-close': '' }, '×')
  ));
  card.appendChild(el('div', { class: 'modal-body' }, body || ''));
  if (actions && actions.length) {
    const footer = el('div', { class: 'modal-actions' });
    actions.forEach(a => footer.appendChild(a));
    card.appendChild(footer);
  }

  const modal = el('div', { class: 'modal' }, overlay, card);
  overlay.addEventListener('click', close);
  document.body.appendChild(modal);
  return { close, modal };
}

export function confirmDialog(message, { confirmLabel = 'Evet', cancelLabel = 'Hayır' } = {}) {
  return new Promise(resolve => {
    const yes = el('button', {
      class: 'btn btn-primary btn-sm',
      onclick: () => { modal.remove(); resolve(true); }
    }, confirmLabel);
    const no = el('button', {
      class: 'btn btn-ghost btn-sm',
      onclick: () => { modal.remove(); resolve(false); }
    }, cancelLabel);
    const { modal } = showModal({ title: 'Onayla', body: el('p', {}, message), actions: [no, yes] });
  });
}

export function toast(msg, type = 'info', ms = 3000) {
  if (!toastContainer) {
    toastContainer = el('div', { class: 'toast-stack', id: 'toastStack' });
    document.body.appendChild(toastContainer);
  }
  const t = el('div', { class: `toast toast-${type}` }, msg);
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, ms);
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') node.innerHTML = v;
    else if (v != null && v !== false) node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}
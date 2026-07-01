/**
 * Atomic UI primitives
 * Button, Input, Select, Textarea, Label, Pill, Badge
 * Tek sorumluluk: render. State ve davranış parent'tan.
 */

import { escapeHtml } from '../ui.js';

/* ---------- Button ---------- */
export function Button({ label, variant = 'primary', size, icon, type = 'button', onclick, disabled, ...attrs }) {
  const cls = ['btn', `btn-${variant}`];
  if (size) cls.push(`btn-${size}`);
  return el('button', {
    class: cls.join(' '),
    type,
    disabled,
    onclick,
    ...attrs
  },
    icon,
    label ? el('span', {}, label) : null
  );
}

/* ---------- Form fields ---------- */
export function Label({ label, required, children, hint }) {
  return el('label', {},
    el('span', {}, (label || '') + (required ? ' *' : '')),
    children,
    hint ? el('small', { class: 'field-hint' }, hint) : null
  );
}

export function Input({ name, type = 'text', value, placeholder, required, autocomplete, ...attrs }) {
  return el('input', {
    name, type,
    value: value ?? '',
    placeholder: placeholder || '',
    required: !!required,
    autocomplete: autocomplete || 'off',
    ...attrs
  });
}

export function Textarea({ name, rows = 4, value, placeholder, required, ...attrs }) {
  return el('textarea', {
    name, rows,
    placeholder: placeholder || '',
    required: !!required,
    ...attrs
  }, value ?? '');
}

export function Select({ name, value, options, required, ...attrs }) {
  return el('select', { name, required: !!required, ...attrs },
    options.map(opt => {
      const o = typeof opt === 'string' ? { value: opt, label: opt } : opt;
      return el('option', { value: o.value, selected: o.value === value }, o.label);
    })
  );
}

/* ---------- Status indicators ---------- */
const PILL_MAP = {
  new: 'new', read: 'read', replied: 'replied', archived: 'archived',
  open: 'open', done: 'done', 'in-progress': 'open',
  published: 'published', draft: 'draft',
  // Türkçe fallback'ler
  yeni: 'new', okundu: 'read', yanitlandi: 'replied', arsiv: 'archived',
  acik: 'open', tamamlandi: 'done', 'devam-ediyor': 'open',
  iptal: 'archived', hazirlik: 'open', basvuruldu: 'open',
  incelemede: 'open', 'eksik-evrak': 'open', onaylandi: 'done',
  reddedildi: 'archived', taslak: 'draft'
};

export function Pill({ status, label }) {
  const cls = PILL_MAP[status] || 'open';
  return `<span class="pill pill-${cls}">${escapeHtml(label || status || '')}</span>`;
}

export function Badge({ count }) {
  if (!count) return null;
  return el('span', { class: 'badge' }, String(count));
}

/* ---------- Helper el() — re-export from ui for atomic components ---------- */
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
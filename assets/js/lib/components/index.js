/**
 * Atomic Component Library
 * ──────────────────────────────────────────────────────────
 * Tema-bağımsız, JSON-driven, ES Module tabanlı.
 *
 * Tüm componentler render saf JS'tir (framework yok).
 * Tema renk/font/radius JSON config'ten gelir → kişiselleştirme native.
 *
 * Kullanım:
 *   import { Button, Card, Hero, Section, ServiceGrid } from '@/lib/components';
 *   const el = Hero({ title: '...', subtitle: '...' });
 *   document.querySelector('#app').appendChild(el);
 *
 * Prensip:
 *   - Her component pure function (props → DOM)
 *   - State/data parent'tan props ile gelir
 *   - Tema tokens CSS variable'ları üzerinden (--color-primary, vs.)
 *   - Hiçbir bileşen hardcoded renk/font içermez
 * ──────────────────────────────────────────────────────────
 */

// ─── TEMEL ATOMS ────────────────────────────────────────

/**
 * el — DOM element factory (h, attrs, children)
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset' && typeof v === 'object') Object.assign(node.dataset, v);
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === 'string' || typeof child === 'number'
      ? document.createTextNode(String(child))
      : child);
  }
  return node;
}

/**
 * SVG — SVG element factory
 */
export function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.setAttribute('class', v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

// ─── PRIMITIVE COMPONENTS ───────────────────────────────

export function Button({ label, variant = 'primary', size, icon, type = 'button', disabled, loading, href, onclick, className, ...rest }) {
  const cls = ['btn', `btn-${variant}`, size && `btn-${size}`, loading && 'is-loading', className].filter(Boolean).join(' ');
  const content = el('span', { class: 'btn-content' },
    icon && el('span', { class: 'btn-icon', html: icon }),
    label && el('span', { class: 'btn-label' }, label)
  );
  if (href) {
    return el('a', { href, class: cls, ...rest }, content);
  }
  return el('button', { type, class: cls, disabled: disabled || loading, onclick, ...rest }, content);
}

export function Icon({ name, size = 20, stroke = 1.5 }) {
  // Lucide icon names (sadece en yaygın olanlar)
  const paths = {
    arrow_right: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    arrow_left:  '<path d="M19 12H5M11 5l-7 7 7 7"/>',
    menu:        '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
    close:       '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    home:        '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    building:    '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>',
    mail:        '<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/>',
    phone:       '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    location:    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    check:       '<polyline points="20 6 9 17 4 12"/>',
    sparkle:     '<path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
    layers:      '<path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
    send:        '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    edit:        '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    trash:       '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    plus:        '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    user:        '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    settings:    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    chart:       '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  };
  const path = paths[name] || paths.building;
  return svg('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': stroke, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    svg('g', { html: path })
  );
}

export function Badge({ label, variant = 'default' }) {
  return el('span', { class: `badge badge-${variant}` }, label);
}

export function Card({ title, subtitle, body, footer, className }) {
  return el('article', { class: ['card', className].filter(Boolean).join(' ') },
    title && el('header', { class: 'card-header' },
      el('h3', { class: 'card-title' }, title),
      subtitle && el('p', { class: 'card-subtitle' }, subtitle)
    ),
    body && el('div', { class: 'card-body' }, body),
    footer && el('footer', { class: 'card-footer' }, footer)
  );
}

// ─── FORM COMPONENTS ────────────────────────────────────

export function Field({ label, name, type = 'text', value, placeholder, required, error, hint, options, textarea, rows = 4, autocomplete, onInput, children }) {
  const id = `f-${name}-${Math.random().toString(36).slice(2, 8)}`;
  let input;
  if (textarea) {
    input = el('textarea', { id, name, placeholder, required, rows, autocomplete, onInput }, value || '');
  } else if (type === 'select' && options) {
    input = el('select', { id, name, required, onInput },
      el('option', { value: '' }, placeholder || 'Seçiniz'),
      ...options.map(o => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        return el('option', { value: opt.value, selected: opt.value === value }, opt.label);
      })
    );
  } else {
    input = el('input', { id, name, type, value, placeholder, required, autocomplete, onInput });
  }
  return el('label', { class: 'field', for: id },
    el('span', { class: 'field-label' }, label, required && el('span', { class: 'field-required' }, ' *')),
    input,
    hint && el('small', { class: 'field-hint' }, hint),
    error && el('small', { class: 'field-error' }, error),
    children
  );
}

// ─── LAYOUT COMPONENTS ─────────────────────────────────

export function Section({ id, eyebrow, title, subtitle, children, className, dark, container = true }) {
  const sec = el('section', { id, class: ['section', dark && 'section-dark', className].filter(Boolean).join(' ') });
  const inner = el('div', { class: 'container' });
  const head = (eyebrow || title || subtitle) && el('header', { class: 'section-head' },
    eyebrow && el('span', { class: 'section-tag' }, eyebrow),
    title && (typeof title === 'string' ? el('h2', { class: 'section-title', html: title }) : title),
    subtitle && (typeof subtitle === 'string' ? el('p', { class: 'section-sub' }, subtitle) : subtitle)
  );
  if (head) inner.appendChild(head);
  if (Array.isArray(children)) children.forEach(c => inner.appendChild(c));
  else if (children) inner.appendChild(children);
  sec.appendChild(inner);
  return sec;
}

export function Grid({ children, columns = 3, gap = '1.25rem', className }) {
  return el('div', {
    class: ['grid', className].filter(Boolean).join(' '),
    style: { display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${Math.floor(280 / columns)}px, 1fr))`, gap }
  }, children);
}

// ─── HERO COMPONENT (3D destekli) ──────────────────────

export function Hero({ eyebrow, title, subtitle, primaryCta, secondaryCta, threeJs = false }) {
  return el('section', { class: 'hero' },
    threeJs && el('div', { class: 'hero-3d', id: 'hero3d' },
      el('div', { class: 'hero-3d-skeleton' })
    ),
    el('div', { class: 'hero-grain' }),
    el('div', { class: 'container hero-inner' },
      el('div', { class: 'hero-text' },
        eyebrow && el('span', { class: 'eyebrow' }, eyebrow),
        title && (typeof title === 'string' ? el('h1', { class: 'hero-title', html: title }) : title),
        subtitle && el('p', { class: 'hero-sub' }, subtitle),
        (primaryCta || secondaryCta) && el('div', { class: 'hero-actions' },
          primaryCta && Button({ ...primaryCta, variant: 'primary' }),
          secondaryCta && Button({ ...secondaryCta, variant: 'ghost' })
        )
      )
    )
  );
}

// ─── NAVIGATION ────────────────────────────────────────

export function Nav({ brand, links = [], cta }) {
  const linkEls = links.map(l => el('a', { href: l.href }, l.label));
  return el('header', { class: 'nav', id: 'nav' },
    el('div', { class: 'container nav-inner' },
      el('a', { href: '#home', class: 'brand' },
        brand?.mark && el('span', { class: 'brand-mark' }, brand.mark),
        brand?.name && el('span', { class: 'brand-text' }, brand.name, brand?.role && el('small', {}, brand.role))
      ),
      el('nav', { class: 'nav-links', id: 'navLinks', 'aria-label': 'Ana menü' }, ...linkEls),
      cta && Button({ ...cta, variant: 'primary', size: 'sm', className: 'nav-cta' }),
      el('button', { class: 'nav-burger', id: 'navBurger', 'aria-label': 'Menüyü aç', 'aria-expanded': 'false', 'aria-controls': 'navLinks' },
        el('span'), el('span'), el('span')
      )
    )
  );
}

// ─── MODAL / DIALOG ────────────────────────────────────

export function Modal({ title, body, actions, open = false, onClose }) {
  const overlay = el('div', { class: 'modal-overlay', onclick: () => { remove(); onClose?.(); } });
  const card = el('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true' },
    el('header', {},
      el('h3', {}, title || ''),
      el('button', { class: 'modal-close', 'aria-label': 'Kapat', onclick: () => { remove(); onClose?.(); } }, '×')
    ),
    el('div', { class: 'modal-body' }, body || ''),
    actions?.length && el('footer', { class: 'modal-actions' }, ...actions)
  );
  const modal = el('div', { class: 'modal' }, overlay, card);
  function remove() { modal.remove(); document.removeEventListener('keydown', onEsc); document.body.style.overflow = ''; }
  function onEsc(e) { if (e.key === 'Escape') remove(); }
  document.addEventListener('keydown', onEsc);
  if (open) {
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  }
  return { modal, open: () => { document.body.appendChild(modal); document.body.style.overflow = 'hidden'; }, close: remove };
}

// ─── TOAST ─────────────────────────────────────────────

let toastRoot = null;
function getToastRoot() {
  if (!toastRoot) {
    toastRoot = el('div', { class: 'toast-root', id: 'toastRoot', 'aria-live': 'polite' });
    document.body.appendChild(toastRoot);
  }
  return toastRoot;
}

const TOAST_ICONS = { success: '✓', error: '!', warn: '⚠', info: 'i' };

export function toast(message, type = 'info', duration = 4000) {
  const root = getToastRoot();
  const t = el('div', { class: `toast toast-${type}`, role: 'status' },
    el('span', { class: 'toast-icon' }, TOAST_ICONS[type] || 'i'),
    el('span', { class: 'toast-msg' }, message),
    el('button', { class: 'toast-close', 'aria-label': 'Kapat', onclick: () => dismiss(t) }, '×')
  );
  root.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  if (duration > 0) setTimeout(() => dismiss(t), duration);
  return t;
}
function dismiss(t) {
  t.classList.remove('is-in');
  t.classList.add('is-out');
  setTimeout(() => t.remove(), 300);
}

// ─── CONTAINER QUERIES (tiny) ──────────────────────────

export function $  (sel, root = document) { return root.querySelector(sel); }
export function $$ (sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

// ─── UTILITIES ─────────────────────────────────────────

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

export function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function throttle(fn, ms = 100) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}
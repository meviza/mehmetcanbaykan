/**
 * File uploader components
 * ImageUploader + DocumentUploader
 * Drag&drop, progress bar, preview, validation
 */

import { el } from './atoms.js';
import { toast } from './modal.js';
import { uploadProjectImage, uploadProjectDocument, deleteFile, ALLOWED_IMAGE_TYPES } from '../storage.js';
import { SUPABASE_CONFIG } from '../../config.js';

const UPLOAD_ICON = '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
const DOC_ICON = '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';

function attachDragAndDrop(el_, onFile, acceptCheck) {
  ['dragenter', 'dragover'].forEach(ev =>
    el_.addEventListener(ev, e => { e.preventDefault(); el_.classList.add('is-dragover'); }));
  ['dragleave', 'drop'].forEach(ev =>
    el_.addEventListener(ev, e => { e.preventDefault(); el_.classList.remove('is-dragover'); }));
  el_.addEventListener('drop', e => {
    const f = e.dataTransfer?.files?.[0];
    if (f && (!acceptCheck || acceptCheck(f))) onFile(f);
    else if (f) toast('Geçersiz dosya türü.', 'error');
  });
}

/* ---------- Image uploader (single, for cover) ---------- */
export function ImageUploader({ value, onChange, accept = ALLOWED_IMAGE_TYPES }) {
  const state = { url: value || null };
  const input = el('input', { type: 'file', accept: accept.join(',') });
  const preview = el('div', { class: 'uploader-preview', hidden: !state.url });
  const previewImg = el('img', { src: state.url || '', alt: '' });
  const removeBtn = el('button', { class: 'uploader-remove', type: 'button', title: 'Kaldır' }, '×');
  if (state.url) preview.append(previewImg, removeBtn);

  const progress = el('div', { class: 'uploader-progress', hidden: true },
    el('div', { class: 'uploader-progress-bar' }));
  const status = el('div', { class: 'uploader-status' });

  const root = el('div', { class: 'uploader' },
    input,
    el('div', { class: 'uploader-icon', html: UPLOAD_ICON }),
    el('div', { class: 'uploader-text' }, 'Kapak görseli için tıklayın veya sürükleyin'),
    el('div', { class: 'uploader-hint' }, 'JPG, PNG, WebP — otomatik 1920px küçültülür'),
    preview, progress, status
  );

  async function handle(file) {
    progress.hidden = false;
    status.textContent = 'Yükleniyor…';
    try {
      const { publicUrl } = await uploadProjectImage(file, pct => {
        progress.querySelector('.uploader-progress-bar').style.width = pct + '%';
      });
      state.url = publicUrl;
      previewImg.src = publicUrl;
      preview.hidden = false;
      if (!preview.contains(removeBtn)) preview.appendChild(removeBtn);
      onChange?.(publicUrl);
      status.textContent = 'Yüklendi ✓';
      setTimeout(() => status.textContent = '', 2000);
    } catch (e) {
      toast('Yükleme başarısız: ' + e.message, 'error');
    } finally {
      progress.hidden = true;
      progress.querySelector('.uploader-progress-bar').style.width = '0%';
    }
  }

  root.addEventListener('click', e => {
    if (e.target.closest('.uploader-remove')) {
      state.url = null;
      previewImg.src = '';
      preview.hidden = true;
      onChange?.('');
      return;
    }
    input.click();
  });
  input.addEventListener('change', e => { const f = e.target.files?.[0]; if (f) handle(f); });
  attachDragAndDrop(root, handle);

  return { root, getValue: () => state.url };
}

/* ---------- Document uploader (multi, private bucket) ---------- */
export function DocumentUploader({ onChange }) {
  const state = { docs: [] };
  const input = el('input', { type: 'file', accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png' });
  const progress = el('div', { class: 'uploader-progress', hidden: true },
    el('div', { class: 'uploader-progress-bar' }));
  const status = el('div', { class: 'uploader-status' });
  const list = el('div', { class: 'docs-list' });

  const root = el('div', { class: 'uploader' },
    input,
    el('div', { class: 'uploader-icon', html: DOC_ICON }),
    el('div', { class: 'uploader-text' }, 'Belge yükle (sözleşme, ruhsat, fatura)'),
    el('div', { class: 'uploader-hint' }, 'PDF, DOC, JPG — gizli depolama'),
    progress, status
  );

  const wrap = el('div', { class: 'full' },
    el('span', { class: 'uploader-label' }, 'Proje Belgeleri'),
    root, list
  );

  function render() {
    list.innerHTML = '';
    if (!state.docs.length) {
      list.appendChild(el('div', { class: 'empty-state', style: 'padding:20px;font-size:12px;' },
        'Henüz belge yüklenmedi.'));
      onChange?.(state.docs);
      return;
    }
    state.docs.forEach((doc, i) => {
      list.appendChild(el('div', { class: 'doc-item' },
        el('div', { class: 'doc-item-info' },
          el('div', { class: 'doc-item-name' }, doc.name),
          el('div', { class: 'doc-item-meta' }, `${(doc.size / 1024).toFixed(1)} KB`)
        ),
        el('div', { class: 'doc-item-actions' },
          el('button', { class: 'doc-delete', type: 'button',
            onclick: () => removeDoc(i) }, 'Sil')
        )
      ));
    });
    onChange?.(state.docs);
  }

  async function removeDoc(i) {
    const doc = state.docs[i];
    if (doc.path) {
      try { await deleteFile(SUPABASE_CONFIG.storage.privateBucket, doc.path); } catch {}
    }
    state.docs.splice(i, 1);
    render();
  }

  async function handle(file) {
    progress.hidden = false;
    status.textContent = 'Yükleniyor…';
    try {
      const { path, size } = await uploadProjectDocument(file, pct => {
        progress.querySelector('.uploader-progress-bar').style.width = pct + '%';
      });
      state.docs.push({ name: file.name, path, size, mime_type: file.type, category: 'diger' });
      status.textContent = 'Yüklendi ✓';
      setTimeout(() => status.textContent = '', 2000);
      render();
    } catch (e) {
      toast('Yükleme başarısız: ' + e.message, 'error');
    } finally {
      progress.hidden = true;
      progress.querySelector('.uploader-progress-bar').style.width = '0%';
    }
  }

  root.addEventListener('click', e => {
    if (e.target.closest('.doc-item')) return;
    input.click();
  });
  input.addEventListener('change', e => { const f = e.target.files?.[0]; if (f) handle(f); });
  attachDragAndDrop(root, handle);

  render();
  return { root: wrap, getDocs: () => state.docs };
}
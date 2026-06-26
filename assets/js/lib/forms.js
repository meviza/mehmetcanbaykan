/**
 * Declarative form builder
 * Form({ fields, onSubmit, onChange, initial })
 * Validation, dirty tracking built-in.
 */

import { el } from './components/atoms.js';
import { toast } from './components/modal.js';

const FIELD_TYPES = {
  text: (name, def) => ({ name, type: 'text', value: def ?? '', required: false }),
  email: (name, def) => ({ name, type: 'email', value: def ?? '' }),
  tel: (name, def) => ({ name, type: 'tel', value: def ?? '' }),
  number: (name, def) => ({ name, type: 'number', value: def ?? '' }),
  date: (name, def) => ({ name, type: 'date', value: def ?? '' }),
  url: (name, def) => ({ name, type: 'url', value: def ?? '' }),
  textarea: (name, def) => ({ name, type: 'textarea', rows: 3, value: def ?? '' }),
  select: (name, def, opts) => ({ name, type: 'select', options: opts?.options || [], value: def ?? '' }),
  checkbox: (name, def) => ({ name, type: 'checkbox', value: !!def }),
  hidden: (name, def) => ({ name, type: 'hidden', value: def ?? '' }),
  uploader: (name, def) => ({ name, type: 'uploader', value: def ?? '' }),
  documents: () => ({ name: 'documents_json', type: 'documents' })
};

export function Form({ fields, initial = {}, onSubmit, onChange, submitLabel = 'Kaydet', cancelLabel = 'İptal' }) {
  const state = { ...initial };
  const form = el('form', { class: 'form-grid', novalidate: '' });
  const fieldRefs = {};

  // Render fields
  fields.forEach(spec => {
    const config = FIELD_TYPES[spec.type]?.(spec.name, initial[spec.name], spec) ?? FIELD_TYPES.text(spec.name, initial[spec.name]);
    const span = spec.full ? 'full' : (spec.span || 1) === 2 ? 'full' : '';

    const wrap = el('label', { class: span });
    if (spec.type !== 'checkbox' && spec.type !== 'hidden') {
      wrap.appendChild(el('span', {}, (spec.label || spec.name) + (spec.required ? ' *' : '')));
    }
    if (spec.hint) wrap.appendChild(el('small', { class: 'field-hint' }, spec.hint));

    if (spec.type === 'textarea') {
      const ta = el('textarea', { name: spec.name, rows: spec.rows || 4, required: !!spec.required }, state[spec.name] || '');
      fieldRefs[spec.name] = ta;
      wrap.appendChild(ta);
    } else if (spec.type === 'select') {
      const sel = el('select', { name: spec.name, required: !!spec.required },
        ...(spec.options || []).map(o => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return el('option', { value: opt.value, selected: opt.value === state[spec.name] }, opt.label);
        })
      );
      fieldRefs[spec.name] = sel;
      wrap.appendChild(sel);
    } else if (spec.type === 'checkbox') {
      const cb = el('input', { type: 'checkbox', name: spec.name, checked: !!state[spec.name] });
      fieldRefs[spec.name] = cb;
      wrap.appendChild(el('div', { class: 'checkbox-row' }, cb, el('span', {}, spec.label || spec.name)));
      wrap.classList.add('checkbox');
    } else if (spec.type === 'hidden') {
      const inp = el('input', { type: 'hidden', name: spec.name, value: state[spec.name] || '' });
      fieldRefs[spec.name] = inp;
      form.appendChild(inp); // hidden'ı wrap dışına ekle
      return;
    } else if (spec.type === 'uploader') {
      // Lazy import to avoid circular dep — use dynamic binding
      const placeholder = el('div', { class: 'uploader-placeholder', 'data-uploader': spec.name });
      fieldRefs[spec.name] = { placeholder, value: state[spec.name] };
      wrap.appendChild(placeholder);
    } else if (spec.type === 'documents') {
      const placeholder = el('div', { class: 'documents-placeholder', 'data-documents': '' });
      fieldRefs[spec.name] = { placeholder, value: '[]' };
      wrap.appendChild(placeholder);
    } else {
      const inp = el('input', {
        type: spec.type || 'text',
        name: spec.name,
        value: state[spec.name] || '',
        required: !!spec.required,
        placeholder: spec.placeholder || ''
      });
      fieldRefs[spec.name] = inp;
      wrap.appendChild(inp);
    }
    form.appendChild(wrap);
  });

  // Footer (submit + cancel)
  const footer = el('div', { class: 'full modal-actions' });
  const cancelBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: e => e.target.closest('.modal')?.remove() }, cancelLabel);
  const submitBtn = el('button', { type: 'submit', class: 'btn btn-primary btn-sm' }, submitLabel);
  footer.append(cancelBtn, submitBtn);
  form.appendChild(footer);

  // Collect values
  function collect() {
    const data = {};
    Object.entries(fieldRefs).forEach(([key, ref]) => {
      if (key === 'documents_json' || ref?.placeholder) {
        data[key] = ref.value;
        return;
      }
      const node = ref;
      if (!node) return;
      if (node.type === 'checkbox') data[key] = node.checked;
      else data[key] = node.value;
    });
    return data;
  }

  // Validate
  function validate() {
    const errors = [];
    fields.forEach(spec => {
      if (!spec.required) return;
      const v = collect()[spec.name];
      if (v === '' || v == null) errors.push(`${spec.label || spec.name} zorunlu.`);
    });
    return errors;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errs = validate();
    if (errs.length) {
      toast(errs[0], 'error');
      return;
    }
    const data = collect();
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Kaydediliyor…';
      await onSubmit?.(data, { reset: () => form.reset() });
      toast(submitLabel + ' başarılı ✓', 'success');
    } catch (err) {
      toast('Hata: ' + (err.message || err), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    }
  });

  form.addEventListener('input', e => {
    if (e.target.name) onChange?.(e.target.name, e.target.value, collect());
  });

  return {
    root: form,
    setFieldRef: (name, node) => { fieldRefs[name] = node; },
    collect,
    validate
  };
}
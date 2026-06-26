/**
 * Table component
 * Sıralanabilir, filtrelenebilir, action button'larıyla
 */

import { el } from './atoms.js';

export function Table({ columns, rows, emptyText = 'Veri yok.' }) {
  const thead = el('thead', {},
    el('tr', {}, ...columns.map(c =>
      el('th', { style: c.width ? { width: c.width } : {} }, c.label)
    ))
  );

  const tbody = el('tbody', {});

  const root = el('div', { class: 'table-wrap' },
    el('table', {}, thead, tbody)
  );

  renderRows(tbody, rows, columns, emptyText);
  return { root, tbody };
}

export function renderRows(tbody, rows, columns, emptyText) {
  tbody.innerHTML = '';
  if (!rows || !rows.length) {
    const colspan = columns.length;
    tbody.appendChild(el('tr', {},
      el('td', { colspan, class: 'empty-state' }, emptyText)
    ));
    return;
  }
  rows.forEach((row, i) => {
    const tr = el('tr', {});
    columns.forEach(c => {
      const td = el('td', { 'data-aos': 'fade-up', 'data-aos-delay': (i % 6) * 30 },
        c.render ? c.render(row) : (row[c.key] ?? '')
      );
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

export function ActionButtons({ actions, row }) {
  return el('td', { class: 'actions' },
    ...actions.map(a => el('button', {
      class: a.class || 'btn-edit',
      'data-action': a.action,
      'data-id': row.id
    }, a.label))
  );
}
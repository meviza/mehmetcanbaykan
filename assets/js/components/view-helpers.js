/**
 * Ortak view helper'ları
 * Stat kartları, sidebar badge, vb.
 */

import { el } from './atoms.js';

export function StatTile({ label, value, id }) {
  return el('div', { class: 'stat-tile', id },
    el('span', {}, label),
    el('strong', { id: id ? id + 'Value' : undefined }, value)
  );
}

export function renderEmptyState(colSpan, text) {
  return el('tr', {},
    el('td', { colspan: colSpan, class: 'empty-state' }, text)
  );
}
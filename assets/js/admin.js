/**
 * Admin sayfası girişi
 */
import { initAdmin } from './features/admin.js';
import './lib/db.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}
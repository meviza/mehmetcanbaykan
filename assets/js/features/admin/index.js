/**
 * Admin Panel — entry point
 * Auth + router + global state
 */

import { getClient } from '../../lib/db.js';
import { signIn, signOut, getSession } from '../../lib/auth.js';
import { SUPABASE_CONFIG } from '../../config.js';
import { $, $$, el } from '../../lib/components/atoms.js';
import { toast } from '../../lib/components/modal.js';
import { switchView, bindNav, currentView } from './router.js';
import * as customers from './customers.js';
import * as projects from './projects.js';

export async function initAdmin() {
  // Supabase client init
  if (window.SupabaseService?.init) window.SupabaseService.init();
  isOnline = !!(window.SupabaseService?.isReady?.() || await getClient().then(c => !!c));

  const badge = document.getElementById('supabaseState');
  if (badge) {
    badge.textContent = isOnline ? 'Çevrimiçi (Supabase)' : 'Çevrimdışı Mod';
    badge.classList.toggle('is-online', isOnline);
  }

  bindLogin();
  bindNav();
  bindLogout();

  // Oturum kontrolü
  try {
    const session = await getSession();
    if (session?.user) onLoginSuccess(session.user);
    else showLogin();
  } catch {
    showLogin();
  }
}

let isOnline = false;

function showLogin() {
  $('#loginScreen').hidden = false;
  $('#adminShell').hidden = true;
}

function onLoginSuccess(user) {
  $('#loginScreen').hidden = true;
  $('#adminShell').hidden = false;
  if (user.email) {
    $('#userEmail').textContent = user.email;
    $('#userName').textContent = user.email.split('@')[0];
    $('#userAvatar').textContent = user.email[0].toUpperCase();
  }
  switchView(currentView());
}

function bindLogin() {
  const form = $('#loginForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = new FormData(form);
    const status = $('#loginStatus');
    if (status) status.textContent = 'Giriş yapılıyor…';
    try {
      const user = await signIn(data.get('email'), data.get('password'));
      onLoginSuccess(user);
    } catch (err) {
      if (status) status.textContent = err.message || 'Giriş başarısız';
    }
  });
}

function bindLogout() {
  $('#logoutBtn')?.addEventListener('click', async () => {
    try { await signOut(); } catch {}
    location.reload();
  });
}

// Cross-module state — dashboard için gerekli
export function getAllState() {
  return {
    customers: customers.state,
    projects: projects.state
  };
}
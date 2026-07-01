/**
 * Admin Panel — entry point
 * Auth + router + global state
 */

import { getClient } from '../../lib/db.js';
import { signIn, signOut, getSession } from '../../lib/auth.js';
import { $ } from '../../lib/ui.js';
import { toast } from '../../lib/components/modal.js';
import { switchView, bindNav, currentView } from './router.js';

export async function initAdmin() {
  // Supabase client init (config.js tarafından yönetilir)
  const client = await getClient();
  isOnline = !!client;

  const badge = document.getElementById('supabaseState');
  if (badge) {
    badge.textContent = isOnline ? 'Çevrimiçi (Supabase)' : 'Çevrimdışı Mod';
    badge.classList.toggle('is-online', isOnline);
  }

  bindLogin();
  bindNav();
  bindLogout();
  bindForgotPassword();

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
    const email = (data.get('email') || '').toString().trim();
    const password = (data.get('password') || '').toString();
    const status = $('#loginStatus');
    if (status) status.textContent = 'Giriş yapılıyor…';
    try {
      const user = await signIn(email, password);
      onLoginSuccess(user);
    } catch (err) {
      if (status) status.textContent = err.message || 'Giriş başarısız';
      toast('Giriş başarısız: ' + (err.message || err), 'error');
    }
  });
}

function bindForgotPassword() {
  const link = $('#forgotLink');
  if (!link) return;
  link.addEventListener('click', async e => {
    e.preventDefault();
    const emailInput = document.querySelector('#loginForm [name="email"]');
    const email = emailInput?.value?.trim();
    if (!email) {
      toast('Lütfen e-posta adresinizi girin.', 'error');
      emailInput?.focus();
      return;
    }
    await forgotPassword(email);
  });
}

async function forgotPassword(email) {
  if (!isOnline) {
    toast('Çevrimdışı moddasınız — şifre yenileme için Supabase gerekir.', 'error');
    return;
  }
  const status = $('#loginStatus');
  if (status) status.textContent = 'Şifre yenileme e-postası gönderiliyor…';
  try {
    const client = await getClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/admin.html'
    });
    if (error) throw error;
    if (status) status.textContent = '✓ Şifre yenileme linki gönderildi. E-postanızı kontrol edin.';
    toast('Şifre yenileme linki gönderildi.', 'success');
  } catch (err) {
    if (status) status.textContent = 'Hata: ' + (err.message || err);
    toast('Hata: ' + (err.message || err), 'error');
  }
}

function bindLogout() {
  $('#logoutBtn')?.addEventListener('click', async () => {
    try { await signOut(); } catch {}
    location.reload();
  });
}

export function getAllState() {
  // Cross-module state export (dashboard için)
  return {};
}

// Auto-init — sayfa yüklendiğinde admin'i başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initAdmin().catch(err => console.error('initAdmin:', err)));
} else {
  initAdmin().catch(err => console.error('initAdmin:', err));
}
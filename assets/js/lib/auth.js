/**
 * Auth katmanı — Supabase email/password auth
 */
import { getClient } from './db.js';

export async function signIn(email, password) {
  const c = await getClient();
  if (!c) throw new Error('Çevrimdışı mod');
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const c = await getClient();
  if (!c) return;
  await c.auth.signOut();
}

export async function getSession() {
  const c = await getClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data?.session || null;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new Error('Oturum gerekli');
  return session.user;
}

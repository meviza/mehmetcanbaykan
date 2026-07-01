/**
 * content-loader — Supabase'den concept_designs + services verisi çeker.
 * Tenant-aware: her sorgu tenant_id ile filtrelenir.
 * Çevrimdışı veya hata durumunda null döner → fallback data kullanılır.
 */
import { getClient } from './db.js';
import { getTenant } from './tenant.js';

export async function fetchServices() {
  const tenant = getTenant();
  if (!tenant?.id) return null;
  const c = await getClient();
  if (!c) return null;
  try {
    const { data, error } = await c
      .from('services')
      .select('slug, title, description, icon, display_order')
      .eq('tenant_id', tenant.id)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('services yüklenemedi:', err);
    return null;
  }
}

export async function fetchConcepts() {
  const tenant = getTenant();
  if (!tenant?.id) return null;
  const c = await getClient();
  if (!c) return null;
  try {
    const { data, error } = await c
      .from('concept_designs')
      .select('title, category, hint, image_url, display_order')
      .eq('tenant_id', tenant.id)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('concept_designs yüklenemedi:', err);
    return null;
  }
}
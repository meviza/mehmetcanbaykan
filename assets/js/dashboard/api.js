/**
 * API helpers — Supabase Storage image upload, shared
 */
import { SUPABASE_CONFIG } from '../config.js';

let _client = null;
async function client() {
  if (_client) return _client;
  const { getClient } = await import('../lib/db.js');
  _client = await getClient();
  return _client;
}

/**
 * Upload image to Supabase Storage public bucket.
 * Returns public URL.
 */
export async function uploadImage(file, pathPrefix = 'misc') {
  if (!file) throw new Error('Dosya seçilmedi');
  if (!file.type.startsWith('image/')) throw new Error('Sadece görsel yüklenebilir');
  if (file.size > 8 * 1024 * 1024) throw new Error('Dosya 8MB sınırını aşıyor');

  const c = await client();
  if (!c) throw new Error('Çevrimdışı — yükleme yapılamaz');

  const bucket = SUPABASE_CONFIG.storage.publicBucket;
  const ext = file.name.split('.').pop() || 'jpg';
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 60);
  const fileName = `${pathPrefix}/${Date.now()}-${safeName}.${ext}`;

  const { error } = await c.storage.from(bucket).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) throw error;

  const { data } = c.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * Delete image from bucket (best-effort, ignore 404).
 */
export async function deleteImage(url) {
  if (!url) return;
  try {
    const c = await client();
    if (!c) return;
    const bucket = SUPABASE_CONFIG.storage.publicBucket;
    const marker = `/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = url.slice(idx + marker.length);
    await c.storage.from(bucket).remove([path]);
  } catch {}
}

export async function getDb() { return client(); }
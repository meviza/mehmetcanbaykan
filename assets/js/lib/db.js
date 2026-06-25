/**
 * Supabase Client Singleton
 * CDN üzerinden supabase-js yüklenir, bu modül onu alıp config ile bağlar.
 */
import { SUPABASE_CONFIG } from '../config.js';

let clientInstance = null;

export async function getClient() {
  if (clientInstance) return clientInstance;
  if (!SUPABASE_CONFIG.enabled) return null;

  // Supabase global window objesinden al (CDN script tarafından yüklenmiş olmalı)
  const lib = globalThis.supabase;
  if (!lib || !lib.createClient) {
    console.warn('[db] supabase-js yüklenmedi, çevrimdışı moda düşülüyor');
    return null;
  }

  clientInstance = lib.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: globalThis.localStorage
    }
  });
  return clientInstance;
}

export function isOnline() {
  return Boolean(clientInstance);
}

/**
 * Supabase Yapılandırma
 * Sadece public anon key burada bulunur. Service role key ASLA frontend kodunda bulunmaz.
 */
export const SUPABASE_CONFIG = Object.freeze({
  url: 'https://musbzhimfbyufiocrrse.supabase.co',
  anonKey: 'sb_publishable_wMvz2g_PWhhKdGGQ0RMjCw_Q2U5fOxX',
  storage: {
    publicBucket: 'project-images',
    privateBucket: 'project-documents'
  },
  rpc: {
    submitContactForm: 'submit_contact_form'
  },
  // Admin panelinde oturum açabilecek e-postalar (sadece UI yönlendirmesi; gerçek auth Supabase yapar)
  adminEmails: ['can.mimarlik.56@gmail.com'],
  // true = Supabase aktif, false = localStorage fallback (geliştirme için)
  enabled: true
});

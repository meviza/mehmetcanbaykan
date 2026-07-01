/**
 * Tenant Loader — URL'den tenant belirle, config'i Supabase'den çek,
 * tema CSS variable'larını uygula, içeriği exportla.
 *
 * Tenant tespiti:
 *   1) URL: ?tenant=slug (query param)
 *   2) Host: mehmetcanbaykan.com veya mehmetcanbaykan.localhost
 *   3) Subdomain: mehmetcanbaykan.mehmetcanbaykan.com (gelecekte)
 *   4) Default: 'demo' (geliştirme için)
 */
import { getClient } from './db.js';
import { SUPABASE_CONFIG } from '../config.js';

let currentTenant = null;
let currentTheme = null;

/**
 * Tenant'ı tespit et (URL/host'tan)
 */
function detectTenantSlug() {
  const params = new URLSearchParams(location.search);
  if (params.get('tenant')) return params.get('tenant');
  if (params.get('t')) return params.get('t');

  const host = location.hostname;
  // localhost'ta tenant=slug kullan
  if (host === 'localhost' || host === '127.0.0.1') {
    return localStorage.getItem('mcb-dev-tenant') || 'mehmetcanbaykan';
  }

  // Production: subdomain veya path
  // mehmetcanbaykan.com → mehmetcanbaykan
  const parts = host.split('.');
  if (parts.length >= 2 && parts[parts.length - 1] !== 'localhost') {
    // www.mehmetcanbaykan.com → mehmetcanbaykan
    if (parts[0] === 'www' && parts.length === 3) {
      return parts[1];
    }
    // mehmetcanbaykan.com → mehmetcanbaykan
    if (parts.length === 2) {
      return parts[0];
    }
  }

  return 'mehmetcanbaykan';
}

/**
 * Tenant config'i yükle
 */
export async function loadTenant(slug = null) {
  const targetSlug = slug || detectTenantSlug();
  const client = await getClient();

  if (!client) {
    // Çevrimdışı fallback
    currentTenant = getDefaultTenant();
    applyTheme(currentTenant.theme);
    return currentTenant;
  }

  try {
    const { data, error } = await client
      .from('tenants')
      .select('*')
      .eq('slug', targetSlug)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      console.warn(`Tenant bulunamadı: ${targetSlug}, default kullanılıyor`);
      currentTenant = getDefaultTenant();
    } else {
      currentTenant = data;
    }
  } catch (err) {
    console.warn('Tenant yükleme hatası:', err);
    currentTenant = getDefaultTenant();
  }

  applyTheme(currentTenant.theme);
  // SEO meta'ları uygula
  applySEO(currentTenant);
  return currentTenant;
}

function getDefaultTenant() {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    slug: 'demo',
    name: 'Demo Mimar',
    tagline: 'Mimarlık & Tasarım',
    description: 'Lütfen Supabase bağlantısını kontrol edin.',
    theme: {
      colors: {
        primary: '#c9a45a',
        bg: '#0a0a0b',
        ink: '#f4f1ea',
        ink2: '#d9d3c4',
        ink3: '#a39c8a',
        line: 'rgba(244,241,234,0.08)'
      },
      fonts: { serif: 'Cormorant Garamond', sans: 'Inter' },
      radius: { sm: '8px', md: '14px', lg: '22px' }
    },
    contact: {
      phone: '+90 542 735 13 16',
      email: 'info@example.com',
      whatsapp: '905427351316'
    },
    seo: {
      title: 'Mimar — Mimarlık Ofisi',
      description: 'Mimarlık ve tasarım hizmetleri'
    }
  };
}

/**
 * Tema JSON'unu CSS variable'larına çevir
 */
export function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;

  const colors = theme.colors || {};
  // Renkleri set et (eski isimlerle uyumlu)
  setVar(root, '--color-primary', colors.primary || colors.accent);
  setVar(root, '--color-primary-2', colors.primary2 || colors.primary2);
  setVar(root, '--color-primary-3', colors.primary3);
  setVar(root, '--color-bg', colors.bg);
  setVar(root, '--color-bg-soft', colors.bgSoft || colors.bgSoft);
  setVar(root, '--color-bg-elevated', colors.bgElevated);
  setVar(root, '--color-ink', colors.ink);
  setVar(root, '--color-ink-2', colors.ink2);
  setVar(root, '--color-ink-3', colors.ink3);
  setVar(root, '--color-muted', colors.muted);
  setVar(root, '--color-line', colors.line);

  // Font
  const fonts = theme.fonts || {};
  if (fonts.serif) {
    setVar(root, '--font-serif', `'${fonts.serif}', 'Times New Roman', serif`);
    document.documentElement.style.setProperty('--font-serif', `'${fonts.serif}', 'Times New Roman', serif`);
  }
  if (fonts.sans) {
    document.documentElement.style.setProperty('--font-sans', `'${fonts.sans}', system-ui, sans-serif`);
  }

  // Radius
  const radius = theme.radius || {};
  if (radius.sm) setVar(root, '--radius-sm', radius.sm);
  if (radius.md) setVar(root, '--radius-md', radius.md);
  if (radius.lg) setVar(root, '--radius-lg', radius.lg);

  currentTheme = theme;
}

function setVar(el, name, value) {
  if (value) el.style.setProperty(name, value);
}

/**
 * SEO meta'ları tenant config'den uygula
 */
function applySEO(tenant) {
  const seo = tenant.seo || {};
  if (seo.title) document.title = seo.title;
  setMeta('description', seo.description);
  setMeta('keywords', (seo.keywords || []).join(', '));
  setMeta('og:title', seo.title, 'property');
  setMeta('og:description', seo.description, 'property');
  if (tenant.og_image_url || seo.ogImage) {
    setMeta('og:image', tenant.og_image_url || seo.ogImage, 'property');
  }
}

function setMeta(name, value, attr = 'name') {
  if (!value) return;
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

/**
 * Getter'lar
 */
export function getTenant() { return currentTenant; }
export function getTheme() { return currentTheme; }

/**
 * Yardımcı: telefon numarasını WhatsApp linkine çevir
 */
export function whatsappLink(message = '') {
  const phone = currentTenant?.contact?.whatsapp || currentTenant?.contact?.phone?.replace(/\D/g, '');
  const text = message || `Merhaba, ${currentTenant?.name || 'mimarlık ofisi'} websitesinden yazıyorum.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function telLink() {
  const phone = currentTenant?.contact?.phone || '';
  return `tel:${phone.replace(/\s/g, '')}`;
}

export function mailtoLink(subject = '') {
  const email = currentTenant?.contact?.email || '';
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
}
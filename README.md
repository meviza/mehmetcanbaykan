# Mehmet Can Baykan — Mimar
Kişisel portföy, kurumsal tanıtım sitesi ve yönetim paneli. Siirt ve çevresi için optimize edilmiş, mobil uyumlu, WhatsApp odaklı, **SEO 100/100** ve **GEO** hazır, **Supabase** ile tam senkronize.

**Canlı URL:** `https://mehmetcanbaykan.com`

## 🚀 Lighthouse Skorları (Production)
- **SEO: 100/100** ✅
- **Best Practices: 96/100** ✅
- **Accessibility: 92/100** ✅
- **Performance: 76/100** 🟡
- **CLS: 0.022** (mükemmel — görsel kayması yok)

## Stack
- Saf HTML / CSS / ES Modules (framework yok)
- Three.js (procedural 3D hero sahnesi, idle load)
- AOS (scroll animasyonları, async)
- Supabase (DB + auth + storage)
- Vercel deploy

## Önemli URL'ler
- Ana sayfa: `https://mehmetcanbaykan.com/`
- Vercel alias: `https://mehmet-can-baykan-mimar.vercel.app/`
- Admin: `https://mehmetcanbaykan.com/admin.html`

## SEO/GEO Checklist (Tamamlandı)
- ✅ Title, description, keywords (TR, Siirt yerel ağırlıklı)
- ✅ Canonical, hreflang (tr + x-default)
- ✅ Open Graph + Twitter Card (og-cover.jpg 1200x630)
- ✅ LocalBusiness / Person / WebSite / FAQPage / BreadcrumbList JSON-LD
- ✅ Service ItemList JSON-LD (6 hizmet)
- ✅ geo.region/placename/position meta
- ✅ Sitemap.xml + robots.txt (Vercel + mehmetcanbaykan.com)
- ✅ PWA: manifest.json + browserconfig + apple-touch-icon
- ✅ DNS prefetch, preconnect, preload (kritik font)
- ✅ IndexNow API key (Bing/Yandex anında index)
- ✅ Lazy loading (görseller + Three.js + AOS)
- ✅ KVKK aydınlatma + çerez barı

## 📋 Yapılması Gerekenler (Manuel)
1. **Google Search Console**: https://search.google.com/search-console → site ekle → sitemap gönder
2. **Bing Webmaster**: https://www.bing.com/webmasters → IndexNow ile gönderildi
3. **Yandex Webmaster**: https://webmaster.yandex.com → site ekle
4. **Google Analytics 4**: GA4 ID al → `assets/js/config.js`'e `gaId: 'G-XXX'` ekle
5. **Custom domain bağlama**: Vercel Dashboard → Settings → Domains → `mehmetcanbaykan.com` ekle
6. **Google'da hızlı index için**: Search Console'da URL Inspection → "Request Indexing"

## Konsept Slider
`assets/js/features/concept-slider.js` 12 görsel için:
- WebP (%93 küçültme) + JPG fallback
- Kayan + drag + klavye + swipe
- Lightbox desteği
- Autoplay (hover'da pause)
- 3D perspektif carousel

Görseller `assets/images/concepts/` altında WebP olarak.

## 3D Three.js Hero
- Procedural mimari sahne (yüzen kübik kütle kompozisyonu)
- Idle'da yüklenir (LCP'yi bloklamaz)
- WebGL yoksa SVG skeleton fallback
- `prefers-reduced-motion` desteği

## Yerel Geliştirme
```bash
python3 -m http.server 8080
# veya
npx serve
```

## Vercel Deploy
```bash
vercel deploy --prod
```

---

© Mehmet Can Baykan — Tüm hakları saklıdır.

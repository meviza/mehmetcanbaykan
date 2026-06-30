# Mehmet Can Baykan — Mimar
Kişisel portföy, kurumsal tanıtım sitesi ve yönetim paneli. Siirt ve çevresi için optimize edilmiş, mobil uyumlu, WhatsApp odaklı, SEO + GEO hazır, **Supabase ile tam senkronize**.

**Canlı URL:** `https://mehmetcanbaykan.com`

## Stack
- Saf HTML / CSS / ES Modules (framework yok)
- Three.js (procedural 3D hero sahnesi)
- AOS (scroll animasyonları)
- Supabase (DB + auth + storage)
- Vercel deploy (recommended) veya GitHub Pages

## Yapı
```
.
├── index.html
├── project.html
├── admin.html
├── 404.html
├── vercel.json
├── assets/
│   ├── css/        tokens, base, layout, components, sections, pages + dark hero/slider/toast/cookie
│   ├── js/         ES modules: app, features (site, projects, contact, hero3d, concept-slider, faq, cookie-bar), lib (db, repo, auth, ui, storage)
│   ├── data/       projects.json (Supabase kapalı fallback)
│   └── images/     profile.jpg, favicon.svg, og-cover.svg, concepts/ (konsept slider için)
├── supabase/       schema.sql + migrations
├── robots.txt
└── sitemap.xml
```

## Premium Dark + Gold Tasarım
- `#0a0a0b` zemin, `#c9a45a` altın aksan
- Cormorant Garamond (serif başlık) + Inter (sans gövde)
- Custom cursor, magnetic buttons, 3D hero, konsept slider
- Film-grain overlay, altın aksan ışıklar
- KVKK uyumlu, çerez bildirimi, gizlilik politikası bölümü

## Konsept Slider
`assets/js/features/concept-slider.js` 13 görsel için:
- Kayan + drag + klavye + swipe
- Lightbox desteği
- Autoplay (hover'da pause)
- Yükleme hatası → kategori placeholder'ı
- Görseller `assets/images/concepts/` altına `site-2.png`, `kat-plani-02.png`, `kultur-sanat-evi.png` vb. isimlerle konmalı.

## 3D Three.js Hero
`assets/js/features/hero3d.js` procedural mimari sahne:
- Yüzen kübik kütle kompozisyonu (ana kule + yan kanat + üst kütle)
- Altın aksan çizgiler, cam kütle, ısıtma ışıkları
- Mouse parallax + scroll/visibility optimizasyonu
- WebGL yoksa SVG fallback
- Three.js r0.160.0 (CDN)

## Yerel Geliştirme
```bash
# Basit statik server
python3 -m http.server 8080
# veya
npx serve
```

## Vercel Deploy
```bash
npm i -g vercel
vercel          # ilk deploy
vercel --prod   # production
```

Vercel otomatik:
- HTTPS
- Cache headers (vercel.json'da tanımlı)
- Custom domain bağlama

**Environment variables (opsiyonel):** Vercel Dashboard'dan ekleyebilirsin ama şu an static site, JS runtime'da Supabase yapılandırması kullanılıyor (`assets/js/config.js`).

## Supabase Kurulumu
SQL Editor → `supabase/schema.sql` yapıştır → Run.

Detaylar için README eski versiyonuna bakılabilir; mimari değişmedi.

## KVKK
Web formu + cookie barı eklendi:
- Çerez bildirimi (LocalStorage ile hatırlanır)
- Gizlilik Politikası bölümü (`#gizlilik`)
- Aydınlatma checkbox'ı formda zorunlu

---

© Mehmet Can Baykan — Tüm hakları saklıdır.

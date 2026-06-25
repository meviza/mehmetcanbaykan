# Mehmet Can Baykan — Mimar

Kişisel portföy, kurumsal tanıtım sitesi ve yönetim paneli. Siirt ve çevresi için optimize edilmiş, mobil uyumlu, WhatsApp odaklı, SEO + GEO hazır, **Supabase ile tam senkronize**.

**Canlı URL:** `https://meviza.github.io/mehmetcanbaykan/`
**Admin:** `https://meviza.github.io/mehmetcanbaykan/admin.html`

## Yapı

```
.
├── index.html              Ana sayfa (Hero, Hakkımda, Hizmetler, Projeler, Süreç, İletişim)
├── project.html            Tekil proje detay sayfası (blog formatı)
├── admin.html              Yönetim paneli (giriş, projeler, mesajlar, raporlar)
├── assets/
│   ├── css/
│   │   ├── style.css       Ana tasarım sistemi
│   │   ├── blog.css        Proje detay sayfası stilleri
│   │   └── admin.css       Admin paneli stilleri
│   ├── js/
│   │   ├── main.js         Site etkileşimleri, proje grid
│   │   ├── blog.js         Proje detay sayfası işleyicisi
│   │   ├── supabase-config.js   ← Supabase URL/key buraya
│   │   ├── supabase-service.js  CRUD, auth, storage
│   │   └── admin.js        Admin paneli işleyicisi
│   ├── data/
│   │   └── projects.json   18 proje (Supabase kapalıyken fallback)
│   └── images/
│       ├── profile.jpg     ← Mehmet Bey'in fotoğrafı (eklendi)
│       └── favicon.svg
├── supabase/
│   └── schema.sql          ← Supabase SQL şeması (oraya yapıştır)
├── robots.txt
├── sitemap.xml
├── CNAME                   Özel alan adı (boş)
├── .nojekyll               GitHub Pages
└── README.md
```

## GitHub Pages'te Yayınlama

1. **Yeni public repo** → `mehmetcanbaykan`
2. Tüm dosyaları push'la
3. Settings → Pages → Source: `main` / root
4. Birkaç dakika sonra `https://meviza.github.io/mehmetcanbaykan/`

## Supabase Kurulumu (opsiyonel ama önerilen)

Supabase olmadan site statik olarak çalışır (18 örnek proje `assets/data/projects.json`'dan gelir). Ancak:
- Web formundan gelen mesajlar kaybolur
- Admin paneli "çevrimdışı mod"da çalışır (LocalStorage)
- Admin'de eklenen projeler sitede görünmez

**Supabase ile tam senkron:**

### 1. Proje oluştur
- [supabase.com/dashboard](https://supabase.com/dashboard) → New Project
- Bölge: Frankfurt (Türkiye'ye yakın)
- Database şifresi belirle

### 2. SQL şemasını yükle
- Sol menü → **SQL Editor**
- `supabase/schema.sql` içeriğini yapıştır → **Run**

### 3. API anahtarlarını al
- Settings → **API**
- `Project URL` ve `anon public` key'i kopyala

### 4. Yapılandırmayı güncelle
`assets/js/supabase-config.js` dosyasında:
```js
url: 'https://xxxxxxxxxxxx.supabase.co',
anonKey: 'eyJhbGciOi...',
enabled: true
```

### 5. İlk admin kullanıcısını oluştur
- Supabase → Authentication → Users → Add user
- Email + şifre ver, "Auto Confirm User" işaretle

### 6. Storage bucket
`schema.sql` otomatik oluşturur: `project-images` (public).

### 7. Siteyi yayınla
GitHub Pages push sonrası:
- Web formu → Supabase `messages` tablosuna yazılır
- Admin girişi → gerçek auth
- Admin'den eklenen proje → anında sitede görünür

## Veri Modeli

### `projects`
| Alan | Tür | Açıklama |
|---|---|---|
| `id` | text PK | Slug, örn: `rest-01` |
| `title` | text | Başlık |
| `category` | text | restorasyon \| ic-tasarim \| vaziyet \| kat-plani \| peyzaj \| tas-ahsap |
| `categoryLabel` | text | Görünen ad |
| `year`, `location`, `area`, `duration` | text/int | Meta bilgiler |
| `summary` | text | Kısa özet |
| `image` | text | Kapak görseli URL |
| `tags` | text[] | Etiketler |
| `content` | jsonb | Blog içeriği (intro, climate, soil, neighborhood, regulations, equations, process, outcome) |
| `is_published` | bool | Yayında mı |
| `display_order` | int | Sıralama |

### `messages`
Web formundan gelen müşteri mesajları. Admin'de durum (new/read/replied/archived) ve admin notu yönetilir.

### `reports`
İç notlar, görevler, teklifler, saha kayıtları. Projeler ve mesajlarla ilişkilendirilebilir.

## Admin Panel Kullanımı

1. `admin.html` → e-posta + şifre ile giriş
2. **Panel** → Genel bakış (istatistikler, son mesajlar, son raporlar)
3. **Projeler** → Yeni proje ekle, düzenle, sil, arama, yayın durumu
4. **Mesajlar** → Müşteri mesajları, durum güncelle, WhatsApp'tan yanıtla, admin notu
5. **Raporlar** → İç notlar, termin, ilgili proje, durum takibi

## SEO/GEO Notları

- Title, description, keywords Türkçe ve Siirt yerel anahtar kelime odaklı
- `<meta name="geo.region/placename/position">` (enlem/boylam: 37.9274, 41.9403)
- `JSON-LD` `ArchitecturalService` schema (areaServed: Siirt, Kurtalan, Baykan, Pervari, Şirvan, Tillo, Batman, Şırnak)
- Open Graph + Twitter Card
- `robots.txt` + `sitemap.xml`
- Her proje detay sayfası kendi meta etiketlerini dinamik üretir

**Google Search Console'a kayıt:** [search.google.com/search-console](https://search.google.com/search-console) → `meviza.github.io/mehmetcanbaykan` → sitemap gönder.

## Özelleştirme

| Değişken | Konum |
|---|---|
| Renk paleti | `assets/css/style.css` `:root` |
| Telefon numarası | Tüm dosyalarda `905427351316` (bul/değiştir) |
| WhatsApp linkleri | `index.html`, `project.html`, `admin.html` |
| Admin email listesi | `assets/js/supabase-config.js` `adminEmails` |
| Hizmet listesi | `index.html` (services bölümü) |

## Teknoloji

- Saf HTML + CSS + JS (framework yok)
- [AOS](https://michalsnik.github.io/aos/) — scroll animasyonları
- [Supabase JS](https://supabase.com/docs/reference/javascript) — DB + auth + storage
- Google Fonts: Cormorant Garamond + Inter
- Tamamen statik hosting (GitHub Pages) + ücretsiz DB (Supabase free tier)

---

© Mehmet Can Baykan — Tüm hakları saklıdır.

/**
 * fallback-content — DB'den veri gelmediğinde kullanılan varsayılan içerik.
 * Her tenant kendi theme.json'unda override edebilir (ileride).
 */
export const SERVICES = [
  {
    icon: 'building',
    title: 'Mimari Restorasyon',
    description: 'Tarihi yapıların aslına uygun restorasyonu, güçlendirme projeleri ve koruma-yaşatma çözümleri.',
    whatsapp: 'Restorasyon%20projem%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.'
  },
  {
    icon: 'layers',
    title: 'İç Tasarım & İç Mimari',
    description: 'Konut, ofis ve ticari mekanlarda konsept tasarım, malzeme seçimi ve 3B görselleştirme.',
    whatsapp: '%C4%B0%C3%A7%20mimari%20projem%20hakk%C4%B1nda%20g%C3%B6r%C3%BC%C5%9Fmek%20istiyorum.'
  },
  {
    icon: 'sparkle',
    title: 'Vaziyet Planı',
    description: 'Parsel analizi, yerleşim kararları, yeşil alan ve ulaşım ilişkileriyle bütüncül planlama.',
    whatsapp: 'Vaziyet%20plan%C4%B1%20i%C3%A7in%20teklif%20almak%20istiyorum.'
  },
  {
    icon: 'home',
    title: 'Kat Planları',
    description: 'Akıllı sirkülasyon, ergonomik metrekare kullanımı ve detaylandırılmış kat çözümleri.',
    whatsapp: 'Kat%20planlar%C4%B1%20i%C3%A7in%20g%C3%B6r%C3%BC%C5%9Fme%20istiyorum.'
  },
  {
    icon: 'sparkle',
    title: 'Peyzaj Tasarımı',
    description: 'Doğal bitki örtüsü, taş ve su öğeleriyle bütünleşik, düşük bakım gerektiren dış alan çözümleri.',
    whatsapp: 'Peyzaj%20tasar%C4%B1m%C4%B1%20i%C3%A7in%20teklif%20alabilir%20miyim.'
  },
  {
    icon: 'building',
    title: 'Taş & Ahşap Ev',
    description: 'Bölgenin geleneksel malzemesiyle, modern konforu buluşturan rustik konut projeleri.',
    whatsapp: 'Ta%C5%9F%20ve%20ah%C5%9Fap%20ev%20projesi%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.'
  }
];

export const PROCESS_STEPS = [
  { num: '01', title: 'Ön Görüşme', body: 'İhtiyaçlarınızı, bütçenizi ve vizyonunuzu dinliyorum. Ücretsiz.' },
  { num: '02', title: 'Keşif & Analiz', body: 'Parsel/alan ziyareti, çevre analizi ve yönetmelik incelemesi.' },
  { num: '03', title: 'Konsept & Teklif', body: 'Tasarım konsepti, ön maliyet ve sözleşme aşaması.' },
  { num: '04', title: 'Uygulama Projeleri', body: 'Mimari, statik, mekanik ve elektrik projelerinin hazırlanması.' },
  { num: '05', title: 'Ruhsat Süreci', body: 'Belediye ve ilgili kurumlara başvuru, ruhsat takibi.' },
  { num: '06', title: 'Şantiye & Teslim', body: 'Uygulama denetimi, kontrollük ve anahtar teslim.' }
];

export const FAQ_ITEMS = [
  {
    q: 'Ruhsat süreci ne kadar sürer?',
    a: 'Ortalama 30–60 iş günü. Projenin ölçeğine ve belediyenin yoğunluğuna göre değişir. Başvurudan itibaren takip tarafımızca yürütülür.'
  },
  {
    q: 'Maliyet nasıl belirlenir?',
    a: 'Arsa büyüklüğü, yapı sınıfı, malzeme tercihleri ve zorluk derecesine göre metrekare bazlı ön maliyet çıkarılır. Konsept aşamasında size iki farklı bütçe senaryosu sunuyorum.'
  },
  {
    q: 'Ücretsiz ön görüşme nasıl yapılıyor?',
    a: 'Telefon, WhatsApp veya ofisimde yüz yüze. Tapu bilginiz, beklentileriniz ve zamanlamanız üzerinden 20–30 dakikalık bir görüşme yeterli.'
  },
  {
    q: 'Sadece iç mimari de yapıyor musunuz?',
    a: 'Evet. Sadece iç mekan yenileme, mağaza konsept tasarımı ve ofis düzenlemesi için de çalışıyorum. Mimari proje gerektirmeyen işler için ayrı teklif veriyorum.'
  },
  {
    q: 'Hangi bölgelere hizmet veriyorsunuz?',
    a: 'Hizmet bölgelerim detay için İletişim bölümünü inceleyebilirsiniz. Yakın çevre ve komşu iller önceliklidir.'
  },
  {
    q: 'Restorasyon projelerinde nelere dikkat ediyorsunuz?',
    a: 'Tarihi doku ve malzemenin aslına uygun korunması öncelik. Taşıyıcı sistem stabilizasyonu, cephe detayları ve çağdaş konfor katmanı bir arada çözülür.'
  }
];

export const STATS = [
  { num: '10', plus: '+', label: 'Yıllık Deneyim' },
  { num: '6', plus: '', label: 'Uzmanlık Alanı' },
  { num: '8', plus: '', label: 'Hizmet Bölgesi' },
  { num: '100', plus: '%', label: 'Kişisel Süreç Takibi' }
];

export const NAV_LINKS = [
  { href: '#konseptler', label: 'Konseptler' },
  { href: '#hakkimda', label: 'Hakkımda' },
  { href: '#hizmetler', label: 'Hizmetler' },
  { href: '#surec', label: 'Süreç' },
  { href: '#sss', label: 'SSS' },
  { href: '#iletisim', label: 'İletişim' }
];
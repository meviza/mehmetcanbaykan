/**
 * SSS (FAQ) bölümü — accordion.
 */

const FAQ_ITEMS = [
  {
    q: 'Ruhsat süreci ne kadar sürer?',
    a: 'Siirt Merkez ve çevre ilçelerde ortalama 30–60 iş günü. Projenin ölçeğine ve belediyenin yoğunluğuna göre değişir. Başvurudan itibaren takip tarafımızca yürütülür.'
  },
  {
    q: 'Maliyet nasıl belirlenir?',
    a: 'Arsa büyüklüğü, yapı sınıfı, malzeme tercihleri ve zorluk derecesine göre metrekare bazlı ön maliyet çıkarılır. Konsept aşamasında size iki farklı bütçe senaryosu sunuyorum.'
  },
  {
    q: 'Ücretsiz ön görüşme nasıl yapılıyor?',
    a: 'Telefon, WhatsApp veya ofisimizde yüz yüze. Arsanızın tapu bilgisi, beklentileriniz ve zamanlamanız üzerinden 20–30 dakikalık bir görüşme yeterli.'
  },
  {
    q: 'Sadece iç mimari de yapıyor musunuz?',
    a: 'Evet. Sadece iç mekan yenileme, mağaza konsept tasarımı ve ofis düzenlemesi için de çalışıyorum. Mimari proje gerektirmeyen işler için ayrı teklif veriyorum.'
  },
  {
    q: 'Restorasyon projelerinde nelere dikkat ediyorsunuz?',
    a: 'Tarihi doku ve malzemenin aslına uygun korunması öncelik. Taşıyıcı sistem stabilizasyonu, cephe detayları ve çağdaş konfor katmanı bir arada çözülür.'
  },
  {
    q: 'Hangi bölgelere hizmet veriyorsunuz?',
    a: 'Siirt merkez ve tüm ilçeleri (Kurtalan, Baykan, Pervari, Şirvan, Tillo) başta olmak üzere Batman ve Şırnak çevresi.'
  },
];

export function initFaq() {
  const root = document.getElementById('faq');
  if (!root) return;

  root.innerHTML = `
    <div class="container">
      <div class="section-head" data-aos="fade-up">
        <span class="section-tag">Sık Sorulan Sorular</span>
        <h2 class="section-title">Aklınıza <em>gelenler</em></h2>
        <p class="section-sub">Süreç, maliyet ve işleyiş hakkında kısa cevaplar.</p>
      </div>
      <div class="faq-list">
        ${FAQ_ITEMS.map((item, i) => `
          <details class="faq-item" ${i === 0 ? 'open' : ''}>
            <summary>
              <span>${item.q}</span>
              <span class="faq-icon" aria-hidden="true">+</span>
            </summary>
            <div class="faq-body"><p>${item.a}</p></div>
          </details>
        `).join('')}
      </div>
    </div>
  `;
}
/**
 * 3rd-party entegrasyonlar
 * Her servis için ID gerekli. Boşsa otomatik yüklenmez.
 * .env veya CI üzerinden override edilebilir.
 */
export const ANALYTICS_CONFIG = Object.freeze({
  // Google Analytics 4 — measurement ID (G-XXXXXXXXXX)
  // Google Analytics hesabı oluştur → Yönetici → Veri Akışları → Web → Ölçüm Kimliği
  // Örn: 'G-ABC123DEF4'
  ga4Id: '',

  // Yandex.Metrica — sayaç ID (numeric)
  // https://metrica.yandex.com → Sayaç ekle → ID kopyala
  // Örn: 98765432
  yandexMetricaId: '',

  // Plausible — domain (analytics için)
  // Plausible.io → Site ekle → domain adını yaz (www. olmadan)
  // Örn: 'mehmetcanbaykan.com'
  plausibleDomain: '',

  // Microsoft Clarity — heatmap/recording (opsiyonel)
  // clarity.microsoft.com → Project oluştur → ID kopyala
  // Örn: 'abcdef1234'
  clarityId: '',

  // Facebook Pixel — reklam retargeting (opsiyonel)
  // business.facebook.com → Events Manager → Pixel ID
  // Örn: '123456789012345'
  facebookPixelId: '',
});

/**
 * Analytics script'lerini async yükle. Hiç ID yoksa hiçbir şey yüklenmez.
 */
export function loadAnalytics() {
  const c = ANALYTICS_CONFIG;
  const head = document.head;

  // Google Analytics 4
  if (c.ga4Id) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${c.ga4Id}`;
    head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', c.ga4Id, { anonymize_ip: true, send_page_view: true });
  }

  // Yandex.Metrica
  if (c.yandexMetricaId) {
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
    (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    window.ym(c.yandexMetricaId, "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true
    });
  }

  // Plausible (privacy-friendly analytics)
  if (c.plausibleDomain) {
    const s = document.createElement('script');
    s.async = true;
    s.defer = true;
    s.src = 'https://plausible.io/js/script.js';
    s.dataset.domain = c.plausibleDomain;
    head.appendChild(s);
  }

  // Microsoft Clarity
  if (c.clarityId) {
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", c.clarityId);
  }

  // Facebook Pixel
  if (c.facebookPixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', c.facebookPixelId);
    fbq('track', 'PageView');
  }
}
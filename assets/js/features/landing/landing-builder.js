/**
 * landing-builder — Tek noktadan tüm landing section'larını mount eder.
 * Tenant-aware: her section tenant.contact / tenant.theme alır.
 * DB verisi başarısız olursa fallback-content kullanılır.
 */
import { buildNav } from './sections/nav-section.js';
import { buildHero } from './sections/hero-section.js';
import { buildConcepts } from './sections/concepts-section.js';
import { buildServices } from './sections/services-section.js';
import { buildAbout } from './sections/about-section.js';
import { buildProcess } from './sections/process-section.js';
import { buildFaq } from './sections/faq-section.js';
import { buildContact } from './sections/contact-section.js';
import { buildFooter } from './sections/footer-section.js';

import { fetchServices, fetchConcepts } from '../../lib/content-loader.js';
import { getTenant } from '../../lib/tenant.js';

export async function mountLanding(rootEl) {
  if (!rootEl) return;

  const tenant = getTenant() || {};
  const [services, concepts] = await Promise.all([
    fetchServices().catch(() => null),
    fetchConcepts().catch(() => null)
  ]);

  // Nav (ayrı root'a — sticky olabilmesi için)
  const navHost = document.getElementById('landing-nav');
  if (navHost) {
    navHost.replaceWith(buildNav({ tenant }));
  }

  // Hero
  const heroHost = document.getElementById('landing-hero');
  if (heroHost) heroHost.replaceWith(buildHero({ tenant }));

  // Konsept slider
  const conceptsHost = document.getElementById('landing-concepts');
  if (conceptsHost) {
    const wrap = document.createElement('div');
    wrap.className = 'section section-concepts';
    wrap.id = 'konseptler';
    const inner = document.createElement('div');
    inner.className = 'container-fluid';
    inner.innerHTML = `
      <div class="section-head">
        <span class="section-tag">Konsept Tasarımlar</span>
        <h2 class="section-title">Çalışma <em>masamdan</em></h2>
        <p class="section-sub">Henüz inşa edilmemiş, kafamda ve çizim masamda olan projeler. Restorasyondan iç mekana, vaziyetten peyzaja — tamamlanmış iş değil, konseptler.</p>
      </div>
    `;
    inner.appendChild(buildConcepts({ concepts }));
    wrap.appendChild(inner);
    conceptsHost.replaceWith(wrap);
  }

  // Hakkımda
  const aboutHost = document.getElementById('landing-about');
  if (aboutHost) aboutHost.replaceWith(buildAbout({ tenant }));

  // Hizmetler
  const servicesHost = document.getElementById('landing-services');
  if (servicesHost) servicesHost.replaceWith(buildServices({ services, tenant }));

  // Süreç
  const processHost = document.getElementById('landing-process');
  if (processHost) processHost.replaceWith(buildProcess({ tenant }));

  // SSS
  const faqHost = document.getElementById('landing-faq');
  if (faqHost) faqHost.replaceWith(buildFaq({ faqs: null }));

  // İletişim
  const contactHost = document.getElementById('landing-contact');
  if (contactHost) contactHost.replaceWith(buildContact({ services, tenant }));

  // Footer
  const footerHost = document.getElementById('landing-footer');
  if (footerHost) footerHost.replaceWith(buildFooter({ tenant }));
}
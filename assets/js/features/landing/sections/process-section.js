/**
 * process-section — 6 adımlı süreç timeline.
 */
import { el } from '../../../lib/components/index.js';
import { PROCESS_STEPS } from '../fallback-content.js';

export function buildProcess({ tenant }) {
  const waPhone = (tenant?.contact?.whatsapp || '').replace(/\D/g, '');
  const waText = encodeURIComponent('Merhaba, maliyet hakkında ön bilgi almak istiyorum.');

  const steps = el('div', { class: 'process' },
    ...PROCESS_STEPS.map(s => el('div', { class: 'step' },
      el('div', { class: 'step-num' }, s.num),
      el('h3', {}, s.title),
      el('p', {}, s.body)
    ))
  );

  const cta = el('div', { class: 'process-cta' },
    el('h3', {}, 'Maliyet aralığınızı öğrenmek ister misiniz?'),
    el('p', {}, 'Birkaç satır bilgi yeter, gerisini birlikte konuşalım.'),
    el('a', {
      href: `https://wa.me/${waPhone}?text=${waText}`,
      class: 'btn btn-primary', target: '_blank', rel: 'noopener'
    }, "WhatsApp'tan Bilgi Al")
  );

  return el('section', { class: 'section section-dark', id: 'surec' },
    el('div', { class: 'container-fluid' },
      el('div', { class: 'section-head' },
        el('span', { class: 'section-tag' }, 'Süreç & Maliyet'),
        el('h2', { class: 'section-title light', html: 'Nasıl <em>ilerliyoruz</em>?' }),
        el('p', { class: 'section-sub light' }, 'Şeffaf süreç, öngörülebilir maliyet.')
      ),
      steps,
      cta
    )
  );
}
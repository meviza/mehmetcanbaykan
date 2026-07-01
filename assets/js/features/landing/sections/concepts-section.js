/**
 * concepts-section — 3D carousel slider (drag/swipe/lightbox/autoplay).
 * Bağımsız: kendi state yönetimi + render'ı içerir.
 */
import { el } from '../../../lib/components/index.js';

export function buildConcepts({ concepts }) {
  const slides = (concepts && concepts.length) ? concepts : FALLBACK_CONCEPTS;

  const stage = el('div', { class: 'cs-stage', style: { maxWidth: '100%', overflow: 'hidden' } },
    el('div', { class: 'cs-track', id: 'csTrack', style: { maxWidth: '100%' } }),
    el('div', { class: 'cs-controls' },
      el('button', { class: 'cs-arrow cs-prev', 'aria-label': 'Önceki',
        html: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 18l-6-6 6-6"/></svg>'
      }),
      el('button', { class: 'cs-arrow cs-next', 'aria-label': 'Sonraki',
        html: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 6l6 6-6 6"/></svg>'
      })
    ),
    el('div', { class: 'cs-meta' },
      el('span', { class: 'cs-counter' },
        el('span', { id: 'csCurrent' }, '1'),
        el('span', {}, ' / ' + slides.length)
      ),
      el('span', { class: 'cs-title', id: 'csTitle' }, slides[0]?.title || '')
    )
  );

  const thumbs = el('div', { class: 'cs-thumbs', id: 'csThumbs', style: { maxWidth: '100%' } });
  const lightbox = el('div', { class: 'cs-lightbox', id: 'csLightbox',
    'aria-hidden': 'true', role: 'dialog', 'aria-label': 'Konsept önizleme' },
    el('button', { class: 'cs-lb-close', 'aria-label': 'Kapat' }, '×'),
    el('button', { class: 'cs-lb-prev', 'aria-label': 'Önceki' }, '‹'),
    el('picture', {},
      el('img', { class: 'cs-lb-img', alt: '' })
    ),
    el('button', { class: 'cs-lb-next', 'aria-label': 'Sonraki' }, '›'),
    el('p', { class: 'cs-lb-caption' })
  );

  const root = el('div', { class: 'cs-root', id: 'conceptSlider' }, stage, thumbs, lightbox);

  setTimeout(() => initSlider(root, slides), 0);
  return root;
}

function initSlider(root, slides) {
  const track = root.querySelector('#csTrack');
  const thumbsEl = root.querySelector('#csThumbs');
  const titleEl = root.querySelector('#csTitle');
  const counterEl = root.querySelector('#csCurrent');

  slides.forEach((s, i) => {
    const elSlide = el('article', { class: 'cs-slide', dataset: { index: i } });
    const wrap = el('div', { class: 'cs-img-wrap' });
    wrap.appendChild(el('div', { class: 'cs-img-placeholder' },
      el('span', {}, s.title || `Konsept ${i + 1}`)
    ));
    const img = el('img', {
      class: 'cs-img',
      src: s.image_url || s.src,
      alt: s.title || '',
      loading: i < 2 ? 'eager' : 'lazy',
      decoding: 'async',
      draggable: 'false'
    });
    img.addEventListener('load', () => elSlide.classList.add('is-loaded'), { once: true });
    wrap.appendChild(img);
    elSlide.appendChild(wrap);

    elSlide.appendChild(el('div', { class: 'cs-slide-meta' },
      el('span', { class: 'cs-num' }, String(i + 1).padStart(2, '0')),
      el('h3', {}, s.title || ''),
      el('p', {}, s.hint || '')
    ));
    track.appendChild(elSlide);

    const thumb = el('button', {
      class: 'cs-thumb',
      'aria-label': `${i + 1}. ${s.title || ''}`,
      dataset: { index: i }
    });
    const tImg = el('img', { src: s.image_url || s.src, alt: '',
      loading: i < 4 ? 'eager' : 'lazy', decoding: 'async' });
    thumb.appendChild(tImg);
    thumb.appendChild(el('span', { class: 'cs-thumb-num' }, String(i + 1).padStart(2, '0')));
    thumb.addEventListener('click', () => goTo(i, true));
    thumbsEl.appendChild(thumb);
  });

  const state = { index: 0, isDragging: false, startX: 0, deltaX: 0, autoplayId: null };

  function update() {
    const slideEls = track.querySelectorAll('.cs-slide');
    const thumbEls = thumbsEl.querySelectorAll('.cs-thumb');
    slideEls.forEach((s, i) => {
      s.classList.toggle('is-active', i === state.index);
      s.classList.toggle('is-prev', i === state.index - 1);
      s.classList.toggle('is-next', i === state.index + 1);
      s.classList.toggle('is-far', Math.abs(i - state.index) > 1);
    });
    thumbEls.forEach((t, i) => t.classList.toggle('is-active', i === state.index));
    if (titleEl) titleEl.textContent = slides[state.index]?.title || '';
    if (counterEl) counterEl.textContent = String(state.index + 1);
  }

  function goTo(i, fromUser = false) {
    state.index = ((i % slides.length) + slides.length) % slides.length;
    update();
    if (fromUser) restart();
  }

  function next(fromUser = false) { goTo(state.index + 1, fromUser); }
  function prev(fromUser = false) { goTo(state.index - 1, fromUser); }

  function start() {
    if (state.autoplayId) return;
    state.autoplayId = setInterval(() => next(false), 5000);
  }
  function stop() {
    if (state.autoplayId) { clearInterval(state.autoplayId); state.autoplayId = null; }
  }
  function restart() { stop(); start(); }

  root.querySelector('.cs-prev').addEventListener('click', () => prev(true));
  root.querySelector('.cs-next').addEventListener('click', () => next(true));

  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);

  // Drag
  const onDown = (e) => {
    state.isDragging = true;
    state.startX = (e.touches ? e.touches[0].clientX : e.clientX);
    state.deltaX = 0;
    stop();
  };
  const onMove = (e) => {
    if (!state.isDragging) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    state.deltaX = x - state.startX;
  };
  const onUp = () => {
    if (!state.isDragging) return;
    state.isDragging = false;
    if (state.deltaX > 60) prev();
    else if (state.deltaX < -60) next();
    state.deltaX = 0;
    start();
  };
  track.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  track.addEventListener('touchstart', onDown, { passive: true });
  track.addEventListener('touchmove', onMove, { passive: true });
  track.addEventListener('touchend', onUp);

  // Lightbox
  const lb = root.querySelector('#csLightbox');
  const openLb = (i) => {
    goTo(i, true);
    const slide = slides[state.index];
    lb.querySelector('.cs-lb-img').src = slide.image_url || slide.src || '';
    lb.querySelector('.cs-lb-img').alt = slide.title || '';
    lb.querySelector('.cs-lb-caption').textContent = `${slide.title || ''} — ${slide.hint || ''}`;
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const closeLb = () => {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  track.querySelectorAll('.cs-slide').forEach(s => {
    s.addEventListener('click', () => {
      if (Math.abs(state.deltaX) > 5) return;
      openLb(parseInt(s.dataset.index, 10));
    });
  });
  lb.querySelector('.cs-lb-close').addEventListener('click', closeLb);
  lb.querySelector('.cs-lb-prev').addEventListener('click', () => { prev(); openLb(state.index); });
  lb.querySelector('.cs-lb-next').addEventListener('click', () => { next(); openLb(state.index); });
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });

  document.addEventListener('keydown', (e) => {
    if (lb.classList.contains('is-open')) {
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') { prev(); openLb(state.index); }
      if (e.key === 'ArrowRight') { next(); openLb(state.index); }
    }
  });

  update();
  start();
}

const FALLBACK_CONCEPTS = [
  { src: 'assets/images/concepts/site-02.webp',          image_url: 'assets/images/concepts/site-02.webp',          title: 'Site Tasarımı 02',   hint: 'Parsel düzenlemesi, ana giriş aksı, otopark ve yeşil tampon.' },
  { src: 'assets/images/concepts/kat-plani-02.webp',     image_url: 'assets/images/concepts/kat-plani-02.webp',     title: 'Kat Planı 02',       hint: 'Sirkülasyon, ergonomik m² kullanımı, ıslak hacim optimizasyonu.' },
  { src: 'assets/images/concepts/kultur-sanat-evi.webp', image_url: 'assets/images/concepts/kultur-sanat-evi.webp', title: 'Kültür & Sanat Evi', hint: 'Çok amaçlı salon, atölyeler, galeri koridorları; esnek akustik.' },
  { src: 'assets/images/concepts/site-tasarimi.webp',    image_url: 'assets/images/concepts/site-tasarimi.webp',    title: 'Site Tasarımı',      hint: 'Yaya aksı, araç yolu ayrımı, peyzaj entegrasyonu.' },
  { src: 'assets/images/concepts/ic-tasarim-03.webp',    image_url: 'assets/images/concepts/ic-tasarim-03.webp',    title: 'İç Tasarım 03',      hint: 'Doğal ışık, gömme aydınlatma, doku kontrastı.' },
  { src: 'assets/images/concepts/kat-plani-01.webp',     image_url: 'assets/images/concepts/kat-plani-01.webp',     title: 'Kat Planı 01',       hint: 'Açık plan, merkezi ada, lineer mutfak-banyo şeridi.' },
  { src: 'assets/images/concepts/ic-tasarim-02.webp',    image_url: 'assets/images/concepts/ic-tasarim-02.webp',    title: 'İç Tasarım 02',      hint: 'Mobilyada özel üretim, sıcak ton paleti, hacim kademelemesi.' },
  { src: 'assets/images/concepts/ic-tasarim-01.webp',    image_url: 'assets/images/concepts/ic-tasarim-01.webp',    title: 'İç Tasarım 01',      hint: 'Galeri boşluğu, doğal malzeme, sessiz lüks detaylar.' },
  { src: 'assets/images/concepts/rezidans.webp',         image_url: 'assets/images/concepts/rezidans.webp',         title: 'Rezidans',           hint: 'Yüksek tavan, manzara odaklı, özel peyzaj entegrasyonu.' },
  { src: 'assets/images/concepts/restorasyon-03.webp',   image_url: 'assets/images/concepts/restorasyon-03.webp',   title: 'Restorasyon 03',     hint: 'Taş duvar stabilizasyonu, geleneksel pencere detayları.' },
  { src: 'assets/images/concepts/restorasyon-02.webp',   image_url: 'assets/images/concepts/restorasyon-02.webp',   title: 'Restorasyon 02',     hint: 'Ahşap taşıyıcı restorasyonu, cephe sağlamlaştırma.' },
  { src: 'assets/images/concepts/restorasyon-04.webp',   image_url: 'assets/images/concepts/restorasyon-04.webp',   title: 'Restorasyon 04',     hint: 'İç mekân koruma, süsleme detayları, modern müdahale dengesi.' }
];
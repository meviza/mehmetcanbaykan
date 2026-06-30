/**
 * Konsept tasarımlar slider'ı.
 * 13 görsel için: kayan + drag + klavye + swipe + lightbox + autoplay (pause on hover).
 * Görseller assets/images/concepts/ altında; yüklenemezse kategori placeholder'ı gösterir.
 */

const SLIDES = [
  { src: 'assets/images/concepts/site-02.webp',          title: 'Site Tasarımı 02',    category: 'site',        hint: 'Parsel düzenlemesi, ana giriş aksı, otopark ve yeşil tampon.' },
  { src: 'assets/images/concepts/kat-plani-02.webp',     title: 'Kat Planı 02',        category: 'plan',        hint: 'Sirkülasyon, ergonomik m² kullanımı, ıslak hacim optimizasyonu.' },
  { src: 'assets/images/concepts/kultur-sanat-evi.webp', title: 'Kültür & Sanat Evi',  category: 'culture',     hint: 'Çok amaçlı salon, atölyeler, galeri koridorları; esnek akustik.' },
  { src: 'assets/images/concepts/site-tasarimi.webp',    title: 'Site Tasarımı',       category: 'site',        hint: 'Yaya aksı, araç yolu ayrımı, peyzaj entegrasyonu.' },
  { src: 'assets/images/concepts/ic-tasarim-03.webp',    title: 'İç Tasarım 03',       category: 'interior',    hint: 'Doğal ışık, gömme aydınlatma, doku kontrastı.' },
  { src: 'assets/images/concepts/kat-plani-01.webp',     title: 'Kat Planı 01',        category: 'plan',        hint: 'Açık plan, merkezi ada, lineer mutfak-banyo şeridi.' },
  { src: 'assets/images/concepts/ic-tasarim-02.webp',    title: 'İç Tasarım 02',       category: 'interior',    hint: 'Mobilyada özel üretim, sıcak ton paleti, hacim kademelemesi.' },
  { src: 'assets/images/concepts/ic-tasarim-01.webp',    title: 'İç Tasarım 01',       category: 'interior',    hint: 'Galeri boşluğu, doğal malzeme, sessiz lüks detaylar.' },
  { src: 'assets/images/concepts/rezidans.webp',         title: 'Rezidans',            category: 'rezidans',    hint: 'Yüksek tavan, manzara odaklı, özel peyzaj entegrasyonu.' },
  { src: 'assets/images/concepts/restorasyon-03.webp',   title: 'Restorasyon 03',      category: 'restoration', hint: 'Taş duvar stabilizasyonu, geleneksel pencere detayları.' },
  { src: 'assets/images/concepts/restorasyon-02.webp',   title: 'Restorasyon 02',      category: 'restoration', hint: 'Ahşap taşıyıcı restorasyonu, cephe sağlamlaştırma.' },
  { src: 'assets/images/concepts/restorasyon-04.webp',   title: 'Restorasyon 04',      category: 'restoration', hint: 'İç mekân koruma, süsleme detayları, modern müdahale dengesi.' },
];

let state = {
  index: 0,
  isDragging: false,
  startX: 0,
  deltaX: 0,
  startTime: 0,
  autoplayId: null,
};

export function initConcepSlider() {
  const root = document.getElementById('conceptSlider');
  if (!root) return;

  root.innerHTML = `
    <div class="cs-stage">
      <div class="cs-track" id="csTrack"></div>
      <div class="cs-controls">
        <button class="cs-arrow cs-prev" aria-label="Önceki"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 18l-6-6 6-6"/></svg></button>
        <button class="cs-arrow cs-next" aria-label="Sonraki"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 6l6 6-6 6"/></svg></button>
      </div>
      <div class="cs-meta">
        <span class="cs-counter"><span id="csCurrent">1</span> / ${SLIDES.length}</span>
        <span class="cs-title" id="csTitle"></span>
      </div>
    </div>
    <div class="cs-thumbs" id="csThumbs"></div>
    <div class="cs-lightbox" id="csLightbox" aria-hidden="true" role="dialog" aria-label="Konsept önizleme">
      <button class="cs-lb-close" aria-label="Kapat">×</button>
      <button class="cs-lb-prev" aria-label="Önceki">‹</button>
      <picture>
        <img class="cs-lb-img" alt=""/>
      </picture>
      <button class="cs-lb-next" aria-label="Sonraki">›</button>
      <p class="cs-lb-caption"></p>
    </div>
  `;

  const track = root.querySelector('#csTrack');
  const thumbs = root.querySelector('#csThumbs');
  const titleEl = root.querySelector('#csTitle');
  const counterEl = root.querySelector('#csCurrent');

  // Slideları üret
  SLIDES.forEach((slide, i) => {
    const el = document.createElement('article');
    el.className = 'cs-slide';
    el.dataset.index = i;
    // WebP yoksa jpg/png'ye düşsün
    const fallbackSrc = slide.src.replace(/\.webp$/, '.jpg');
    el.innerHTML = `
      <div class="cs-img-wrap">
        <div class="cs-img-placeholder" data-cat="${slide.category}">
          <span>${slide.title}</span>
        </div>
        <picture>
          <source srcset="${slide.src}" type="image/webp"/>
          <img class="cs-img" src="${fallbackSrc}" alt="${slide.title}" loading="lazy" decoding="async" draggable="false" width="1200" height="900"/>
        </picture>
      </div>
      <div class="cs-slide-meta">
        <span class="cs-num">${String(i + 1).padStart(2, '0')}</span>
        <h3>${slide.title}</h3>
        <p>${slide.hint}</p>
      </div>
    `;
    // Görsel yüklenince placeholder'ı gizle
    const img = el.querySelector('img');
    img.addEventListener('load', () => el.classList.add('is-loaded'), { once: true });
    img.addEventListener('error', () => el.classList.add('is-failed'), { once: true });
    track.appendChild(el);

    const thumb = document.createElement('button');
    thumb.className = 'cs-thumb';
    thumb.setAttribute('aria-label', `${i + 1}. ${slide.title}`);
    thumb.dataset.index = i;
    // İlk 4 thumbnail normal, kalanlar lazy (slider çalışmaya başladıktan sonra)
    const loading = i < 4 ? 'eager' : 'lazy';
    const fetchpriority = i === 0 ? 'high' : 'auto';
    thumb.innerHTML = `<img src="${slide.src}" alt="" loading="${loading}" fetchpriority="${fetchpriority}" width="80" height="56" decoding="async"/><span class="cs-thumb-num">${String(i + 1).padStart(2, '0')}</span>`;
    thumb.addEventListener('click', () => goTo(i, true));
    thumbs.appendChild(thumb);
  });

  // İlk aktif
  update();
  bindEvents(root);
  startAutoplay(root);
}

function update() {
  const root = document.getElementById('conceptSlider');
  if (!root) return;
  const track = root.querySelector('#csTrack');
  const titleEl = root.querySelector('#csTitle');
  const counterEl = root.querySelector('#csCurrent');
  const slides = track.querySelectorAll('.cs-slide');
  const thumbs = root.querySelectorAll('.cs-thumb');

  slides.forEach((s, i) => {
    s.classList.toggle('is-active', i === state.index);
    s.classList.toggle('is-prev', i === state.index - 1);
    s.classList.toggle('is-next', i === state.index + 1);
    s.classList.toggle('is-far', Math.abs(i - state.index) > 1);
  });
  thumbs.forEach((t, i) => t.classList.toggle('is-active', i === state.index));

  const meta = SLIDES[state.index];
  if (titleEl) titleEl.textContent = meta.title;
  if (counterEl) counterEl.textContent = state.index + 1;
}

function goTo(i, fromUser = false) {
  state.index = ((i % SLIDES.length) + SLIDES.length) % SLIDES.length;
  update();
  if (fromUser) restartAutoplay();
}

function next(fromUser = false) { goTo(state.index + 1, fromUser); }
function prev(fromUser = false) { goTo(state.index - 1, fromUser); }

function bindEvents(root) {
  root.querySelector('.cs-prev').addEventListener('click', () => prev(true));
  root.querySelector('.cs-next').addEventListener('click', () => next(true));

  // Klavye
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prev(true);
    if (e.key === 'ArrowRight') next(true);
  });
  root.tabIndex = 0;

  // Drag/Swipe
  const track = root.querySelector('#csTrack');
  const onDown = (e) => {
    state.isDragging = true;
    state.startX = (e.touches ? e.touches[0].clientX : e.clientX);
    state.startTime = performance.now();
    track.style.transition = 'none';
    stopAutoplay();
  };
  const onMove = (e) => {
    if (!state.isDragging) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    state.deltaX = x - state.startX;
  };
  const onUp = () => {
    if (!state.isDragging) return;
    state.isDragging = false;
    track.style.transition = '';
    const threshold = 60;
    if (state.deltaX > threshold) prev();
    else if (state.deltaX < -threshold) next();
    state.deltaX = 0;
    startAutoplay(root);
  };
  track.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  track.addEventListener('touchstart', onDown, { passive: true });
  track.addEventListener('touchmove', onMove, { passive: true });
  track.addEventListener('touchend', onUp);

  // Hover'da autoplay dur
  root.addEventListener('mouseenter', stopAutoplay);
  root.addEventListener('mouseleave', () => startAutoplay(root));

  // Slidelara tıklayınca lightbox aç
  track.querySelectorAll('.cs-slide').forEach(s => {
    s.addEventListener('click', (e) => {
      // Drag bittiyse açma
      if (Math.abs(state.deltaX) > 5) return;
      openLightbox(parseInt(s.dataset.index, 10));
    });
  });

  // Lightbox
  bindLightbox(root);
}

function bindLightbox(root) {
  const lb = root.querySelector('#csLightbox');
  const close = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); };
  root.querySelector('.cs-lb-close').addEventListener('click', close);
  root.querySelector('.cs-lb-prev').addEventListener('click', () => {
    prev();
    updateLightbox();
  });
  root.querySelector('.cs-lb-next').addEventListener('click', () => {
    next();
    updateLightbox();
  });
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') { prev(); updateLightbox(); }
    if (e.key === 'ArrowRight') { next(); updateLightbox(); }
  });
}

function openLightbox(i) {
  const root = document.getElementById('conceptSlider');
  if (!root) return;
  goTo(i, true);
  updateLightbox();
  const lb = root.querySelector('#csLightbox');
  lb.classList.add('is-open');
  lb.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  lb.addEventListener('transitionend', () => {
    const img = lb.querySelector('.cs-lb-img');
    if (img) img.focus?.();
  }, { once: true });
  // Close sonrası body overflow geri
  const observer = new MutationObserver(() => {
    if (!lb.classList.contains('is-open')) {
      document.body.style.overflow = '';
      observer.disconnect();
    }
  });
  observer.observe(lb, { attributes: true, attributeFilter: ['class'] });
}

function updateLightbox() {
  const root = document.getElementById('conceptSlider');
  if (!root) return;
  const lb = root.querySelector('#csLightbox');
  const slide = SLIDES[state.index];
  const img = lb.querySelector('.cs-lb-img');
  const cap = lb.querySelector('.cs-lb-caption');
  // WebP ana, jpg fallback. Picture element'i sıfırla
  const picture = lb.querySelector('picture');
  if (picture) {
    picture.innerHTML = `<source srcset="${slide.src}" type="image/webp"/><img class="cs-lb-img" alt="${slide.title}"/>`;
  } else {
    img.src = slide.src;
  }
  cap.textContent = `${slide.title} — ${slide.hint}`;
}

function startAutoplay(root) {
  if (state.autoplayId) return;
  state.autoplayId = setInterval(() => next(false), 5000);
}
function stopAutoplay() {
  if (state.autoplayId) { clearInterval(state.autoplayId); state.autoplayId = null; }
}
function restartAutoplay() {
  stopAutoplay();
  startAutoplay(document.getElementById('conceptSlider'));
}
/**
 * Proje grid: ana sayfada kategorilere göre filtrelenebilir proje listesi.
 * Hem Supabase'den hem localStorage fallback'ten beslenir.
 */
import { listPublishedProjects } from '../lib/repo.js';
import { $, $$, el, escapeHtml } from '../lib/ui.js';

const CATEGORIES = {
  restorasyon: 'Restorasyon',
  'ic-tasarim': 'İç Tasarım',
  vaziyet: 'Vaziyet',
  'kat-plani': 'Kat Planları',
  peyzaj: 'Peyzaj',
  'tas-ahsap': 'Taş & Ahşap'
};

const FALLBACK_BG = {
  restorasyon: 'linear-gradient(135deg, #8c5a2a, #5a3a1a)',
  'ic-tasarim': 'linear-gradient(135deg, #1f3a5f, #0f2238)',
  'tas-ahsap': 'linear-gradient(135deg, #4a443d, #2a2622)',
  peyzaj: 'linear-gradient(135deg, #5a6b3a, #2f3a1f)',
  vaziyet: 'linear-gradient(135deg, #6b5b4a, #3a2f24)',
  'kat-plani': 'linear-gradient(135deg, #3a3a3a, #1a1a1a)'
};

let allProjects = [];
let activeFilter = 'all';

export async function initProjects() {
  const grid = $('#projectsGrid');
  const filters = $$('.project-filters .filter');
  if (!grid) return;

  try {
    allProjects = await listPublishedProjects();
  } catch (e) {
    console.error('Projeler yüklenemedi:', e);
    grid.innerHTML = '<div class="projects-empty">Projeler yüklenemedi. Lütfen daha sonra tekrar deneyin.</div>';
    return;
  }

  if (!allProjects.length) {
    grid.innerHTML = '<div class="projects-empty">Henüz yayınlanmış proje yok.</div>';
    return;
  }

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeFilter = btn.dataset.filter;
      render();
    });
  });

  render();
}

function render() {
  const grid = $('#projectsGrid');
  if (!grid) return;
  const filtered = activeFilter === 'all'
    ? allProjects
    : allProjects.filter(p => p.category === activeFilter);

  if (!filtered.length) {
    grid.innerHTML = '<div class="projects-empty">Bu kategoride proje bulunamadı.</div>';
    return;
  }

  grid.innerHTML = filtered.map((p, i) => projectCard(p, i)).join('');

  // AOS refresh for new elements
  if (window.AOS) window.AOS.refresh();
}

function projectCard(p, i) {
  const bg = p.image
    ? `style="background-image:linear-gradient(135deg, rgba(20,17,15,0.4), rgba(20,17,15,0.2)), url('${p.image}'); background-size:cover; background-position:center;"`
    : `style="background:${FALLBACK_BG[p.category] || FALLBACK_BG.restorasyon}"`;
  const cat = CATEGORIES[p.category] || p.category_label || p.category || 'Proje';
  const meta = [p.location, p.year].filter(Boolean).join(' · ');

  return `
    <article class="project" data-category="${escapeHtml(p.category || '')}" data-aos="fade-up" data-aos-delay="${(i % 3) * 100}">
      <a href="project.html?id=${encodeURIComponent(p.id)}" class="project-link">
        <div class="project-image" ${bg}>
          <span>${escapeHtml(cat)}</span>
        </div>
        <div class="project-body">
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(meta)}</p>
        </div>
      </a>
    </article>
  `;
}

/**
 * Proje detay sayfası
 */
import { getProject } from '../lib/repo.js';
import { $, escapeHtml, formatDate } from '../lib/ui.js';

const SECTIONS = [
  { key: 'intro', title: 'Giriş' },
  { key: 'climate', title: 'İklim & Hava Koşulları' },
  { key: 'soil', title: 'Zemin & Temel' },
  { key: 'neighborhood', title: 'Sokak & Mahalle Mimarisi' },
  { key: 'regulations', title: 'Mevzuat & Ruhsat Süreci' },
  { key: 'equations', title: 'Mimari Denklemler', mono: true },
  { key: 'process', title: 'Süreç Adımları', list: true },
  { key: 'outcome', title: 'Sonuç & Teslim' }
];

export async function initProjectDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return showError('Proje bulunamadı. ID parametresi eksik.');

  let project;
  try {
    project = await getProject(id);
  } catch (e) {
    return showError('Proje yüklenemedi: ' + (e.message || e));
  }
  if (!project) return showError('Bu ID ile proje bulunamadı: ' + id);

  render(project);
}

function showError(msg) {
  const loading = $('#postLoading');
  if (loading) loading.innerHTML = `<p style="color: var(--accent-3);">${escapeHtml(msg)}</p><p style="margin-top: 24px;"><a href="index.html#projeler" class="btn btn-primary">← Projelere Dön</a></p>`;
}

function render(p) {
  $('#postLoading').hidden = true;
  $('#postContent').hidden = false;

  // Meta tags
  document.title = `${p.title} | Mehmet Can Baykan Mimar`;
  setMeta('description', p.summary);
  setMeta('og:title', 'property', p.title);
  setMeta('og:description', 'property', p.summary);
  setMeta('og:image', 'property', p.image || 'assets/images/og-cover.jpg');

  // Header
  setText('postCategory', p.category_label || p.category);
  setText('postSummary', p.summary);
  setText('pageTitleHeader', p.title);
  setText('postTitleHeader', p.title);

  // Cover
  const cover = $('#postCover');
  if (cover) {
    if (p.image) {
      cover.src = p.image;
      cover.alt = p.title;
      cover.onerror = () => { cover.style.display = 'none'; cover.parentElement.style.background = 'linear-gradient(135deg, #1f3a5f, #0f2238)'; };
    } else {
      cover.style.display = 'none';
      cover.parentElement.style.background = 'linear-gradient(135deg, #1f3a5f, #0f2238)';
    }
  }

  // Meta
  setText('postYear', p.year);
  setText('postLocation', p.location);
  setText('postArea', p.area || '—');
  setText('postDuration', p.duration || '—');
  setText('postStatus', p.status || '—');

  // Body
  const body = $('#postBody');
  if (body) body.innerHTML = buildBody(p);

  // WhatsApp CTA
  const wa = $('#postWhatsapp');
  if (wa) {
    const text = `Merhaba Mehmet Can Bey, "${p.title}" projeniz gibi bir çalışma için görüşmek istiyorum.`;
    wa.href = `https://wa.me/905427351316?text=${encodeURIComponent(text)}`;
  }

  if (window.AOS) window.AOS.refresh();
}

function buildBody(p) {
  const c = p.content || {};
  let html = '';
  for (const sec of SECTIONS) {
    const value = c[sec.key];
    if (!value) continue;
    if (sec.list && Array.isArray(value) && value.length) {
      const items = value.map(x => `<li>${escapeHtml(x)}</li>`).join('');
      html += `<div class="section-block"><h2>${sec.title}</h2><ol>${items}</ol></div>`;
    } else if (typeof value === 'string' && value.trim()) {
      const inner = sec.mono
        ? `<div class="equation">${escapeHtml(value).replace(/\n/g, '<br>')}</div>`
        : `<p>${escapeHtml(value)}</p>`;
      html += `<div class="section-block"><h2>${sec.title}</h2>${inner}</div>`;
    }
  }
  if (Array.isArray(p.tags) && p.tags.length) {
    html += `<div class="post-tags">${p.tags.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>`;
  }
  return html;
}

function setText(id, val) { const el = $(`#${id}`); if (el) el.textContent = val || ''; }
function setMeta(name, attr, val) {
  const sel = attr === 'property' ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  const el = document.querySelector(sel);
  if (el) el.setAttribute('content', val || '');
}

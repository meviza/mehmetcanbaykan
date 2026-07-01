/**
 * Global Metrics view
 * Aggregate counts: tenants, users, messages, MRR placeholder
 */
import { getClient } from '../lib/db.js';

let charts = [];

export async function renderMetrics() {
  const root = document.getElementById('saView-metrics');
  if (!root) return;
  root.innerHTML = `
    <div class="sa-stats" id="saMetricsStats">
      <div class="sa-stat is-cyan"><span>Tenants</span><strong>—</strong><small>aktif + pending</small></div>
      <div class="sa-stat is-amber"><span>Users</span><strong>—</strong><small>kayıtlı</small></div>
      <div class="sa-stat is-red"><span>Messages</span><strong>—</strong><small>son 30 gün</small></div>
      <div class="sa-stat is-green"><span>MRR (Tahmini)</span><strong>—</strong><small>₺ / ay</small></div>
    </div>
    <div class="sa-panel">
      <div class="sa-panel-head"><h3>Tenant Büyümesi <small>son 12 ay</small></h3></div>
      <div class="sa-panel-body"><div class="sa-chart-wrap"><canvas id="saChartGrowth"></canvas></div></div>
    </div>
    <div class="sa-panel">
      <div class="sa-panel-head"><h3>Plan Dağılımı</h3></div>
      <div class="sa-panel-body"><div class="sa-chart-wrap"><canvas id="saChartPlans"></canvas></div></div>
    </div>
  `;

  const stats = await loadStats().catch(() => null);
  if (!stats) {
    root.insertAdjacentHTML('beforeend', '<p style="color:var(--sa-ink-3);text-align:center;padding:40px">Veriler yüklenemedi. Supabase bağlantısını kontrol edin.</p>');
    return;
  }
  const cells = root.querySelectorAll('.sa-stat strong');
  cells[0].textContent = stats.tenants;
  cells[1].textContent = stats.users;
  cells[2].textContent = stats.messages;
  cells[3].textContent = stats.mrr + ' ₺';

  destroyCharts();
  drawGrowthChart(stats.growth);
  drawPlansChart(stats.plans);
}

async function loadStats() {
  const client = await getClient();
  if (!client) return mockStats();

  const [t, u, m] = await Promise.all([
    client.from('tenants').select('id, plan, status, created_at', { count: 'exact', head: false }),
    client.from('profiles').select('id', { count: 'exact', head: true }),
    client.from('messages').select('id', { count: 'exact', head: true })
  ]);
  const tenants = t.data || [];
  const planCount = { free: 0, pro: 0, enterprise: 0 };
  tenants.forEach(x => { planCount[x.plan] = (planCount[x.plan] || 0) + 1; });

  // MRR placeholder: plan başına varsayımsal değer
  const planPrice = { free: 0, pro: 299, enterprise: 1499 };
  const mrr = Object.entries(planCount).reduce((sum, [p, n]) => sum + (planPrice[p] || 0) * n, 0);

  // Growth: tenants.created_at → aylık bucket
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('tr-TR', { month: 'short' }) };
  });
  months.forEach(m => m.count = 0);
  tenants.forEach(t => {
    const k = (t.created_at || '').slice(0, 7);
    const slot = months.find(x => x.key === k);
    if (slot) slot.count++;
  });
  let running = 0;
  const growth = months.map(m => ({ ...m, total: (running += m.count) }));

  return {
    tenants: tenants.length,
    users: u.count || 0,
    messages: m.count || 0,
    mrr,
    plans: planCount,
    growth
  };
}

function mockStats() {
  return {
    tenants: 3, users: 12, messages: 47, mrr: 2096,
    plans: { free: 1, pro: 1, enterprise: 1 },
    growth: Array.from({ length: 12 }, (_, i) => ({
      label: new Date(2026, i, 1).toLocaleDateString('tr-TR', { month: 'short' }),
      count: Math.floor(Math.random() * 3), total: 0
    }))
  };
}

function destroyCharts() {
  charts.forEach(c => c?.destroy?.());
  charts = [];
}

function drawGrowthChart(growth) {
  const canvas = document.getElementById('saChartGrowth');
  if (!canvas || !window.Chart) return;
  let total = 0;
  const data = growth.map(g => (total += g.count));
  charts.push(new window.Chart(canvas, {
    type: 'line',
    data: {
      labels: growth.map(g => g.label),
      datasets: [{
        label: 'Tenants',
        data,
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34,211,238,0.1)',
        fill: true, tension: 0.35, pointRadius: 3, pointBackgroundColor: '#22d3ee'
      }]
    },
    options: chartOpts()
  }));
}

function drawPlansChart(plans) {
  const canvas = document.getElementById('saChartPlans');
  if (!canvas || !window.Chart) return;
  const labels = Object.keys(plans).filter(k => plans[k] > 0);
  const data = labels.map(k => plans[k]);
  if (!data.length) return;
  charts.push(new window.Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels.map(l => l.toUpperCase()),
      datasets: [{
        data,
        backgroundColor: ['#22d3ee', '#fbbf24', '#ff3b3b'],
        borderColor: '#06070b', borderWidth: 2
      }]
    },
    options: { ...chartOpts(), cutout: '65%', plugins: { legend: { position: 'right' } } }
  }));
}

function chartOpts() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#9aa1b1', font: { family: 'Inter', size: 11 } } } },
    scales: {
      x: { ticks: { color: '#5b6273' }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: '#5b6273' }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
    }
  };
}
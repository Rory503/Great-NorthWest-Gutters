import { createDemoData, CREW_COLORS } from './seed.js';
import { DEMO_TODAY, money, number, percent, dateLabel, inPeriod, completedJobs, crewStats, estimatorStats, warehouseStock, truckBalance, materialAlerts, validateJob } from './domain.js';
import { scanDocument, parseEstimateText, saveScanSource, getScanSource, deleteScanSource, clearScanSources } from './scanner.js';

const STORAGE_KEY = 'gnw-operations-demo-v1';
const paths = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  crews: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  jobs: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M9 5V3h6v2M8 10h8m-8 4h8m-8 4h5"/>',
  materials: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 8 9 5 9-5M3 8v10l9 5 9-5V8M12 13v10m-5-18 10 5"/>',
  estimators: '<path d="M3 20h18M7 16V9m5 7V4m5 12v-5"/><path d="m4 6 5-3 5 4 6-5"/>',
  quality: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-11 12a2 2 0 0 0 4 0"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  up: '<path d="m6 15 9-9m-9 0h9v9"/>',
  down: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  truck: '<path d="M1 4h13v13H1V4Zm13 6h4l4 4v3h-8"/><circle cx="5" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  dollar: '<path d="M12 2v20m5-16H9a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8H6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  warning: '<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v1"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  location: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01"/>',
  logout: '<path d="M9 21H3V3h6m6 5 4 4-4 4m-8-4h12"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  scans: '<path d="M7 3H3v4m14-4h4v4M3 17v4h4m14-4v4h-4M6 12h12"/><rect x="7" y="6" width="10" height="12" rx="1"/>',
  refresh: '<path d="M20 7a8 8 0 1 0 1 9M20 3v5h-5"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.jobs}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let storageError = '';
let data;
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  data = raw ? JSON.parse(raw) : createDemoData();
  if (data.version !== 1 || !['crews', 'estimators', 'materials', 'jobs', 'estimates', 'feedback', 'movements'].every(key => Array.isArray(data[key]))) throw new Error('Saved dashboard data has an unsupported format.');
} catch (error) {
  storageError = `Saved data could not be loaded: ${error.message} Sample data is shown; saving is disabled until you reset the demo.`;
  data = createDemoData();
}
data.scans ||= [];
for (const people of [data.crews, data.estimators]) {
  people.forEach((person, index) => { person.color = CREW_COLORS[index % CREW_COLORS.length]; });
}
const state = { page: 'dashboard', period: 'month', search: '', jobStatus: 'All', qualityKind: 'All', materialCrew: '2400', menu: false };
const pageNames = { dashboard: 'Overview', crews: 'Crew performance', jobs: 'Job board', scans: 'Scan intake', materials: 'Materials & inventory', estimators: 'Estimator performance', quality: 'Quality & callbacks' };
const app = document.querySelector('#app');
const detail = document.querySelector('#detail-dialog');
const formDialog = document.querySelector('#form-dialog');
const scanDialog = document.querySelector('#scan-dialog');
let scanDraft;
let scanController;
let scanPreviewUrls = [];
let scanSaving = false;
let toastTimer;
function toast(message) {
  const target = document.querySelector('#toast');
  target.textContent = message; target.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => target.classList.remove('visible'), 4500);
}
function persist(next) {
  if (storageError) throw new Error('Saving is disabled because saved data could not be loaded. Reset the demo to continue.');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  data = next;
}
const matches = (...values) => !state.search || values.some(value => String(value ?? '').toLowerCase().includes(state.search.toLowerCase()));
const crewName = id => data.crews.find(item => item.id === id)?.lead || 'Unassigned';
const estimatorName = id => data.estimators.find(item => item.id === id)?.name || 'Unassigned';
const badge = (label, type = '') => `<span class="badge ${type || (['Completed', 'Won', 'Resolved', 'On site'].includes(label) ? 'green' : ['In progress', 'Pending', 'Scheduled', 'Available'].includes(label) ? 'blue' : 'amber')}">${esc(label)}</span>`;
const empty = (title = 'No results found', description = 'Try a different search or date range.') => `<div class="empty">${icon('search')}<strong>${title}</strong><p>${description}</p></div>`;
const avatar = (initials, color, small = false) => `<span class="avatar ${small ? 'small' : ''}" style="--avatar-color:${color}">${esc(initials)}</span>`;
const sectionHead = (title, subtitle, right = '') => `<div class="section-head"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${right}</div>`;
const periodLabel = () => ({ month: 'Last 30 days', week: 'Last 7 days', september: 'September 2026', all: 'All demo history' }[state.period]);
function statCard(label, value, note, symbol, color = 'green') {
  return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}">${icon(symbol)}</span></div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></article>`;
}
function render() {
  const alerts = materialAlerts(data);
  app.innerHTML = `
    <aside class="sidebar ${state.menu ? 'mobile-open' : ''}">
      <a href="#dashboard" class="brand" aria-label="Great Northwest Gutters overview">
        <span class="brand-mark"><svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M4 29 16 9l9 14 5-8 8 14H4Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="m12 16 4 4 4-4m5 7 5 6" stroke="currentColor" stroke-width="2"/></svg></span>
        <span>GREAT NORTHWEST<small>G U T T E R S</small></span>
      </a>
      <div class="workspace-label">WORKSPACE <span>OFFICE</span></div>
      <nav aria-label="Main navigation">${Object.entries(pageNames).map(([key, label]) => `<a href="#${key}" class="nav-item ${state.page === key ? 'active' : ''}" ${state.page === key ? 'aria-current="page"' : ''}>${icon(key)}<span>${key === 'dashboard' ? 'Overview' : key === 'crews' ? 'Crews' : key === 'jobs' ? 'Jobs' : key === 'scans' ? 'Scan intake' : key === 'materials' ? 'Materials' : key === 'estimators' ? 'Estimators' : 'Quality & reviews'}</span>${key === 'materials' ? `<span class="nav-count">${alerts.length}</span>` : ''}</a>`).join('')}</nav>
      <div class="sidebar-bottom">
        <div class="demo-side"><span class="live-dot"></span> Demo workspace<p>Explore with sample data.<br>Changes stay in this browser.</p></div>
        <button class="nav-item" data-action="help">${icon('help')}<span>How this works</span></button>
        <div class="profile">${avatar('OM', CREW_COLORS[1], true)}<div><strong>Office Manager</strong><small>Demo administrator</small></div><button class="icon-btn" data-action="reset" aria-label="Reset demo data" title="Reset demo data">${icon('refresh')}</button></div>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar"><div class="breadcrumb"><button class="icon-btn mobile-menu" data-action="menu" aria-label="Toggle navigation">${icon('menu')}</button><span>Workspace</span>${icon('chevron')}<strong>${pageNames[state.page]}</strong></div>
        <div class="topbar-right"><label class="global-search">${icon('search')}<input id="global-search" type="search" placeholder="Search ${state.page === 'dashboard' ? 'crews' : state.page}..." value="${esc(state.search)}" aria-label="Search current page"><span class="search-hint">Search</span></label><span class="topbar-divider"></span><button class="icon-btn notification-btn" data-action="alerts" aria-label="${alerts.length} material alerts">${icon('bell')}<span></span></button><span class="top-avatar">OM</span></div>
      </header>
      <main id="main">
        ${storageError ? `<div class="error-banner" role="alert">${esc(storageError)} <button data-action="reset">Reset demo</button></div>` : ''}
        <div class="page-heading"><div><div class="eyebrow"><span class="live-dot"></span> OPERATIONS COMMAND CENTER</div><h1>${state.page === 'dashboard' ? 'A clear view of your operations.' : pageNames[state.page]}</h1><p>${({ dashboard: "Every crew. Every job. Every foot of material. All in one place.", crews: 'Know who is delivering, and where your team needs support.', jobs: 'From the first assignment to the final inspection.', scans: 'From a paper estimate to a work order. Without starting from scratch.', materials: 'Follow your materials from the warehouse to the finished job.', estimators: 'Turn estimates into insight. See who is bringing in business.', quality: 'Close the loop on service visits and customer feedback.' })[state.page]}</p></div><div class="heading-action"><button class="${['dashboard', 'jobs', 'estimators', 'scans'].includes(state.page) ? 'primary-btn' : 'secondary-btn'}" data-action="scan">${icon('scans')} Scan estimate</button>${state.page === 'materials' ? `<button class="primary-btn" data-action="movement">${icon('plus')} Record movement</button>` : state.page === 'estimators' ? `<button class="secondary-btn" data-action="estimate">${icon('plus')} New estimate</button>` : state.page === 'quality' ? `<button class="primary-btn" data-action="feedback">${icon('plus')} Add feedback</button>` : state.page === 'scans' ? '' : `<button class="secondary-btn" data-action="job">${icon('plus')} Add job</button>`}</div></div>
        <div class="toolbar"><div class="toolbar-date">${icon('calendar')} Friday, October 2, 2026 <span class="demo-pill">SAMPLE DATA</span></div><div class="toolbar-actions">${['materials', 'scans'].includes(state.page) ? `<span class="muted small-text">${state.page === 'materials' ? 'Inventory: all recorded movements' : 'Intake: all reviewed documents'}</span>` : `<label class="period-select">${icon('calendar')}<select id="period" aria-label="Reporting date range"><option value="month" ${state.period === 'month' ? 'selected' : ''}>Last 30 days</option><option value="week" ${state.period === 'week' ? 'selected' : ''}>Last 7 days</option><option value="september" ${state.period === 'september' ? 'selected' : ''}>September 2026</option><option value="all" ${state.period === 'all' ? 'selected' : ''}>All demo history</option></select></label>`}<button class="secondary-btn export-btn" data-action="export">${icon('down')} Export report</button></div></div>
        <div id="page-content">${({ dashboard: renderDashboard, crews: renderCrews, jobs: renderJobs, scans: renderScans, materials: renderMaterials, estimators: renderEstimators, quality: renderQuality })[state.page]()}</div>
        <footer class="page-footer"><span>GREAT NORTHWEST GUTTERS <span class="footer-dot">·</span> Built for a better day on the job.</span><span>${icon('check')} Browser-saved demo · Not a shared company database</span></footer>
      </main>
    </div>`;
}
function renderDashboard() {
  const all = crewStats(data, undefined, state.period);
  const todays = data.jobs.filter(item => item.date === DEMO_TODAY);
  const activeCrews = new Set(todays.filter(item => item.status === 'In progress').map(item => item.crewId)).size;
  const alerts = materialAlerts(data);
  return `
    <div class="stats-grid">
      ${statCard('Completed job value', money(all.revenue), `<span class="green-text">${all.jobs} completed jobs</span><span class="muted"> · not net profit</span>`, 'dollar')}
      ${statCard('Jobs completed', number(all.jobs), `<span class="green-text">${number(all.footage)} ft</span><span class="muted"> installed this period</span>`, 'jobs', 'blue')}
      ${statCard('First-time completion', percent(all.quality), `<span class="muted">${all.callbackJobs} jobs with callbacks · ${all.callbacks} visits</span>`, 'quality', 'purple')}
      ${statCard('Crews in the field', `${activeCrews}<span class="stat-denominator"> / ${data.crews.length}</span>`, `<span class="live-dot"></span><span class="muted">${todays.length} jobs on today's schedule</span>`, 'truck', 'amber')}
    </div>
    <div class="analytics-row">
      <section class="panel revenue-panel">${sectionHead('Revenue at a glance', 'Completed job value over the selected period', '<span class="chart-key"><i></i> Job value</span>')}${revenueChart()}<div class="chart-footer"><span>${icon('calendar')} ${periodLabel()}</span><span>Completed work, not payments collected</span></div></section>
      <section class="panel quality-panel">${sectionHead('Built right. The first time.', 'Your installation quality, at a glance')}<div class="quality-visual">${qualityRing(all.quality)}<div class="quality-legend"><div><span class="legend-dot green-bg"></span><span>No callbacks</span><strong>${all.jobs - all.callbackJobs}</strong></div><div><span class="legend-dot amber-bg"></span><span>With callbacks</span><strong>${all.callbackJobs}</strong></div></div></div><div class="quality-bottom"><span>${icon('star')} Customer rating</span><strong>${all.rating === null ? '—' : all.rating.toFixed(1)} <span>/ 5</span></strong></div></section>
    </div>
    <div class="crew-section">${sectionHead('Your crews', 'The people behind every finished job.', `<a class="text-link" href="#crews">View all crews ${icon('arrow')}</a>`)}<div class="crew-grid">${crewCards()}</div></div>
    <div class="bottom-grid">
      <section class="panel attention-panel">${sectionHead('Needs your attention', 'A little visibility goes a long way.', badge(`${alerts.length} alerts`, 'amber'))}<div class="alert-list">${alerts.slice(0, 4).map(alertRow).join('') || empty('All clear', 'No stock or reconciliation alerts.')} </div><a href="#materials" class="panel-bottom-link">Open material control ${icon('arrow')}</a></section>
      <section class="panel estimator-summary">${sectionHead('Estimator leaderboard', 'Accepted estimates and conversion performance', `<a class="text-link" href="#estimators">Details ${icon('arrow')}</a>`)}${data.estimators.map(est => ({ ...est, stats: estimatorStats(data, est.id, state.period) })).sort((a, b) => b.stats.booked - a.stats.booked).map((est, i) => `<button class="estimator-row" data-action="estimator-detail" data-id="${est.id}"><span class="rank">${String(i + 1).padStart(2, '0')}</span>${avatar(est.initials, est.color, true)}<div class="estimator-row-name"><strong>${est.name}</strong><small>${est.stats.won} won / ${est.stats.total} estimates</small></div><div><strong>${money(est.stats.booked)}</strong><small class="green-text">${percent(est.stats.winRate)} win rate</small></div></button>`).join('')}<div class="panel-footnote">Win rate = won ÷ decided estimates. Pending excluded.</div></section>
    </div>`;
}
function revenueChart() {
  const jobs = completedJobs(data, state.period);
  const dates = [...new Set(jobs.map(job => job.completedDate))].sort();
  if (!dates.length) return empty('No completed work in this period', 'Complete a job or choose another date range.');
  const groups = Array.from({ length: Math.min(6, dates.length) }, () => ({ value: 0, start: '', end: '' }));
  dates.forEach((date, index) => {
    const group = groups[Math.min(groups.length - 1, Math.floor(index / dates.length * groups.length))];
    group.start ||= date; group.end = date;
    group.value += jobs.filter(job => job.completedDate === date).reduce((sum, job) => sum + job.value, 0);
  });
  const max = Math.ceil(Math.max(...groups.map(group => group.value), 1000) / 10000) * 10000;
  const points = groups.map((group, i) => [64 + i * (556 / Math.max(groups.length - 1, 1)), 179 - group.value / max * 142]);
  const line = points.map(point => point.join(',')).join(' ');
  const accessible = groups.map(group => `${dateLabel(group.start)}–${dateLabel(group.end)}: ${money(group.value)}`).join('; ');
  return `<div class="line-chart"><svg viewBox="0 0 650 222" role="img" aria-label="${esc(accessible)}"><defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".26"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>${[0, 1, 2, 3].map(i => { const y = 37 + i * 47.3; return `<line x1="64" y1="${y}" x2="630" y2="${y}" stroke="var(--border)" stroke-dasharray="3 5"/><text x="3" y="${y + 4}" fill="var(--muted)" font-size="10">${money(max * (3 - i) / 3).replace(',000', 'k')}</text>`; }).join('')}<polygon points="${points[0][0]},179 ${line} ${points.at(-1)[0]},179" fill="url(#revenue-fill)"/><polyline points="${line}" stroke="var(--accent)" stroke-width="3" fill="none" stroke-linejoin="round"/>${points.map((point, i) => `<circle cx="${point[0]}" cy="${point[1]}" r="4" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"><title>${dateLabel(groups[i].start)}–${dateLabel(groups[i].end)}: ${money(groups[i].value)}</title></circle><text x="${point[0]}" y="210" fill="var(--muted)" font-size="10" text-anchor="middle">${dateLabel(groups[i].start)}</text>`).join('')}</svg></div>`;
}
function qualityRing(value) {
  const score = value ?? 0;
  return `<div class="quality-ring"><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="70" fill="none" stroke="var(--border)" stroke-width="14"/><circle cx="90" cy="90" r="70" fill="none" stroke="var(--purple)" stroke-width="14" stroke-dasharray="${score / 100 * 439.82} 439.82" stroke-linecap="round" transform="rotate(-90 90 90)"/></svg><div><strong>${percent(value)}</strong><span>FIRST-TIME<br>COMPLETION</span></div></div>`;
}
function crewCards() {
  const crews = data.crews.filter(crew => matches(crew.id, crew.lead, crew.helper, crew.third));
  return crews.map(crew => {
    const stats = crewStats(data, crew.id, state.period);
    const today = data.jobs.find(job => job.crewId === crew.id && job.date === DEMO_TODAY && job.status !== 'Completed');
    return `<button class="crew-card" style="--crew-accent:${crew.color}" data-action="crew-detail" data-id="${crew.id}" aria-label="View truck ${crew.id}, ${crew.lead}"><div class="crew-card-top"><span class="truck-label">${icon('truck')} TRUCK ${crew.id}</span>${badge(today?.status === 'In progress' ? 'On site' : 'Available', today?.status === 'In progress' ? 'green' : 'neutral')}</div><div class="crew-person">${avatar(crew.initials, crew.color)}<div><h3>${crew.lead}</h3><p>${esc(crew.helper)}${crew.third ? ` <span>+1</span>` : ''} <span>· ${crew.third ? 3 : 2}-person crew</span></p></div></div><div class="crew-metrics"><div><span>Job value</span><strong>${money(stats.revenue)}</strong></div><div><span>Jobs done</span><strong>${stats.jobs}</strong></div><div><span>Quality</span><strong class="${stats.quality !== null && stats.quality < 90 ? 'amber-text' : 'green-text'}">${percent(stats.quality)}<small> ${icon('quality')}</small></strong></div></div><div class="crew-card-bottom"><span>${icon('location')} ${today ? `${esc(today.city)} · ${esc(today.type)}` : 'Ready for the next assignment'}</span>${icon('arrow')}</div></button>`;
  }).join('') || empty();
}
function renderCrews() {
  return `<div class="info-strip">${icon('quality')} <div><strong>Quality means work that stays finished.</strong><span>First-time completion = completed jobs with no repair callback ÷ completed jobs. Multiple visits to one job count as one affected job.</span></div></div><div class="crew-grid crews-page">${crewCards()}</div><section class="panel comparison-panel">${sectionHead('Performance comparison', `Completed work · ${periodLabel()}`)}<div class="comparison-bars">${data.crews.filter(crew => matches(crew.id, crew.lead, crew.helper)).map(crew => {
    const stats = crewStats(data, crew.id, state.period);
    const max = Math.max(...data.crews.map(item => crewStats(data, item.id, state.period).revenue), 1);
    return `<button class="comparison-row" data-action="crew-detail" data-id="${crew.id}"><span>Truck ${crew.id}<small>${crew.lead}</small></span><span class="bar-track"><span style="width:${stats.revenue / max * 100}%;background:${crew.color}"></span></span><strong>${money(stats.revenue)}</strong><span class="muted">${stats.jobs} jobs</span></button>`;
  }).join('')}</div></section>`;
}
function alertRow(alert) {
  return `<div class="alert-row"><span class="alert-icon ${alert.kind === 'stock' ? 'amber' : 'red'}">${icon(alert.kind === 'stock' ? 'materials' : 'warning')}</span><div><strong>${alert.kind === 'stock' ? `${esc(alert.material.name)} is running low` : `Truck ${alert.crew.id} · material discrepancy`}</strong><p>${alert.kind === 'stock' ? `${number(alert.stock)} ${alert.material.unit} available · reorder at ${number(alert.material.reorder)} ${alert.material.unit}` : `${number(Math.abs(alert.balance.variance))} ${alert.material.unit} ${esc(alert.material.name)} ${alert.balance.variance > 0 ? 'less' : 'more'} than expected. Verify the count.`}</p></div><button class="icon-btn" data-action="${alert.kind === 'stock' ? 'movement' : 'crew-detail'}" ${alert.crew ? `data-id="${alert.crew.id}"` : ''} aria-label="${alert.kind === 'stock' ? 'Record material receipt' : `Review truck ${alert.crew.id}`}">${icon('arrow')}</button></div>`;
}
function jobsForView() {
  return data.jobs.filter(job => inPeriod(job.status === 'Completed' ? job.completedDate : job.date, state.period) && (state.jobStatus === 'All' || job.status === state.jobStatus) && matches(job.id, job.customer, job.city, job.address, job.crewId, crewName(job.crewId))).sort((a, b) => b.date.localeCompare(a.date));
}
function jobTable(jobs, compact = false) {
  if (!jobs.length) return empty('No jobs to show', 'Try another filter, or add your first job.');
  return `<div class="table-scroll"><table><thead><tr><th>Job / customer</th><th>${compact ? 'Scheduled' : 'Location'}</th><th>Crew</th><th>Job value</th><th>Status</th><th><span class="sr-only">Details</span></th></tr></thead><tbody>${jobs.map(job => `<tr><td><button class="table-link" data-action="job-detail" data-id="${esc(job.id)}"><strong>${esc(job.customer)}</strong><small>${esc(job.id)} · ${esc(job.type)}</small></button></td><td>${compact ? dateLabel(job.date) : esc(job.city)}<small>${compact ? '' : dateLabel(job.date)}</small></td><td><button class="plain-link" data-action="crew-detail" data-id="${job.crewId}">${icon('truck')} ${job.crewId}</button></td><td class="tabular">${money(job.value)}</td><td>${badge(job.status)}</td><td><button class="icon-btn" data-action="job-detail" data-id="${esc(job.id)}" aria-label="View job ${esc(job.id)}">${icon('chevron')}</button></td></tr>`).join('')}</tbody></table></div>`;
}
function renderJobs() {
  const scoped = data.jobs.filter(job => inPeriod(job.status === 'Completed' ? job.completedDate : job.date, state.period));
  return `<div class="mini-stats"><div><span>Scheduled</span><strong>${scoped.filter(job => job.status === 'Scheduled').length}</strong></div><div><span>In progress</span><strong class="blue-text">${scoped.filter(job => job.status === 'In progress').length}</strong></div><div><span>Completed</span><strong class="green-text">${scoped.filter(job => job.status === 'Completed').length}</strong></div><div><span>Scheduled work value</span><strong>${money(scoped.filter(job => job.status !== 'Completed').reduce((sum, job) => sum + job.value, 0))}</strong></div></div><section class="panel">${sectionHead('All jobs', `${jobsForView().length} jobs · ${periodLabel()}`, `<label class="filter-select"><select id="job-status" aria-label="Job status"><option>All</option>${['Scheduled', 'In progress', 'Completed'].map(status => `<option ${state.jobStatus === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label>`)}${jobTable(jobsForView())}</section>`;
}
function renderMaterials() {
  const alerts = materialAlerts(data);
  const selected = data.crews.find(crew => crew.id === state.materialCrew);
  return `<div class="stats-grid inventory-stats">${statCard('Materials tracked', data.materials.length, 'Stock is tracked in its own unit', 'materials')}${statCard('Low-stock items', alerts.filter(alert => alert.kind === 'stock').length, 'At or below their reorder point', 'warning', 'amber')}${statCard('Reconciliation alerts', alerts.filter(alert => alert.kind === 'variance').length, 'Differences needing verification', 'truck', 'purple')}${statCard('Truck allocations', data.crews.length, 'Physical counts establish accountability', 'check', 'blue')}</div>
    <section class="panel">${sectionHead('Warehouse inventory', 'Opening stock + receipts + returns − truck loads', `<button class="text-link" data-action="movement">${icon('plus')} Record a receipt</button>`)}<div class="inventory-grid">${data.materials.filter(material => matches(material.name, material.detail)).map(material => {
      const stock = warehouseStock(data, material.id); const low = stock <= material.reorder;
      return `<article class="inventory-item"><div class="inventory-item-top"><span class="material-symbol">${icon('materials')}</span>${badge(low ? 'Reorder soon' : 'Healthy stock', low ? 'amber' : 'green')}</div><h3>${material.name}</h3><p>${material.detail}</p><div class="inventory-count">${number(stock)} <span>${material.unit}</span></div><div class="stock-track"><span class="${low ? 'amber-bg' : 'green-bg'}" style="width:${Math.min(100, Math.max(0, stock / (material.reorder * 3) * 100))}%"></span></div><div class="stock-caption"><span>Reorder: ${number(material.reorder)} ${material.unit}</span><button data-action="threshold" data-id="${material.id}">Edit</button></div></article>`;
    }).join('') || empty()}</div></section>
    <section class="panel reconciliation-panel">${sectionHead('Truck material reconciliation', 'Compare job requirements, actual use, and what is still on the truck.', `<label class="filter-select"><select id="material-crew" aria-label="Truck for reconciliation">${data.crews.map(crew => `<option value="${crew.id}" ${crew.id === state.materialCrew ? 'selected' : ''}>Truck ${crew.id} · ${crew.lead}</option>`).join('')}</select></label>`)}${reconciliationTable(selected.id)}<div class="info-strip inset">${icon('help')}<div><strong>A discrepancy is a signal to investigate, not proof of theft.</strong><span>Expected balance = loaded − used − documented waste − returned. Difference = expected − physical count. Refresh counts after new movements or completed jobs.</span></div></div></section>
    <div class="bottom-grid"><section class="panel">${sectionHead('Material alerts', 'Review counts and plan your next order.')}<div class="alert-list">${alerts.map(alertRow).join('') || empty('All clear', 'No material alerts.')}</div></section><section class="panel">${sectionHead('Recent movements', 'A record of what came in and went out.')}<div class="movement-list">${data.movements.filter(item => item.kind !== 'Count').slice(-6).reverse().map(item => `<div class="movement-row"><span class="movement-icon">${icon(item.kind === 'Receipt' || item.kind === 'Return' ? 'down' : 'up')}</span><div><strong>${item.kind} · ${esc(data.materials.find(material => material.id === item.materialId)?.name)}</strong><small>${dateLabel(item.date)} · ${item.crewId ? `Truck ${item.crewId}` : 'Warehouse'}</small></div><strong>${number(item.quantity)} <span>${data.materials.find(material => material.id === item.materialId)?.unit}</span></strong></div>`).join('')}</div></section></div>`;
}
function reconciliationTable(crewId) {
  return `<div class="table-scroll"><table class="reconciliation-table"><thead><tr><th>Material</th><th>Loaded</th><th>Required</th><th>Used</th><th>Waste</th><th>Returned</th><th>Expected</th><th>Counted</th><th>Difference</th></tr></thead><tbody>${data.materials.map(material => {
    const b = truckBalance(data, crewId, material.id); const flag = b.variance !== null && Math.abs(b.variance) > material.tolerance;
    return `<tr><td><strong>${material.name}</strong><small>${material.unit} · ${material.detail}</small></td>${[b.loaded, b.required, b.used, b.waste, b.returned, b.expected].map(value => `<td class="tabular">${number(value)}</td>`).join('')}<td class="tabular">${b.counted === null ? '—' : number(b.counted)}${b.needsCount ? '<small class="amber-text">Needs new count</small>' : ''}</td><td>${b.variance === null ? badge('Awaiting count', 'neutral') : badge(`${b.variance > 0 ? '+' : ''}${number(b.variance)} ${material.unit}`, flag ? 'amber' : 'green')}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function renderEstimators() {
  const stats = data.estimators.map(est => ({ ...est, stats: estimatorStats(data, est.id, state.period) }));
  const totals = stats.reduce((acc, item) => ({ total: acc.total + item.stats.total, won: acc.won + item.stats.won, lost: acc.lost + item.stats.lost, booked: acc.booked + item.stats.booked, pipeline: acc.pipeline + item.stats.pipeline }), { total: 0, won: 0, lost: 0, booked: 0, pipeline: 0 });
  return `<div class="stats-grid">${statCard('Estimates delivered', totals.total, `${totals.won} accepted estimates`, 'jobs', 'blue')}${statCard('Booked job value', money(totals.booked), 'Accepted estimates, not collected revenue', 'dollar')}${statCard('Win rate', percent(totals.won + totals.lost ? totals.won / (totals.won + totals.lost) * 100 : null), 'Won ÷ (won + lost); pending excluded', 'estimators', 'purple')}${statCard('Open pipeline', money(totals.pipeline), 'Pending estimates awaiting a decision', 'clock', 'amber')}</div>
    <div class="estimator-grid">${stats.filter(est => matches(est.name, est.territory)).map(est => `<button class="panel estimator-card" data-action="estimator-detail" data-id="${est.id}"><div class="estimator-card-person">${avatar(est.initials, est.color)}<div><h2>${est.name}</h2><p>${est.territory}</p></div>${icon('arrow')}</div><div class="estimator-booked"><span>Booked job value</span><strong>${money(est.stats.booked)}</strong></div><div class="estimator-funnel"><span style="width:${est.stats.total ? est.stats.won / est.stats.total * 100 : 0}%;background:${est.color}"></span><span style="width:${est.stats.total ? est.stats.pending / est.stats.total * 100 : 0}%;background:#68705e"></span></div><div class="funnel-caption"><span>${est.stats.won} won</span><span>${est.stats.pending} pending</span><span>${est.stats.lost} lost</span></div><div class="estimator-card-footer"><span>${est.stats.total} estimates</span><strong class="green-text">${percent(est.stats.winRate)} win rate</strong></div></button>`).join('') || empty()}</div>
    <section class="panel">${sectionHead('Estimate pipeline', `Estimates issued in ${periodLabel().toLowerCase()}`)}${estimateTable(data.estimates.filter(item => inPeriod(item.date, state.period) && matches(item.customer, estimatorName(item.estimatorId), item.id)).sort((a, b) => b.date.localeCompare(a.date)))}</section>`;
}
function estimateTable(estimates) {
  return estimates.length ? `<div class="table-scroll"><table><thead><tr><th>Estimate / customer</th><th>Estimator</th><th>Issued</th><th>Value</th><th>Decision</th><th>Action</th></tr></thead><tbody>${estimates.map(item => `<tr><td><strong>${esc(item.customer)}</strong><small>${esc(item.id)}</small></td><td>${esc(estimatorName(item.estimatorId))}</td><td>${dateLabel(item.date)}</td><td>${money(item.value)}</td><td>${badge(item.status)}</td><td>${item.status === 'Pending' ? `<button class="text-link" data-action="estimate-decision" data-id="${esc(item.id)}">Update ${icon('chevron')}</button>` : item.jobId ? `<button class="text-link" data-action="job-detail" data-id="${esc(item.jobId)}">View job ${icon('chevron')}</button>` : '<span class="muted">Closed</span>'}</td></tr>`).join('')}</tbody></table></div>` : empty('No estimates in this period');
}
function feedbackForView() {
  return data.feedback.filter(item => {
    const job = data.jobs.find(job => job.id === item.jobId);
    return inPeriod(item.date, state.period) && (state.qualityKind === 'All' || item.kind === state.qualityKind) && matches(item.note, item.kind, item.jobId, job?.customer, job?.crewId);
  }).sort((a, b) => b.date.localeCompare(a.date));
}
function feedbackList(items) {
  return items.length ? `<div class="feedback-list">${items.map(item => {
    const job = data.jobs.find(job => job.id === item.jobId);
    return `<article class="feedback-item"><span class="feedback-symbol ${item.kind === 'Review' ? 'green' : item.kind === 'Repair' ? 'amber' : 'red'}">${icon(item.kind === 'Review' ? 'star' : item.kind === 'Repair' ? 'truck' : 'warning')}</span><div class="feedback-body"><div class="feedback-heading"><strong>${item.kind === 'Repair' ? 'Repair / return visit' : item.kind === 'Review' ? `${item.rating}-star customer review` : 'Customer complaint'}</strong>${badge(item.status, item.status === 'Open' ? 'amber' : 'green')}</div><p>${esc(item.note)}</p><div class="feedback-meta"><button data-action="job-detail" data-id="${esc(item.jobId)}">${esc(item.jobId)} · ${esc(job?.customer)}</button><span>Truck ${job?.crewId} · ${dateLabel(item.date)}</span></div></div>${item.status === 'Open' ? `<button class="secondary-btn" data-action="resolve-feedback" data-id="${esc(item.id)}">Resolve</button>` : ''}</article>`;
  }).join('')}</div>` : empty('No feedback to show', 'Add a repair visit, complaint, or review to keep a complete record.');
}
function renderQuality() {
  const stats = crewStats(data, undefined, state.period);
  const entries = data.feedback.filter(item => inPeriod(item.date, state.period));
  return `<div class="stats-grid">${statCard('First-time completion', percent(stats.quality), 'Based on completed jobs in the period', 'quality')}${statCard('Repair visits logged', entries.filter(item => item.kind === 'Repair').length, 'Feedback logged in the selected period', 'truck', 'amber')}${statCard('Open complaints', entries.filter(item => item.kind === 'Complaint' && item.status === 'Open').length, 'Customer follow-ups still needed', 'warning', 'purple')}${statCard('Customer reviews', entries.filter(item => item.kind === 'Review').length, 'Reviews logged in the selected period', 'star', 'blue')}</div><div class="info-strip">${icon('help')}<div><strong>Two useful views of quality.</strong><span>The score follows the completion date of each job and its callback history. The feedback list follows the date the repair, complaint, or review was logged. Resolving a callback does not erase it from the score.</span></div></div><section class="panel">${sectionHead('Customer feedback & service history', `${feedbackForView().length} records · ${periodLabel()}`, `<label class="filter-select"><select id="quality-kind" aria-label="Feedback type">${['All', 'Repair', 'Complaint', 'Review'].map(kind => `<option ${state.qualityKind === kind ? 'selected' : ''}>${kind}</option>`).join('')}</select></label>`)}${feedbackList(feedbackForView())}</section>`;
}
function openDetail(content) {
  detail.innerHTML = `<div class="dialog-close-row"><span class="eyebrow">OPERATIONS / DETAILS</span><button class="icon-btn" data-action="close-detail" aria-label="Close details">${icon('close')}</button></div>${content}`;
  if (!detail.open) detail.showModal();
}
function showCrew(id) {
  const crew = data.crews.find(item => item.id === id);
  const stats = crewStats(data, id, state.period);
  const jobs = data.jobs.filter(job => job.crewId === id && inPeriod(job.status === 'Completed' ? job.completedDate : job.date, state.period)).sort((a, b) => b.date.localeCompare(a.date));
  const ids = new Set(jobs.map(job => job.id));
  const onSite = data.jobs.some(job => job.crewId === id && job.date === DEMO_TODAY && job.status === 'In progress');
  openDetail(`<div class="detail-hero">${avatar(crew.initials, crew.color)}<div><span class="truck-label">TRUCK ${crew.id}</span><h1>${crew.lead}</h1><p>Lead · ${crew.specialty}</p></div>${badge(onSite ? 'On site' : 'Available')}</div><div class="crew-roster"><span><small>LEAD</small>${crew.lead}</span><span><small>HELPER</small>${crew.helper}</span>${crew.third ? `<span><small>THIRD CREW MEMBER</small>${crew.third}</span>` : ''}</div><div class="detail-kpis"><div><small>Completed job value</small><strong>${money(stats.revenue)}</strong></div><div><small>Completed jobs</small><strong>${stats.jobs}</strong></div><div><small>First-time completion</small><strong class="green-text">${percent(stats.quality)}</strong></div><div><small>Repair visits</small><strong class="amber-text">${stats.callbacks}</strong></div></div><div class="detail-period">${periodLabel()} · ${stats.callbackJobs} jobs with callbacks · ${stats.complaints} complaints · ${stats.reviews} reviews</div><section class="detail-section">${sectionHead('Job history', 'Select any job to see its work order and material use.')}${jobTable(jobs, true)}</section><section class="detail-section">${sectionHead('Material accountability', 'All-history allocations · each material is reconciled separately')}${reconciliationTable(id)}<button class="secondary-btn" data-action="movement" data-id="${id}">${icon('plus')} Record truck movement or count</button></section><section class="detail-section">${sectionHead('Repairs, complaints & reviews', 'Feedback for jobs completed or scheduled in this reporting period')}${feedbackList(data.feedback.filter(item => ids.has(item.jobId)))}</section>`);
}
function showJob(id) {
  const job = data.jobs.find(item => item.id === id);
  if (!job) { toast('This job could not be found.'); return; }
  const callbacks = data.feedback.filter(item => item.jobId === id && item.kind === 'Repair').length;
  openDetail(`<div class="detail-job-heading"><div><span class="eyebrow">WORK ORDER · ${esc(job.id)}</span><h1>${esc(job.customer)}</h1><p>${icon('location')} ${esc(job.address)}, ${esc(job.city)}</p></div>${badge(job.status)}</div><div class="detail-kpis"><div><small>Job value</small><strong>${money(job.value)}</strong></div><div><small>Gutters</small><strong>${number(job.gutterFt)} <span>ft</span></strong></div><div><small>Downspouts</small><strong>${number(job.downspoutFt)} <span>ft</span></strong></div><div><small>Repair visits</small><strong class="${callbacks ? 'amber-text' : 'green-text'}">${callbacks}</strong></div></div><div class="workorder-grid"><div><small>ASSIGNED CREW</small><button class="plain-link" data-action="crew-detail" data-id="${job.crewId}">Truck ${job.crewId} · ${crewName(job.crewId)}</button></div><div><small>ESTIMATOR</small>${estimatorName(job.estimatorId)}</div><div><small>SCHEDULED</small>${dateLabel(job.date)}, ${job.date.slice(0, 4)}</div><div><small>COMPLETED</small>${job.completedDate ? dateLabel(job.completedDate) : 'Not yet completed'}</div><div><small>STYLE / COLOR</small>${esc(job.type)} · ${esc(job.color)}</div><div><small>ROOF PITCH</small>${esc(job.roofPitch)}</div><div><small>TEAR-OFF</small>${job.tearOff ? 'Yes · remove existing' : 'No'}</div><div><small>CUTS</small>${job.cuts}</div></div><section class="detail-section">${sectionHead('Installation notes', 'Work-order instructions, based on the fields in your example sheets')}<p class="job-notes">${esc(job.notes || 'No installation notes recorded.')}</p></section><section class="detail-section">${sectionHead('Materials on this job', 'Estimated requirement versus reported actual usage')}<div class="table-scroll"><table><thead><tr><th>Material</th><th>Required</th><th>Actual used</th><th>Over / under</th></tr></thead><tbody>${job.materials.map(item => {
    const m = data.materials.find(material => material.id === item.materialId);
    return `<tr><td>${m.name}<small>${m.detail}</small></td><td>${number(item.required)} ${m.unit}</td><td>${job.status === 'Completed' ? `${number(item.used)} ${m.unit}` : 'Not yet reported'}</td><td>${job.status === 'Completed' ? `${item.used - item.required > 0 ? '+' : ''}${number(item.used - item.required)} ${m.unit}` : '—'}</td></tr>`;
  }).join('')}</tbody></table></div></section><div class="detail-actions">${job.sourceId ? `<button class="secondary-btn" data-action="source" data-id="${esc(job.sourceId)}">${icon('scans')} View original estimate sheet</button>` : ''}${job.status !== 'Completed' ? `<button class="primary-btn" data-action="complete-job" data-id="${esc(id)}">${icon('check')} Complete job & report usage</button><button class="secondary-btn" data-action="job-requirements" data-id="${esc(id)}">Edit work-order requirements</button>${job.status === 'Scheduled' ? `<button class="secondary-btn" data-action="start-job" data-id="${esc(id)}">Mark in progress</button>` : ''}` : ''}<button class="secondary-btn" data-action="feedback" data-id="${esc(id)}">${icon('plus')} Add repair / feedback</button></div><section class="detail-section">${sectionHead('Service & customer history', 'Every return visit stays on the record.')}${feedbackList(data.feedback.filter(item => item.jobId === id))}</section>`);
}
function showEstimator(id) {
  const est = data.estimators.find(item => item.id === id);
  const stats = estimatorStats(data, id, state.period);
  openDetail(`<div class="detail-hero">${avatar(est.initials, est.color)}<div><span class="eyebrow">ESTIMATOR</span><h1>${est.name}</h1><p>${est.territory}</p></div></div><div class="detail-kpis"><div><small>Estimates issued</small><strong>${stats.total}</strong></div><div><small>Accepted estimates</small><strong>${stats.won}</strong></div><div><small>Win rate</small><strong class="green-text">${percent(stats.winRate)}</strong></div><div><small>Booked job value</small><strong>${money(stats.booked)}</strong></div></div><div class="info-strip">${icon('help')}<div><strong>${periodLabel()} · ${stats.pending} pending · ${stats.lost} lost</strong><span>Win rate excludes pending estimates. Booked value is the sum of accepted estimate prices; it is not profit or collected payments.</span></div></div>${estimateTable(data.estimates.filter(item => item.estimatorId === id && inPeriod(item.date, state.period)).sort((a, b) => b.date.localeCompare(a.date)))}`);
}
const field = (label, control, cls = '') => `<label class="form-field ${cls}"><span>${label}</span>${control}</label>`;
const input = (name, type = 'text', value = '', extra = '') => `<input name="${name}" type="${type}" value="${esc(value)}" ${extra}>`;
const crewSelect = (id = '') => `<select name="crewId">${data.crews.map(crew => `<option value="${crew.id}" ${crew.id === id ? 'selected' : ''}>Truck ${crew.id} · ${crew.lead}</option>`).join('')}</select>`;
const estimatorSelect = () => `<select name="estimatorId">${data.estimators.map(item => `<option value="${item.id}">${item.name}</option>`).join('')}</select>`;
function openForm(title, subtitle, kind, fields, id = '') {
  formDialog.innerHTML = `<div class="form-header"><div><span class="eyebrow">DEMO WORKSPACE</span><h2>${title}</h2><p>${subtitle}</p></div><button class="icon-btn" data-action="close-form" aria-label="Close form">${icon('close')}</button></div><form id="entry-form" data-kind="${kind}" data-id="${esc(id)}"><div class="form-grid">${fields}</div><div id="form-error" class="form-error" role="alert"></div><div class="form-footer"><span>Saved only in this browser.</span><button type="button" class="secondary-btn" data-action="close-form">Cancel</button><button class="primary-btn" type="submit">${kind === 'reset' ? 'Reset demo' : 'Save record'} ${icon('check')}</button></div></form>`;
  if (!formDialog.open) formDialog.showModal();
}
function jobForm() {
  openForm('Add a job', 'Create a work order and assign it to a crew.', 'job',
    field('Customer / project', input('customer', 'text', '', 'required maxlength="120"')) +
    field('Job value ($)', input('value', 'number', '', 'required min="0.01" step="0.01"')) +
    field('Street address', input('address', 'text', '', 'required maxlength="180"')) +
    field('City', input('city', 'text', '', 'required maxlength="80"')) +
    field('Crew', crewSelect()) + field('Estimator', estimatorSelect()) +
    field('Scheduled date', input('date', 'date', DEMO_TODAY, 'required')) +
    field('Gutter style', '<select name="type"><option>5" K-style</option><option>6" K-style</option><option>6" Fascia</option><option>Service / repair</option></select>') +
    field('Gutter footage', input('gutterFt', 'number', 260, 'required min="0" step="0.1"')) +
    field('Downspout footage', input('downspoutFt', 'number', 80, 'required min="0" step="0.1"')) +
    field('Downspout size', '<select name="ds"><option value="ds-23">2 × 3</option><option value="ds-34">3 × 4</option></select>') +
    field('Color', '<select name="color"><option>White</option></select>') +
    field('Roof pitch', input('roofPitch', 'text', '6 / 12', 'maxlength="30"')) +
    field('Cuts', input('cuts', 'number', 21, 'required min="0" step="1"')) +
    field('Tear-off required', '<select name="tearOff"><option value="yes">Yes</option><option value="no">No</option></select>') +
    field('A / B elbows (count)', input('elbows', 'number', 8, 'required min="0" step="1"')) +
    field('Installation notes', '<textarea name="notes" rows="3" maxlength="2000" placeholder="Access instructions, fittings, drainage, finish details..."></textarea>', 'full') +
    '<p class="form-info full">Demo inventory currently covers white K-style coil, downspouts, hangers, and elbows. Fascia and service jobs need only the listed downspouts / fittings; untracked materials are not reconciled. Hangers are estimated at one every 2 ft.</p>');
}
function movementForm(crewId = '') {
  openForm('Record material movement', 'Keep warehouse stock and truck counts in sync.', 'movement',
    field('Movement type', '<select name="kind" id="movement-kind"><option>Load</option><option>Return</option><option>Receipt</option><option>Waste</option><option>Count</option></select>') +
    field('Material', `<select name="materialId">${data.materials.map(item => `<option value="${item.id}">${item.name} (${item.unit})</option>`).join('')}</select>`) +
    field('Truck (not used for receipts)', crewSelect(crewId || state.materialCrew)) +
    field('Quantity (in the material’s unit)', input('quantity', 'number', '', 'required min="0" step="0.1"')) +
    field('Date', input('date', 'date', DEMO_TODAY, 'required')) +
    field('Reference / reason', input('note', 'text', '', 'required maxlength="250"')) +
    '<p class="form-info full">Load: warehouse → truck. Return: truck → warehouse. Receipt: supplier → warehouse. Waste: documented truck offcuts. Count: latest physical truck balance, not an incoming movement. Load/return/waste are effective now; backdated entries cannot reconstruct historical balances.</p>');
}
function feedbackForm(id = '') {
  const jobs = data.jobs.filter(job => job.status === 'Completed');
  if (!jobs.length) { toast('Complete a job before adding feedback.'); return; }
  const job = data.jobs.find(item => item.id === id);
  if (id && job?.status !== 'Completed') { toast('Complete this job before recording repair visits or customer feedback.'); return; }
  openForm('Add service or customer feedback', 'Record one entry per actual repair visit, complaint, or review.', 'feedback',
    field('Job', `<select name="jobId">${jobs.map(job => `<option value="${esc(job.id)}" ${job.id === id ? 'selected' : ''}>${esc(job.id)} · ${esc(job.customer)} · ${job.crewId}</option>`).join('')}</select>`, 'full') +
    field('Record type', '<select name="kind" id="feedback-kind"><option>Repair</option><option>Complaint</option><option>Review</option></select>') +
    field('Date', input('date', 'date', DEMO_TODAY, 'required')) +
    field('Status', '<select name="status"><option>Open</option><option>Resolved</option></select>') +
    field('Rating (reviews only)', '<select name="rating"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select>') +
    field('Details / work performed', '<textarea name="note" rows="3" required maxlength="2000" placeholder="Describe the issue, repair, or customer feedback..."></textarea>', 'full'));
}
function estimateForm() {
  openForm('New estimate', 'Track the opportunity before a job is accepted.', 'estimate',
    field('Customer / project', input('customer', 'text', '', 'required maxlength="120"')) +
    field('Estimator', estimatorSelect()) +
    field('Estimate value ($)', input('value', 'number', '', 'required min="0.01" step="0.01"')) +
    field('Date issued', input('date', 'date', DEMO_TODAY, 'required')) +
    '<p class="form-info full">New estimates start as pending. When accepted, assign a crew and schedule a work order from the estimate pipeline.</p>');
}
function decisionForm(id) {
  const est = data.estimates.find(item => item.id === id);
  openForm('Update estimate decision', `${est.customer} · ${money(est.value)}`, 'decision',
    field('Decision', '<select name="decision" id="estimate-decision"><option value="Won">Accepted / won</option><option value="Lost">Declined / lost</option></select>', 'full') +
    '<div id="won-fields" class="form-grid full">' +
    field('Assigned crew', crewSelect()) + field('Scheduled date', input('date', 'date', DEMO_TODAY, 'required')) +
    field('Street address', input('address', 'text', est.address || '', 'required maxlength="180"')) +
    field('City', input('city', 'text', est.city || '', 'required maxlength="80"')) +
    '<p class="form-info full">Accepting creates a linked scheduled job. Add installation requirements by editing its quantities before completing it; this demo starts the linked job at zero footage.</p></div>', id);
}
function completionForm(id) {
  const job = data.jobs.find(item => item.id === id);
  openForm('Complete job & report usage', `${job.id} · ${job.customer}`, 'completion',
    field('Completion date', input('completedDate', 'date', DEMO_TODAY, `required min="${job.date}"`), 'full') +
    job.materials.map(item => { const m = data.materials.find(material => material.id === item.materialId); return field(`${m.name} used (${m.unit}) · required ${number(item.required)}`, input(`used-${m.id}`, 'number', item.required, `required min="0" step="${m.unit === 'ea' ? '1' : '0.1'}"`), 'full'); }).join('') +
    '<p class="form-info full">Actual usage is deducted from the truck balance. Record extra loads first if the truck does not have enough material. Waste is reported separately through material movements.</p>', id);
}
function requirementsForm(id) {
  const job = data.jobs.find(item => item.id === id);
  openForm('Work-order requirements', `${job.id} · ${job.customer}`, 'requirements',
    field('Gutter footage', input('gutterFt', 'number', job.gutterFt, 'required min="0" step="0.1"')) +
    field('Downspout footage', input('downspoutFt', 'number', job.downspoutFt, 'required min="0" step="0.1"')) +
    field('Cuts', input('cuts', 'number', job.cuts, 'required min="0" step="1"')) +
    field('A / B elbows (count)', input('elbows', 'number', job.materials.find(item => item.materialId === 'elbow')?.required || 0, 'required min="0" step="1"')) +
    field('Roof pitch', input('roofPitch', 'text', job.roofPitch, 'maxlength="30"')) +
    field('Tear-off', `<select name="tearOff"><option value="yes" ${job.tearOff ? 'selected' : ''}>Yes</option><option value="no" ${!job.tearOff ? 'selected' : ''}>No</option></select>`) +
    field('Installation notes', `<textarea name="notes" rows="3" maxlength="2000">${esc(job.notes)}</textarea>`, 'full') +
    '<p class="form-info full">Updates the estimate requirements, not actual consumption. Hangers are estimated at one every 2 ft. Material style and unit remain those on the original work order.</p>', id);
}
function exportReport() {
  let rows;
  const crewRows = () => [['Truck', 'Lead', 'Helper', 'Third member', 'Completed job value', 'Completed jobs', 'First-time completion (%)', 'Repair visits', 'Affected jobs', 'Complaints', 'Reviews'], ...data.crews.filter(crew => matches(crew.id, crew.lead, crew.helper, crew.third)).map(crew => {
    const s = crewStats(data, crew.id, state.period);
    return [crew.id, crew.lead, crew.helper, crew.third || '', s.revenue, s.jobs, s.quality === null ? '' : s.quality.toFixed(1), s.callbacks, s.callbackJobs, s.complaints, s.reviews];
  })];
  if (state.page === 'scans') rows = [['Source file', 'Customer', 'Document date', 'Imported', 'Estimate', 'Linked job', 'Value', 'Estimator', 'Review status'], ...data.scans.filter(scan => matches(scan.customer, scan.filename, scan.estimateId)).map(scan => [scan.filename, scan.customer, scan.documentDate, scan.importedAt, scan.estimateId, data.estimates.find(item => item.id === scan.estimateId)?.jobId || '', scan.value, estimatorName(scan.estimatorId), 'Office reviewed'])];
  else if (state.page === 'jobs') rows = [['Job', 'Customer', 'Address', 'City', 'Truck', 'Estimator', 'Scheduled', 'Completed', 'Status', 'Job value', 'Gutter ft', 'Downspout ft'], ...jobsForView().map(job => [job.id, job.customer, job.address, job.city, job.crewId, estimatorName(job.estimatorId), job.date, job.completedDate, job.status, job.value, job.gutterFt, job.downspoutFt])];
  else if (state.page === 'estimators') rows = [['Estimator', 'Estimates issued', 'Won', 'Lost', 'Pending', 'Win rate (%)', 'Booked value', 'Open pipeline'], ...data.estimators.filter(est => matches(est.name, est.territory)).map(est => { const s = estimatorStats(data, est.id, state.period); return [est.name, s.total, s.won, s.lost, s.pending, s.winRate === null ? '' : s.winRate.toFixed(1), s.booked, s.pipeline]; })];
  else if (state.page === 'materials') rows = [['Truck', 'Material', 'Unit', 'Warehouse stock', 'Reorder point', 'Loaded', 'Required', 'Used', 'Waste', 'Returned', 'Expected truck balance', 'Physical count', 'Difference'], ...data.crews.flatMap(crew => data.materials.map(m => { const b = truckBalance(data, crew.id, m.id); return [crew.id, m.name, m.unit, warehouseStock(data, m.id), m.reorder, b.loaded, b.required, b.used, b.waste, b.returned, b.expected, b.counted ?? '', b.variance ?? 'Awaiting count']; }))];
  else if (state.page === 'quality') rows = [['Job', 'Truck', 'Type', 'Logged date', 'Status', 'Rating', 'Details'], ...feedbackForView().map(item => [item.jobId, data.jobs.find(job => job.id === item.jobId)?.crewId, item.kind, item.date, item.status, item.rating ?? '', item.note])];
  else rows = crewRows();
  const csv = rows.map(row => row.map(value => {
    let text = String(value ?? '');
    if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = `gnw-${state.page}-${['materials', 'scans'].includes(state.page) ? 'all-history' : state.period}.csv`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('CSV report exported. Figures reflect the current reporting scope.');
}
function showHelp() {
  openDetail(`<div class="detail-job-heading"><div><span class="eyebrow">WELCOME TO YOUR WORKSPACE</span><h1>Less guessing. More visibility.</h1><p>A working preview of Great Northwest Gutters operations.</p></div></div><div class="help-content"><h2>What you can do</h2><p>Open any crew to see job history, first-time completion, material balances, and customer feedback. Add jobs, complete them with actual use, record warehouse and truck movements, track estimates, and log return visits.</p><h2>Scan intake</h2><p>Upload a PNG, JPEG, WebP, or PDF. OCR runs locally with a locally served language model; documents are not sent to a cloud service. PDFs support up to five pages and files up to 20 MB. Review every suggested field next to the original and confirm before saving. Handwritten sheets may need substantial corrections. Source documents remain attached in this browser.</p><h2>How the numbers work</h2><p><strong>Revenue:</strong> completed job prices, not profit or collected payments. <strong>Quality:</strong> completed jobs with no callbacks divided by completed jobs. Repeated repair visits count as one affected job. <strong>Estimator win rate:</strong> won divided by won plus lost; pending excluded. <strong>Booked value:</strong> accepted estimates.</p><h2>Material accountability</h2><p>Stock = opening balance + receipts + returns − loads. Truck balance = loads − reported use − waste − returns. Reconcile against physical counts. Differences prompt investigation, never accusations.</p><h2>Demo boundaries</h2><p>Seed data is fictional and reports are anchored to October 2, 2026. Inventory uses all history and currently covers white K-style coil, downspouts, hangers, and elbows. There is no staff authentication, shared database, dependable handwriting AI, purchase-order system, or financial integration.</p><p>This is not production storage. Do not enter sensitive customer information. Source files and records can be lost if browser storage is cleared. CSV reports are summaries, not complete backups. Production needs authenticated shared storage, permissions, audited inventory records, and backups.</p></div>`);
}
function updateExistingFeedback(id) {
  const next = structuredClone(data);
  const item = next.feedback.find(item => item.id === id);
  if (!item) { toast('Feedback record not found.'); return; }
  item.status = 'Resolved';
  try {
    persist(next); render();
    if (detail.open) {
      const job = next.jobs.find(job => job.id === item.jobId);
      showJob(job.id);
    }
    toast('Marked resolved. The service history and quality score remain intact.');
  } catch (error) { toast(`Unable to save: ${error.message}`); }
}
function handleAction(action, id) {
  switch (action) {
    case 'menu': state.menu = !state.menu; render(); break;
    case 'scan': openScanIntake(); break;
    case 'close-scan': if (!scanSaving) scanDialog.close(); break;
    case 'source': showScanSource(id); break;
    case 'scan-page': changeScanPage(Number(id)); break;
    case 'parse-scan': applyScanText(); break;
    case 'crew-detail': showCrew(id); break;
    case 'job-detail': showJob(id); break;
    case 'estimator-detail': showEstimator(id); break;
    case 'close-detail': detail.close(); break;
    case 'close-form': formDialog.close(); break;
    case 'job': jobForm(); break;
    case 'movement': movementForm(id); break;
    case 'feedback': feedbackForm(id); break;
    case 'estimate': estimateForm(); break;
    case 'estimate-decision': decisionForm(id); break;
    case 'complete-job': completionForm(id); break;
    case 'job-requirements': requirementsForm(id); break;
    case 'resolve-feedback': updateExistingFeedback(id); break;
    case 'start-job': {
      const next = structuredClone(data); next.jobs.find(job => job.id === id).status = 'In progress';
      try { persist(next); render(); showJob(id); toast('Job marked in progress.'); } catch (error) { toast(`Unable to save: ${error.message}`); }
      break;
    }
    case 'threshold': {
      const m = data.materials.find(item => item.id === id);
      openForm('Update reorder point', `${m.name} · ${m.unit}`, 'threshold', field(`Reorder point (${m.unit})`, input('reorder', 'number', m.reorder, `required min="0" step="${m.unit === 'ea' ? 1 : 0.1}"`), 'full'), id); break;
    }
    case 'export': exportReport(); break;
    case 'alerts': state.page = 'materials'; state.search = ''; state.menu = false; location.hash = 'materials'; render(); break;
    case 'help': showHelp(); break;
    case 'reset': openForm('Reset demo data?', 'This removes every change you made in this browser.', 'reset', '<p class="form-info full">The original fictional crews, work orders, estimates, and inventory will be restored. Export any reports you want to keep before resetting.</p>'); break;
  }
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) handleAction(button.dataset.action, button.dataset.id);
});
document.addEventListener('input', event => {
  if (event.target.id === 'global-search') {
    state.search = event.target.value;
    document.querySelector('#page-content').innerHTML = ({ dashboard: renderDashboard, crews: renderCrews, jobs: renderJobs, scans: renderScans, materials: renderMaterials, estimators: renderEstimators, quality: renderQuality })[state.page]();
  }
});
document.addEventListener('change', event => {
  const id = event.target.id;
  if (id === 'period') { state.period = event.target.value; render(); }
  if (id === 'job-status') { state.jobStatus = event.target.value; render(); }
  if (id === 'quality-kind') { state.qualityKind = event.target.value; render(); }
  if (id === 'material-crew') { state.materialCrew = event.target.value; render(); }
  if (id === 'estimate-decision') {
    const container = document.querySelector('#won-fields');
    container.hidden = event.target.value === 'Lost';
    container.querySelectorAll('input,select').forEach(input => input.disabled = container.hidden);
  }
  if (id === 'movement-kind') {
    const receipt = event.target.value === 'Receipt';
    formDialog.querySelector('[name="crewId"]').disabled = receipt;
  }
  if (id === 'feedback-kind') {
    formDialog.querySelector('[name="rating"]').disabled = event.target.value !== 'Review';
    const status = formDialog.querySelector('[name="status"]');
    status.disabled = event.target.value === 'Review';
    if (status.disabled) status.value = 'Resolved';
  }
});
window.addEventListener('hashchange', () => {
  const page = location.hash.slice(1);
  if (pageNames[page]) { state.page = page; state.search = ''; state.menu = false; render(); window.scrollTo(0, 0); }
});
for (const dialog of [detail, formDialog]) dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
function createJob(values) {
  const job = {
    id: `GN-${Math.max(1040, ...data.jobs.map(job => Number(job.id.replace('GN-', '')) || 1040)) + 1}`,
    customer: values.customer.trim(), address: values.address.trim(), city: values.city.trim(),
    crewId: values.crewId, estimatorId: values.estimatorId, date: values.date, completedDate: null, status: 'Scheduled',
    value: Number(values.value), type: values.type || '5" K-style', color: values.color || 'White',
    gutterFt: Number(values.gutterFt || 0), downspoutFt: Number(values.downspoutFt || 0),
    roofPitch: values.roofPitch || 'Not recorded', tearOff: values.tearOff === 'yes', cuts: Number(values.cuts || 0), notes: values.notes?.trim() || '',
    materials: [],
  };
  const error = validateJob(job, data);
  if (error) throw new Error(error);
  if (job.type.includes('K-style')) job.materials.push({ materialId: job.type.startsWith('6') ? 'coil-6' : 'coil-5', required: job.gutterFt, used: 0 });
  job.materials.push({ materialId: values.ds || 'ds-23', required: job.downspoutFt, used: 0 }, { materialId: 'hanger', required: Math.ceil(job.gutterFt / 2), used: 0 }, { materialId: 'elbow', required: Number(values.elbows || 0), used: 0 });
  return job;
}
function renderScans() {
  const scans = data.scans.filter(scan => matches(scan.customer, scan.filename, scan.estimateId));
  return `<section class="scan-intro panel"><div class="scan-intro-copy"><span class="eyebrow">PAPERWORK, MEET YOUR WORKSPACE</span><h2>Your estimate sheet.<br>A head start on the data entry.</h2><p>Drop in a screenshot, photo, or scanned PDF. Read the suggested details alongside the original, confirm what is correct, and turn it into an estimate or assigned work order.</p><button class="primary-btn" data-action="scan">${icon('scans')} Upload an estimate sheet</button><div class="scan-privacy">${icon('quality')} Local OCR. Your document stays in this browser.</div></div><div class="paper-illustration" aria-hidden="true"><div class="paper-top">GREAT NORTHWEST <span>ESTIMATE</span></div><div class="paper-rule"></div><div class="paper-row"><i></i><i></i></div><div class="paper-row"><i></i><i></i></div><div class="paper-boxes"><i></i><i></i><i></i></div><div class="paper-drawing"><svg viewBox="0 0 220 90" fill="none"><path d="M20 65V25h60v18h35V15h65v50h-35v15H50V65H20Z" stroke="#738ca7" stroke-width="2"/><path d="M25 29h50m44-10h54m-30 49v10" stroke="#a4cfff" stroke-width="2"/></svg></div><div class="paper-total">TOTAL <strong>$ 2,450</strong></div><span class="paper-tag">${icon('check')} Ready to review</span></div></section><div class="scan-steps"><div><span>01</span><strong>Upload your sheet</strong><p>PNG, JPEG, WebP, or PDF.<br>Up to 20 MB / 5 PDF pages.</p></div><div><span>02</span><strong>Review the suggestions</strong><p>Compare footage, pricing, and customer details with the original.</p></div><div><span>03</span><strong>Save & assign</strong><p>Create an estimate or accepted job. Keep the source sheet attached.</p></div></div><div class="info-strip">${icon('help')}<div><strong>Handwritten numbers always need a human check.</strong><span>Local OCR works best on clear printed text. These handwritten estimate sheets may need substantial corrections. Blank or unrecognized fields are not guessed; no record affects your dashboard until you confirm it.</span></div></div><section class="panel">${sectionHead('Reviewed scan history', `${scans.length} imported documents · sources saved in this browser`)}${scans.length ? `<div class="table-scroll"><table><thead><tr><th>Document / customer</th><th>Estimator</th><th>Job value</th><th>Record</th><th>Original sheet</th></tr></thead><tbody>${scans.map(scan => {
    const estimate = data.estimates.find(item => item.id === scan.estimateId);
    return `<tr><td><strong>${esc(scan.customer)}</strong><small>${esc(scan.filename)} · ${dateLabel(scan.documentDate)}</small></td><td>${esc(estimatorName(scan.estimatorId))}</td><td>${money(scan.value)}</td><td>${badge(estimate?.status || 'Pending')}${estimate?.jobId ? `<small><button class="text-link" data-action="job-detail" data-id="${estimate.jobId}">${estimate.jobId}</button></small>` : `<small>${esc(scan.estimateId)}</small>`}</td><td><button class="text-link" data-action="source" data-id="${scan.id}">${icon('scans')} View source</button></td></tr>`;
  }).join('')}</tbody></table></div>` : empty('Your paperwork starts here', 'Upload your first estimate. Reviewed documents will appear here.')}</section>`;
}
function clearScanDraft() {
  scanController?.abort(); scanController = null;
  scanPreviewUrls.forEach(url => URL.revokeObjectURL(url));
  scanPreviewUrls = []; scanDraft = null;
}
function openScanIntake() {
  clearScanDraft();
  scanDialog.innerHTML = `<div class="scan-header"><div><span class="eyebrow">PRIVATE DOCUMENT INTAKE</span><h2>Scan an estimate</h2><p>Upload, review, then save. No automatic posting to your dashboard.</p></div><button class="icon-btn" data-action="close-scan" aria-label="Close scan intake">${icon('close')}</button></div><div class="scan-upload-content"><label class="scan-dropzone" id="scan-dropzone"><span class="scan-upload-icon">${icon('scans')}</span><strong>Choose an estimate sheet</strong><span>Click to browse, or drop a scan here</span><span class="scan-file-types">PNG · JPEG · WebP · PDF / up to 20 MB</span><input id="scan-file" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" aria-label="Choose an estimate scan"></label><div class="scan-local-note">${icon('quality')} OCR engine and language model are served locally. No document is uploaded to a cloud service.</div><div id="scan-progress" class="scan-progress" hidden><span class="scan-spinner"></span><div><strong id="scan-progress-label">Preparing document</strong><progress id="scan-progress-bar" max="1" value="0"></progress><p>Handwritten fields may not be recognized. You will review the results.</p></div></div><div id="scan-error" class="form-error" role="alert"></div></div>`;
  if (!scanDialog.open) scanDialog.showModal();
}
async function beginScan(file) {
  if (!file) return;
  scanController?.abort();
  const controller = new AbortController(); scanController = controller;
  const input = scanDialog.querySelector('#scan-file');
  input.disabled = true;
  scanDialog.querySelector('#scan-error').textContent = '';
  scanDialog.querySelector('#scan-progress').hidden = false;
  try {
    const result = await scanDocument(file, (label, progress) => {
      if (!controller.signal.aborted && scanDialog.querySelector('#scan-progress-label')) {
        scanDialog.querySelector('#scan-progress-label').textContent = label;
        scanDialog.querySelector('#scan-progress-bar').value = progress;
      }
    }, controller.signal);
    if (controller.signal.aborted) return;
    scanPreviewUrls = result.previews.map(blob => URL.createObjectURL(blob));
    scanDraft = { id: crypto.randomUUID(), file, ...result, page: 0, suggestions: parseEstimateText(result.text) };
    showScanReview();
  } catch (error) {
    if (error.name !== 'AbortError' && scanDialog.open) {
      scanDialog.querySelector('#scan-error').textContent = `The sheet could not be read: ${error.message} Try a sharper image, a different supported file, or enter the record manually.`;
      scanDialog.querySelector('#scan-progress').hidden = true;
    }
  } finally {
    if (scanDialog.querySelector('#scan-file')) scanDialog.querySelector('#scan-file').disabled = false;
  }
}
function scanPreviewPane(filename, pages) {
  return `<div class="scan-source-pane"><div class="scan-source-toolbar"><strong>${esc(filename)}</strong><span>${pages} ${pages === 1 ? 'page' : 'pages'}</span></div><div class="scan-source-image"><img id="scan-preview-image" src="${scanPreviewUrls[0]}" alt="Original estimate sheet for comparison"></div>${pages > 1 ? `<div class="scan-page-buttons">${Array.from({ length: pages }, (_, index) => `<button type="button" class="secondary-btn ${index === 0 ? 'selected' : ''}" data-action="scan-page" data-id="${index}">Page ${index + 1}</button>`).join('')}</div>` : ''}<p>Original document · compare all numbers and handwritten notes before saving.</p></div>`;
}
function showScanReview() {
  const draft = scanDraft; const values = draft.suggestions.fields;
  const suggestedField = (label, name, control, cls = '') => field(`${label}${draft.suggestions.detected.includes(name) ? ' · suggested' : ' · check / enter'}`, control, `${cls} ${draft.suggestions.detected.includes(name) ? 'suggested-field' : ''}`);
  scanDialog.innerHTML = `<div class="scan-header"><div><span class="eyebrow">STEP 2 / OFFICE REVIEW</span><h2>Check the sheet. Confirm the details.</h2><p>${draft.suggestions.detected.length} fields suggested · ${draft.confidence === null ? 'PDF text extracted' : `OCR text confidence ${Math.round(draft.confidence)}% (not field accuracy)`}</p></div><button class="icon-btn" data-action="close-scan" aria-label="Close scan review">${icon('close')}</button></div><div class="scan-review-layout">${scanPreviewPane(draft.file.name, draft.pages)}<div class="scan-review-fields"><div class="scan-review-warning">${icon('warning')}<span>Handwritten fields may be wrong or missing. No figures are verified until you check them against the sheet.</span></div><form id="scan-review-form"><div class="form-grid">
    ${field('Save as', '<select name="destination" id="scan-destination"><option value="estimate">Pending estimate</option><option value="job">Accepted estimate + assigned job</option></select>', 'full')}
    ${suggestedField('Customer / project', 'customer', input('customer', 'text', values.customer, 'required maxlength="120"'), 'full')}
    ${suggestedField('Job / estimate value ($)', 'value', input('value', 'number', values.value, 'required min="0.01" step="0.01"'))}
    ${suggestedField('Document date', 'date', input('date', 'date', values.date || DEMO_TODAY, 'required'))}
    ${suggestedField('Street address', 'address', input('address', 'text', values.address, 'required maxlength="180"'), 'full')}
    ${suggestedField('City', 'city', input('city', 'text', values.city, 'required maxlength="80"'))}
    ${field('Estimator (office assignment)', estimatorSelect())}
    ${suggestedField('Phone', 'phone', input('phone', 'tel', values.phone, 'maxlength="60"'))}
    ${suggestedField('Email', 'email', input('email', 'email', values.email, 'maxlength="180"'))}
    ${suggestedField('Gutter footage', 'gutterFt', input('gutterFt', 'number', values.gutterFt, 'required min="0" step="0.1"'))}
    ${suggestedField('Downspout footage', 'downspoutFt', input('downspoutFt', 'number', values.downspoutFt, 'required min="0" step="0.1"'))}
    ${suggestedField('Gutter style', 'type', `<select name="type" required><option value="">Confirm style...</option>${['5" K-style', '6" K-style', '6" Fascia', 'Service / repair'].map(type => `<option ${type === values.type ? 'selected' : ''}>${esc(type)}</option>`).join('')}</select>`)}
    ${suggestedField('Downspout size', 'ds', `<select name="ds" required><option value="">Confirm size...</option><option value="ds-23" ${values.ds === 'ds-23' ? 'selected' : ''}>2 × 3</option><option value="ds-34" ${values.ds === 'ds-34' ? 'selected' : ''}>3 × 4</option></select>`)}
    ${suggestedField('Color', 'color', `<select name="color" required><option value="">Confirm color...</option><option ${values.color === 'White' ? 'selected' : ''}>White</option></select>`)}
    ${suggestedField('Cuts', 'cuts', input('cuts', 'number', values.cuts, 'required min="0" step="1"'))}
    ${suggestedField('Roof pitch', 'roofPitch', input('roofPitch', 'text', values.roofPitch, 'maxlength="30"'))}
    ${suggestedField('Tear-off', 'tearOff', '<select name="tearOff" required><option value="">Confirm tear-off...</option><option value="yes">Yes</option><option value="no">No</option></select>')}
    ${suggestedField('Elbows / fittings count', 'elbows', input('elbows', 'number', '', 'required min="0" step="1"'))}
    ${field('Crew (if accepted)', crewSelect(), 'scan-assignment')}
    ${field('Scheduled date (if accepted)', input('scheduledDate', 'date', DEMO_TODAY, 'required'), 'scan-assignment')}
    ${suggestedField('Installation notes', 'notes', `<textarea name="notes" rows="3" maxlength="4000">${esc(values.notes)}</textarea>`, 'full')}
    <p class="form-info full">Enter 0 for quantities not required. Only white K-style coil, downspouts, hangers, and elbows are currently inventory-tracked. Fittings, diagrams, customer signatures, and unrecognized handwriting stay on the original sheet.</p>
    <details class="scan-raw-text full"><summary>Inspect / correct extracted text</summary><textarea id="scan-raw-text" rows="8" aria-label="Extracted document text">${esc(draft.text)}</textarea><button type="button" class="text-link" data-action="parse-scan">Suggest values for empty fields ${icon('arrow')}</button></details>
    <label class="review-confirm full"><input type="checkbox" name="confirmed" required><span>I checked the price, footage, customer details, and work instructions against the original sheet.</span></label>
    </div><div id="scan-save-error" class="form-error" role="alert"></div><div class="form-footer"><span>No cloud upload. Saved in this browser.</span><button type="button" class="secondary-btn" data-action="close-scan">Cancel</button><button type="submit" class="primary-btn">${icon('check')} Confirm & save</button></div></form></div></div>`;
  updateScanAssignment();
}
function updateScanAssignment() {
  const isJob = scanDialog.querySelector('#scan-destination')?.value === 'job';
  scanDialog.querySelectorAll('.scan-assignment').forEach(label => {
    label.hidden = !isJob; label.querySelectorAll('input,select').forEach(control => control.disabled = !isJob);
  });
}
function changeScanPage(index) {
  if (!scanPreviewUrls[index]) return;
  scanDialog.querySelector('#scan-preview-image').src = scanPreviewUrls[index];
  scanDialog.querySelectorAll('[data-action="scan-page"]').forEach(button => button.classList.toggle('selected', Number(button.dataset.id) === index));
}
function applyScanText() {
  const text = scanDialog.querySelector('#scan-raw-text').value;
  scanDraft.text = text;
  const parsed = parseEstimateText(text);
  let applied = 0;
  for (const [key, value] of Object.entries(parsed.fields)) {
    const control = scanDialog.querySelector(`#scan-review-form [name="${key}"]`);
    if (control && !control.value && value !== '') { control.value = value; applied++; }
  }
  toast(`${applied} empty fields filled with suggestions. Existing edits were preserved.`);
}
async function showScanSource(id) {
  clearScanDraft();
  try {
    const source = await getScanSource(id);
    if (!source) throw new Error('The original document is missing from this browser’s storage.');
    scanPreviewUrls = source.previews.map(blob => URL.createObjectURL(blob));
    const originalUrl = URL.createObjectURL(source.file);
    scanPreviewUrls.push(originalUrl);
    scanDialog.innerHTML = `<div class="scan-header"><div><span class="eyebrow">REVIEWED SOURCE DOCUMENT</span><h2>${esc(source.filename)}</h2><p>Retained locally with the reviewed estimate.</p></div><button class="icon-btn" data-action="close-scan" aria-label="Close original sheet">${icon('close')}</button></div><div class="source-view-layout">${scanPreviewPane(source.filename, source.previews.length)}<div class="source-view-notes"><h3>Original document retained</h3><p>Use the source to verify measurements, fittings, sketches, and installation notes. OCR text is an aid, not the authoritative work order.</p><a class="secondary-btn" href="${originalUrl}" download="${esc(source.filename)}">${icon('down')} Download original</a><details class="scan-raw-text"><summary>View extracted text</summary><pre>${esc(source.text)}</pre></details></div></div>`;
    if (!scanDialog.open) scanDialog.showModal();
  } catch (error) { toast(`Unable to open original sheet: ${error.message}`); }
}
scanDialog.addEventListener('close', clearScanDraft);
scanDialog.addEventListener('cancel', event => { if (scanSaving) event.preventDefault(); });
scanDialog.addEventListener('click', event => {
  const rect = scanDialog.getBoundingClientRect();
  if (!scanSaving && event.target === scanDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) scanDialog.close();
});
document.addEventListener('change', event => {
  if (event.target.id === 'scan-file') beginScan(event.target.files[0]);
  if (event.target.id === 'scan-destination') updateScanAssignment();
});
scanDialog.addEventListener('dragover', event => {
  if (scanDialog.querySelector('#scan-file:not(:disabled)')) { event.preventDefault(); scanDialog.querySelector('#scan-dropzone').classList.add('dragging'); }
});
scanDialog.addEventListener('dragleave', () => scanDialog.querySelector('#scan-dropzone')?.classList.remove('dragging'));
scanDialog.addEventListener('drop', event => {
  event.preventDefault();
  if (scanDialog.querySelector('#scan-file:not(:disabled)')) {
    scanDialog.querySelector('#scan-dropzone').classList.remove('dragging');
    if (event.dataTransfer.files.length !== 1) { scanDialog.querySelector('#scan-error').textContent = 'Choose one estimate document at a time.'; return; }
    beginScan(event.dataTransfer.files[0]);
  }
});
document.addEventListener('submit', async event => {
  if (event.target.id !== 'scan-review-form') return;
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form));
  const draft = scanDraft;
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  scanSaving = true;
  let sourceSaved = false;
  let committed = false;
  try {
    if (!draft || !values.confirmed) throw new Error('Review and confirm the extracted information first.');
    if (values.date > DEMO_TODAY) throw new Error('The estimate date cannot be later than the demo reporting date.');
    const job = createJob({ ...values, date: values.destination === 'job' ? values.scheduledDate : values.date, crewId: values.crewId || data.crews[0].id });
    if (!values.type || !values.ds || !values.color || !values.tearOff) throw new Error('Confirm the gutter style, color, downspout size, and tear-off instructions.');
    if (!Number.isInteger(job.cuts) || !Number.isInteger(Number(values.elbows))) throw new Error('Cuts and fittings must be whole numbers.');
    if (values.destination === 'job' && values.scheduledDate < values.date) throw new Error('The job cannot be scheduled before the estimate date.');
    const next = structuredClone(data);
    const estimate = {
      id: `E-${crypto.randomUUID().slice(0, 8)}`, estimatorId: values.estimatorId, date: values.date,
      customer: values.customer.trim(), value: Number(values.value), status: values.destination === 'job' ? 'Won' : 'Pending',
      jobId: values.destination === 'job' ? job.id : null, sourceId: draft.id,
      address: values.address.trim(), city: values.city.trim(), phone: values.phone.trim(), email: values.email.trim(),
      requirements: { gutterFt: job.gutterFt, downspoutFt: job.downspoutFt, type: job.type, color: job.color, cuts: job.cuts, roofPitch: job.roofPitch, tearOff: job.tearOff, notes: job.notes, materials: structuredClone(job.materials) },
    };
    next.estimates.push(estimate);
    if (values.destination === 'job') {
      Object.assign(job, { sourceId: draft.id, phone: estimate.phone, email: estimate.email });
      next.jobs.push(job);
    }
    next.scans.push({ id: draft.id, filename: draft.file.name, customer: estimate.customer, value: estimate.value, estimatorId: estimate.estimatorId, estimateId: estimate.id, documentDate: values.date, importedAt: new Date().toISOString(), pages: draft.pages });
    await saveScanSource({ id: draft.id, file: draft.file, filename: draft.file.name, previews: draft.previews, text: scanDialog.querySelector('#scan-raw-text').value });
    sourceSaved = true;
    persist(next);
    committed = true;
    scanDialog.close(); state.page = 'scans'; state.search = ''; location.hash = 'scans'; render();
    if (values.destination === 'job') showJob(job.id);
    toast(`Reviewed ${values.destination === 'job' ? 'job and accepted estimate' : 'estimate'} saved with its original sheet.`);
  } catch (error) {
    let cleanupMessage = '';
    if (sourceSaved && !committed) {
      try { await deleteScanSource(draft.id); }
      catch (cleanupError) { cleanupMessage = ` The unused source could not be removed: ${cleanupError.message}`; }
    }
    form.querySelector('#scan-save-error').textContent = `Unable to save: ${error.message}${cleanupMessage}`;
  } finally { submit.disabled = false; scanSaving = false; }
});
document.addEventListener('submit', async event => {
  if (event.target.id !== 'entry-form') return;
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form));
  const kind = form.dataset.kind; const id = form.dataset.id;
  const next = structuredClone(data);
  let jobToOpen; let message = 'Record saved in this browser.';
  try {
    if (kind === 'reset') {
      const fresh = createDemoData();
      fresh.scans = [];
      await clearScanSources();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      data = fresh; storageError = '';
      formDialog.close(); detail.close(); state.search = ''; render(); toast('Demo restored to its original sample data.'); return;
    }
    if (kind === 'job') {
      const job = createJob(values); next.jobs.push(job); jobToOpen = job.id;
      message = `Job ${job.id} created and assigned to truck ${job.crewId}.`;
    }
    if (kind === 'movement') {
      const quantity = Number(values.quantity);
      const material = next.materials.find(item => item.id === values.materialId);
      if (!material || !['Load', 'Return', 'Receipt', 'Waste', 'Count'].includes(values.kind)) throw new Error('Select a valid material and movement type.');
      if (!Number.isFinite(quantity) || quantity < 0 || values.kind !== 'Count' && quantity === 0) throw new Error('Quantity must be positive (physical counts may be zero).');
      if (material.unit === 'ea' && !Number.isInteger(quantity)) throw new Error('Individual pieces must be a whole number.');
      if (!values.note.trim()) throw new Error('A reference or reason is required.');
      if (values.date > DEMO_TODAY) throw new Error('Movements cannot be future-dated relative to the demo date, October 2, 2026.');
      if (values.kind !== 'Receipt' && !next.crews.some(crew => crew.id === values.crewId)) throw new Error('Select a valid truck.');
      if (values.kind === 'Load' && quantity > warehouseStock(next, material.id)) throw new Error('Not enough warehouse stock. Record a supplier receipt first.');
      if (['Return', 'Waste'].includes(values.kind) && quantity > truckBalance(next, values.crewId, material.id).expected) throw new Error('Quantity exceeds the truck’s recorded balance. Verify loads and job usage first.');
      if (values.kind === 'Count') {
        const latestJob = next.jobs.filter(job => job.crewId === values.crewId && job.status === 'Completed').map(job => job.completedDate).sort().at(-1);
        const latestMovement = next.movements.filter(item => item.crewId === values.crewId && item.materialId === material.id).map(item => item.date).sort().at(-1);
        if (values.date < (latestJob || '') || values.date < (latestMovement || '')) throw new Error('Physical counts must be dated on or after the latest job completion and movement for this truck.');
      }
      next.movements.push({ id: crypto.randomUUID(), kind: values.kind, materialId: material.id, crewId: values.kind === 'Receipt' ? null : values.crewId, quantity, date: values.date, note: values.note.trim() });
      message = `${values.kind} recorded: ${number(quantity)} ${material.unit} ${material.name}.`;
    }
    if (kind === 'feedback') {
      const job = next.jobs.find(job => job.id === values.jobId && job.status === 'Completed');
      if (!job) throw new Error('Feedback requires a completed job.');
      if (values.date < job.completedDate || values.date > DEMO_TODAY) throw new Error('Feedback date must be between the job’s completion and the demo date, October 2, 2026.');
      if (!values.note.trim()) throw new Error('Feedback details are required.');
      next.feedback.push({ id: crypto.randomUUID(), jobId: job.id, kind: values.kind, date: values.date, note: values.note.trim(), status: values.kind === 'Review' ? 'Resolved' : values.status, ...(values.kind === 'Review' ? { rating: Number(values.rating) } : {}) });
      jobToOpen = job.id; message = 'Feedback recorded. Crew quality and service history have been updated.';
    }
    if (kind === 'estimate') {
      const value = Number(values.value);
      if (!Number.isFinite(value) || value <= 0 || !values.customer.trim()) throw new Error('A customer and positive estimate value are required.');
      if (values.date > DEMO_TODAY) throw new Error('Estimate issue date cannot be later than the demo date.');
      next.estimates.push({ id: `E-${crypto.randomUUID().slice(0, 8)}`, estimatorId: values.estimatorId, date: values.date, customer: values.customer.trim(), value, status: 'Pending', jobId: null });
      message = 'Pending estimate added to the pipeline.';
    }
    if (kind === 'decision') {
      const estimate = next.estimates.find(item => item.id === id);
      if (estimate.status !== 'Pending') throw new Error('This estimate has already been decided.');
      estimate.status = values.decision;
      if (values.decision === 'Won') {
        const job = createJob({ ...values, customer: estimate.customer, value: estimate.value, estimatorId: estimate.estimatorId });
        if (estimate.requirements) {
          const requirements = estimate.requirements;
          Object.assign(job, { gutterFt: requirements.gutterFt, downspoutFt: requirements.downspoutFt, type: requirements.type, color: requirements.color, cuts: requirements.cuts, roofPitch: requirements.roofPitch, tearOff: requirements.tearOff, notes: requirements.notes, materials: structuredClone(requirements.materials) });
        }
        if (estimate.sourceId) job.sourceId = estimate.sourceId;
        if (job.date < estimate.date) throw new Error('The scheduled job date cannot precede the estimate.');
        next.jobs.push(job); estimate.jobId = job.id; jobToOpen = job.id;
        message = `Estimate accepted. Work order ${job.id} created.`;
      } else message = 'Estimate marked lost. Conversion statistics updated.';
    }
    if (kind === 'completion') {
      const job = next.jobs.find(item => item.id === id);
      if (job.status === 'Completed') throw new Error('This job is already completed.');
      if (values.completedDate < job.date || values.completedDate > DEMO_TODAY) throw new Error('Completion must be between the scheduled date and the demo date, October 2, 2026.');
      job.materials.forEach(item => {
        const used = Number(values[`used-${item.materialId}`]);
        const m = next.materials.find(material => material.id === item.materialId);
        if (!Number.isFinite(used) || used < 0 || m.unit === 'ea' && !Number.isInteger(used)) throw new Error(`Enter valid usage for ${m.name}. Piece counts must be whole numbers.`);
        if (used > truckBalance(data, job.crewId, m.id).expected) throw new Error(`Not enough ${m.name} on truck ${job.crewId}. Record an additional load first.`);
        item.used = used;
      });
      job.completedDate = values.completedDate; job.status = 'Completed';
      // A count taken before this newly reported usage is no longer current.
      next.movements.forEach(item => {
        if (item.kind === 'Count' && item.crewId === job.crewId && job.materials.some(m => m.materialId === item.materialId)) item.stale = true;
      });
      jobToOpen = job.id; message = 'Job completed. Actual usage recorded; take a new physical truck count.';
    }
    if (kind === 'requirements') {
      const job = next.jobs.find(item => item.id === id);
      if (job.status === 'Completed') throw new Error('Requirements cannot be changed after job completion.');
      const gutterFt = Number(values.gutterFt), downspoutFt = Number(values.downspoutFt);
      const cuts = Number(values.cuts), elbows = Number(values.elbows);
      if (![gutterFt, downspoutFt, cuts, elbows].every(value => Number.isFinite(value) && value >= 0) || !Number.isInteger(cuts) || !Number.isInteger(elbows)) throw new Error('Quantities must be nonnegative; cuts and elbows must be whole numbers.');
      job.gutterFt = gutterFt; job.downspoutFt = downspoutFt; job.cuts = cuts;
      job.roofPitch = values.roofPitch.trim(); job.tearOff = values.tearOff === 'yes'; job.notes = values.notes.trim();
      job.materials.forEach(item => {
        if (item.materialId.startsWith('coil')) item.required = gutterFt;
        if (item.materialId.startsWith('ds')) item.required = downspoutFt;
        if (item.materialId === 'hanger') item.required = Math.ceil(gutterFt / 2);
        if (item.materialId === 'elbow') item.required = elbows;
      });
      jobToOpen = job.id; message = 'Work-order requirements updated.';
    }
    if (kind === 'threshold') {
      const material = next.materials.find(item => item.id === id);
      const reorder = Number(values.reorder);
      if (!Number.isFinite(reorder) || reorder < 0 || material.unit === 'ea' && !Number.isInteger(reorder)) throw new Error('Enter a nonnegative reorder point in the material’s unit.');
      material.reorder = reorder; message = 'Reorder point updated.';
    }
    persist(next); formDialog.close(); render();
    if (jobToOpen) showJob(jobToOpen); else if (detail.open) detail.close();
    toast(message);
  } catch (error) {
    document.querySelector('#form-error').textContent = `Unable to save: ${error.message}`;
  }
});
if (pageNames[location.hash.slice(1)]) state.page = location.hash.slice(1);
render();

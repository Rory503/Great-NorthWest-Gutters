export const DEMO_TODAY = '2026-10-02';
export const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
export const number = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
export const percent = value => value === null ? '—' : `${Math.round(value)}%`;
export const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export function inPeriod(date, period) {
  if (period === 'all') return true;
  if (period === 'september') return date >= '2026-09-01' && date <= '2026-09-30';
  const end = new Date(`${DEMO_TODAY}T12:00:00`);
  const start = new Date(end);
  start.setDate(start.getDate() - (period === 'week' ? 6 : 29));
  return date >= start.toISOString().slice(0, 10) && date <= DEMO_TODAY;
}
export function completedJobs(data, period = 'all', crewId) {
  return data.jobs.filter(job => job.status === 'Completed' && inPeriod(job.completedDate, period) && (!crewId || job.crewId === crewId));
}
export function crewStats(data, crewId, period = 'all') {
  const jobs = completedJobs(data, period, crewId);
  const jobIds = new Set(jobs.map(job => job.id));
  const callbacks = data.feedback.filter(item => item.kind === 'Repair' && jobIds.has(item.jobId));
  const affected = new Set(callbacks.map(item => item.jobId));
  const reviews = data.feedback.filter(item => item.kind === 'Review' && jobIds.has(item.jobId));
  return {
    jobs: jobs.length,
    revenue: jobs.reduce((sum, job) => sum + job.value, 0),
    footage: jobs.reduce((sum, job) => sum + job.gutterFt + job.downspoutFt, 0),
    callbacks: callbacks.length,
    callbackJobs: affected.size,
    quality: jobs.length ? (jobs.length - affected.size) / jobs.length * 100 : null,
    complaints: data.feedback.filter(item => item.kind === 'Complaint' && jobIds.has(item.jobId)).length,
    reviews: reviews.length,
    rating: reviews.length ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : null,
  };
}
export function estimatorStats(data, estimatorId, period = 'all') {
  const estimates = data.estimates.filter(item => item.estimatorId === estimatorId && inPeriod(item.date, period));
  const won = estimates.filter(item => item.status === 'Won');
  const lost = estimates.filter(item => item.status === 'Lost');
  return {
    total: estimates.length, won: won.length, lost: lost.length,
    pending: estimates.length - won.length - lost.length,
    winRate: won.length + lost.length ? won.length / (won.length + lost.length) * 100 : null,
    booked: won.reduce((sum, item) => sum + item.value, 0),
    pipeline: estimates.filter(item => item.status === 'Pending').reduce((sum, item) => sum + item.value, 0),
  };
}
export function warehouseStock(data, materialId) {
  const material = data.materials.find(item => item.id === materialId);
  return material.opening + data.movements.filter(item => item.materialId === materialId).reduce((sum, item) => {
    if (item.kind === 'Receipt' || item.kind === 'Return') return sum + item.quantity;
    if (item.kind === 'Load') return sum - item.quantity;
    return sum;
  }, 0);
}
export function truckBalance(data, crewId, materialId) {
  const entries = data.movements.filter(item => item.crewId === crewId && item.materialId === materialId);
  const total = kind => entries.filter(item => item.kind === kind).reduce((sum, item) => sum + item.quantity, 0);
  const jobs = data.jobs.filter(item => item.crewId === crewId && item.status === 'Completed');
  const required = jobs.reduce((sum, job) => sum + (job.materials.find(item => item.materialId === materialId)?.required || 0), 0);
  const used = jobs.reduce((sum, job) => sum + (job.materials.find(item => item.materialId === materialId)?.used || 0), 0);
  const expected = total('Load') - total('Return') - total('Waste') - used;
  const counts = entries.filter(item => item.kind === 'Count');
  const counted = counts.length ? counts[counts.length - 1].quantity : null;
  const lastCount = counts.length ? entries.lastIndexOf(counts[counts.length - 1]) : -1;
  const hasChangesAfterCount = Boolean(counts.at(-1)?.stale) || entries.slice(lastCount + 1).some(item => item.kind !== 'Count') ||
    (counts.length > 0 && jobs.some(job => job.completedDate > counts[counts.length - 1].date));
  return {
    loaded: total('Load'), returned: total('Return'), waste: total('Waste'), required, used, expected,
    counted, variance: counted === null || hasChangesAfterCount ? null : expected - counted,
    needsCount: counted === null || hasChangesAfterCount,
  };
}
export function materialAlerts(data) {
  const alerts = [];
  for (const material of data.materials) {
    const stock = warehouseStock(data, material.id);
    if (stock <= material.reorder) alerts.push({ kind: 'stock', material, stock });
    for (const crew of data.crews) {
      const balance = truckBalance(data, crew.id, material.id);
      if (balance.variance !== null && Math.abs(balance.variance) > material.tolerance) alerts.push({ kind: 'variance', material, crew, balance });
    }
  }
  return alerts;
}
export function validateJob(job, data) {
  if (!job.customer.trim() || !job.address.trim()) return 'Customer and address are required.';
  if (!data.crews.some(item => item.id === job.crewId) || !data.estimators.some(item => item.id === job.estimatorId)) return 'Select a valid crew and estimator.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(job.date) || Number.isNaN(Date.parse(job.date))) return 'A valid scheduled date is required.';
  if (!Number.isFinite(job.value) || job.value <= 0) return 'Job value must be greater than zero.';
  if (![job.gutterFt, job.downspoutFt].every(value => Number.isFinite(value) && value >= 0)) return 'Footage must be zero or greater.';
  return null;
}

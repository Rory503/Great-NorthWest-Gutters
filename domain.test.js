import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoData } from './seed.js';
import { crewStats, estimatorStats, warehouseStock, truckBalance, materialAlerts, inPeriod, validateJob } from './domain.js';

test('quality counts affected jobs once, retains resolved callbacks, and excludes unfinished jobs', () => {
  const data = createDemoData();
  const initial = crewStats(data, '2400', 'all');
  assert.equal(initial.jobs, 14);
  assert.equal(initial.callbackJobs, 1);
  assert.equal(initial.quality, 13 / 14 * 100);
  const callback = data.feedback.find(item => item.kind === 'Repair' && data.jobs.find(job => job.id === item.jobId).crewId === '2400');
  data.feedback.push({ ...callback, id: 'second-visit', status: 'Resolved' });
  const updated = crewStats(data, '2400', 'all');
  assert.equal(updated.quality, initial.quality);
  assert.equal(updated.callbacks, 2);
  assert.equal(updated.revenue, data.jobs.filter(job => job.crewId === '2400' && job.status === 'Completed').reduce((sum, job) => sum + job.value, 0));
});

test('empty cohorts have no invented quality, rating, or conversion percentage', () => {
  const data = createDemoData();
  assert.equal(crewStats(data, 'missing').quality, null);
  assert.equal(crewStats(data, 'missing').rating, null);
  assert.equal(estimatorStats(data, 'missing').winRate, null);
});

test('estimator conversion excludes pending estimates and booked value includes won only', () => {
  const data = createDemoData();
  const stats = estimatorStats(data, 'est-1', 'all');
  assert.ok(stats.pending > 0);
  assert.equal(stats.winRate, stats.won / (stats.won + stats.lost) * 100);
  assert.equal(stats.total, stats.won + stats.lost + stats.pending);
  assert.equal(stats.booked, data.estimates.filter(item => item.estimatorId === 'est-1' && item.status === 'Won').reduce((sum, item) => sum + item.value, 0));
});

test('warehouse receipts, loads and returns reconcile without mixing units or counting waste twice', () => {
  const data = createDemoData();
  assert.equal(warehouseStock(data, 'coil-5'), 4200);
  data.movements.push({ kind: 'Receipt', materialId: 'coil-5', quantity: 100 });
  assert.equal(warehouseStock(data, 'coil-5'), 4300);
  data.movements.push({ kind: 'Load', materialId: 'coil-5', crewId: '2400', quantity: 50 });
  assert.equal(warehouseStock(data, 'coil-5'), 4250);
  data.movements.push({ kind: 'Return', materialId: 'coil-5', crewId: '2400', quantity: 20 });
  assert.equal(warehouseStock(data, 'coil-5'), 4270);
  data.movements.push({ kind: 'Waste', materialId: 'coil-5', crewId: '2400', quantity: 10 });
  assert.equal(warehouseStock(data, 'coil-5'), 4270);
});

test('truck loaded, required, actual, waste, return and physical count are distinct', () => {
  const data = createDemoData();
  const result = truckBalance(data, '2700', 'coil-5');
  assert.equal(result.expected, 300);
  assert.equal(result.counted, 214);
  assert.equal(result.variance, 86);
  assert.ok(result.used > result.required);
  assert.equal(result.expected, result.loaded - result.returned - result.waste - result.used);
  const alerts = materialAlerts(data);
  assert.equal(alerts.filter(item => item.kind === 'stock').length, 2);
  assert.equal(alerts.filter(item => item.kind === 'variance').length, 2);
  assert.ok(data.materials.every(material => warehouseStock(data, material.id) >= 0));
});

test('new movement invalidates a physical count until another count is recorded', () => {
  const data = createDemoData();
  data.movements.push({ kind: 'Load', crewId: '2400', materialId: 'coil-5', quantity: 20, date: '2026-10-02' });
  assert.equal(truckBalance(data, '2400', 'coil-5').variance, null);
  assert.equal(truckBalance(data, '2400', 'coil-5').needsCount, true);
  data.movements.push({ kind: 'Count', crewId: '2400', materialId: 'coil-5', quantity: 320, date: '2026-10-02' });
  assert.equal(truckBalance(data, '2400', 'coil-5').variance, 0);
});

test('counts invalidated by newly reported job usage remain in history', () => {
  const data = createDemoData();
  const count = data.movements.find(item => item.kind === 'Count' && item.crewId === '2400' && item.materialId === 'coil-5');
  count.stale = true;
  assert.equal(truckBalance(data, '2400', 'coil-5').variance, null);
  assert.equal(truckBalance(data, '2400', 'coil-5').counted, 300);
  assert.ok(data.movements.includes(count));
});

test('date periods are inclusive and bounded to the demo reporting date', () => {
  assert.ok(inPeriod('2026-09-03', 'month'));
  assert.ok(!inPeriod('2026-09-02', 'month'));
  assert.ok(inPeriod('2026-10-02', 'month'));
  assert.ok(!inPeriod('2026-10-03', 'month'));
  assert.ok(inPeriod('2026-09-26', 'week'));
  assert.ok(!inPeriod('2026-09-25', 'week'));
  assert.ok(inPeriod('2026-09-01', 'september'));
  assert.ok(!inPeriod('2026-10-01', 'september'));
});

test('job validation rejects invalid monetary, footage and crew inputs', () => {
  const data = createDemoData();
  const job = { ...data.jobs[0] };
  assert.equal(validateJob(job, data), null);
  assert.match(validateJob({ ...job, value: -1 }, data), /greater than zero/);
  assert.match(validateJob({ ...job, gutterFt: NaN }, data), /Footage/);
  assert.match(validateJob({ ...job, crewId: 'missing' }, data), /valid crew/);
  assert.match(validateJob({ ...job, customer: '  ' }, data), /required/);
});

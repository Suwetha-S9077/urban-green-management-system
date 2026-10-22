#!/usr/bin/env node
/**
 * End-to-end API checks against the RUNNING backend and the REAL imported data.
 * No expected numbers are hardcoded: every check compares endpoints against each other
 * (e.g. species counts must add up to the dashboard total) or against values read from the API.
 *
 * Usage (backend must be running):
 *   node scripts/check-api.mjs
 *   node scripts/check-api.mjs --base=http://localhost:5000/api/v1 --expect-total=702109
 */
const opts = { base: 'http://localhost:5000/api/v1', expectTotal: null };
for (const a of process.argv.slice(2)) {
  if (a.startsWith('--base=')) opts.base = a.slice('--base='.length).replace(/\/$/, '');
  else if (a.startsWith('--expect-total=')) opts.expectTotal = Number(a.split('=')[1]);
}

let passed = 0;
let failed = 0;

async function get(path) {
  const res = await fetch(opts.base + path);
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, body };
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name}\n      -> ${err.message}`);
  }
}

const sum = (rows) => rows.reduce((a, r) => a + r.count, 0);
const inBox = (t, b) =>
  t.location.coordinates[0] >= b.minLon && t.location.coordinates[0] <= b.maxLon &&
  t.location.coordinates[1] >= b.minLat && t.location.coordinates[1] <= b.maxLat;

async function main() {
  const shared = {};

  await check('health: API up and database connected', async () => {
    const { status, body } = await get('/health');
    assert(status === 200, `status ${status}`);
    assert(body.data.database === 'connected', `database is ${body.data.database}`);
  });

  await check('GET /trees: paginated, real data present', async () => {
    const { status, body } = await get('/trees');
    assert(status === 200 && body.success === true, `status ${status}`);
    assert(body.meta.total > 0, 'collection is empty: run the import first');
    assert(body.data.length === Math.min(50, body.meta.total), 'default page size is not 50');
    assert(body.meta.totalPages === Math.ceil(body.meta.total / 50), 'totalPages is wrong');
    const t = body.data[0];
    assert(t.location.type === 'Point' && t.location.coordinates.length === 2, 'location is not a GeoJSON Point');
    shared.total = body.meta.total;
    shared.first = t;
    if (opts.expectTotal !== null) {
      assert(shared.total === opts.expectTotal, `total ${shared.total} != expected ${opts.expectTotal}`);
    }
  });

  await check('GET /trees: page 2 differs from page 1 and is ordered by objectId', async () => {
    const p1 = (await get('/trees?limit=5&page=1')).body.data;
    const p2 = (await get('/trees?limit=5&page=2')).body.data;
    assert(p2.length > 0 && p1[p1.length - 1].objectId < p2[0].objectId, 'pages overlap or are unordered');
  });

  await check('GET /trees/:id: round trip + 404 + 400', async () => {
    const { status, body } = await get(`/trees/${shared.first.id}`);
    assert(status === 200 && body.data.objectId === shared.first.objectId, 'record mismatch');
    const missing = await get('/trees/000000000000000000000000');
    assert(missing.status === 404 && missing.body.error.code === 'TREE_NOT_FOUND', `missing -> ${missing.status}`);
    const bad = await get('/trees/not-an-id');
    assert(bad.status === 400 && bad.body.error.code === 'VALIDATION_ERROR', `bad id -> ${bad.status}`);
  });

  await check('GET /analytics/species: counts add up to total, sorted, percentages ~100', async () => {
    const { status, body } = await get('/analytics/species');
    assert(status === 200, `status ${status}`);
    assert(sum(body.data) === shared.total, `sum ${sum(body.data)} != total ${shared.total}`);
    assert(body.data.every((r, i) => i === 0 || body.data[i - 1].count >= r.count), 'not sorted by count');
    const pct = body.data.reduce((a, r) => a + r.percentage, 0);
    assert(Math.abs(pct - 100) < 1, `percentages sum to ${pct}`);
    shared.species = body.data;
    const limited = await get('/analytics/species?limit=3');
    assert(limited.body.data.length === 3, 'limit ignored');
  });

  await check('GET /analytics/wards: counts add up to total; ward sort works', async () => {
    const { body } = await get('/analytics/wards');
    assert(sum(body.data) === shared.total, `sum ${sum(body.data)} != total ${shared.total}`);
    shared.wards = body.data;
    const byWard = await get('/analytics/wards?sort=ward');
    assert(byWard.status === 200 && byWard.body.data.length === body.data.length, 'sort=ward failed');
  });

  await check('GET /analytics/status: 1 / 0 / null add up to total', async () => {
    const { body } = await get('/analytics/status');
    assert(body.data.map((e) => e.status).slice(0, 3).join() === '1,0,', 'expected entries for 1, 0, null in order');
    assert(sum(body.data) === shared.total, `sum ${sum(body.data)} != total ${shared.total}`);
    shared.status = body.data;
  });

  await check('GET /analytics/condition: clear "not in source dataset" response', async () => {
    const { status, body } = await get('/analytics/condition');
    assert(status === 404 && body.error.code === 'FIELD_NOT_IN_SOURCE_DATASET', `got ${status} ${body?.error?.code}`);
  });

  await check('GET /dashboard: consistent with the other endpoints', async () => {
    const { status, body } = await get('/dashboard');
    assert(status === 200, `status ${status}`);
    const d = body.data;
    assert(d.totals.trees === shared.total, 'trees total mismatch');
    assert(d.totals.speciesCategories === shared.species.length, 'species count mismatch');
    assert(d.totals.wards === shared.wards.length, 'ward count mismatch');
    const s = d.status;
    assert(s.count1 + s.count0 + s.countNull + s.countOther === shared.total, 'status counts do not add up');
    assert(s.countNull === shared.status[2].count, 'null status mismatch');
    assert(d.spatial.repeatedCoordinateRecords === d.spatial.totalRecords - d.spatial.distinctLocations, 'spatial math wrong');
    assert(d.topSpecies.length === Math.min(10, shared.species.length), 'topSpecies length');
    console.log(`      dashboard: ${JSON.stringify({ totals: d.totals, status: d.status, spatial: d.spatial })}`);
  });

  await check('filters: wardNumber / treeName / status totals match analytics', async () => {
    const ward = shared.wards[0];
    const w = await get(`/trees?wardNumber=${encodeURIComponent(ward.wardNumber)}&limit=5`);
    assert(w.body.meta.total === ward.count, `ward filter ${w.body.meta.total} != ${ward.count}`);
    assert(w.body.data.every((t) => t.wardNumber === ward.wardNumber), 'ward filter returned other wards');
    const sp = shared.species[0];
    const n = await get(`/trees?treeName=${encodeURIComponent(sp.treeName)}&limit=5`);
    assert(n.body.meta.total === sp.count, `treeName filter ${n.body.meta.total} != ${sp.count}`);
    for (const [param, idx] of [['1', 0], ['0', 1], ['null', 2]]) {
      const r = await get(`/trees?status=${param}&limit=1`);
      assert(r.body.meta.total === shared.status[idx].count, `status=${param}: ${r.body.meta.total} != ${shared.status[idx].count}`);
    }
  });

  await check('bbox filter: results lie inside the box', async () => {
    const [lon, lat] = shared.first.location.coordinates;
    const box = { minLon: lon - 0.002, minLat: lat - 0.002, maxLon: lon + 0.002, maxLat: lat + 0.002 };
    const q = `${box.minLon},${box.minLat},${box.maxLon},${box.maxLat}`;
    const { status, body } = await get(`/trees?bbox=${q}&limit=200`);
    assert(status === 200 && body.meta.total >= 1, 'box around a known tree is empty');
    assert(body.data.every((t) => inBox(t, box)), 'a result is outside the box');
    assert(body.data.some((t) => t.id === shared.first.id) || body.meta.total > 200, 'known tree missing from its own box');
    const bad = await get('/trees?bbox=1,2,3');
    assert(bad.status === 400, `malformed bbox -> ${bad.status}`);
  });

  await check('GET /trees/search: q, identifiers, combined filters, validation', async () => {
    const sp = shared.species.find((s) => typeof s.treeName === 'string' && s.treeName.length >= 3);
    const q = sp.treeName.slice(0, 3);
    const r = await get(`/trees/search?q=${encodeURIComponent(q)}&limit=20`);
    assert(r.status === 200 && r.body.meta.total >= sp.count, 'q search total too small');
    assert(r.body.data.every((t) => t.treeName.toLowerCase().includes(q.toLowerCase())), 'result does not match q');
    const none = await get('/trees/search?q=zzzzzz-no-such-tree');
    assert(none.status === 200 && none.body.meta.total === 0, 'nonsense query should return 0 results');
    const byId = await get(`/trees/search?objectId=${shared.first.objectId}`);
    assert(byId.body.meta.total === 1 && byId.body.data[0].id === shared.first.id, 'objectId search failed');
    if (shared.first.kgisTreeId) {
      const byKgis = await get(`/trees/search?kgisTreeId=${encodeURIComponent(shared.first.kgisTreeId)}`);
      assert(byKgis.body.data.some((t) => t.id === shared.first.id), 'kgisTreeId search missed the tree');
    }
    const combined = await get(`/trees/search?q=${encodeURIComponent(q)}&status=1&limit=5`);
    assert(combined.body.data.every((t) => t.status === 1), 'combined filter ignored status');
    const empty = await get('/trees/search');
    assert(empty.status === 400, `search without criteria -> ${empty.status}`);
  });

  await check('validation: bad page/limit/unknown parameter -> 400; unknown route -> 404', async () => {
    assert((await get('/trees?page=0')).status === 400, 'page=0 accepted');
    assert((await get('/trees?limit=201')).status === 400, 'limit=201 accepted');
    assert((await get('/trees?status=2')).status === 400, 'status=2 accepted');
    assert((await get('/trees?ward=1')).status === 400, 'unknown parameter accepted');
    const nf = await get('/nope');
    assert(nf.status === 404 && nf.body.error.code === 'NOT_FOUND', `unknown route -> ${nf.status}`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Could not run checks (is the backend running?):', err.message);
  process.exit(1);
});

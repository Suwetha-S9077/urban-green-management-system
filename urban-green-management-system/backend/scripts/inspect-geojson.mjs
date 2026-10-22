#!/usr/bin/env node
/**
 * Read-only inspector for large GeoJSON files. Dependency-free and streaming,
 * so it works on files too big for JSON.parse. It NEVER modifies the input.
 *
 * Usage (from backend/):
 *   node scripts/inspect-geojson.mjs                      full report (default file)
 *   node scripts/inspect-geojson.mjs <path>               full report for another file
 *   node scripts/inspect-geojson.mjs --sample=50          write first 50 features to data/sample/
 *   node scripts/inspect-geojson.mjs --no-duplicates      skip the second (duplicate-check) pass
 *
 * Output: console report + data/reports/inspection-report.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../data');
const DEFAULT_FILE = path.join(dataDir, 'raw', 'bbmp_tree_census_july_2026.geojson');

const DISTINCT_CAP = 300; // above this a field is treated as high-cardinality
const PLACEHOLDER = /^(na|n\/a|nan|null|none|nil|unknown|undefined|-+|\?+|\.+)$/i;
// Diagnostic heuristic only (Greater Bengaluru). Used to FLAG points, never to decide anything.
const BBOX = { minLat: 12.6, maxLat: 13.4, minLon: 77.2, maxLon: 78.0 };

const opts = { file: DEFAULT_FILE, sample: 0, chunkSize: 1 << 20, duplicates: true };
for (const a of process.argv.slice(2)) {
  if (a.startsWith('--sample=')) opts.sample = Number(a.split('=')[1]);
  else if (a.startsWith('--chunk-size=')) opts.chunkSize = Number(a.split('=')[1]);
  else if (a === '--no-duplicates') opts.duplicates = false;
  else if (!a.startsWith('--')) opts.file = path.resolve(a);
}

const fmt = (n) => Number(n).toLocaleString('en-US');

/** Streams each element of the top-level "features" array, one parsed object at a time. */
async function* streamFeatures(file, chunkSize) {
  const stream = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: chunkSize });
  let depth = 0;
  let inStr = false;
  let esc = false;
  let strBuf = '';
  let lastTopString = '';
  let inFeatures = false;
  let capturing = false;
  let parts = [];
  let segStart = 0;

  for await (const chunk of stream) {
    segStart = 0;
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk.charCodeAt(i);
      if (inStr) {
        if (esc) {
          esc = false;
          if (depth === 1) strBuf += chunk[i];
        } else if (c === 92) {
          esc = true;
        } else if (c === 34) {
          inStr = false;
          if (depth === 1) lastTopString = strBuf;
        } else if (depth === 1) {
          strBuf += chunk[i];
        }
        continue;
      }
      if (c === 34) {
        inStr = true;
        strBuf = '';
      } else if (c === 123) {
        if (inFeatures && depth === 2 && !capturing) {
          capturing = true;
          segStart = i;
          parts = [];
        }
        depth++;
      } else if (c === 91) {
        if (depth === 1) inFeatures = lastTopString === 'features';
        depth++;
      } else if (c === 125) {
        depth--;
        if (capturing && depth === 2) {
          parts.push(chunk.slice(segStart, i + 1));
          capturing = false;
          const text = parts.join('');
          parts = [];
          yield JSON.parse(text);
        }
      } else if (c === 93) {
        depth--;
        if (inFeatures && depth === 1) inFeatures = false;
      }
    }
    if (capturing) parts.push(chunk.slice(segStart));
  }
}

/** Fast 53-bit string hash (cyrb53) so duplicate detection needs only numbers in memory. */
function hash53(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function newPropStat() {
  return {
    present: 0,
    nullCount: 0,
    empty: 0,
    placeholder: 0,
    types: {},
    distinct: new Map(),
    overflow: false,
    numCount: 0,
    min: Infinity,
    max: -Infinity,
    sum: 0,
    numericLikeStrings: 0,
    maxLen: 0,
    examples: [],
  };
}

function recordProp(map, key, value) {
  let s = map.get(key);
  if (!s) {
    s = newPropStat();
    map.set(key, s);
  }
  s.present++;
  const t = typeOf(value);
  s.types[t] = (s.types[t] || 0) + 1;
  if (value === null) {
    s.nullCount++;
    return;
  }
  if (t === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') s.empty++;
    else if (PLACEHOLDER.test(trimmed)) s.placeholder++;
    if (trimmed !== '' && Number.isFinite(Number(trimmed))) s.numericLikeStrings++;
    if (value.length > s.maxLen) s.maxLen = value.length;
  }
  if (t === 'number' && Number.isFinite(value)) {
    s.numCount++;
    s.sum += value;
    if (value < s.min) s.min = value;
    if (value > s.max) s.max = value;
  }
  if (s.examples.length < 5 && (t === 'string' || t === 'number' || t === 'boolean')) {
    const ex = String(value);
    if (!s.examples.includes(ex)) s.examples.push(ex);
  }
  if (t === 'string' || t === 'number' || t === 'boolean') {
    if (!s.overflow) {
      const k = String(value);
      s.distinct.set(k, (s.distinct.get(k) || 0) + 1);
      if (s.distinct.size > DISTINCT_CAP) {
        s.overflow = true;
        s.distinct = new Map();
      }
    }
  }
}

const norm = (v) => v.trim().replace(/\s+/g, ' ').toLowerCase();

function summarizeProp(key, s, total) {
  const out = {
    field: key,
    present: s.present,
    absent: total - s.present,
    null: s.nullCount,
    emptyString: s.empty,
    placeholderLike: s.placeholder,
    types: s.types,
  };
  if (s.numCount > 0) {
    out.numeric = { count: s.numCount, min: s.min, max: s.max, mean: s.sum / s.numCount };
  }
  if (s.numericLikeStrings > 0) out.numericLikeStrings = s.numericLikeStrings;
  if (s.maxLen > 0) out.maxStringLength = s.maxLen;
  if (!s.overflow) {
    const entries = [...s.distinct.entries()].sort((a, b) => b[1] - a[1]);
    out.distinctCount = entries.length;
    out.values = entries;
    const groups = new Map();
    for (const [raw] of entries) {
      const n = norm(raw);
      groups.set(n, [...(groups.get(n) || []), raw]);
    }
    const variants = [...groups.values()].filter((g) => g.length > 1);
    if (variants.length) out.spellingVariants = variants;
  } else {
    out.distinctCountAtLeast = DISTINCT_CAP + 1;
    out.highCardinality = true;
    out.examples = s.examples;
  }
  return out;
}

function analyzeGeometry(g, geo) {
  if (g === null || g === undefined) {
    geo.missing++;
    geo.types.MISSING = (geo.types.MISSING || 0) + 1;
    return;
  }
  const t = g.type ?? 'NO_TYPE';
  geo.types[t] = (geo.types[t] || 0) + 1;
  if (t !== 'Point') return;
  const c = g.coordinates;
  if (!Array.isArray(c) || c.length < 2) {
    geo.badShape++;
    return;
  }
  geo.dims[c.length] = (geo.dims[c.length] || 0) + 1;
  const [lon, lat] = c;
  if (typeof lon !== 'number' || typeof lat !== 'number' || !Number.isFinite(lon) || !Number.isFinite(lat)) {
    geo.nonNumeric++;
    return;
  }
  if (Math.abs(lon) > 180 || Math.abs(lat) > 90) {
    geo.outOfRange++;
    return;
  }
  if (lon === 0 && lat === 0) {
    geo.nullIsland++;
    return;
  }
  geo.validPoints++;
  geo.minLon = Math.min(geo.minLon, lon);
  geo.maxLon = Math.max(geo.maxLon, lon);
  geo.minLat = Math.min(geo.minLat, lat);
  geo.maxLat = Math.max(geo.maxLat, lat);
  const inside = lat >= BBOX.minLat && lat <= BBOX.maxLat && lon >= BBOX.minLon && lon <= BBOX.maxLon;
  if (!inside) {
    const swapped =
      lon >= BBOX.minLat && lon <= BBOX.maxLat && lat >= BBOX.minLon && lat <= BBOX.maxLon;
    if (swapped) geo.likelySwapped++;
    else geo.outsideBbox++;
    if (geo.outsideExamples.length < 5) geo.outsideExamples.push([lon, lat]);
  }
}

function readEdges(file, size) {
  const fd = fs.openSync(file, 'r');
  const headLen = Math.min(600, size);
  const tailLen = Math.min(200, size);
  const head = Buffer.alloc(headLen);
  const tail = Buffer.alloc(tailLen);
  fs.readSync(fd, head, 0, headLen, 0);
  fs.readSync(fd, tail, 0, tailLen, size - tailLen);
  fs.closeSync(fd);
  return { head: head.toString('utf8'), tail: tail.toString('utf8') };
}

async function writeSample(size) {
  const n = opts.sample;
  const features = [];
  for await (const f of streamFeatures(opts.file, opts.chunkSize)) {
    features.push(f);
    if (features.length >= n) break;
  }
  const dir = path.join(dataDir, 'sample');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `tree_census_sample_${features.length}.geojson`);
  fs.writeFileSync(out, JSON.stringify({ type: 'FeatureCollection', features }, null, 1));
  console.log(`Source size: ${fmt(size)} bytes (unchanged)`);
  console.log(`Wrote ${features.length} features to ${out}`);
}

async function main() {
  if (!fs.existsSync(opts.file)) {
    console.error(`File not found: ${opts.file}`);
    process.exit(1);
  }
  const size = fs.statSync(opts.file).size;
  if (opts.sample > 0) return writeSample(size);

  console.log(`\nInspecting: ${opts.file}`);
  console.log(`File size : ${fmt(size)} bytes (${(size / 1048576).toFixed(1)} MB)`);
  const { head, tail } = readEdges(opts.file, size);
  console.log('\n--- First 600 characters (raw) ---\n' + head);
  console.log('\n--- Last 200 characters (raw) ---\n' + tail);

  // ---------- Pass 1: statistics ----------
  const props = new Map();
  const featureTypes = {};
  const geo = {
    types: {},
    missing: 0,
    badShape: 0,
    nonNumeric: 0,
    outOfRange: 0,
    nullIsland: 0,
    validPoints: 0,
    likelySwapped: 0,
    outsideBbox: 0,
    outsideExamples: [],
    dims: {},
    minLon: Infinity,
    maxLon: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity,
  };
  let total = 0;
  let noProperties = 0;
  let firstFeature = null;

  for await (const f of streamFeatures(opts.file, opts.chunkSize)) {
    total++;
    if (!firstFeature) firstFeature = f;
    featureTypes[f?.type ?? 'NO_TYPE'] = (featureTypes[f?.type ?? 'NO_TYPE'] || 0) + 1;
    if (f && 'id' in f) recordProp(props, '<feature.id>', f.id);
    analyzeGeometry(f?.geometry, geo);
    const p = f?.properties;
    if (p === null || p === undefined || typeof p !== 'object') noProperties++;
    else for (const [k, v] of Object.entries(p)) recordProp(props, k, v);
    if (total % 500000 === 0) process.stderr.write(`  ...${fmt(total)} features read\n`);
  }

  // ---------- Pass 2: duplicates ----------
  let duplicates = null;
  if (opts.duplicates && total > 0) {
    const candidates = [...props.entries()]
      .filter(([, s]) => s.overflow && s.present >= total * 0.5 && (s.types.string || s.types.number))
      .sort((a, b) => b[1].present - a[1].present)
      .slice(0, 6)
      .map(([k]) => k);
    const seen = { full: new Set(), coords: new Set() };
    const dup = { fullRecord: 0, sameCoordinates: 0, byField: {} };
    const keySets = new Map(candidates.map((k) => [k, new Set()]));
    for (const k of candidates) dup.byField[k] = 0;
    process.stderr.write('  ...pass 2 (duplicate check)\n');
    for await (const f of streamFeatures(opts.file, opts.chunkSize)) {
      const hFull = hash53(JSON.stringify(f?.geometry) + '|' + JSON.stringify(f?.properties));
      if (seen.full.has(hFull)) dup.fullRecord++;
      else seen.full.add(hFull);
      if (f?.geometry?.coordinates !== undefined) {
        const hC = hash53(JSON.stringify(f.geometry.coordinates));
        if (seen.coords.has(hC)) dup.sameCoordinates++;
        else seen.coords.add(hC);
      }
      for (const k of candidates) {
        const v = f?.properties?.[k];
        if (v === null || v === undefined || v === '') continue;
        const h = hash53(String(v));
        const set = keySets.get(k);
        if (set.has(h)) dup.byField[k]++;
        else set.add(h);
      }
    }
    duplicates = { ...dup, candidateFieldsChecked: candidates };
  }

  // ---------- Report ----------
  const fields = [...props.entries()].map(([k, s]) => summarizeProp(k, s, total));
  const report = {
    file: opts.file,
    sizeBytes: size,
    featureCount: total,
    featureTypes,
    featuresWithoutProperties: noProperties,
    geometry: geo,
    fields,
    duplicates,
    firstFeaturePreview: firstFeature
      ? {
          ...firstFeature,
          geometry: firstFeature.geometry
            ? {
                type: firstFeature.geometry.type,
                coordinates: JSON.stringify(firstFeature.geometry.coordinates).slice(0, 200),
              }
            : firstFeature.geometry,
        }
      : null,
  };
  fs.mkdirSync(path.join(dataDir, 'reports'), { recursive: true });
  const reportPath = path.join(dataDir, 'reports', 'inspection-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n================ INSPECTION REPORT ================');
  console.log(`Features            : ${fmt(total)}   types: ${JSON.stringify(featureTypes)}`);
  console.log(`Without properties  : ${fmt(noProperties)}`);
  console.log(`Geometry types      : ${JSON.stringify(geo.types)}`);
  console.log(`Point coord lengths : ${JSON.stringify(geo.dims)}  (2 = [lon,lat], 3 = with altitude)`);
  console.log(
    `Coordinate problems : missing geometry ${fmt(geo.missing)}, bad shape ${fmt(geo.badShape)}, ` +
      `non-numeric ${fmt(geo.nonNumeric)}, out of range ${fmt(geo.outOfRange)}, exactly (0,0) ${fmt(geo.nullIsland)}`,
  );
  console.log(
    `Valid points        : ${fmt(geo.validPoints)}; outside Bengaluru bbox ${fmt(geo.outsideBbox)}; ` +
      `likely lat/lon swapped ${fmt(geo.likelySwapped)}`,
  );
  if (geo.validPoints > 0) {
    console.log(
      `Extent (lon,lat)    : [${geo.minLon}, ${geo.minLat}] to [${geo.maxLon}, ${geo.maxLat}]`,
    );
  }
  if (geo.outsideExamples.length) console.log(`Outside-bbox samples: ${JSON.stringify(geo.outsideExamples)}`);
  if (duplicates) {
    console.log(
      `Duplicates          : identical records ${fmt(duplicates.fullRecord)}, same coordinates ${fmt(duplicates.sameCoordinates)}`,
    );
    for (const [k, n] of Object.entries(duplicates.byField)) {
      console.log(`                      repeated values in "${k}": ${fmt(n)}`);
    }
  }
  console.log(`\nFields (${fields.length}):`);
  for (const f of fields) {
    const types = Object.entries(f.types).map(([t, n]) => `${t}:${fmt(n)}`).join(' ');
    console.log(`\n• ${f.field}   [${types}]`);
    console.log(
      `    present ${fmt(f.present)} | absent ${fmt(f.absent)} | null ${fmt(f.null)} | empty ${fmt(f.emptyString)} | placeholder-like ${fmt(f.placeholderLike)}`,
    );
    if (f.numeric) {
      console.log(`    numeric: min ${f.numeric.min}, max ${f.numeric.max}, mean ${f.numeric.mean.toFixed(3)}`);
    }
    if (f.numericLikeStrings) console.log(`    strings that look numeric: ${fmt(f.numericLikeStrings)}`);
    if (f.highCardinality) {
      console.log(`    distinct: > ${DISTINCT_CAP} (high cardinality). examples: ${JSON.stringify(f.examples)}`);
    } else {
      const shown = f.values.slice(0, 40).map(([v, n]) => `${JSON.stringify(v)} (${fmt(n)})`).join(', ');
      console.log(`    distinct: ${f.distinctCount}${f.values.length > 40 ? ' (top 40 shown)' : ''} → ${shown}`);
      if (f.spellingVariants) console.log(`    spelling/case variants: ${JSON.stringify(f.spellingVariants)}`);
    }
  }
  console.log(`\nFirst feature (geometry shortened):\n${JSON.stringify(report.firstFeaturePreview, null, 2)}`);
  console.log(`\nFull report written to: ${reportPath}`);
}

main().catch((err) => {
  console.error('Inspection failed:', err);
  process.exit(1);
});

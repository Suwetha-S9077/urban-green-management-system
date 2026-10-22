#!/usr/bin/env node
/**
 * Imports the Bengaluru Tree Census (July 2026) GeoJSON into MongoDB collection `tree_census`.
 *
 *  - Streams the file (constant memory), validates + cleans each feature, writes in batches.
 *  - Idempotent / resumable: every record is upserted by its OBJECTID with $setOnInsert, so
 *    re-running (or resuming after a crash) never creates duplicates and never overwrites data.
 *  - The raw GeoJSON is only ever read.
 *
 * Usage (from backend/):
 *   node scripts/import-tree-census.mjs                 import the default file
 *   node scripts/import-tree-census.mjs --dry-run       validate + report only, no database needed
 *   node scripts/import-tree-census.mjs --batch-size=2000
 *   node scripts/import-tree-census.mjs <path-to-geojson>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanFeature, newCleaningStats, validateFeature } from './lib/census-record.mjs';
import { streamFeatures } from './lib/stream-features.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '..');

const COLLECTION = 'tree_census';
const DEFAULT_FILE = path.join(backendDir, 'data', 'raw', 'bbmp_tree_census_july_2026.geojson');

/**
 * Index rationale (from the inspection):
 *  - OBJECTID: 0 repeated values in the inspected data -> the only unique index (import identity).
 *  - KGISTreeID (2,502 repeated) and KGISCode (heavily repeated): NON-unique lookup indexes.
 *  - DepartmentCode: 0 repeats were seen but it is not proven globally unique -> NON-unique.
 *  - KGISVillageID: ~332 distinct values across 700k records (a grouping code) -> not indexed.
 *  - location / WardNumber / TreeName / Status: used by API filters and analytics.
 */
const INDEXES = [
  { key: { OBJECTID: 1 }, name: 'uniq_OBJECTID', unique: true },
  { key: { location: '2dsphere' }, name: 'geo_location' },
  { key: { WardNumber: 1 }, name: 'idx_WardNumber' },
  { key: { TreeName: 1 }, name: 'idx_TreeName' },
  { key: { Status: 1 }, name: 'idx_Status' },
  { key: { KGISTreeID: 1 }, name: 'idx_KGISTreeID' },
  { key: { KGISCode: 1 }, name: 'idx_KGISCode' },
  { key: { DepartmentCode: 1 }, name: 'idx_DepartmentCode' },
];

const opts = { file: DEFAULT_FILE, batchSize: 1000, dryRun: false };
for (const a of process.argv.slice(2)) {
  if (a === '--dry-run') opts.dryRun = true;
  else if (a.startsWith('--batch-size=')) opts.batchSize = Number(a.split('=')[1]);
  else if (!a.startsWith('--')) opts.file = path.resolve(a);
}
if (!Number.isInteger(opts.batchSize) || opts.batchSize < 1 || opts.batchSize > 10000) {
  console.error('--batch-size must be an integer between 1 and 10000');
  process.exit(1);
}

const fmt = (n) => Number(n).toLocaleString('en-US');

const counts = {
  sourceRecords: 0,
  validRecords: 0,
  invalidRecords: 0,
  duplicateOBJECTIDInSource: 0,
  insertedRecords: 0,
  alreadyPresentRecords: 0,
};
const invalidReasons = {};
const stats = newCleaningStats();
const seenObjectIds = new Set();

function printReport(startedMs, finalCount, complete) {
  const skipped =
    counts.invalidRecords + counts.duplicateOBJECTIDInSource + counts.alreadyPresentRecords;
  const elapsed = ((Date.now() - startedMs) / 1000).toFixed(1);
  console.log(`\n================ IMPORT REPORT${complete ? '' : ' (INCOMPLETE)'} ================`);
  console.log(`Mode                              : ${opts.dryRun ? 'DRY RUN (nothing written)' : 'import'}`);
  console.log(`Source records read               : ${fmt(counts.sourceRecords)}`);
  console.log(`Valid records                     : ${fmt(counts.validRecords)}`);
  console.log(`Invalid records (skipped)         : ${fmt(counts.invalidRecords)}`);
  if (counts.invalidRecords > 0) console.log(`  reasons                         : ${JSON.stringify(invalidReasons)}`);
  console.log(`Duplicate OBJECTID in source      : ${fmt(counts.duplicateOBJECTIDInSource)} (skipped)`);
  if (opts.dryRun) {
    console.log('Inserted / already present        : n/a (dry run)');
  } else {
    console.log(`Inserted records (new)            : ${fmt(counts.insertedRecords)}`);
    console.log(`Already present (skipped)         : ${fmt(counts.alreadyPresentRecords)}`);
  }
  console.log(`Skipped records (total)           : ${fmt(skipped)}`);
  console.log(`Elapsed                           : ${elapsed}s`);
  if (finalCount !== null) console.log(`Final ${COLLECTION} document count : ${fmt(finalCount)}`);
  console.log('\nCleaning notes (values are only trimmed / nulled, never merged or renamed):');
  console.log(`  strings trimmed                 : ${fmt(stats.trimmedStrings)}`);
  console.log(`  empty strings stored as null    : ${fmt(stats.emptyStringsToNull)}`);
  console.log(`  numbers coerced to string       : ${fmt(stats.numbersCoercedToString)}`);
  console.log(`  unexpected types stored as null : ${fmt(stats.unexpectedTypeDropped)}`);
  console.log(`  KGISVillageID coerced to number : ${fmt(stats.villageIdCoerced)}`);
  console.log(`  Status of unexpected type -> null: ${fmt(stats.statusUnexpected)}`);
  console.log(`  fields not in inspected schema  : ${stats.unknownFields.size ? [...stats.unknownFields].join(', ') : 'none'}`);
}

async function main() {
  if (!fs.existsSync(opts.file)) {
    console.error(`Source file not found: ${opts.file}`);
    process.exit(1);
  }
  const sourceFile = path.basename(opts.file);
  const startedAt = new Date();
  const startedMs = Date.now();
  console.log(`Source : ${opts.file} (${fmt(fs.statSync(opts.file).size)} bytes, read-only)`);

  let collection = null;
  let mongoose = null;
  if (!opts.dryRun) {
    // Loaded lazily so --dry-run works with nothing but Node installed.
    const { default: dotenv } = await import('dotenv');
    ({ default: mongoose } = await import('mongoose'));
    dotenv.config({ path: path.join(backendDir, '.env') });
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI is not set. Add it to backend/.env');
      process.exit(1);
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    collection = mongoose.connection.collection(COLLECTION);
    console.log(`Target : ${mongoose.connection.name}.${COLLECTION}`);
    // The unique OBJECTID index must exist BEFORE the upserts: it makes them fast and safe.
    await collection.createIndexes([INDEXES[0]]);
  }

  let batch = [];
  const flush = async () => {
    if (batch.length === 0) return;
    const ops = batch.map((rec) => {
      const { OBJECTID, ...rest } = rec;
      return {
        updateOne: {
          filter: { OBJECTID },
          update: { $setOnInsert: { ...rest, importedAt: startedAt, sourceFile } },
          upsert: true,
        },
      };
    });
    batch = [];
    if (!collection) return;
    const res = await collection.bulkWrite(ops, { ordered: false });
    counts.insertedRecords += res.upsertedCount;
    counts.alreadyPresentRecords += res.matchedCount;
    if (res.upsertedCount + res.matchedCount !== ops.length) {
      throw new Error(
        `Batch accounting mismatch: ${ops.length} sent, ${res.upsertedCount} upserted, ${res.matchedCount} matched`,
      );
    }
  };

  try {
    for await (const feature of streamFeatures(opts.file)) {
      counts.sourceRecords++;
      const reasons = validateFeature(feature);
      if (reasons.length > 0) {
        counts.invalidRecords++;
        for (const r of reasons) invalidReasons[r] = (invalidReasons[r] || 0) + 1;
      } else {
        const objectId = feature.properties.OBJECTID;
        if (seenObjectIds.has(objectId)) {
          counts.duplicateOBJECTIDInSource++;
        } else {
          seenObjectIds.add(objectId);
          counts.validRecords++;
          batch.push(cleanFeature(feature, stats));
          if (batch.length >= opts.batchSize) await flush();
        }
      }
      if (counts.sourceRecords % 50000 === 0) {
        console.log(`  ...${fmt(counts.sourceRecords)} read, ${fmt(counts.insertedRecords)} inserted so far`);
      }
    }
    await flush();
  } catch (err) {
    console.error('\nImport stopped by an error:', err);
    printReport(startedMs, null, false);
    console.error('\nIt is safe to re-run: already imported records are skipped.');
    if (collection) await mongoose.disconnect();
    process.exit(1);
  }

  let finalCount = null;
  if (collection) {
    console.log('Creating indexes (safe to repeat)...');
    await collection.createIndexes(INDEXES);
    finalCount = await collection.countDocuments();
    const names = (await collection.indexes()).map((i) => i.name);
    console.log(`Indexes: ${names.join(', ')}`);
  }
  printReport(startedMs, finalCount, true);

  const reportDir = path.join(backendDir, 'data', 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, opts.dryRun ? 'import-dry-run-report.json' : 'import-report.json'),
    JSON.stringify(
      { finishedAt: new Date().toISOString(), dryRun: opts.dryRun, counts, invalidReasons, finalCount,
        cleaning: { ...stats, unknownFields: [...stats.unknownFields] } },
      null,
      2,
    ),
  );

  if (collection) await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});

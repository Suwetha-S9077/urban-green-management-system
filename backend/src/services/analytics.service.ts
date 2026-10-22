import type { PipelineStage } from 'mongoose';
import { env } from '../config/env';
import { TreeCensus } from '../models/census/TreeCensus.model';
import type {
  DashboardData,
  Distribution,
  SpatialOverlap,
  SpeciesEntry,
  StatusEntry,
  WardEntry,
} from '../types/api';
import { TtlCache } from '../utils/ttlCache';

const cache = new TtlCache(env.ANALYTICS_CACHE_TTL_SECONDS * 1000);
const AGGREGATION_MAX_TIME_MS = 60_000;
const TOP_N = 10;

interface GroupRow<K> {
  _id: K;
  count: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const percentage = (count: number, total: number): number =>
  total === 0 ? 0 : round2((count / total) * 100);

async function groupCounts<K extends string | number | null>(field: string): Promise<GroupRow<K>[]> {
  const pipeline: PipelineStage[] = [
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ];
  return TreeCensus.aggregate<GroupRow<K>>(pipeline)
    .allowDiskUse(true)
    .option({ maxTimeMS: AGGREGATION_MAX_TIME_MS })
    .exec();
}

const sumCounts = (rows: GroupRow<unknown>[]): number => rows.reduce((acc, r) => acc + r.count, 0);

export function getSpeciesDistribution(): Promise<Distribution<SpeciesEntry>> {
  return cache.getOrLoad('species', async () => {
    const rows = await groupCounts<string | null>('TreeName');
    const totalTrees = sumCounts(rows);
    return {
      totalTrees,
      distinctValues: rows.length,
      entries: rows.map((r) => ({
        treeName: r._id,
        count: r.count,
        percentage: percentage(r.count, totalTrees),
      })),
    };
  });
}

export function getWardDistribution(): Promise<Distribution<WardEntry>> {
  return cache.getOrLoad('wards', async () => {
    const rows = await groupCounts<string | null>('WardNumber');
    const totalTrees = sumCounts(rows);
    return {
      totalTrees,
      distinctValues: rows.length,
      entries: rows.map((r) => ({
        wardNumber: r._id,
        count: r.count,
        percentage: percentage(r.count, totalTrees),
      })),
    };
  });
}

/** Status values in the source are 1, 0 and null. Their meaning is undocumented, so none is implied. */
export function getStatusDistribution(): Promise<Distribution<StatusEntry>> {
  return cache.getOrLoad('status', async () => {
    const rows = await groupCounts<number | null>('Status');
    const totalTrees = sumCounts(rows);
    const countOf = (value: number | null): number => rows.find((r) => r._id === value)?.count ?? 0;

    const entries: StatusEntry[] = [1, 0, null].map((value) => ({
      status: value,
      count: countOf(value),
      percentage: percentage(countOf(value), totalTrees),
    }));
    const others = rows
      .filter((r) => r._id !== 1 && r._id !== 0 && r._id !== null)
      .sort((a, b) => Number(a._id) - Number(b._id));
    for (const r of others) {
      entries.push({ status: r._id, count: r.count, percentage: percentage(r.count, totalTrees) });
    }
    return { totalTrees, distinctValues: entries.length, entries };
  });
}

export function getSpatialOverlap(): Promise<SpatialOverlap> {
  return cache.getOrLoad('spatial', async () => {
    const pipeline: PipelineStage[] = [
      { $group: { _id: '$location.coordinates', n: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: '$n' },
          distinctLocations: { $sum: 1 },
          locationsSharedByMultipleTrees: { $sum: { $cond: [{ $gt: ['$n', 1] }, 1, 0] } },
        },
      },
    ];
    const [row] = await TreeCensus.aggregate<{
      totalRecords: number;
      distinctLocations: number;
      locationsSharedByMultipleTrees: number;
    }>(pipeline)
      .allowDiskUse(true)
      .option({ maxTimeMS: AGGREGATION_MAX_TIME_MS })
      .exec();

    if (!row) {
      return { totalRecords: 0, distinctLocations: 0, repeatedCoordinateRecords: 0, locationsSharedByMultipleTrees: 0 };
    }
    return {
      totalRecords: row.totalRecords,
      distinctLocations: row.distinctLocations,
      repeatedCoordinateRecords: row.totalRecords - row.distinctLocations,
      locationsSharedByMultipleTrees: row.locationsSharedByMultipleTrees,
    };
  });
}

export function getDashboard(): Promise<DashboardData> {
  return cache.getOrLoad('dashboard', async () => {
    const [species, wards, status, spatial] = await Promise.all([
      getSpeciesDistribution(),
      getWardDistribution(),
      getStatusDistribution(),
      getSpatialOverlap(),
    ]);
    const statusCount = (value: number | null): number =>
      status.entries.find((e) => e.status === value)?.count ?? 0;
    const known = statusCount(1) + statusCount(0) + statusCount(null);

    return {
      totals: {
        trees: species.totalTrees,
        speciesCategories: species.distinctValues,
        wards: wards.distinctValues,
      },
      status: {
        count1: statusCount(1),
        count0: statusCount(0),
        countNull: statusCount(null),
        countOther: status.totalTrees - known,
      },
      spatial,
      topSpecies: species.entries.slice(0, TOP_N),
      topWards: wards.entries.slice(0, TOP_N),
      notes: [
        'The source dataset has no height, diameter, condition, age, health, canopy or carbon fields, so no indicators are derived from them.',
        'The meaning of Status values 1 and 0 is not documented in the source dataset.',
        'Repeated coordinates are valid in the source data; records are not removed for sharing a location.',
        'TreeName "Others" is a category in the source data, not a missing value.',
      ],
      generatedAt: new Date().toISOString(),
    };
  });
}

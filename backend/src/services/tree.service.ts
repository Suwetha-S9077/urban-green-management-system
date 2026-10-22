import type { FilterQuery } from 'mongoose';
import { env } from '../config/env';
import { TreeCensus, type TreeCensusLean, type TreeCensusRecord } from '../models/census/TreeCensus.model';
import type { BoundingBox, PaginationMeta, TreeDto } from '../types/api';
import { AppError } from '../utils/AppError';
import { TtlCache } from '../utils/ttlCache';

export interface TreeFilters {
  wardNumber?: string;
  treeName?: string;
  /** undefined = no filter, null = trees whose Status is null */
  status?: number | null;
  bbox?: BoundingBox;
}

export interface TreeSearchCriteria extends TreeFilters {
  q?: string;
  objectId?: number;
  kgisTreeId?: string;
  kgisCode?: string;
  departmentCode?: string;
}

export interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

const nameCache = new TtlCache(env.ANALYTICS_CACHE_TTL_SECONDS * 1000);

export function toTreeDto(doc: TreeCensusLean): TreeDto {
  return {
    id: doc._id.toString(),
    objectId: doc.OBJECTID,
    kgisTreeId: doc.KGISTreeID,
    kgisCode: doc.KGISCode,
    kgisVillageId: doc.KGISVillageID,
    departmentCode: doc.DepartmentCode,
    wardNumber: doc.WardNumber,
    treeName: doc.TreeName,
    status: doc.Status,
    location: doc.location,
  };
}

function buildFilter(f: TreeFilters): FilterQuery<TreeCensusRecord> {
  const filter: FilterQuery<TreeCensusRecord> = {};
  if (f.wardNumber !== undefined) filter.WardNumber = f.wardNumber;
  if (f.treeName !== undefined) filter.TreeName = f.treeName;
  if (f.status !== undefined) filter.Status = f.status;
  if (f.bbox) {
    const { minLon, minLat, maxLon, maxLat } = f.bbox;
    // Counter-clockwise ring, uses the 2dsphere index on `location`.
    filter.location = {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [minLon, minLat],
              [maxLon, minLat],
              [maxLon, maxLat],
              [minLon, maxLat],
              [minLon, minLat],
            ],
          ],
        },
      },
    };
  }
  return filter;
}

async function getAllTreeNames(): Promise<string[]> {
  return nameCache.getOrLoad('treeNames', async () => {
    const values: unknown[] = await TreeCensus.distinct('TreeName').exec();
    return values.filter((v): v is string => typeof v === 'string');
  });
}

async function fetchPage(
  filter: FilterQuery<TreeCensusRecord>,
  page: number,
  limit: number,
): Promise<Page<TreeDto>> {
  const unfiltered = Object.keys(filter).length === 0;
  const [docs, total] = await Promise.all([
    TreeCensus.find(filter)
      .select('-importedAt -sourceFile')
      .sort({ OBJECTID: 1 }) // stable order; served by the unique OBJECTID index
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<TreeCensusLean[]>()
      .exec(),
    unfiltered ? TreeCensus.estimatedDocumentCount().exec() : TreeCensus.countDocuments(filter).exec(),
  ]);
  return {
    items: docs.map(toTreeDto),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export function listTrees(filters: TreeFilters, page: number, limit: number): Promise<Page<TreeDto>> {
  return fetchPage(buildFilter(filters), page, limit);
}

export async function searchTrees(
  criteria: TreeSearchCriteria,
  page: number,
  limit: number,
): Promise<Page<TreeDto>> {
  const { q, objectId, kgisTreeId, kgisCode, departmentCode, ...rest } = criteria;
  const filter = buildFilter(rest);

  if (objectId !== undefined) filter.OBJECTID = objectId;
  if (kgisTreeId !== undefined) filter.KGISTreeID = kgisTreeId;
  if (kgisCode !== undefined) filter.KGISCode = kgisCode;
  if (departmentCode !== undefined) filter.DepartmentCode = departmentCode;

  if (q !== undefined) {
    // Resolve the (few hundred) matching species names first, so the query itself
    // is an indexed equality lookup instead of a regex scan over every record.
    const needle = q.toLowerCase();
    let names = (await getAllTreeNames()).filter((n) => n.toLowerCase().includes(needle));
    if (rest.treeName !== undefined) names = names.filter((n) => n === rest.treeName);
    filter.TreeName = { $in: names };
  }

  return fetchPage(filter, page, limit);
}

export async function getTreeById(id: string): Promise<TreeDto> {
  const doc = await TreeCensus.findById(id)
    .select('-importedAt -sourceFile')
    .lean<TreeCensusLean | null>()
    .exec();
  if (!doc) throw new AppError(404, `No tree census record with id ${id}`, 'TREE_NOT_FOUND');
  return toTreeDto(doc);
}

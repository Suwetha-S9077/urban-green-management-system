import { z } from 'zod';
import type { BoundingBox } from '../types/api';

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
};

const text = (max: number) => z.string().trim().min(1).max(max);

/** "0" | "1" | "null"  ->  0 | 1 | null  (absent stays undefined = no filter) */
const statusParam = z.enum(['0', '1', 'null']).transform((v) => (v === 'null' ? null : Number(v)));

/** "minLon,minLat,maxLon,maxLat" */
const bboxParam = z.string().transform((value, ctx): BoundingBox => {
  const raw = value.split(',').map((s) => s.trim());
  const nums = raw.map(Number);
  if (raw.length !== 4 || raw.some((s) => s === '') || nums.some((n) => !Number.isFinite(n))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'bbox must be "minLon,minLat,maxLon,maxLat"' });
    return z.NEVER;
  }
  const [minLon, minLat, maxLon, maxLat] = nums as [number, number, number, number];
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'bbox coordinates are out of range' });
    return z.NEVER;
  }
  if (minLon >= maxLon || minLat >= maxLat) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'bbox min values must be smaller than max values' });
    return z.NEVER;
  }
  if (maxLon - minLon >= 180 || maxLat - minLat >= 90) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'bbox is too large' });
    return z.NEVER;
  }
  return { minLon, minLat, maxLon, maxLat };
});

const filters = {
  wardNumber: text(50).optional(),
  treeName: text(200).optional(),
  status: statusParam.optional(),
  bbox: bboxParam.optional(),
};

export const treeListQuerySchema = z.object({ ...pagination, ...filters }).strict();

export const treeSearchQuerySchema = z
  .object({
    ...pagination,
    ...filters,
    q: text(100).optional(),
    objectId: z.coerce.number().int().min(0).optional(),
    kgisTreeId: text(100).optional(),
    kgisCode: text(100).optional(),
    departmentCode: text(100).optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.q !== undefined ||
      v.objectId !== undefined ||
      v.kgisTreeId !== undefined ||
      v.kgisCode !== undefined ||
      v.departmentCode !== undefined,
    { message: 'Provide at least one of: q, objectId, kgisTreeId, kgisCode, departmentCode' },
  );

export const treeIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'id must be a 24-character hex MongoDB id'),
});

export const speciesQuerySchema = z
  .object({ limit: z.coerce.number().int().min(1).max(500).optional() })
  .strict();

export const wardsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).optional(),
    sort: z.enum(['count', 'ward']).default('count'),
  })
  .strict();

  
export const createManagedTreeSchema = z
  .object({
    treeName: text(200),
    wardNumber: text(50),
    departmentCode: z.string().trim().max(100).optional(),
    kgisTreeId: z.string().trim().max(100).optional(),
    kgisCode: z.string().trim().max(100).optional(),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

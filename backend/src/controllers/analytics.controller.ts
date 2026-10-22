import type { Request, Response } from 'express';
import * as analytics from '../services/analytics.service';
import { AppError } from '../utils/AppError';
import { speciesQuerySchema, wardsQuerySchema } from '../validators/tree.validators';

export async function dashboard(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await analytics.getDashboard() });
}

export async function species(req: Request, res: Response): Promise<void> {
  const { limit } = speciesQuerySchema.parse(req.query);
  const dist = await analytics.getSpeciesDistribution();
  const entries = limit ? dist.entries.slice(0, limit) : dist.entries;
  res.json({
    success: true,
    data: entries,
    meta: { totalTrees: dist.totalTrees, distinctValues: dist.distinctValues, returned: entries.length },
  });
}

export async function wards(req: Request, res: Response): Promise<void> {
  const { limit, sort } = wardsQuerySchema.parse(req.query);
  const dist = await analytics.getWardDistribution();
  // Default order is by tree count; "ward" orders by ward number numerically ("2" before "10").
  const sorted =
    sort === 'ward'
      ? [...dist.entries].sort((a, b) =>
          (a.wardNumber ?? '').localeCompare(b.wardNumber ?? '', 'en', { numeric: true }),
        )
      : dist.entries;
  const entries = limit ? sorted.slice(0, limit) : sorted;
  res.json({
    success: true,
    data: entries,
    meta: { totalTrees: dist.totalTrees, distinctValues: dist.distinctValues, returned: entries.length },
  });
}

export async function status(_req: Request, res: Response): Promise<void> {
  const dist = await analytics.getStatusDistribution();
  res.json({
    success: true,
    data: dist.entries,
    meta: {
      totalTrees: dist.totalTrees,
      note: 'The meaning of Status values 1 and 0 is not documented in the source dataset.',
    },
  });
}

/** The source dataset has no condition field, so no condition analytics can exist. */
export function condition(): never {
  throw new AppError(
    404,
    'Condition analytics are not available: the source dataset has no "condition" field. See GET /api/v1/analytics/status for the Status field that does exist.',
    'FIELD_NOT_IN_SOURCE_DATASET',
  );
}

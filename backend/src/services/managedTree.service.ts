
import { ManagedTree } from '../models/management/ManagedTree';
import { AppError } from '../utils/AppError';

export interface CreateManagedTreeInput {
  treeName: string;
  wardNumber: string;
  departmentCode?: string;
  kgisTreeId?: string;
  kgisCode?: string;
  latitude: number;
  longitude: number;
  notes?: string;
}

export async function createManagedTree(input: CreateManagedTreeInput) {
  const tree = await ManagedTree.create({
    treeName: input.treeName,
    wardNumber: input.wardNumber,
    departmentCode: input.departmentCode || null,
    kgisTreeId: input.kgisTreeId || null,
    kgisCode: input.kgisCode || null,
    latitude: input.latitude,
    longitude: input.longitude,
    notes: input.notes || '',
  });

  return tree;
}

export async function listManagedTrees(page = 1, limit = 50) {
  const [items, total] = await Promise.all([
    ManagedTree.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),
    ManagedTree.countDocuments().exec(),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getManagedTreeById(id: string) {
  const tree = await ManagedTree.findById(id).lean().exec();

  if (!tree) {
    throw new AppError(404, `Managed tree not found: ${id}`, 'TREE_NOT_FOUND');
  }

  return tree;
}

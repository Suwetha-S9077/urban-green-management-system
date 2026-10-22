import type { Request, Response } from 'express';
import * as treeService from '../services/tree.service';
import {
  treeIdParamSchema,
  treeListQuerySchema,
  treeSearchQuerySchema,
} from '../validators/tree.validators';

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit, ...filters } = treeListQuerySchema.parse(req.query);
  const { items, meta } = await treeService.listTrees(filters, page, limit);
  res.json({ success: true, data: items, meta });
}

export async function search(req: Request, res: Response): Promise<void> {
  const { page, limit, ...criteria } = treeSearchQuerySchema.parse(req.query);
  const { items, meta } = await treeService.searchTrees(criteria, page, limit);
  res.json({ success: true, data: items, meta });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = treeIdParamSchema.parse(req.params);
  const tree = await treeService.getTreeById(id);
  res.json({ success: true, data: tree });
}

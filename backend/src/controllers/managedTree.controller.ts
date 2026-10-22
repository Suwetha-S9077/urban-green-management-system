
import type { Request, Response } from 'express';
import { z } from 'zod';
import * as managedTreeService from '../services/managedTree.service';
import { createManagedTreeSchema } from '../validators/tree.validators';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid tree ID'),
});

const bulkBodySchema = z.object({
  trees: z.array(z.unknown()).min(1).max(500),
});

export async function create(req: Request, res: Response): Promise<void> {
  const input = createManagedTreeSchema.parse(req.body);
  const tree = await managedTreeService.createManagedTree(input);

  res.status(201).json({
    success: true,
    message: 'Tree added successfully',
    data: tree,
  });
}

export async function bulkCreate(
  req: Request,
  res: Response,
): Promise<void> {
  const { trees } = bulkBodySchema.parse(req.body);

  const validTrees: z.infer<typeof createManagedTreeSchema>[] = [];
  const errors: { row: number; message: string }[] = [];

  trees.forEach((row, index) => {
    const result = createManagedTreeSchema.safeParse(row);

    if (result.success) {
      validTrees.push(result.data);
    } else {
      errors.push({
        row: index + 2,
        message: result.error.issues
          .map((issue) => {
            const field = issue.path.join('.');
            return field
              ? `${field}: ${issue.message}`
              : issue.message;
          })
          .join('; '),
      });
    }
  });

  const savedTrees = [];

  for (let index = 0; index < validTrees.length; index++) {
    try {
      const tree = await managedTreeService.createManagedTree(
        validTrees[index],
      );
      savedTrees.push(tree);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Database save failed';

      errors.push({
        row: index + 2,
        message,
      });
    }
  }

  res.status(savedTrees.length > 0 ? 201 : 400).json({
    success: savedTrees.length > 0,
    message: `${savedTrees.length} tree(s) imported; ${errors.length} row(s) need attention.`,
    data: savedTrees,
    meta: {
      received: trees.length,
      imported: savedTrees.length,
      failed: errors.length,
    },
    errors,
  });
}

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = listQuerySchema.parse(req.query);
  const result = await managedTreeService.listManagedTrees(page, limit);

  res.json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const tree = await managedTreeService.getManagedTreeById(id);

  res.json({
    success: true,
    data: tree,
  });
}

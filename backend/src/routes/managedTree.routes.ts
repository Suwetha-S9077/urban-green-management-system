
import { Router } from 'express';
import * as managedTreeController from '../controllers/managedTree.controller';

const router = Router();

// Add one tree manually
router.post('/', managedTreeController.create);

// Import multiple trees from Excel/CSV data
router.post('/bulk', managedTreeController.bulkCreate);

// List managed trees
router.get('/', managedTreeController.list);

// Get one tree by ID
router.get('/:id', managedTreeController.getById);

export default router;

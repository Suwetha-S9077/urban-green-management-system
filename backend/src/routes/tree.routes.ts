import { Router } from 'express';
import * as treeController from '../controllers/tree.controller';

const router = Router();

router.get('/', treeController.list);
// Must be registered before '/:id', otherwise "search" would be read as an id.
router.get('/search', treeController.search);
router.get('/:id', treeController.getById);

export default router;

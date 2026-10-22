import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';

const router = Router();

router.get('/species', analyticsController.species);
router.get('/wards', analyticsController.wards);
router.get('/status', analyticsController.status);
router.get('/condition', analyticsController.condition);

export default router;

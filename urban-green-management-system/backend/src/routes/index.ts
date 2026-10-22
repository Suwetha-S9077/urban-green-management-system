import { Router } from 'express';
import analyticsRoutes from './analytics.routes';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import healthRoutes from './health.routes';
import treeRoutes from './tree.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/trees', treeRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);

export default router;

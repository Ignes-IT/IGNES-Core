import { Router } from 'express';
import { getPlans } from '../controllers/plan.controller';

const router = Router();

router.get('/', getPlans);

export default router;


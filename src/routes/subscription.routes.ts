import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getMySubscription, createTrialSubscription } from '../controllers/subscription.controller';

const router = Router();

router.use(authMiddleware);
router.get('/me', getMySubscription);
router.post('/', createTrialSubscription);

export default router;
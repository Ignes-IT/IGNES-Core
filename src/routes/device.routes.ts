import { Router } from 'express';
import { createDevice, getConfig } from '../controllers/device.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { deviceCreateSchema } from '@ignes/shared';

const router = Router();

router.use(authMiddleware);

router.post('/devices', validate(deviceCreateSchema), createDevice);
router.get('/vpn/config/:uuid', getConfig);

export default router;
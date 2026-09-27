import { Router } from 'express';
import { register, login, me } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { userCreateSchema, userLoginSchema } from '@ignes/shared';

const router = Router();

router.post('/register', validate(userCreateSchema), register);
router.post('/login', validate(userLoginSchema), login);
router.get('/me', authMiddleware, me);

export default router;

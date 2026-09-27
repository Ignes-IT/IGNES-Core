import { Router } from 'express';
import { getBrand } from '../controllers/brand.controller';

const router = Router();

router.get('/', getBrand);

export default router;
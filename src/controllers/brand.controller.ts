import { Request, Response } from 'express';
import { defaultBrandConfig } from '@ignes/shared';

export const getBrand = (_req: Request, res: Response) => {
    res.json(defaultBrandConfig);
}
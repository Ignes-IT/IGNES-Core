import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import deviceRoutes from './routes/device.routes';
import subscriptionRoutes from './routes/subscription.routes';
import planRoutes from './routes/plan.routes';
import brandRouters from './routes/brand.routes';
import { prisma } from './config/prisma';

export const app = express();

app.use(
    cors({ 
        origin: ['http://localhost:3001'],
        credentials: true,
    })
);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes)
app.use('/api/brand', brandRouters);
app.use('/api/plans', planRoutes);

app.use('/api', deviceRoutes);

app.get('/health', async (_req, res) => {
    let dbStatus: 'ok' | 'fail' = 'fail';

    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'ok';
    } catch {

    }

    return res.json({
        status: 'ok',
        db: dbStatus,
        version: '0.1.0',
    });
});
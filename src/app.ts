import express from 'express';
import authRoutes from './routes/auth.routes';
import deviceRoutes from './routes/device.routes';
import subscriptionRoutes from './routes/subscription.routes';

export const app = express();

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api', deviceRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

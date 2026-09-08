import express from 'express';
import { config } from './config/environment';
console.log('Загружен конфиг:', config.port);

import authRoutes from './routes/auth.routes';
console.log('Импортирован authRoutes');

import deviceRoutes from './routes/device.routes';
console.log('Импортирован deviceRoutes');

const app = express();
console.log('Создан express app');

app.use(express.json());
console.log('Добавлен express.json middleware');

app.use('/api/auth', authRoutes);
console.log('Подключены authRoutes');

app.use('/api', deviceRoutes);
console.log('Подключены deviceRoutes');

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
console.log('Добавлен health endpoint');

app.listen(config.port, () => {
  console.log(`🚀 Сервер запущен на порту ${config.port}`);
});
console.log('Вызван app.listen');

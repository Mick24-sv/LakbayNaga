import express from 'express';
import { attractions } from './attractions.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/attractions', (_req, res) => res.json(attractions));
// TODO: Add validated routes for accounts, profiles, trips, and admin features.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Route not found' }));
export default app;

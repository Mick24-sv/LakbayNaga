import express from 'express';
import { makeStore } from './repositories/memoryStore.js';
import { makeAttractionRepository } from './repositories/attractionRepository.js';
import { auth } from './middleware/authMiddleware.js';
import {
  notFound,
  errorHandler
} from './middleware/errorHandler.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createAttractionRoutes } from './routes/attractionRoutes.js';
import { createItineraryRoutes } from './routes/itineraryRoutes.js';


export function createApp({
  store = makeStore(),
  attractionData = [],
  attractionRepository = makeAttractionRepository({
    initialData: attractionData
  })
} = {}) {
  const app = express();
  const access = auth(store);


  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));


  app.use((req, res, next) => {
    access.load(req).then(() => next()).catch(next);
  });


  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });


  app.use('/api', createAuthRoutes(store, access));


  app.use(
    '/api',
    createAttractionRoutes(attractionRepository, access)
  );


  app.use('/api', createItineraryRoutes(attractionRepository, access));

  app.use('/api', notFound);
  app.use(errorHandler);


  return app;
}


export default createApp();
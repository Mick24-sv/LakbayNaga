import { Router } from 'express';
import { createSavedItineraryController } from '../controllers/savedItineraryController.js';
import { makeItineraryRepository } from '../repositories/itineraryRepository.js';
import { createItineraryController } from '../controllers/itineraryController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export function createItineraryRoutes(attractionRepository, access, itineraryRepository = makeItineraryRepository()) {
  const router = Router();
  const controller = createItineraryController(attractionRepository);
  router.post('/itineraries/generate', access.required, asyncHandler(controller.generate));
  const saved = createSavedItineraryController(attractionRepository, itineraryRepository);
  router.get('/itineraries', access.required, asyncHandler(saved.list));
  router.post('/itineraries', access.required, asyncHandler(saved.create));
  router.get('/itineraries/:id', access.required, asyncHandler(saved.get));
  router.put('/itineraries/:id', access.required, asyncHandler(saved.update));
  router.delete('/itineraries/:id', access.required, asyncHandler(saved.delete));
  return router;
}

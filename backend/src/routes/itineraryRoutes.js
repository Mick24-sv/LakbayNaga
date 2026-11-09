import { Router } from 'express';
import { createItineraryController } from '../controllers/itineraryController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export function createItineraryRoutes(attractionRepository, access) {
  const router = Router();
  const controller = createItineraryController(attractionRepository);
  router.post('/itineraries/generate', access.required, asyncHandler(controller.generate));
  return router;
}

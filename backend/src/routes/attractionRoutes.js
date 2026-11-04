import { Router } from 'express';
import { createAttractionController } from '../controllers/attractionController.js';

export function createAttractionRoutes(attractionData, access) {
  const router = Router();
  const controller = createAttractionController(attractionData);
  router.get('/attractions', controller.listPublic);
  router.get('/admin/attractions', access.required, access.admin, controller.listAdmin);
  return router;
}

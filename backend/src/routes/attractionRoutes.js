import { Router } from 'express';
import { createAttractionController } from '../controllers/attractionController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';


export function createAttractionRoutes(attractionRepository, access) {
  const router = Router();
  const controller = createAttractionController(attractionRepository);


  router.get(
    '/attractions',
    asyncHandler(controller.listPublic)
  );


  router.get(
    '/admin/attractions',
    access.required,
    access.admin,
    asyncHandler(controller.listAdmin)
  );


  return router;
}
import { Router } from 'express';
import {
  createAttractionController
} from '../controllers/attractionController.js';
import {
  createAdminAttractionController
} from '../controllers/adminAttractionController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';


export function createAttractionRoutes(attractionRepository, access) {
  const router = Router();


  const controller = createAttractionController(attractionRepository);
  const admin = createAdminAttractionController(attractionRepository);


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


  router.post(
    '/admin/attractions',
    access.required,
    access.admin,
    asyncHandler(admin.create)
  );


  router.put(
    '/admin/attractions/:id',
    access.required,
    access.admin,
    asyncHandler(admin.update)
  );


  router.patch(
    '/admin/attractions/:id/publish',
    access.required,
    access.admin,
    asyncHandler(admin.publish)
  );


  router.patch(
    '/admin/attractions/:id/archive',
    access.required,
    access.admin,
    asyncHandler(admin.archive)
  );


  return router;
}
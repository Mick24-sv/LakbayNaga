import { Router } from 'express';
import { createSettingsController } from '../controllers/settingsController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export function createSettingsRoutes(repository, access, imageRepository) {
  const router = Router();
  const controller = createSettingsController(repository, imageRepository);

  router.get(['/settings', '/site-images'], asyncHandler(controller.get));
  router.put(
    ['/admin/settings', '/admin/site-images'],
    access.required,
    access.admin,
    asyncHandler(controller.update)
  );

  return router;
}
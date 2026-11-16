import { Router } from 'express';
import { createSettingsController } from '../controllers/settingsController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export function createSettingsRoutes(repository, access) {
  const router = Router();
  const controller = createSettingsController(repository);

  router.get('/settings', asyncHandler(controller.get));
  router.put(
    '/admin/settings',
    access.required,
    access.admin,
    asyncHandler(controller.update)
  );

  return router;
}
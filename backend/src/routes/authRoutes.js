import { Router } from 'express';
import { createAuthController } from '../controllers/authController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export function createAuthRoutes(store, access) {
  const router = Router();
  const controller = createAuthController(store, access);
  router.post('/auth/register', asyncHandler(controller.register));
  router.post('/auth/login', asyncHandler(controller.login));
  router.get('/auth/me', controller.me);
  router.post('/auth/logout', asyncHandler(controller.logout));
  router.get('/profile', access.required, controller.me);
  return router;
}

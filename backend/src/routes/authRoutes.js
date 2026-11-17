import { Router } from 'express';
import { createAuthController } from '../controllers/authController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export function createAuthRoutes(store, access, options) {
  const router = Router();
  const controller = createAuthController(store, access, options);
  router.post('/auth/register', asyncHandler(controller.register));
  router.post('/auth/login', asyncHandler(controller.login));
  router.post('/auth/google', asyncHandler(controller.googleLogin));
  router.post('/auth/password-reset/request', asyncHandler(controller.requestPasswordReset));
  router.post('/auth/password-reset/complete', asyncHandler(controller.completePasswordReset));
  router.get('/auth/me', controller.me);
  router.post('/auth/logout', asyncHandler(controller.logout));
  router.get('/profile', access.required, controller.me);
  return router;
}

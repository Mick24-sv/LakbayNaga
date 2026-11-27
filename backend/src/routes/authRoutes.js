import { Router } from 'express';
import { createAuthController } from '../controllers/authController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { rateLimit } from '../middleware/rateLimit.js';

export function createAuthRoutes(store, access, options) {
  const router = Router();
  const controller = createAuthController(store, access, options);
  const signInLimit = rateLimit({ limit: 10, windowMs: 15 * 60 * 1000 });
  const registrationLimit = rateLimit({ limit: 5, windowMs: 60 * 60 * 1000 });
  const passwordResetRequestLimit = rateLimit({ limit: 5, windowMs: 60 * 60 * 1000 });
  const passwordResetCompleteLimit = rateLimit({ limit: 10, windowMs: 15 * 60 * 1000 });
  const passwordChangeLimit = rateLimit({ limit: 5, windowMs: 15 * 60 * 1000 });

  router.post('/auth/register', registrationLimit, asyncHandler(controller.register));
  router.post('/auth/login', signInLimit, asyncHandler(controller.login));
  router.post('/auth/google', signInLimit, asyncHandler(controller.googleLogin));
  router.post('/auth/password-reset/request', passwordResetRequestLimit, asyncHandler(controller.requestPasswordReset));
  router.post('/auth/password-reset/complete', passwordResetCompleteLimit, asyncHandler(controller.completePasswordReset));
  router.get('/auth/me', controller.me);
  router.post('/auth/logout', asyncHandler(controller.logout));
  router.get('/profile', access.required, controller.me);
  router.put('/profile', access.required, asyncHandler(controller.updateProfile));
  router.put('/profile/password', access.required, passwordChangeLimit, asyncHandler(controller.changePassword));
  return router;
}

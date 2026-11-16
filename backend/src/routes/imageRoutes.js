import express, { Router } from 'express';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { Image } from '../models/Image.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const maxBytes = 5 * 1024 * 1024;
const pngStart = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function detectType(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(pngStart)) {
    return 'image/png';
  }
  if (
    buffer.length > 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

const unavailable = res =>
  res.status(503).json({ error: 'Image storage is not available.' });

export function createImageRoutes(access) {
  const router = Router();
  const upload = express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: maxBytes
  });

  router.post(
    '/admin/images',
    access.required,
    access.admin,
    upload,
    asyncHandler(async (req, res) => {
      if (mongoose.connection.readyState !== 1) return unavailable(res);

      const body = req.body;
      if (!Buffer.isBuffer(body) || !body.length) {
        return res.status(400).json({ error: 'Send a JPEG, PNG, or WebP image.' });
      }

      const contentType = detectType(body);
      if (!contentType) {
        return res.status(400).json({ error: 'The file is not a supported image.' });
      }

      const id = randomBytes(16).toString('hex');
      await Image.create({
        id,
        contentType,
        size: body.length,
        data: body,
        uploadedBy: String(req.user._id)
      });

      res.status(201).json({ url: '/api/images/' + id });
    })
  );

  router.get(
    '/images/:id',
    asyncHandler(async (req, res) => {
      if (mongoose.connection.readyState !== 1) return unavailable(res);
      if (!/^[a-f0-9]{32}$/.test(req.params.id)) {
        return res.status(404).json({ error: 'Image not found.' });
      }

      const image = await Image.findOne({ id: req.params.id });
      if (!image) return res.status(404).json({ error: 'Image not found.' });

      res.set({
        'Content-Type': image.contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=86400'
      });
      res.send(image.data);
    })
  );

  return router;
}
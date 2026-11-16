import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { Itinerary } from '../models/Itinerary.js';
import { Image } from '../models/Image.js';
import { Setting } from '../models/Setting.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { makeMongoItineraryRepository } from '../repositories/mongoItineraryRepository.js';
import { makeSettingsRepository } from '../repositories/settingsRepository.js';
import { makeImageRepository } from '../repositories/imageRepository.js';

// Use uniquely named collections; never write to the real application collections.
dotenv.config({ path: new URL('../../.env', import.meta.url) });
const prefix = 'verify_db04_' + randomBytes(8).toString('hex');
const collectionNames = [prefix + '_trips', prefix + '_images', prefix + '_settings'];
const TripModel = mongoose.model(prefix + '_Trip', Itinerary.schema.clone(), collectionNames[0]);
const ImageModel = mongoose.model(prefix + '_Image', Image.schema.clone(), collectionNames[1]);
const SettingModel = mongoose.model(prefix + '_Setting', Setting.schema.clone(), collectionNames[2]);
const tripRepository = () => makeMongoItineraryRepository({ model: TripModel });
const imageRepository = () => makeImageRepository({ persistent: true, model: ImageModel });
const settingsRepository = () => makeSettingsRepository({ persistent: true, model: SettingModel });
const owner = 'verification-owner';
const other = 'verification-other';
const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFRsAAAAASUVORK5CYII=', 'base64');
let connected = false;

try {
  await connectDatabase();
  connected = true;
  const trips = tripRepository();
  const images = imageRepository();
  const settings = settingsRepository();
  await trips.initialize(); await images.initialize(); await settings.initialize();
  const image = await images.create({ contentType: 'image/png', data: imageBytes, uploadedBy: owner });
  const imageUrl = '/api/images/' + image.id;
  await settings.save({ logo: imageUrl, hero: imageUrl });
  await settings.save({ account: imageUrl });
  await settings.save({ hero: '' });
  const trip = await trips.create(owner, { name: 'Original', plan: { stops: [{ id: 'fixture' }] } });
  assert.equal(await trips.find(trip.id, other), null);
  assert.equal(await trips.update(trip.id, other, { name: 'Forbidden', plan: {} }), null);
  assert.equal(await trips.delete(trip.id, other), false);
  assert.equal(await trips.find('invalid-id', owner), null);
  const updated = await trips.update(trip.id, owner, { name: 'Updated', plan: { stops: [{ id: 'updated' }] } });
  assert.equal(updated.name, 'Updated');
  assert.equal(updated.createdAt, trip.createdAt);
  console.log('Trip ownership, update, and invalid IDs: passed');
  await disconnectDatabase();
  await connectDatabase();
  assert.equal((await tripRepository().find(trip.id, owner)).name, 'Updated');
  assert.equal((await tripRepository().list(owner)).length, 1);
  const savedImage = await imageRepository().find(image.id);
  assert.equal(savedImage.contentType, 'image/png');
  assert.equal(savedImage.size, imageBytes.length);
  assert.deepEqual(savedImage.data, imageBytes);
  const savedSettings = await settingsRepository().get();
  assert.deepEqual(savedSettings, { logo: imageUrl, hero: '', account: imageUrl });
  console.log('Trips, image bytes, and settings survive reconnection: passed');
  assert.equal(await tripRepository().delete(trip.id, owner), true);
  assert.equal(await tripRepository().find(trip.id, owner), null);
  console.log('Owner delete: passed');
} catch (error) {
  console.error('DB-04 verification failed. Error type: ' + error.name + '; code: ' + error.code);
  console.error('Check MongoDB credentials, network access, and verification database permissions.');
  process.exitCode = 1;
} finally {
  try {
    if (connected) {
      if (mongoose.connection.readyState !== 1) await connectDatabase();
      for (const name of collectionNames) {
        if (!name.startsWith(prefix + '_') || !/^verify_db04_[a-f0-9]{16}_(trips|images|settings)$/.test(name)) {
          throw new Error('Verification collection identity mismatch.');
        }
        try { await mongoose.connection.db.collection(name).drop(); }
        catch (error) { if (error.code !== 26) throw error; }
      }
      console.log('Verification collections removed. Real application records were not modified.');
    }
  } catch {
    console.error('Verification cleanup failed. Remove only these temporary collections: ' + collectionNames.join(', '));
    process.exitCode = 1;
  } finally { await disconnectDatabase(); }
}

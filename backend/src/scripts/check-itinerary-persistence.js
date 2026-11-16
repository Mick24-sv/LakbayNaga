import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { makeMongoItineraryRepository } from '../repositories/mongoItineraryRepository.js';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

const owner = 'db04-owner-check';
const other = 'db04-other-check';
let createdId;

try {
  await connectDatabase();
  const repository = makeMongoItineraryRepository();
  await repository.initialize();

  const created = await repository.create(owner, {
    name: 'DB-04 check',
    plan: { stops: [] }
  });
  createdId = created.id;

  await disconnectDatabase();
  await connectDatabase();

  const reconnected = makeMongoItineraryRepository();
  const saved = await reconnected.find(createdId, owner);
  assert.equal(saved?.name, 'DB-04 check');
  console.log('Saved itinerary survives reconnection: passed');

  assert.equal(await reconnected.find(createdId, other), null);
  assert.equal(await reconnected.find('not-an-id', owner), null);
  console.log('Ownership and invalid ID checks: passed');
} catch (error) {
  console.error('Itinerary persistence check failed. Error type: ' + error.name);
  process.exitCode = 1;
} finally {
  try {
    if (mongoose.connection.readyState !== 1) await connectDatabase();
    if (createdId) {
      await makeMongoItineraryRepository().delete(createdId, owner);
    }
    console.log('Temporary verification record removed.');
  } catch {
    console.error('Could not clean up the test itinerary. Its ID is: ' + createdId);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}
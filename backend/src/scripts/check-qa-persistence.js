// QA-01 persistence check: all writes use uniquely named, temporary collections.
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { PasswordReset } from '../models/PasswordReset.js';
import { Itinerary } from '../models/Itinerary.js';
import { makeMongoAuthStore } from '../repositories/mongoAuthStore.js';
import { makeMongoItineraryRepository } from '../repositories/mongoItineraryRepository.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';

dotenv.config({ path: new URL('../../.env', import.meta.url) });
const prefix = 'verify_qa01_' + randomBytes(8).toString('hex');
const definitions = { users: User, sessions: Session, resets: PasswordReset, trips: Itinerary };
const models = {};
const collections = [];
for (const [key, Model] of Object.entries(definitions)) {
  const collection = prefix + '_' + key;
  collections.push(collection);
  models[key] = mongoose.model(prefix + '_' + key, Model.schema.clone(), collection);
}
let connected = false;
let server;
try {
  await connectDatabase(); connected = true;
  const store = makeMongoAuthStore({ models: { User: models.users, Session: models.sessions, PasswordReset: models.resets } });
  const repository = makeMongoItineraryRepository({ model: models.trips });
  await store.initialize(); await repository.initialize();
  server = createApp({ store, itineraryRepository: repository, attractionData: [{ id: 'qa-plaza', name: 'QA fixture', category: 'City spaces', area: 'Naga', description: 'Temporary QA fixture', cost: 25, duration: 30, published: true, archived: false }] }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  const request = (path, method = 'GET', body, cookie = '') => fetch(base + path, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const email = prefix + '@example.test';
  const registered = await request('/auth/register', 'POST', { firstName: 'QA', lastName: 'Fixture', email, password: 'qa-persistence-password-123' });
  assert.equal(registered.status, 200);
  let cookie = registered.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/profile', 'PUT', { firstName: 'Updated QA', lastName: 'Fixture' }, cookie)).status, 200);
  const changed = await request('/profile/password', 'PUT', { currentPassword: 'qa-persistence-password-123', newPassword: 'qa-persistence-replacement-123' }, cookie);
  assert.equal(changed.status, 200);
  cookie = changed.headers.get('set-cookie').split(';')[0];
  const saved = await request('/itineraries', 'POST', { name: 'QA persistent trip', settings: { budget: 500, hours: 6, transport: 'walk' } }, cookie);
  assert.equal(saved.status, 201);
  const trip = await saved.json();
  await disconnectDatabase();
  await connectDatabase();
  const profile = await request('/profile', 'GET', undefined, cookie);
  assert.equal(profile.status, 200);
  assert.equal((await profile.json()).user.firstName, 'Updated QA');
  const loaded = await request('/itineraries/' + trip.id, 'GET', undefined, cookie);
  assert.equal(loaded.status, 200);
  assert.equal((await loaded.json()).plan.totals.total, 25);
  assert.equal((await request('/auth/login', 'POST', { email, password: 'qa-persistence-password-123' })).status, 401);
  assert.equal((await request('/auth/login', 'POST', { email, password: 'qa-persistence-replacement-123' })).status, 200);
  console.log('QA-01 MongoDB: profile, password, session and saved itinerary survive reconnection: passed');
} catch (error) {
  console.error('QA-01 MongoDB verification failed. Error type: ' + error.name + '; code: ' + error.code);
  process.exitCode = 1;
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  try {
    if (connected) {
      if (mongoose.connection.readyState !== 1) await connectDatabase();
      for (const name of collections) {
        if (!name.startsWith(prefix + '_') || !/^verify_qa01_[a-f0-9]{16}_(users|sessions|resets|trips)$/.test(name)) throw new Error('Unsafe verification collection identity');
        try { await mongoose.connection.db.collection(name).drop(); }
        catch (error) { if (error.code !== 26) throw error; }
      }
      console.log('QA-01 temporary collections removed. Application records unchanged.');
    }
  } catch {
    console.error('QA-01 cleanup failed. Remove only these temporary collections: ' + collections.join(', '));
    process.exitCode = 1;
  } finally { await disconnectDatabase(); }
}

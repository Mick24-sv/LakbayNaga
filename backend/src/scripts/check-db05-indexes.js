// DB-05 check: indexes and persistence. All writes use uniquely named, temporary collections.
import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { PasswordReset } from '../models/PasswordReset.js';
import { Attraction } from '../models/Attraction.js';
import { Itinerary } from '../models/Itinerary.js';
import { Image } from '../models/Image.js';
import { Setting } from '../models/Setting.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { makeMongoAuthStore } from '../repositories/mongoAuthStore.js';
import { makeMongoItineraryRepository } from '../repositories/mongoItineraryRepository.js';
import { makeImageRepository } from '../repositories/imageRepository.js';
import { makeSettingsRepository } from '../repositories/settingsRepository.js';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

const prefix = 'verify_db05_' + randomBytes(8).toString('hex');
const definitions = {
  users: User, sessions: Session, resets: PasswordReset, attractions: Attraction,
  trips: Itinerary, images: Image, settings: Setting
};
const models = {};
const collections = [];
for (const [key, Model] of Object.entries(definitions)) {
  const collection = prefix + '_' + key;
  collections.push(collection);
  models[key] = mongoose.model(prefix + '_' + key, Model.schema.clone(), collection);
}

// Every index the application relies on. ttl = expireAfterSeconds.
const expected = {
  users: [{ key: { email: 1 }, unique: true }, { key: { googleId: 1 }, unique: true, sparse: true }],
  sessions: [{ key: { digest: 1 }, unique: true }, { key: { expiresAt: 1 }, ttl: 0 }, { key: { userId: 1 } }],
  resets: [{ key: { digest: 1 }, unique: true }, { key: { expiresAt: 1 }, ttl: 0 }],
  attractions: [{ key: { id: 1 }, unique: true }],
  trips: [{ key: { ownerId: 1, createdAt: -1 } }],
  images: [{ key: { id: 1 }, unique: true }],
  settings: [{ key: { key: 1 }, unique: true }]
};

const future = new Date(Date.now() + 3600_000);
const sample = {
  users: i => ({ firstName: 'DB05', lastName: 'Fixture', email: 'u' + i + '@example.test', passwordHash: 'x' }),
  sessions: i => ({ digest: 's' + i, userId: 'user-' + (i % 5), expiresAt: future }),
  resets: i => ({ digest: 'r' + i, userId: 'user-' + i, expiresAt: future }),
  attractions: i => ({ id: 'a' + i, data: { name: 'Fixture ' + i } }),
  trips: i => ({ ownerId: 'owner-' + (i % 3), name: 'Trip ' + i, plan: {} }),
  images: i => ({ id: 'i' + i, contentType: 'image/png', size: 1, data: Buffer.from([i]), uploadedBy: 'owner' }),
  settings: i => ({ key: i === 0 ? 'site' : 'k' + i, value: {} })
};
const SAMPLE_COUNT = 30;

// Each query below is copied from a repository method. noSort = the index must also supply the sort order.
const plans = [
  { model: 'users', name: 'user lookup by email', filter: { email: 'u1@example.test' } },
  { model: 'users', name: 'user lookup by Google ID', filter: { googleId: 'g-1' } },
  { model: 'sessions', name: 'session lookup by digest', filter: { digest: 's1', expiresAt: { $gt: new Date() } } },
  { model: 'sessions', name: 'revoke all sessions for a user', filter: { userId: 'user-1' } },
  { model: 'resets', name: 'password reset lookup', filter: { digest: 'r1', expiresAt: { $gt: new Date() } } },
  { model: 'attractions', name: 'attraction list sorted by id', filter: {}, sort: { id: 1 }, noSort: true },
  { model: 'trips', name: 'saved trips for owner, newest first', filter: { ownerId: 'owner-1' }, sort: { createdAt: -1 }, noSort: true },
  { model: 'trips', name: 'saved trip by id and owner', filter: { _id: new mongoose.Types.ObjectId(), ownerId: 'owner-1' } },
  { model: 'images', name: 'image lookup by id', filter: { id: 'i1' } },
  { model: 'settings', name: 'site settings lookup', filter: { key: 'site' } }
];

function stagesOf(node, found = []) {
  if (Array.isArray(node)) node.forEach(item => stagesOf(item, found));
  else if (node && typeof node === 'object') {
    if (typeof node.stage === 'string') found.push(node.stage);
    Object.values(node).forEach(value => stagesOf(value, found));
  }
  return found;
}

async function assertIndexes(label) {
  for (const [name, wanted] of Object.entries(expected)) {
    const actual = await models[name].listIndexes();
    for (const want of wanted) {
      const where = label + ' ' + name + ' ' + JSON.stringify(want.key);
      const found = actual.find(index => JSON.stringify(index.key) === JSON.stringify(want.key));
      assert.ok(found, where + ': index is missing');
      assert.equal(Boolean(found.unique), Boolean(want.unique), where + ': unique flag differs');
      assert.equal(Boolean(found.sparse), Boolean(want.sparse), where + ': sparse flag differs');
      assert.equal(found.expireAfterSeconds, want.ttl, where + ': TTL setting differs');
    }
  }
}

async function assertDuplicatesRejected(label) {
  const rejected = code => error => error.code === code;

  for (const name of ['users', 'sessions', 'resets', 'attractions', 'images', 'settings']) {
    await assert.rejects(
      models[name].create(sample[name](0)),
      rejected(11000),
      label + ' ' + name + ': duplicate was accepted'
    );
  }

  // Use unique values on every invocation so the test works
  // both before and after reconnecting.
  const unique = randomBytes(8).toString('hex');

  const other = {
    ...sample.users(900),
    email: 'google-' + unique + '@example.test',
    googleId: 'g-' + unique
  };

  await models.users.create(other);

  await assert.rejects(
    models.users.create({
      ...sample.users(901),
      googleId: 'g-' + unique
    }),
    rejected(11000),
    label + ' users: duplicate Google ID was accepted'
  );
}

let connected = false;
try {
  await connectDatabase(); connected = true;

  // Same startup path as server.js: the connection disables autoIndex, so indexes exist only if initialize() runs.
  const initialize = async () => {
    const store = makeMongoAuthStore({ models: { User: models.users, Session: models.sessions, PasswordReset: models.resets } });
    await store.initialize();
    await models.attractions.createIndexes();
    await makeMongoItineraryRepository({ model: models.trips }).initialize();
    await makeImageRepository({ persistent: true, model: models.images }).initialize();
    await makeSettingsRepository({ persistent: true, model: models.settings }).initialize();
  };
  await initialize();
  await initialize(); // Startup runs on every boot, so repeating it must not fail.
  await assertIndexes('after startup');
  console.log('Required indexes created by startup initialization (and safe to repeat): passed');

  for (const name of Object.keys(sample)) {
    await models[name].insertMany(Array.from({ length: SAMPLE_COUNT }, (_, i) => sample[name](i)));
  }
  await assertDuplicatesRejected('before reconnect');
  console.log('Unique indexes reject duplicates (email, digest, id, key, Google ID): passed');

  for (const plan of plans) {
    const cursor = models[plan.model].collection.find(plan.filter, plan.sort ? { sort: plan.sort } : {});
    const explained = await cursor.explain('queryPlanner');
    const stages = stagesOf(explained.queryPlanner?.winningPlan);
    const label = plan.model + ' / ' + plan.name + ' [' + stages.join(' > ') + ']';
    assert.ok(!stages.includes('COLLSCAN'), label + ': full collection scan');
    assert.ok(stages.some(stage => /IXSCAN|IDHACK/.test(stage)), label + ': no index used');
    if (plan.noSort) assert.ok(!stages.includes('SORT'), label + ': in-memory sort needed');
  }
  console.log('Every repository query uses an index (no collection scans, no in-memory sorts): passed');

  await disconnectDatabase();
  await connectDatabase();
  await assertIndexes('after reconnect');
  await assertDuplicatesRejected('after reconnect');
  for (const name of Object.keys(sample)) {
    assert.ok(await models[name].countDocuments() >= SAMPLE_COUNT, name + ': records missing after reconnect');
  }
  console.log('Indexes, uniqueness rules and records survive reconnection: passed');
  console.log('Note: TTL index settings were verified. Actual expiry cleanup runs in MongoDB roughly every 60 seconds and was not waited for.');
} catch (error) {
  console.error('DB-05 verification failed. Error type: ' + error.name + '; code: ' + error.code);
  // Assertion text names only an index or query, never credentials, so it is safe to show.
  if (error.name === 'AssertionError') console.error(error.message);
  console.error('Fix the reported index or check MongoDB credentials, network access, and index-creation permission.');
  process.exitCode = 1;
} finally {
  try {
    if (connected) {
      if (mongoose.connection.readyState !== 1) await connectDatabase();
      for (const name of collections) {
        if (!name.startsWith(prefix + '_') || !/^verify_db05_[a-f0-9]{16}_(users|sessions|resets|attractions|trips|images|settings)$/.test(name)) {
          throw new Error('Unsafe verification collection identity');
        }
        try { await mongoose.connection.db.collection(name).drop(); }
        catch (error) { if (error.code !== 26) throw error; }
      }
      console.log('Verification collections removed. Real application records were not modified.');
    }
  } catch {
    console.error('DB-05 cleanup failed. Remove only these temporary collections: ' + collections.join(', '));
    process.exitCode = 1;
  } finally { await disconnectDatabase(); }
}

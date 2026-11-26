import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  connectDatabase,
  requireDatabaseInProduction
} from '../../src/config/database.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

function runErrorHandler(error) {
  const logged = [];
  const realError = console.error;
  console.error = (...parts) => logged.push(parts.join(' '));

  let sent;
  const res = {
    status(code) { this.code = code; return this; },
    json(body) { sent = { code: this.code, body }; return this; }
  };

  try {
    errorHandler(error, {}, res, () => {});
  } finally {
    console.error = realError;
  }
  return { sent, logged: logged.join(' ') };
}

test('SEC-03: production refuses to start without MONGODB_URI', () => {
  assert.throws(
    () => requireDatabaseInProduction({ NODE_ENV: 'production' }),
    /MONGODB_URI is required/
  );
  assert.throws(
    () => requireDatabaseInProduction({ NODE_ENV: 'production', MONGODB_URI: '' }),
    /MONGODB_URI is required/
  );
});

test('SEC-03: development and test runs may still use temporary memory storage', () => {
  assert.doesNotThrow(() => requireDatabaseInProduction({}));
  assert.doesNotThrow(() => requireDatabaseInProduction({ NODE_ENV: 'development' }));
  assert.doesNotThrow(() => requireDatabaseInProduction({ NODE_ENV: 'test' }));
});

test('SEC-03: production with a configured database starts normally', () => {
  assert.doesNotThrow(() =>
    requireDatabaseInProduction({ NODE_ENV: 'production', MONGODB_URI: 'configured' })
  );
});

test('SEC-03: connecting without MONGODB_URI fails with a message that names no value', async () => {
  const saved = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  try {
    await assert.rejects(connectDatabase(), { message: 'MONGODB_URI is not configured.' });
  } finally {
    if (saved !== undefined) process.env.MONGODB_URI = saved;
  }
});

test('SEC-03: an unexpected error that contains a connection string is not sent or logged', () => {
  const secret = 'sec03-' + randomBytes(6).toString('hex');
  // The string is assembled in pieces so no URI with a password sits in this file.
  const message = 'connect failed for mongodb+srv://user:' + secret + '@cluster.example.test';

  const { sent, logged } = runErrorHandler(new Error(message));

  assert.equal(sent.code, 500);
  assert.equal(JSON.stringify(sent.body).includes(secret), false);
  assert.equal(JSON.stringify(sent.body).includes('mongodb'), false);
  assert.equal(logged.includes(secret), false);
  assert.equal(logged.includes('mongodb'), false);
});

test('SEC-03: database error classes are reported by name only', () => {
  const error = Object.assign(new Error('authentication failed for user secret-user'), {
    name: 'MongoServerError',
    code: 18
  });

  const { sent, logged } = runErrorHandler(error);

  assert.equal(sent.code, 500);
  assert.equal(logged.includes('secret-user'), false);
  assert.ok(logged.includes('MongoServerError'));
});
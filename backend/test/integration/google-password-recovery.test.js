import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { makeStore } from '../../src/repositories/memoryStore.js';

async function fixture(check, options = {}) {
  const store = makeStore();
  const server = createApp({ store, ...options }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = (path, body) => fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  try { await check({ store, request }); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

const googleClaims = {
  sub: 'google-subject-1', email: 'google@example.test', email_verified: true,
  given_name: 'Google', family_name: 'Tester'
};

test('Google login creates a user/session for a verified credential and rejects invalid credentials', () =>
  fixture(async ({ store, request }) => {
    const invalid = await request('/auth/google', { credential: 'bad-token' });
    assert.equal(invalid.status, 401);
    assert.equal(invalid.headers.get('set-cookie'), null);

    const valid = await request('/auth/google', { credential: 'valid-token' });
    assert.equal(valid.status, 200);
    const { user } = await valid.json();
    assert.equal(user.email, googleClaims.email);
    assert.equal(user.passwordHash, undefined);
    assert.ok(valid.headers.get('set-cookie'));
    assert.equal((await store.userByEmail(googleClaims.email)).googleId, googleClaims.sub);
  }, { google: { verifyIdToken: async token => token === 'valid-token' ? googleClaims : null } })
);

test('password recovery hides account existence and reset token is one-time', () => {
  let delivered;
  return fixture(async ({ request }) => {
    await request('/auth/register', { firstName: 'Recover', lastName: 'Me', email: 'recover@example.test', password: 'original-password-123' });
    const existing = await request('/auth/password-reset/request', { email: 'recover@example.test' });
    assert.equal(existing.status, 200);
    const existingBody = await existing.json();
    assert.match(existingBody.message, /If an account matches/);
    assert.equal(delivered.email, 'recover@example.test');
    const token = new URL(delivered.link).hash.match(/[?&]token=([^&]+)/)?.[1];
    assert.ok(token);

    const missing = await request('/auth/password-reset/request', { email: 'missing@example.test' });
    assert.deepEqual(await missing.json(), existingBody);
    assert.equal(delivered.email, 'recover@example.test');

    const weak = await request('/auth/password-reset/complete', { token: decodeURIComponent(token), password: 'short' });
    assert.equal(weak.status, 400);
    const changed = await request('/auth/password-reset/complete', { token: decodeURIComponent(token), password: 'replacement-password-123' });
    assert.equal(changed.status, 200);
    assert.equal((await request('/auth/password-reset/complete', { token: decodeURIComponent(token), password: 'another-password-123' })).status, 400);
    assert.equal((await request('/auth/login', { email: 'recover@example.test', password: 'original-password-123' })).status, 401);
    assert.equal((await request('/auth/login', { email: 'recover@example.test', password: 'replacement-password-123' })).status, 200);
  }, { mailer: async message => { delivered = message; } });
});

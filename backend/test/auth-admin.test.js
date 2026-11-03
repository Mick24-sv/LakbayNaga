import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createApp } from '../src/app.js';
import { makeStore } from '../src/store.js';
import { hashPassword } from '../src/auth.js';

const attractionData = [
  { id: 'public', published: true, archived: false },
  { id: 'draft', published: false, archived: false },
  { id: 'archived', published: true, archived: true }
];

async function fixture(check) {
  const store = makeStore();
  const server = createApp({ store, attractionData }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const request = (path, { cookie, body } = {}) => fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  async function login(role = 'user') {
    const email = role + '@permissions.test';
    await store.addUser({ firstName: 'Access', lastName: 'Tester', email,
      passwordHash: await hashPassword('test-password-12345'), role });
    const response = await request('/api/auth/login', {
      body: { email, password: 'test-password-12345' }
    });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  }
  try { await check({ request, login, store }); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('BE-05: guests and forged sessions cannot access protected endpoints', () =>
  fixture(async ({ request }) => {
    for (const path of ['/api/profile', '/api/admin/attractions']) {
      for (const cookie of ['', 'lakbay_session=forged']) {
        const response = await request(path, { cookie });
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { error: 'Please log in to continue.' });
      }
    }
    assert.equal((await request('/api/attractions')).status, 200);
  })
);

test('BE-05: ordinary users can access their profile but not administrator data', () =>
  fixture(async ({ request, login }) => {
    const cookie = await login();
    const profile = await request('/api/profile', { cookie });
    assert.equal(profile.status, 200);
    const { user } = await profile.json();
    assert.equal(user.email, 'user@permissions.test');
    assert.equal(user.passwordHash, undefined);
    const denied = await request('/api/admin/attractions', { cookie });
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: 'Administrator access is required.' });
  })
);

test('BE-05: admins can inspect all attractions while public browsing hides private entries', () =>
  fixture(async ({ request, login }) => {
    const cookie = await login('admin');
    const response = await request('/api/admin/attractions', { cookie });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), attractionData);
    const publicResponse = await request('/api/attractions');
    assert.deepEqual((await publicResponse.json()).map(place => place.id), ['public']);
  })
);

test('BE-05: registration cannot grant administrator privileges', () =>
  fixture(async ({ request }) => {
    const response = await request('/api/auth/register', { body: {
      firstName: 'Ordinary', lastName: 'User', email: 'register@permissions.test',
      password: 'test-password-12345', role: 'admin'
    } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.role, 'user');
    const cookie = response.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/api/admin/attractions', { cookie })).status, 403);
  })
);

test('BE-05: expired and logged-out sessions lose protected access', () =>
  fixture(async ({ request, login, store }) => {
    const cookie = await login();
    const token = cookie.slice(cookie.indexOf('=') + 1);
    const digest = createHash('sha256').update(token).digest('hex');
    const session = await store.session(digest);
    await store.putSession(digest, { ...session, expiresAt: Date.now() - 1000 });
    assert.equal((await request('/api/profile', { cookie })).status, 401);

    const adminCookie = await login('admin');
    assert.equal((await request('/api/auth/logout', { cookie: adminCookie, body: {} })).status, 204);
    assert.equal((await request('/api/profile', { cookie: adminCookie })).status, 401);
    assert.equal((await request('/api/admin/attractions', { cookie: adminCookie })).status, 401);
  })
);

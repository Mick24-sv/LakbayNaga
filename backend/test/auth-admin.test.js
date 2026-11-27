import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createApp } from '../src/app.js';
import { makeStore } from '../src/repositories/memoryStore.js';

test('QA-01: cookie policy, hashed session storage, login rotation and logout invalidation', async () => {
  const previousMode = process.env.NODE_ENV;
  try {
    for (const mode of ['development', 'production']) {
      process.env.NODE_ENV = mode;
      const store = makeStore();
      const server = createApp({ store }).listen(0);
      await new Promise(resolve => server.once('listening', resolve));
      const base = 'http://127.0.0.1:' + server.address().port + '/api';
      const post = (path, body, cookie) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
      try {
        const details = { firstName: 'Cookie', lastName: 'QA', email: 'cookie@qa.test', password: 'qa-cookie-password-123' };
        const registration = await post('/auth/register', details);
        assert.equal(registration.status, 200);
        const header = registration.headers.get('set-cookie');
        assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Lax/); assert.match(header, /Path=\//);
        assert.equal(header.includes('; Secure'), mode === 'production');
        const original = header.split(';')[0];
        const token = original.split('=')[1];
        assert.equal(await store.session(token), null);
        assert.ok(await store.session(createHash('sha256').update(token).digest('hex')));
        const login = await post('/auth/login', { email: details.email, password: details.password }, original);
        assert.equal(login.status, 200);
        const fresh = login.headers.get('set-cookie').split(';')[0];
        assert.notEqual(original, fresh);
        const oldProfile = await fetch(base + '/profile', { headers: { Cookie: original } });
        assert.equal(oldProfile.status, 401);
        assert.equal((await post('/auth/logout', {}, fresh)).status, 204);
        assert.equal((await fetch(base + '/profile', { headers: { Cookie: fresh } })).status, 401);
      } finally { await new Promise(resolve => server.close(resolve)); }
    }
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
  }
});

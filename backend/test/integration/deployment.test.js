import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createApp } from '../../src/app.js';
import { runtimeConfig, httpsOrigin, ConfigurationError } from '../../src/config/runtime.js';

const production = { NODE_ENV: 'production', MONGODB_URI: 'mongodb+srv://fixture.invalid/test', FRONTEND_URL: 'https://lakbaynaga.example', PORT: '10000' };

test('DEPLOY: production rejects missing persistence, unsafe origins and invalid ports before startup', () => {
  assert.deepEqual(runtimeConfig({}), { port: 3001, production: false, persistent: false });
  assert.deepEqual(runtimeConfig(production), { port: 10000, production: true, persistent: true });
  for (const change of [{ MONGODB_URI: '' }, { MONGODB_URI: 'https://not-a-database.example' }, { FRONTEND_URL: '' }, { FRONTEND_URL: 'http://localhost:5173' }, { FRONTEND_URL: 'https://site.example/path' }, { FRONTEND_URL: 'https://user:secret@site.example' }, { PORT: 'NaN' }, { PORT: '-1' }, { PORT: '65536' }, { GOOGLE_CLIENT_ID: 'not-a-client-id' }]) {
    assert.throws(() => runtimeConfig({ ...production, ...change }), ConfigurationError);
  }
});

test('DEPLOY: API origin configuration rejects placeholders and credentials', () => {
  assert.equal(httpsOrigin('https://example-api.onrender.com/'), 'https://example-api.onrender.com');
  for (const url of ['https://replace.invalid', 'https://localhost', 'https://127.0.0.1', 'https://api.example/api', 'https://user:secret@api.example', 'https://api.example?secret=value']) assert.throws(() => httpsOrigin(url), ConfigurationError);
});

test('DEPLOY: readiness returns 503 for an unavailable database without exposing its error', async () => {
  for (const readiness of [() => true, () => false, async () => { throw new Error('private database connection details'); }]) {
    const server = createApp({ readiness }).listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    try {
      const base = 'http://127.0.0.1:' + server.address().port;
      const response = await fetch(base + '/api/ready');
      const body = await response.json();
      assert.ok([200, 503].includes(response.status));
      assert.deepEqual(body, { status: response.status === 200 ? 'ok' : 'unavailable' });
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal((await fetch(base + '/api/health')).status, 200);
      const session = await fetch(base + '/api/auth/me');
      assert.equal(session.headers.get('cache-control'), 'no-store');
    } finally { await new Promise(resolve => server.close(resolve)); }
  }
});

test('DEPLOY: invalid production startup exits before falling back to temporary storage', () => {
  const server = fileURLToPath(new URL('../../src/server.js', import.meta.url));
  const result = spawnSync(process.execPath, [server], { env: { ...process.env, NODE_ENV: 'production', MONGODB_URI: '', FRONTEND_URL: 'https://fixture.example' }, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Production requires MONGODB_URI/);
  assert.doesNotMatch(result.stdout, /API listening/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';

test('QA-01: concurrent password changes cannot both overwrite the same authenticated password', async () => {
  const server = createApp().listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  const request = (path, body, cookie, method = 'POST') => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  try {
    const email = 'concurrent@qa.test';
    const password = 'qa-original-password-123';
    const registered = await request('/auth/register', { firstName: 'Concurrent', lastName: 'QA', email, password });
    assert.equal(registered.status, 200);
    const cookie = registered.headers.get('set-cookie').split(';')[0];
    const replacements = ['qa-replacement-password-A', 'qa-replacement-password-B'];
    const attempts = await Promise.all(replacements.map(newPassword => request('/profile/password', { currentPassword: password, newPassword }, cookie, 'PUT')));
    assert.equal(attempts.filter(response => response.status === 200).length, 1);
    const winner = attempts.findIndex(response => response.status === 200);
    assert.ok([401, 409].includes(attempts[1 - winner].status));
    assert.equal((await request('/auth/login', { email, password: replacements[winner] })).status, 200);
    assert.equal((await request('/auth/login', { email, password: replacements[1 - winner] })).status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

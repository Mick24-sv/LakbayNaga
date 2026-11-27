import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { makeStore } from '../../src/repositories/memoryStore.js';
import { hashPassword } from '../../src/services/authService.js';

const places = [
  { id: 'plaza', name: 'QA plaza', category: 'City spaces', area: 'Naga', description: 'QA fixture', cost: 25, duration: 30, published: true, archived: false },
  { id: 'museum', name: 'QA museum', category: 'Culture & history', area: 'Naga', description: 'QA fixture', cost: 50, duration: 60, published: true, archived: false },
  { id: 'hidden', name: 'Private fixture', cost: 0, duration: 15, published: false, archived: false }
];
async function fixture(check) {
  const store = makeStore();
  const server = createApp({ store, attractionData: places }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  const request = (path, method = 'GET', body, cookie = '') => fetch(base + path, {
    method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const cookieOf = response => response.headers.get('set-cookie')?.split(';')[0];
  async function register(email) {
    const response = await request('/auth/register', 'POST', { firstName: 'QA', lastName: 'Tester', email, password: 'qa-original-password-123' });
    assert.equal(response.status, 200);
    return { cookie: cookieOf(response), user: (await response.json()).user };
  }
  try { await check({ request, store, register, base, cookieOf }); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('QA-01: visitor registers, plans, saves, edits, isolates and deletes their own itinerary, then logs out', () => fixture(async ({ request, register }) => {
  const publicPlaces = await (await request('/attractions')).json();
  assert.deepEqual(publicPlaces.map(p => p.id), ['plaza', 'museum']);
  assert.equal((await request('/itineraries/generate', 'POST', {})).status, 401);
  const owner = await register('owner@qa.test');
  const settings = { budget: 1500, hours: 6, days: 2, people: 2, foodPerPersonDay: 100, lodgingPerNight: 200, transport: 'public', startDate: '2026-12-31' };
  const generated = await request('/itineraries/generate', 'POST', settings, owner.cookie);
  assert.equal(generated.status, 200);
  const plan = await generated.json();
  assert.equal(plan.totals.admissions, 150);
  assert.equal(plan.totals.transportAllowance, 200);
  assert.equal(plan.totals.food, 400);
  assert.equal(plan.totals.lodging, 200);
  assert.equal(plan.totals.total, 950);
  assert.equal(plan.totals.remaining, 550);
  assert.equal(plan.days[1].date, '2027-01-01');
  const created = await request('/itineraries', 'POST', { name: 'New year trip', settings, ownerId: 'forged', plan: { totals: { total: -1 } } }, owner.cookie);
  assert.equal(created.status, 201);
  const trip = await created.json();
  assert.equal(trip.ownerId, owner.user.id);
  assert.equal(trip.plan.totals.total, 950);
  assert.equal((await (await request('/itineraries', 'GET', undefined, owner.cookie)).json()).length, 1);
  const other = await register('other@qa.test');
  for (const method of ['GET', 'PUT', 'DELETE']) {
    assert.equal((await request('/itineraries/' + trip.id, method, method === 'PUT' ? { name: 'Stolen', settings } : undefined, other.cookie)).status, 404);
  }
  const changed = await request('/itineraries/' + trip.id, 'PUT', { name: 'Updated trip', settings: { ...settings, people: 1 } }, owner.cookie);
  assert.equal(changed.status, 200);
  assert.equal((await changed.json()).plan.totals.total, 575);
  assert.equal((await request('/itineraries/' + trip.id, 'DELETE', undefined, owner.cookie)).status, 204);
  assert.deepEqual(await (await request('/itineraries', 'GET', undefined, owner.cookie)).json(), []);
  assert.equal((await request('/auth/logout', 'POST', {}, owner.cookie)).status, 204);
  assert.equal((await request('/itineraries/generate', 'POST', settings, owner.cookie)).status, 401);
}));

test('QA-01: admin creates/uploads/publishes/edits/archives/restores; public APIs and planner reflect the changes', () => fixture(async ({ request, store, base, cookieOf }) => {
  await store.addUser({ firstName: 'QA', lastName: 'Admin', email: 'admin@qa.test', role: 'admin', passwordHash: await hashPassword('qa-admin-password-123') });
  const login = await request('/auth/login', 'POST', { email: 'admin@qa.test', password: 'qa-admin-password-123' });
  assert.equal(login.status, 200); const cookie = cookieOf(login);
  const response = await request('/admin/attractions', 'POST', { name: 'QA garden', category: 'Nature & outdoors', area: 'Naga', description: 'A temporary test fixture', cost: 12.5, duration: 30 }, cookie);
  assert.equal(response.status, 201); const place = await response.json();
  assert.equal((await (await request('/attractions?q=QA%20garden')).json()).length, 0);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jBZkAAAAASUVORK5CYII=', 'base64');
  const upload = await fetch(base + '/admin/uploads', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'image/png' }, body: png });
  assert.equal(upload.status, 201); const image = await upload.json();
  const bytes = await fetch(base.replace(/\/api$/, '') + image.url);
  assert.equal(bytes.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await bytes.arrayBuffer()), png);
  assert.equal((await request('/admin/site-images', 'PUT', { logo: image.url }, cookie)).status, 200);
  assert.equal((await (await request('/site-images')).json()).logo, image.url);
  assert.equal((await request('/admin/attractions/' + place.id, 'PUT', { cost: 20.25, imageUrl: image.url }, cookie)).status, 200);
  assert.equal((await request('/admin/attractions/' + place.id + '/publish', 'PATCH', { published: true }, cookie)).status, 200);
  const settings = { budget: 100, hours: 6, transport: 'walk', preferences: ['Nature & outdoors'] };
  let plan = await (await request('/itineraries/generate', 'POST', settings, cookie)).json();
  assert.equal(plan.totals.total, 20.25);
  assert.equal(plan.stops[0].id, place.id);
  assert.equal((await request('/admin/attractions/' + place.id + '/archive', 'PATCH', { archived: true }, cookie)).status, 200);
  assert.deepEqual(await (await request('/attractions?q=QA%20garden')).json(), []);
  plan = await (await request('/itineraries/generate', 'POST', settings, cookie)).json();
  assert.deepEqual(plan.stops, []);
  assert.equal((await request('/admin/attractions/' + place.id + '/archive', 'PATCH', { archived: false }, cookie)).status, 200);
  assert.deepEqual(await (await request('/attractions?q=QA%20garden')).json(), [], 'Restoring must not publish without approval');
  assert.equal((await request('/admin/attractions/' + place.id + '/publish', 'PATCH', { published: true }, cookie)).status, 200);
  assert.equal((await (await request('/attractions?q=QA%20garden')).json()).length, 1);
}));

test('QA-01: profile updates are validated and cannot change roles, email or another account', () => fixture(async ({ request, register }) => {
  assert.equal((await request('/profile', 'PUT', { firstName: 'A', lastName: 'B' })).status, 401);
  assert.equal((await request('/profile/password', 'PUT', {})).status, 401);
  const owner = await register('profile@qa.test');
  for (const body of [[], null, {}, { firstName: ' ', lastName: 'Valid' }, { firstName: 'A'.repeat(61), lastName: 'B' }, { firstName: { $ne: '' }, lastName: 'B' }, { firstName: 'A', lastName: 'B', role: 'admin' }, { firstName: 'A', lastName: 'B', email: 'attacker@qa.test' }, { firstName: 'A', lastName: 'B', id: 'other' }]) {
    assert.equal((await request('/profile', 'PUT', body, owner.cookie)).status, 400);
  }
  const saved = await request('/profile', 'PUT', { firstName: '  Updated  ', lastName: '  Name  ' }, owner.cookie);
  assert.equal(saved.status, 200);
  const { user } = await saved.json();
  assert.equal(user.firstName, 'Updated'); assert.equal(user.lastName, 'Name');
  assert.equal(user.role, 'user'); assert.equal(user.email, 'profile@qa.test'); assert.equal(user.passwordHash, undefined);
  assert.equal((await (await request('/auth/me', 'GET', undefined, owner.cookie)).json()).user.firstName, 'Updated');
}));

test('QA-01: password changes verify current password, reject invalid input and rotate/revoke sessions', () => fixture(async ({ request, register, cookieOf }) => {
  const owner = await register('password@qa.test');
  const second = await request('/auth/login', 'POST', { email: owner.user.email, password: 'qa-original-password-123' });
  const secondCookie = cookieOf(second);
  assert.equal((await request('/profile/password', 'PUT', { currentPassword: 'wrong-password', newPassword: 'qa-replacement-password-123' }, owner.cookie)).status, 401);
  assert.equal((await request('/profile/password', 'PUT', { currentPassword: 'qa-original-password-123', newPassword: 'short' }, owner.cookie)).status, 400);
  const changed = await request('/profile/password', 'PUT', { currentPassword: 'qa-original-password-123', newPassword: 'qa-replacement-password-123' }, owner.cookie);
  assert.equal(changed.status, 200); const fresh = cookieOf(changed);
  assert.notEqual(fresh, owner.cookie);
  assert.equal((await changed.json()).user.passwordHash, undefined);
  for (const cookie of [owner.cookie, secondCookie]) assert.equal((await request('/profile', 'GET', undefined, cookie)).status, 401);
  assert.equal((await request('/profile', 'GET', undefined, fresh)).status, 200);
  assert.equal((await request('/auth/login', 'POST', { email: owner.user.email, password: 'qa-original-password-123' })).status, 401);
  assert.equal((await request('/auth/login', 'POST', { email: owner.user.email, password: 'qa-replacement-password-123' })).status, 200);
}));

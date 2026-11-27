import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createApp } from '../../src/app.js';
import { makeStore } from '../../src/repositories/memoryStore.js';
import { makeItineraryRepository } from '../../src/repositories/itineraryRepository.js';

const place = { id: 'public', name: 'Test plaza', category: 'City spaces', area: 'Naga', description: 'Fixture', cost: 25, duration: 30, published: true, archived: false };
const settings = { budget: 1500, hours: 6, transport: 'walk' };
const adminRoutes = [
  ['GET', '/admin/attractions'], ['POST', '/admin/attractions'],
  ['PUT', '/admin/attractions/public'], ['PATCH', '/admin/attractions/public/publish'],
  ['PATCH', '/admin/attractions/public/archive'], ['PUT', '/admin/settings'],
  ['PUT', '/admin/site-images'], ['POST', '/admin/images'], ['POST', '/admin/uploads']
];
async function fixture(check) {
  const store = makeStore();
  const trips = makeItineraryRepository();
  const server = createApp({ store, itineraryRepository: trips, attractionData: [place, { ...place, id: 'draft', published: false }] }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  async function request(path, method = 'GET', body, cookie = '') {
    return fetch(base + path, { method, headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  async function actor(role, label = role) {
    const user = await store.addUser({ firstName: 'Security', lastName: 'Tester', email: label + '@security.test', role, passwordHash: null });
    const token = randomBytes(32).toString('hex');
    await store.putSession(createHash('sha256').update(token).digest('hex'), { userId: user._id, expiresAt: Date.now() + 60000 });
    return { user, cookie: 'lakbay_session=' + token };
  }
  try { await check({ request, actor, store, trips }); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('SEC-01: every admin route rejects guests, forged sessions and ordinary users before mutations', () => fixture(async ({ request, actor }) => {
  const user = await actor('user');
  for (const [method, path] of adminRoutes) {
    for (const [cookie, expected] of [['', 401], ['lakbay_session=forged', 401], [user.cookie, 403]]) {
      const response = await request(path, method, method === 'GET' ? undefined : {}, cookie);
      assert.equal(response.status, expected, method + ' ' + path);
      assert.equal(typeof (await response.json()).error, 'string');
    }
  }
  const admin = await actor('admin');
  assert.equal((await request('/admin/attractions', 'GET', undefined, admin.cookie)).status, 200);
  assert.deepEqual((await (await request('/attractions')).json()).map(p => p.id), ['public']);
}));

test('SEC-01: protected planner and trip endpoints reject guests; changing role revokes admin access immediately', () => fixture(async ({ request, actor }) => {
  for (const [method, path] of [['GET', '/profile'], ['POST', '/itineraries/generate'], ['GET', '/itineraries'], ['POST', '/itineraries'], ['GET', '/itineraries/missing'], ['PUT', '/itineraries/missing'], ['DELETE', '/itineraries/missing']]) {
    assert.equal((await request(path, method, ['POST', 'PUT'].includes(method) ? {} : undefined)).status, 401);
  }
  const admin = await actor('admin');
  admin.user.role = 'user';
  assert.equal((await request('/admin/attractions', 'GET', undefined, admin.cookie)).status, 403);
}));

test('SEC-01: forged owner IDs cannot expose, transfer, modify or delete another user trip', () => fixture(async ({ request, actor }) => {
  const owner = await actor('user', 'owner');
  const other = await actor('user', 'other');
  const admin = await actor('admin');
  const created = await request('/itineraries', 'POST', { name: 'Private trip', settings, ownerId: other.user._id, plan: { totals: { total: -100 } } }, owner.cookie);
  assert.equal(created.status, 201);
  const trip = await created.json();
  assert.equal(trip.ownerId, String(owner.user._id));
  assert.equal(trip.plan.totals.total, 25);
  for (const outsider of [other, admin]) {
    assert.deepEqual(await (await request('/itineraries?ownerId=' + owner.user._id, 'GET', undefined, outsider.cookie)).json(), []);
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const response = await request('/itineraries/' + trip.id + '?ownerId=' + owner.user._id, method, method === 'PUT' ? { name: 'Stolen', settings, ownerId: outsider.user._id } : undefined, outsider.cookie);
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { error: 'Itinerary not found.' });
    }
  }
  assert.deepEqual(await (await request('/itineraries/' + trip.id, 'GET', undefined, owner.cookie)).json(), trip);
}));

test('SEC-01: structured and oversized input is rejected without changing stored records', () => fixture(async ({ request, actor }) => {
  const admin = await actor('admin');
  const user = await actor('user');
  for (const path of ['/attractions?q[$ne]=x', '/attractions?q=a&q=b', '/attractions?category[$regex]=.*', '/attractions?q=' + 'x'.repeat(201), '/attractions?category=' + 'x'.repeat(41)]) {
    assert.equal((await request(path)).status, 400, path);
  }
  for (const bad of [{ budget: { $gt: 0 } }, { people: { $ne: 1 } }, { preferences: { $in: ['City spaces'] } }, { preferences: Array(33).fill('City spaces') }, { hours: 'Infinity' }, { days: 1.5 }]) {
    assert.equal((await request('/itineraries/generate', 'POST', { ...settings, ...bad }, user.cookie)).status, 400);
    assert.equal((await request('/itineraries', 'POST', { name: 'Bad', settings: { ...settings, ...bad } }, user.cookie)).status, 400);
  }
  for (const bad of [{ cost: { $gt: 0 } }, { published: 'true' }, { lat: { $ne: null }, lng: 123 }, { name: { $regex: '.*' } }]) {
    assert.equal((await request('/admin/attractions/public', 'PUT', bad, admin.cookie)).status, 400);
  }
  assert.deepEqual(await (await request('/admin/attractions', 'GET', undefined, admin.cookie)).json(), [place, { ...place, id: 'draft', published: false }]);
  assert.deepEqual(await (await request('/itineraries', 'GET', undefined, user.cookie)).json(), []);
  const login = await request('/auth/login', 'POST', { email: { $ne: null }, password: { $ne: null } });
  assert.equal(login.status, 401);
  assert.equal(login.headers.get('set-cookie'), null);
}));

test('SEC-05: attraction image fields reject scriptable, external, traversal, and malformed URLs', () => fixture(async ({ request, actor }) => {
  const admin = await actor('admin');
  const base = {
    name: 'URL security fixture', category: 'City spaces', area: 'Naga',
    description: 'A safe test record.', cost: 0, duration: 30,
    published: false, featured: false, imageUrl: '', galleryImages: []
  };
  const unsafeUrls = [
    'javascript:alert(1)', 'data:image/svg+xml,<svg onload=alert(1)>',
    'https://attacker.example/image.png', '//attacker.example/image.png',
    '/api/images/not-a-valid-id', '/assets/../private.svg',
    '/api/images/' + 'G'.repeat(32)
  ];
  for (const imageUrl of unsafeUrls) {
    const response = await request('/admin/attractions', 'POST', { ...base, imageUrl }, admin.cookie);
    assert.equal(response.status, 400, imageUrl);
  }
  for (const galleryImages of [['javascript:alert(1)'], ['//attacker.example/a.png'], ['/assets/placeholder.svg']]) {
    const response = await request('/admin/attractions', 'POST', { ...base, galleryImages }, admin.cookie);
    assert.equal(response.status, 400, JSON.stringify(galleryImages));
  }
  assert.equal((await request('/admin/attractions', 'GET', undefined, admin.cookie)).status, 200);
  assert.equal((await (await request('/admin/attractions', 'GET', undefined, admin.cookie)).json()).length, 2);
}));

test('SEC-05: malicious-looking attraction names and descriptions are preserved as plain text data', () => fixture(async ({ request, actor }) => {
  const admin = await actor('admin');
  const payload = {
    name: '<script>alert("name")</script>',
    category: 'City spaces',
    area: '<img src=x onerror=alert("area")>',
    description: '</p><svg onload=alert("description")></svg>',
    cost: 0, duration: 30, published: true, featured: false,
    imageUrl: '/assets/placeholder.svg', galleryImages: []
  };
  const created = await request('/admin/attractions', 'POST', payload, admin.cookie);
  assert.equal(created.status, 201);
  const stored = await created.json();
  assert.equal(stored.name, payload.name);
  assert.equal(stored.description, payload.description);
  const publicPlaces = await (await request('/attractions')).json();
  const visible = publicPlaces.find(place => place.id === stored.id);
  assert.equal(visible.name, payload.name);
  assert.equal(visible.area, payload.area);
  assert.equal(visible.description, payload.description);
}));

import test from 'node:test';
import assert from 'node:assert/strict';
import { planItinerary, InputError } from '../../src/services/plannerService.js';
import { createApp } from '../../src/app.js';

const places = [
  { id: 'plaza', name: 'Test Plaza', category: 'City spaces', area: 'Center', cost: 0, duration: 30, lat: 13.62, lng: 123.18, published: true, archived: false },
  { id: 'museum', name: 'Test Museum', category: 'Culture & history', area: 'Center', cost: 50, duration: 60, lat: 13.63, lng: 123.19, published: true, archived: false },
  { id: 'park', name: 'Test Park', category: 'Nature & outdoors', area: 'Uptown', cost: 25, duration: 45, lat: 13.64, lng: 123.20, published: true, archived: false },
  { id: 'draft', category: 'City spaces', cost: 0, duration: 15, published: false },
  { id: 'archived', category: 'City spaces', cost: 0, duration: 15, published: true, archived: true }
];

test('BE-07: plans respect whole-group budgets and daily time across boundary settings', () => {
  for (const budget of [0, 49, 50, 100, 1500]) {
    for (const hours of [1, 6, 12]) {
      for (const people of [1, 3, 20]) {
        const plan = planItinerary({ budget, hours, people, days: 2 }, places);
        assert.ok(plan.totals.total <= budget);
        assert.ok(plan.totals.remaining >= 0);
        assert.ok(plan.days.every(day => day.minutes <= hours * 60));
        assert.equal(plan.totals.total,
          plan.totals.admissions + plan.totals.transportAllowance + plan.totals.food + plan.totals.lodging);
        for (const day of plan.days) {
          for (const stop of day.stops) assert.ok(stop.startMinutes + stop.duration <= hours * 60);
        }
      }
    }
  }
});

test('BE-07: multiple days preserve unique stops, group allowances, and calendar dates', () => {
  const plan = planItinerary({ budget: 10000, hours: 6, people: 2, days: 3,
    startDate: '2026-12-31', foodPerPersonDay: 100, lodgingPerNight: 200 }, places);
  assert.equal(plan.days.length, 3);
  assert.equal(plan.days[1].date, '2027-01-01');
  assert.equal(plan.days[2].date, '2027-01-02');
  assert.equal(plan.totals.food, 600);
  assert.equal(plan.totals.lodging, 400);
  assert.equal(new Set(plan.stops.map(place => place.id)).size, plan.stops.length);
  assert.equal(plan.stops.length, 3);
  assert.ok(plan.stops.every(place => place.published && !place.archived));
});

test('BE-07: interests restrict stops and walking reserves no transport fare', () => {
  const plan = planItinerary({ budget: 1000, hours: 6, transport: 'walk', preferences: ['Nature & outdoors'] }, places);
  assert.deepEqual(plan.stops.map(place => place.id), ['park']);
  assert.equal(plan.totals.transportAllowance, 0);
  assert.equal(plan.totals.admissions, 25);
  assert.equal(places[2].duration, 45, 'Planning must not change stored attraction records');
});

test('BE-07: invalid settings and allowances exceeding budget are rejected', () => {
  for (const invalid of [null, [], {}, { budget: '', hours: 6 }, { budget: null, hours: 6 },
    { budget: false, hours: 6 }, { budget: -1, hours: 6 }, { budget: 500, hours: 0 },
    { budget: 500, hours: 6, days: 1.5 }, { budget: 500, hours: 6, people: 21 },
    { budget: 500, hours: 6, startDate: '2026-02-30' },
    { budget: 500, hours: 6, preferences: ['Unknown category'] },
    { budget: 500, hours: 6, preferences: 'Nature & outdoors' },
    { budget: 500, hours: 6, pace: 'fast' }, { budget: 500, hours: 6, transport: 'flight' },
    { budget: 50, hours: 6, people: 2, foodPerPersonDay: 100 }]) {
    assert.throws(() => planItinerary(invalid, places), InputError);
  }
});

test('BE-07: empty or unaffordable catalogs produce valid empty plans', () => {
  const empty = planItinerary({ budget: 0, hours: 1 }, places);
  assert.deepEqual(empty.stops, []);
  assert.equal(empty.totals.total, 0);
  const missing = planItinerary({ budget: 100, hours: 6 }, []);
  assert.deepEqual(missing.stops, []);
  assert.equal(missing.totals.remaining, 100);
});

test('BE-07: money totals remain within budget for decimal entrance fees', () => {
  const decimalPlaces = [{ ...places[0], cost: 0.29 }];
  const plan = planItinerary({ budget: 0.87, hours: 6, people: 3, transport: 'walk' }, decimalPlaces);
  assert.equal(plan.stops.length, 1);
  assert.equal(plan.totals.total, 0.87);
  assert.equal(plan.totals.remaining, 0);
  const tiny = planItinerary({ budget: 0.005, hours: 6, transport: 'walk' }, [{ ...places[0], cost: 0.01 }]);
  assert.equal(tiny.stops.length, 0, 'Do not round the available budget up');
  assert.ok(tiny.totals.total <= 0.005);
});

async function fixture(check) {
  const server = createApp({ attractionData: places }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  const post = (path, body, cookie = '') => fetch(base + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body)
  });
  async function register() {
    const response = await post('/auth/register', { firstName: 'Planner', lastName: 'Tester',
      email: 'planner@example.test', password: 'test-password-12345' });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  }
  try { await check({ post, register }); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('BE-07: generation requires an authenticated session, including after logout', () =>
  fixture(async ({ post, register }) => {
    const settings = { budget: 1500, hours: 6 };
    assert.equal((await post('/itineraries/generate', settings)).status, 401);
    const cookie = await register();
    const response = await post('/itineraries/generate', settings, cookie);
    assert.equal(response.status, 200);
    const plan = await response.json();
    assert.ok(plan.stops.length > 0);
    assert.ok(plan.stops.every(place => place.published && !place.archived));
    assert.ok(Array.isArray(plan.days));
    assert.equal((await post('/auth/logout', {}, cookie)).status, 204);
    assert.equal((await post('/itineraries/generate', settings, cookie)).status, 401);
  })
);

test('BE-07: generation validates settings and ignores client-supplied costs and stops', () =>
  fixture(async ({ post, register }) => {
    const cookie = await register();
    const invalid = await post('/itineraries/generate', { budget: -1, hours: 6 }, cookie);
    assert.equal(invalid.status, 400);
    assert.equal(typeof (await invalid.json()).error, 'string');
    const response = await post('/itineraries/generate', { budget: 1500, hours: 6,
      stops: [{ id: 'fake', cost: -1000 }], totals: { total: -1000 } }, cookie);
    assert.equal(response.status, 200);
    const plan = await response.json();
    assert.ok(plan.totals.total >= 0);
    assert.ok(plan.stops.every(place => ['plaza', 'museum', 'park'].includes(place.id)));
  })
);

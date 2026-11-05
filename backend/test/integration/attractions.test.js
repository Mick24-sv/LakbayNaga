import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';

const attractionData = [
  { id: 'plaza', name: 'Test Plaza', category: 'City spaces', area: 'Downtown', description: 'A monument garden.', published: true, archived: false },
  { id: 'church', name: 'Test Church', category: 'Faith & heritage', area: 'Riverside', description: 'Historic architecture.', published: true, archived: false },
  { id: 'draft', name: 'Draft Plaza', category: 'City spaces', published: false, archived: false },
  { id: 'archived', name: 'Archived Plaza', category: 'City spaces', published: true, archived: true },
  { id: 'unreviewed', name: 'Unreviewed Plaza', category: 'City spaces' }
];

async function withServer(check) {
  const server = createApp({ attractionData }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    await check(async query => {
      const response = await fetch(base + '/api/attractions' + (query ? '?' + query : ''));
      assert.match(response.headers.get('content-type'), /application\/json/);
      return { status: response.status, body: await response.json() };
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

const ids = result => result.body.map(place => place.id);

test('BE-04: guests see only explicitly published, non-archived attractions', () =>
  withServer(async get => {
    const result = await get();
    assert.equal(result.status, 200);
    assert.deepEqual(ids(result), ['plaza', 'church']);
  })
);

test('BE-04: search matches name, area, and description ignoring case and outer spaces', () =>
  withServer(async get => {
    for (const q of [' TEST PLAZA ', 'DOWNTOWN', 'monument garden']) {
      const result = await get(new URLSearchParams({ q }).toString());
      assert.equal(result.status, 200);
      assert.deepEqual(ids(result), ['plaza']);
    }
  })
);

test('BE-04: category filtering combines with search', () =>
  withServer(async get => {
    const category = ' city SPACES ';
    assert.deepEqual(ids(await get(new URLSearchParams({ category }).toString())), ['plaza']);
    assert.deepEqual(ids(await get(new URLSearchParams({ category, q: 'plaza' }).toString())), ['plaza']);
    assert.deepEqual(ids(await get(new URLSearchParams({ category, q: 'church' }).toString())), []);
  })
);

test('BE-04: unmatched filters return an empty array; blank filters return visible places', () =>
  withServer(async get => {
    assert.deepEqual(ids(await get('q=missing-location')), []);
    assert.deepEqual(ids(await get('category=unknown')), []);
    assert.deepEqual(ids(await get('q=+&category=+')), ['plaza', 'church']);
  })
);

test('BE-04: repeated and structured query parameters return JSON 400 errors', () =>
  withServer(async get => {
    for (const query of ['q=one&q=two', 'category=one&category=two', 'q[x]=one']) {
      const result = await get(query);
      assert.equal(result.status, 400);
      assert.equal(typeof result.body.error, 'string');
    }
  })
);

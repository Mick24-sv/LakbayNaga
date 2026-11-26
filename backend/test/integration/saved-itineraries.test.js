import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { makeStore } from '../../src/repositories/memoryStore.js';
import { makeItineraryRepository } from '../../src/repositories/itineraryRepository.js';

const settings = { budget: 1500, hours: 6, transport: 'walk' };
const place = { id: 'plaza', name: 'Test plaza', category: 'City spaces', area: 'Naga',
  description: 'Fixture', cost: 25, duration: 30, published: true, archived: false };

async function fixture(check, attractionData = [place]) {
  const store = makeStore();
  const repository = makeItineraryRepository();
  const server = createApp({ store, attractionData, itineraryRepository: repository }).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  const request = (path, method = 'GET', body, cookie = '') => fetch(base + path, {
    method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  async function register(email) {
    const response = await request('/auth/register', 'POST', {
      firstName: 'Trip', lastName: 'Tester', email, password: 'test-password-12345',
    });
    assert.equal(response.status, 200);
    return { cookie: response.headers.get('set-cookie').split(';')[0], user: (await response.json()).user };
  }
  try { await check({ request, register, store, repository }); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('BE-08: every saved-trip endpoint rejects guests, including after logout', () => fixture(async ({ request, register }) => {
  for (const [path, method] of [['/itineraries','GET'],['/itineraries','POST'],
    ['/itineraries/missing','GET'],['/itineraries/missing','PUT'],['/itineraries/missing','DELETE']]) {
    assert.equal((await request(path, method, method === 'POST' || method === 'PUT' ? {} : undefined)).status, 401);
  }
  const { cookie } = await register('owner@example.test');
  assert.equal((await request('/auth/logout','POST',{},cookie)).status,204);
  assert.equal((await request('/itineraries','GET',undefined,cookie)).status,401);
}));

test('BE-08: owner can create, list, read, update, and delete a recalculated trip', () => fixture(async ({ request, register }) => {
  const { cookie, user } = await register('owner@example.test');
  const response = await request('/itineraries','POST',{
    name: '  Naga visit  ', settings, ownerId: 'forged', id: 'forged', createdAt:'forged',
    plan: { totals: { total: -100 }, stops: [{id:'fake'}] },
  },cookie);
  assert.equal(response.status,201);
  const trip=await response.json();
  assert.equal(trip.name,'Naga visit');assert.equal(trip.ownerId,user.id);
  assert.notEqual(trip.id,'forged');assert.ok(Number.isFinite(Date.parse(trip.createdAt)));
  assert.equal(trip.plan.totals.total,25);assert.deepEqual(trip.plan.stops.map(s=>s.id),['plaza']);
  assert.deepEqual(await (await request('/itineraries','GET',undefined,cookie)).json(),[trip]);
  assert.deepEqual(await (await request('/itineraries/'+trip.id,'GET',undefined,cookie)).json(),trip);
  const updated=await request('/itineraries/'+trip.id,'PUT',{name:'Updated',settings:{...settings,people:2},ownerId:'forged'},cookie);
  assert.equal(updated.status,200);
  const row=await updated.json();assert.equal(row.id,trip.id);assert.equal(row.ownerId,user.id);
  assert.equal(row.createdAt,trip.createdAt);assert.equal(row.plan.totals.total,50);
  assert.equal((await request('/itineraries/'+trip.id,'DELETE',undefined,cookie)).status,204);
  assert.equal((await request('/itineraries/'+trip.id,'GET',undefined,cookie)).status,404);
  assert.deepEqual(await (await request('/itineraries','GET',undefined,cookie)).json(),[]);
}));

test('BE-08: another user and an admin cannot read, modify, or delete an owner trip', () => fixture(async ({ request, register, store }) => {
  const owner=await register('owner@example.test');
  const trip=await (await request('/itineraries','POST',{name:'Private',settings},owner.cookie)).json();
  const other=await register('other@example.test');
  const admin=await register('admin@example.test');
  (await store.userByEmail('admin@example.test')).role='admin';
  for(const actor of [other,admin]) {
    assert.deepEqual(await (await request('/itineraries','GET',undefined,actor.cookie)).json(),[]);
    for(const method of ['GET','PUT','DELETE']) {
      const response=await request('/itineraries/'+trip.id,method,method==='PUT'?{name:'Stolen',settings}:undefined,actor.cookie);
      assert.equal(response.status,404);assert.deepEqual(await response.json(),{error:'Itinerary not found.'});
    }
  }
  assert.equal((await request('/itineraries/'+trip.id,'GET',undefined,owner.cookie)).status,200);
}));

test('BE-08: invalid names/settings and unaffordable plans do not create or overwrite trips', () => fixture(async ({ request, register }) => {
  const {cookie}=await register('owner@example.test');
  const trip=await (await request('/itineraries','POST',{name:'Valid',settings},cookie)).json();
  for(const body of [null,[],{}, {name:' ',settings}, {name:'x'.repeat(101),settings},
    {name:'Invalid'}, {name:'Invalid',settings:[]}, {name:'Invalid',settings:{...settings,budget:-1}},
    {name:'Empty',settings:{...settings,budget:0}}]) {
    assert.equal((await request('/itineraries','POST',body,cookie)).status,400);
    assert.equal((await request('/itineraries/'+trip.id,'PUT',body,cookie)).status,400);
  }
  assert.deepEqual(await (await request('/itineraries/'+trip.id,'GET',undefined,cookie)).json(),trip);
  assert.equal((await (await request('/itineraries','GET',undefined,cookie)).json()).length,1);
  assert.equal((await request('/itineraries/missing','PUT',{},cookie)).status,404);
  assert.equal((await request('/itineraries/missing','DELETE',undefined,cookie)).status,404);
}));

test('BE-08: private attractions cannot be saved as itinerary stops', () => fixture(async ({request,register})=>{
  const {cookie}=await register('owner@example.test');
  assert.equal((await request('/itineraries','POST',{name:'Private',settings},cookie)).status,400);
},[{...place,published:false},{...place,id:'archived',archived:true}]));

test('BE-08: repository snapshots cannot alter stored data; independent instances are temporary', async()=>{
  const repo=makeItineraryRepository();
  const trip=await repo.create('owner',{name:'Original',plan:{stops:[{id:'one'}]}});
  trip.plan.stops[0].id='changed';
  const list=await repo.list('owner');list[0].name='Changed';
  assert.equal((await repo.find(trip.id,'owner')).name,'Original');
  assert.equal((await repo.find(trip.id,'owner')).plan.stops[0].id,'one');
  assert.equal(await repo.update(trip.id,'other',{name:'Stolen',plan:{}}),null);
  assert.equal(await repo.delete(trip.id,'other'),false);
  assert.equal(await repo.find(trip.id,'other'),null);
  assert.deepEqual(await makeItineraryRepository().list('owner'),[]);
});

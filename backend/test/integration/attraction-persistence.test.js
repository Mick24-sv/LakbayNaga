import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { makeAttractionRepository } from '../../src/repositories/attractionRepository.js';


test('DB-02: attraction API reads repository updates and keeps visibility rules', async () => {
  const repository = makeAttractionRepository();


  const place = {
    id: 'persistence-test',
    name: 'Persistence Test Place',
    category: 'City spaces',
    area: 'Test area',
    description: 'Repository test.',
    cost: 0,
    duration: 30,
    published: true,
    archived: false
  };


  assert.equal(await repository.insertMissing([place]), 1);
  assert.equal(await repository.insertMissing([place]), 0);


  const server = createApp({
    attractionRepository: repository
  }).listen(0);


  await new Promise(resolve => server.once('listening', resolve));


  const url =
    'http://127.0.0.1:' +
    server.address().port +
    '/api/attractions';


  try {
    let response = await fetch(url);
    assert.equal(response.status, 200);
    assert.equal((await response.json())[0].cost, 0);


    await repository.put({ ...place, cost: 25 });


    // Seed input must not overwrite the edited fee.
    await repository.insertMissing([place]);


    response = await fetch(url);
    assert.equal((await response.json())[0].cost, 25);


    await repository.put({
      ...place,
      published: false
    });


    response = await fetch(url);
    assert.deepEqual(await response.json(), []);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
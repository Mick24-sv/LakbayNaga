import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import {
  connectDatabase,
  disconnectDatabase
} from '../config/database.js';
import { makeAttractionRepository } from '../repositories/attractionRepository.js';
import { Attraction } from '../models/Attraction.js';


dotenv.config({
  path: new URL('../../.env', import.meta.url)
});


const id = 'db02-check-' + randomUUID();


try {
  await connectDatabase();


  const repository = makeAttractionRepository({
    persistent: true
  });


  await repository.initialize();


  const original = {
    id,
    name: 'Temporary DB-02 check',
    category: 'City spaces',
    area: 'Test location',
    description: 'Temporary persistence verification record.',
    cost: 0,
    duration: 30,
    published: false,
    archived: false
  };


  assert.equal(await repository.insertMissing([original]), 1);
  assert.equal(await repository.insertMissing([original]), 0);


  assert.equal(
    await Attraction.countDocuments({ id }),
    1
  );


  console.log('Duplicate prevention: passed');


  await repository.put({
    ...original,
    description: 'Edited value must survive reconnection.',
    cost: 25
  });


  // Running the seed again must preserve this edit.
  assert.equal(await repository.insertMissing([original]), 0);


  await disconnectDatabase();
  await connectDatabase();


  const reconnectedRepository = makeAttractionRepository({
    persistent: true
  });


  const records = await reconnectedRepository.all();
  const saved = records.find(place => place.id === id);


  assert.ok(saved);
  assert.equal(saved.cost, 25);
  assert.equal(
    saved.description,
    'Edited value must survive reconnection.'
  );


  console.log('Existing edits preserved during seeding: passed');
  console.log('Saved changes survive reconnection: passed');
} catch (error) {
  console.error(
    'Persistence verification failed. Error type: ' + error.name
  );
  process.exitCode = 1;
} finally {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }


    await Attraction.deleteOne({ id });
    console.log('Temporary verification record removed.');
  } catch {
    console.error(
      'Could not clean up the temporary draft. Its ID is: ' + id
    );
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}
    import dotenv from 'dotenv';
import {
  connectDatabase,
  disconnectDatabase
} from '../config/database.js';
import { makeAttractionRepository } from '../repositories/attractionRepository.js';
import { attractions } from '../data/attractions.js';


dotenv.config({
  path: new URL('../../.env', import.meta.url)
});


try {
  await connectDatabase();


  const repository = makeAttractionRepository({
    persistent: true
  });


  await repository.initialize();


  const inserted = await repository.insertMissing(attractions);


  console.log('Attraction seed completed.');
  console.log('New records inserted: ' + inserted);
  console.log('Existing attraction records were not overwritten.');
} catch (error) {
  console.error('Attraction seed failed. Error type: ' + error.name);
  console.error(
    'Check the database configuration and ensure attraction IDs are unique.'
  );
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
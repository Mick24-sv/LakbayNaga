import dotenv from 'dotenv';
import {
  connectDatabase,
  disconnectDatabase,
  requireDatabaseInProduction
} from './config/database.js';
import { makeStore } from './repositories/memoryStore.js';
import { makeMongoAuthStore } from './repositories/mongoAuthStore.js';
import { makeItineraryRepository } from './repositories/itineraryRepository.js';
import { makeMongoItineraryRepository } from './repositories/mongoItineraryRepository.js';
import { makeSettingsRepository } from './repositories/settingsRepository.js';
import { defaultSettings } from './services/settingsService.js';
import { makeImageRepository } from './repositories/imageRepository.js';


dotenv.config({
  path: new URL('../.env', import.meta.url)
});


try {
  requireDatabaseInProduction();
  const persistent = Boolean(process.env.MONGODB_URI);


  if (persistent) {
    await connectDatabase();
    console.log('MongoDB connected successfully.');
  } else {
    console.log(
      'MongoDB is not configured. Attractions use empty temporary storage.'
    );
  }


  const { makeAttractionRepository } = await import(
    './repositories/attractionRepository.js'
  );


  const attractionRepository = makeAttractionRepository({
    persistent
  });

  const itineraryRepository = persistent
    ? makeMongoItineraryRepository()
    : makeItineraryRepository();


  await attractionRepository.initialize();
  if (persistent) await itineraryRepository.initialize();
  const imageRepository = makeImageRepository({ persistent });
  await imageRepository.initialize();

  const settingsRepository = makeSettingsRepository({
    persistent,
    defaults: defaultSettings
  });
  await settingsRepository.initialize();


  const { createApp } = await import('./app.js');


  const store = persistent
    ? makeMongoAuthStore()
    : makeStore();

  if (persistent) {
    await store.initialize();
  }

  const app = createApp({
    store,
    attractionRepository,
    itineraryRepository,
    settingsRepository,
    imageRepository
  });
  const port = Number(process.env.PORT || 3001);


  const server = app.listen(port, () => {
    console.log('LakbayNaga API listening on port ' + port);
    console.log('Itinerary storage: ' + (persistent ? 'MongoDB' : 'memory'));
    console.log(
      'Attraction storage: ' + (persistent ? 'MongoDB' : 'memory')
    );
  });


  server.on('error', async () => {
    console.error('Server startup failed. Check the configured port.');
    await disconnectDatabase();
    process.exitCode = 1;
  });
} catch (error) {
  console.error('Backend startup failed. Error type: ' + error.name);
  console.error(
    'Check that MONGODB_URI is set, database credentials, network access, and collection indexes.'
  );


  await disconnectDatabase();
  process.exitCode = 1;
}

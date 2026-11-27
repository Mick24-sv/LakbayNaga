import { runtimeConfig } from './config/runtime.js';
import dotenv from 'dotenv';
import {
  connectDatabase,
  isDatabaseReady,
  disconnectDatabase
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
  const { persistent, port } = runtimeConfig();


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
    imageRepository,
    readiness: () => !persistent || isDatabaseReady()
  });



  const server = app.listen(port, '0.0.0.0', () => {
    console.log('LakbayNaga API listening on port ' + port);
    console.log('Itinerary storage: ' + (persistent ? 'MongoDB' : 'memory'));
    console.log(
      'Attraction storage: ' + (persistent ? 'MongoDB' : 'memory')
    );
  });


  let closing = false;
  async function shutdown() {
    if (closing) return;
    closing = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    server.close(async () => {
      try { await disconnectDatabase(); process.exitCode = 0; }
      catch { process.exitCode = 1; }
      finally { clearTimeout(deadline); }
    });
    server.closeIdleConnections?.();
  }
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  server.on('error', async () => {
    console.error('Server startup failed. Check the configured port.');
    await disconnectDatabase();
    process.exitCode = 1;
  });
} catch (error) {
  console.error('Backend startup failed. Error type: ' + error.name);
  if (error.name === 'ConfigurationError') console.error(error.message);
  console.error(
    'Check database credentials, network access, and collection indexes.'
  );


  await disconnectDatabase();
  process.exitCode = 1;
}

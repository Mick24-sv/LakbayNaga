import dotenv from 'dotenv';
import {
  connectDatabase,
  disconnectDatabase
} from './config/database.js';


dotenv.config({
  path: new URL('../.env', import.meta.url)
});


try {
  if (process.env.MONGODB_URI) {
    await connectDatabase();
    console.log('MongoDB connected successfully.');
  } else {
    console.log(
      'MONGODB_URI is not configured. Starting with temporary storage.'
    );
  }


  // Load the application after environment configuration.
  const { default: app } = await import('./app.js');


  const port = Number(process.env.PORT || 3001);


  const server = app.listen(port, () => {
    console.log('LakbayNaga API listening on port ' + port);
  });


  server.on('error', async () => {
    console.error('Server startup failed. Check the configured port.');
    await disconnectDatabase();
    process.exitCode = 1;
  });
} catch (error) {
  console.error('Backend startup failed. Error type: ' + error.name);
  console.error(
    'Check the database configuration before restarting.'
  );


  await disconnectDatabase();
  process.exitCode = 1;
}
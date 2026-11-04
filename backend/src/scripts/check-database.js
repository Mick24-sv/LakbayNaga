import dotenv from 'dotenv';
import {
  connectDatabase,
  disconnectDatabase
} from '../config/database.js';


import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { Attraction } from '../models/Attraction.js';


dotenv.config({
  path: new URL('../../.env', import.meta.url)
});


try {
  const connection = await connectDatabase();


  const result = await connection.db.command({ ping: 1 });


  if (result.ok !== 1) {
    throw new Error('Database ping failed.');
  }


  console.log('MongoDB connection: successful');
  console.log('Database ping: successful');


  console.log(
    'Defined collections: ' +
      [
        User.collection.name,
        Session.collection.name,
        Attraction.collection.name
      ].join(', ')
  );


  console.log('No application records were inserted or modified.');
} catch (error) {
  console.error(
    'Database check failed. Error type: ' + error.name
  );


  console.error(
    'Check MONGODB_URI, database credentials, Atlas network access, and cluster status.'
  );


  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
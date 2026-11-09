import dotenv from 'dotenv';
import {
  connectDatabase,
  disconnectDatabase
} from '../config/database.js';
import {
  makeMongoAuthStore
} from '../repositories/mongoAuthStore.js';
import {
  hashPassword,
  validateAccount
} from '../services/authService.js';


dotenv.config({
  path: new URL('../../.env', import.meta.url)
});


try {
  const input = validateAccount({
    firstName: process.env.ADMIN_FIRST_NAME,
    lastName: process.env.ADMIN_LAST_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  });


  await connectDatabase();


  const store = makeMongoAuthStore();
  await store.initialize();


  const existing = await store.userByEmail(input.email);


  if (existing) {
    if (existing.role !== 'admin') {
      throw new Error(
        'That email belongs to an ordinary user. Choose another admin email.'
      );
    }


    console.log(
      'Administrator already exists. Its password was not changed.'
    );
  } else {
    await store.addUser({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: 'admin'
    });


    console.log('Administrator created successfully.');
  }
} catch (error) {
  if (error.code === 11000) {
    console.error('An account with that email already exists.');
  } else {
    console.error(
      'Admin creation failed. Check account fields, MongoDB connection, and network access.'
    );
  }


  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
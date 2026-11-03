import express from 'express';
import { attractions } from './attractions.js';
import { makeStore } from './store.js';
import {
  auth,
  hashPassword,
  verifyPassword,
  publicUser,
  validateAccount
} from './auth.js';


// Forward asynchronous errors to Express 4's error handler.
const handle = fn => (req, res, next) =>
  Promise.resolve(fn(req, res)).catch(next);


export function createApp({ store = makeStore() } = {}) {
  const app = express();
  const access = auth(store);


  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));


 

  // Load the user associated with the session cookie.
  app.use((req, res, next) => {
    access.load(req).then(() => next()).catch(next);
  });


  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });


  app.get('/api/attractions', (_req, res) => {
    res.json(attractions);
  });


  app.post('/api/auth/register', handle(async (req, res) => {
    let data;


    try {
      data = validateAccount(req.body || {});
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }


    const user = await store.addUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash: await hashPassword(data.password),
      role: 'user'
    });


    await access.login(req, res, user);
  }));


  app.post('/api/auth/login', handle(async (req, res) => {
    const body = req.body || {};
    const email = typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : '';


    if (typeof body.password !== 'string' ||
        body.password.length > 128) {
      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }


    const user = await store.userByEmail(email);
    const storedHash = user?.passwordHash ||
      await hashPassword('unused-dummy-password');


    const valid = await verifyPassword(body.password, storedHash);


    if (!user || !valid) {
      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }


    await access.login(req, res, user);
  }));


  app.get('/api/auth/me', (req, res) => {
    res.json({ user: req.user ? publicUser(req.user) : null });
  });


  app.post('/api/auth/logout', handle(async (req, res) => {
    await access.logout(req, res);
  }));


  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });


  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON request.' });
    }


    if (error.status === 409) {
      return res.status(409).json({ error: error.message });
    }


    console.error(error.message);
    res.status(500).json({ error: 'The server could not complete the request.' });
  });


  return app;
}


export default createApp();
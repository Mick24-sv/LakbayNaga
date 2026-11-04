import {
  hashPassword, verifyPassword, publicUser, validateAccount
} from '../services/authService.js';

export function createAuthController(store, access) {
  return {
    async register(req, res) {
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
    },

    async login(req, res) {
      const body = req.body || {};
      const email = typeof body.email === 'string'
        ? body.email.trim().toLowerCase() : '';
      if (typeof body.password !== 'string' || body.password.length > 128) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      const user = await store.userByEmail(email);
      const storedHash = user?.passwordHash || await hashPassword('unused-dummy-password');
      const valid = await verifyPassword(body.password, storedHash);
      if (!user || !valid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      await access.login(req, res, user);
    },

    me(req, res) {
      res.json({ user: req.user ? publicUser(req.user) : null });
    },

    async logout(req, res) {
      await access.logout(req, res);
    }
  };
}

import {
  hashPassword, verifyPassword, publicUser, validateAccount, normalizeEmail,
  validatePassword, tokenDigest, verifyGoogleIdToken
} from '../services/authService.js';
import { randomBytes } from 'node:crypto';

async function sendResetEmail({ email, firstName, link }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) throw new Error('Password recovery email is not configured.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [email], subject: 'Reset your LakbayNaga password',
      text: `Hello ${firstName},\n\nUse this one-time link to reset your password (valid for 30 minutes):\n${link}\n\nIf you did not request this, you can ignore this email.` })
  });
  if (!response.ok) throw new Error('Password recovery email could not be sent.');
}

export function createAuthController(store, access, { mailer = sendResetEmail, google = {} } = {}) {
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
      const email = normalizeEmail(body.email);
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

    async googleLogin(req, res) {
      const verify = google.verifyIdToken || (token => verifyGoogleIdToken(token));
      let claims;
      try { claims = await verify(req.body?.credential || req.body?.idToken); }
      catch (error) {
        if (error.status === 503) return res.status(503).json({ error: 'Google sign-in is not configured.' });
        return res.status(503).json({ error: 'Google sign-in is temporarily unavailable.' });
      }
      if (!claims?.sub || !claims.email || claims.email_verified !== true && claims.email_verified !== 'true') {
        return res.status(401).json({ error: 'Google sign-in could not be verified.' });
      }
      const email = normalizeEmail(claims.email);
      let user = await store.userByGoogleId?.(claims.sub);
      if (user && user.email !== email) return res.status(401).json({ error: 'Google sign-in could not be verified.' });
      if (!user) {
        user = await store.userByEmail(email);
        if (user) {
          user = await store.linkGoogleId?.(user._id, claims.sub) || { ...user, googleId: claims.sub };
        } else {
          const name = typeof claims.name === 'string' ? claims.name.trim().split(/\s+/) : [];
          user = await store.addUser({
            firstName: (claims.given_name || name[0] || 'Google').slice(0, 60),
            lastName: (claims.family_name || name.slice(1).join(' ') || 'User').slice(0, 60),
            email,
            passwordHash: null,
            googleId: claims.sub,
            role: 'user'
          });
        }
      }
      await access.login(req, res, user);
    },

    async requestPasswordReset(req, res) {
      const email = normalizeEmail(req.body?.email);
      if (email.length <= 254 && /^\S+@\S+\.\S+$/.test(email)) {
        const user = await store.userByEmail(email);
        if (user) {
          const token = randomBytes(32).toString('base64url');
          await store.createPasswordReset(tokenDigest(token), { userId: user._id, expiresAt: Date.now() + 30 * 60 * 1000 });
          const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
          try {
            if (mailer) await mailer({ email, firstName: user.firstName, link: `${base}/#reset-password?token=${encodeURIComponent(token)}` });
          } catch (error) { console.error('Password reset email delivery failed:', error.message); }
        }
      }
      res.json({ message: 'If an account matches that email, password reset instructions will be sent.' });
    },

    async completePasswordReset(req, res) {
      const token = req.body?.token;
      let password;
      try { password = validatePassword(req.body?.password); }
      catch (error) { return res.status(400).json({ error: error.message }); }
      if (typeof token !== 'string' || token.length > 128) return res.status(400).json({ error: 'This password reset link is invalid or expired.' });
      const user = await store.consumePasswordReset(tokenDigest(token));
      if (!user) return res.status(400).json({ error: 'This password reset link is invalid or expired.' });
      await store.setPassword(user._id, await hashPassword(password));
      await store.revokeUserSessions?.(user._id);
      res.json({ message: 'Password updated. You can now log in.' });
    },

    async updateProfile(req, res) {
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Send your first and last names.' });
      const allowed = ['firstName', 'lastName'];
      if (Object.keys(body).some(key => !allowed.includes(key))) return res.status(400).json({ error: 'Only first and last names can be updated here.' });
      const names = {};
      for (const key of allowed) {
        if (typeof body[key] !== 'string' || !body[key].trim() || body[key].trim().length > 60) return res.status(400).json({ error: 'Enter first and last names, up to 60 characters each.' });
        names[key] = body[key].trim();
      }
      const user = await store.updateProfile(req.user._id, names);
      if (!user) return res.status(401).json({ error: 'Please log in to continue.' });
      res.json({ user: publicUser(user) });
    },

    async changePassword(req, res) {
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['currentPassword', 'newPassword'].includes(key))) return res.status(400).json({ error: 'Send your current and new passwords.' });
      let password;
      try { password = validatePassword(body.newPassword); }
      catch (error) { return res.status(400).json({ error: error.message }); }
      if (typeof body.currentPassword !== 'string' || body.currentPassword.length > 128) return res.status(400).json({ error: 'Enter your current password.' });
      const existing = await store.userById(req.user._id);
      const previousHash = existing?.passwordHash;
      if (!previousHash || !await verifyPassword(body.currentPassword, previousHash)) return res.status(401).json({ error: 'Your current password is incorrect.' });
      const user = await store.setPassword(req.user._id, await hashPassword(password), previousHash);
      if (!user) return res.status(409).json({ error: 'Your password changed during this request. Please log in again.' });
      await store.revokeUserSessions(req.user._id);
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

import { randomBytes, createHash } from 'node:crypto';
import { publicUser } from '../services/authService.js';

const cookieName = 'lakbay_session';
const sessionSeconds = 7 * 24 * 60 * 60;
const digest = token => createHash('sha256').update(token).digest('hex');

export function auth(store) {
  const secure = process.env.NODE_ENV === 'production';

  function tokenFrom(req) {
    return (req.headers.cookie || '')
      .split(';')
      .map(part => part.trim())
      .find(part => part.startsWith(cookieName + '='))
      ?.slice(cookieName.length + 1);
  }

  function setCookie(res, token, seconds) {
    res.setHeader(
      'Set-Cookie',
      cookieName + '=' + token +
      '; HttpOnly; Path=/; SameSite=Lax; Max-Age=' + seconds +
      (secure ? '; Secure' : '')
    );
  }

  return {
    required(req, res, next) {
      if (!req.user) return res.status(401).json({ error: 'Please log in to continue.' });
      next();
    },

    admin(req, res, next) {
      if (!req.user) return res.status(401).json({ error: 'Please log in to continue.' });
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Administrator access is required.' });
      }
      next();
    },

    async load(req) {
      const token = tokenFrom(req);
      if (!token) return;

      const session = await store.session(digest(token));
      if (session) req.user = await store.userById(session.userId);
    },

    async login(req, res, user) {
      const previous = tokenFrom(req);
      if (previous) await store.deleteSession(digest(previous));

      const token = randomBytes(32).toString('hex');

      await store.putSession(digest(token), {
        userId: user._id,
        expiresAt: Date.now() + sessionSeconds * 1000
      });

      setCookie(res, token, sessionSeconds);
      res.json({ user: publicUser(user) });
    },

    async logout(req, res) {
      const token = tokenFrom(req);
      if (token) await store.deleteSession(digest(token));

      setCookie(res, '', 0);
      res.status(204).end();
    }
  };
}
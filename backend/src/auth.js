import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  createHash
} from 'node:crypto';
import { promisify } from 'node:util';


const deriveKey = promisify(scrypt);
const cookieName = 'lakbay_session';
const sessionSeconds = 7 * 24 * 60 * 60;


const digest = token =>
  createHash('sha256').update(token).digest('hex');


export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt, 64);
  return salt + ':' + key.toString('hex');
}


export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const key = await deriveKey(password, salt, 64);
  return timingSafeEqual(key, Buffer.from(hash, 'hex'));
}


export function publicUser(user) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role
  };
}


export function validateAccount(body) {
  const firstName =
    typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName =
    typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';


  if (!firstName || !lastName ||
      firstName.length > 60 || lastName.length > 60) {
    throw new Error('Enter first and last names, up to 60 characters each.');
  }


  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Enter a valid email address.');
  }


  if (typeof body.password !== 'string' ||
      body.password.length < 12 || body.password.length > 128) {
    throw new Error('Use a password with 12 to 128 characters.');
  }


  return { firstName, lastName, email, password: body.password };
}


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
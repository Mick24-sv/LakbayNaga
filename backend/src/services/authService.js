import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt, 64);
  return salt + ':' + key.toString('hex');
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !/^[a-f0-9]{128}$/.test(hash || '')) return false;
  const key = await deriveKey(password, salt, 64);
  return timingSafeEqual(key, Buffer.from(hash, 'hex'));
}

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export const tokenDigest = token => createHash('sha256').update(token).digest('hex');

export async function verifyGoogleIdToken(idToken, { clientId = process.env.GOOGLE_CLIENT_ID, fetchImpl = fetch } = {}) {
  if (!clientId) throw Object.assign(new Error('Google sign-in is not configured.'), { status: 503 });
  if (typeof idToken !== 'string' || idToken.length > 8192) return null;
  const response = await fetchImpl('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
  if (!response.ok) return null;
  const claims = await response.json();
  const expiresAt = Number(claims.exp);
  const issuer = ['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss);
  if (!issuer || claims.aud !== clientId || claims.email_verified !== 'true' ||
      !claims.sub || !claims.email || !Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now()) return null;
  return claims;
}

export function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) {
    throw new Error('Use a password with 12 to 128 characters.');
  }
  return value;
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


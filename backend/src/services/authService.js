import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);

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


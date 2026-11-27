export class ConfigurationError extends Error {
  constructor(message) { super(message); this.name = 'ConfigurationError'; }
}

﻿export function httpsOrigin(value, label = 'URL') {
  let url;
  try { url = new URL(value); } catch { throw new ConfigurationError(label + ' must be a valid HTTPS origin.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '') ||
      url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]' || url.hostname.endsWith('.invalid')) {
    throw new ConfigurationError(label + ' must be a public HTTPS origin without credentials, path, query or fragment.');
  }
  return url.origin;
}

export function runtimeConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ConfigurationError('PORT must be an integer between 1 and 65535.');
  if (production) {
    if (!/^mongodb(?:\+srv)?:\/\//.test(env.MONGODB_URI || '')) throw new ConfigurationError('Production requires MONGODB_URI; temporary storage is disabled.');
    httpsOrigin(env.FRONTEND_URL, 'FRONTEND_URL');
    if (env.GOOGLE_CLIENT_ID && !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID)) throw new ConfigurationError('GOOGLE_CLIENT_ID is invalid.');
  }
  return { port, production, persistent: Boolean(env.MONGODB_URI) };
}

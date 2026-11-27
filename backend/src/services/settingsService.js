export class SettingsInputError extends Error {}

// Match the finished frontend's siteImages property names.
export const defaultSettings = Object.freeze({ logo: '', hero: '', account: '' });

export function validateSettings(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new SettingsInputError('Send a JSON object.');
  }
  const data = {};
  for (const key of Object.keys(body)) {
    if (!Object.hasOwn(defaultSettings, key)) {
      throw new SettingsInputError('Unknown setting: ' + key + '.');
    }
    const value = body[key];
    if (typeof value !== 'string' || (value !== '' && !/^\/api\/images\/[a-f0-9]{32}$/.test(value))) {
      throw new SettingsInputError('Choose an uploaded image or remove it.');
    }
    data[key] = value;
  }
  return data;
}

export class SettingsInputError extends Error {}

// Example: { siteName: 'LakbayNaga' }
export const defaultSettings = {};

export function validateSettings(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new SettingsInputError('Send a JSON object.');
  }

  const unknown = Object.keys(body).find(
    key => !Object.hasOwn(defaultSettings, key)
  );
  if (unknown) {
    throw new SettingsInputError('Unknown setting: ' + unknown + '.');
  }

  // Check each field type and length here, as adminAttractionService.js does.
  return { ...body };
}
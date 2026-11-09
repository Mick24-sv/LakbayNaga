export const adminCategories = [
  'Faith & heritage',
  'City spaces',
  'Culture & history',
  'Nature & outdoors',
];

export class AdminRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
export async function adminRequest(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch('/api' + path, {
    method,
    credentials: 'include',
    signal,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = response.status === 401
      ? 'Your session has expired. Log in again to access administration.'
      : response.status === 403
        ? 'Administrator access is required to manage attractions.'
        : data.error || 'The request could not be completed.';
    throw new AdminRequestError(message, response.status);
  }
  return data;
}

export function validateAttractionForm(values) {
  const errors = {};
  const name = String(values.name ?? '').trim();
  const category = String(values.category ?? '').trim();
  const area = String(values.area ?? '').trim();
  const description = String(values.description ?? '').trim();
  const note = String(values.openingHours ?? '').trim();
  if (!name || name.length > 120) errors.name = 'Enter a name up to 120 characters.';
  if (!adminCategories.includes(category)) errors.category = 'Select a valid category.';
  if (!area || area.length > 200) errors.area = 'Enter an address or area up to 200 characters.';
  if (!description || description.length > 1200) errors.description = 'Enter a description up to 1,200 characters.';
  if (note.length > 200) errors.openingHours = 'Keep this note within 200 characters.';
  const cost = Number(values.cost);
  if (String(values.cost ?? '').trim() === '' || !Number.isFinite(cost) || cost < 0 || cost > 100000) {
    errors.cost = 'Fee must be between 0 and 100,000.';
  } else if (Math.abs(cost * 100 - Math.round(cost * 100)) > 0.00001) {
    errors.cost = 'Fee can have no more than two decimal places.';
  }
  const duration = Number(values.duration);
  if (String(values.duration ?? '').trim() === '' || !Number.isInteger(duration) || duration < 15 || duration > 480) {
    errors.duration = 'Duration must be a whole number from 15 to 480 minutes.';
  }
  const latMissing = String(values.lat ?? '').trim() === '';
  const lngMissing = String(values.lng ?? '').trim() === '';
  if (latMissing !== lngMissing) errors.coordinates = 'Enter both latitude and longitude, or leave both blank.';
  else if (!latMissing) {
    const lat = Number(values.lat);
    const lng = Number(values.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.lat = 'Latitude must be between -90 and 90.';
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.lng = 'Longitude must be between -180 and 180.';
  }
  return errors;
}

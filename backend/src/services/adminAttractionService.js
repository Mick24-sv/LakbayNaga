const categories = [
  'Faith & heritage',
  'City spaces',
  'Culture & history',
  'Nature & outdoors'
];


export class AttractionInputError extends Error {}


export function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AttractionInputError('Send a JSON object.');
  }
}


export function readBoolean(body, field) {
  requireObject(body);


  if (typeof body[field] !== 'boolean') {
    throw new AttractionInputError(field + ' must be true or false.');
  }


  return body[field];
}


export function validateAttraction(body) {
  requireObject(body);


  function text(field, maximum, required = true) {
    const value = body[field] === undefined && !required
      ? ''
      : body[field];


    if (typeof value !== 'string') {
      throw new AttractionInputError(field + ' must be text.');
    }


    const trimmed = value.trim();


    if ((required && !trimmed) || trimmed.length > maximum) {
      throw new AttractionInputError(
        'Check ' + field + ' (maximum ' + maximum + ' characters).'
      );
    }


    return trimmed;
  }


  function number(field, minimum, maximum, integer = false) {
    const value = body[field];


    if (
      !['number', 'string'].includes(typeof value) ||
      (typeof value === 'string' && !value.trim())
    ) {
      throw new AttractionInputError('Enter a valid ' + field + '.');
    }


    const parsed = Number(value);


    if (
      !Number.isFinite(parsed) ||
      parsed < minimum ||
      parsed > maximum ||
      (integer && !Number.isInteger(parsed))
    ) {
      throw new AttractionInputError(
        field + ' must be between ' + minimum + ' and ' + maximum + '.'
      );
    }


    return parsed;
  }


  const name = text('name', 120);
  const category = text('category', 40);
  const area = text('area', 200);
  const description = text('description', 1200);
  const openingHours = text('openingHours', 200, false);
  const photoCredit = text('photoCredit', 300, false);
  const imageUrl = text('imageUrl', 1000, false);


  if (!categories.includes(category)) {
    throw new AttractionInputError('Select a valid category.');
  }


  const cost = number('cost', 0, 100000);
  const duration = number('duration', 15, 480, true);


  if (Math.abs(cost * 100 - Math.round(cost * 100)) > 0.00001) {
    throw new AttractionInputError(
      'Fee must have no more than two decimal places.'
    );
  }


  function validImage(url) {
    return (
      /^\/assets\/[a-zA-Z0-9_.-]+$/.test(url) ||
      /^\/api\/images\/[a-f0-9]{32}$/.test(url)
    );
  }


  if (imageUrl && !validImage(imageUrl)) {
    throw new AttractionInputError(
      'Choose a bundled image or an uploaded photo.'
    );
  }


  const galleryImages = body.galleryImages ?? [];


  if (
    !Array.isArray(galleryImages) ||
    galleryImages.length > 8 ||
    galleryImages.some(url =>
      typeof url !== 'string' ||
      !/^\/api\/images\/[a-f0-9]{32}$/.test(url)
    ) ||
    new Set(galleryImages).size !== galleryImages.length
  ) {
    throw new AttractionInputError(
      'Choose up to 8 different uploaded gallery photos.'
    );
  }


  const missing = value =>
    value === undefined || value === null || value === '';


  const latitudeMissing = missing(body.lat);
  const longitudeMissing = missing(body.lng);


  if (latitudeMissing !== longitudeMissing) {
    throw new AttractionInputError(
      'Enter latitude and longitude together.'
    );
  }


  const lat = latitudeMissing ? null : number('lat', -90, 90);
  const lng = longitudeMissing ? null : number('lng', -180, 180);


  const published = body.published === undefined
    ? false
    : readBoolean(body, 'published');


  const featured = body.featured === undefined
    ? false
    : readBoolean(body, 'featured');


  return {
    name,
    category,
    area,
    description,
    openingHours,
    photoCredit,
    imageUrl,
    galleryImages: [...galleryImages],
    imageIsPlaceholder: imageUrl === '/assets/placeholder.svg',
    cost,
    duration,
    lat,
    lng,
    published,
    featured
  };
}
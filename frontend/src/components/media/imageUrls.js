// Only render same-origin static assets and image records created by the upload API.
export function attractionPhoto(url) {
  return typeof url === 'string' && (
    /^\/assets\/[a-zA-Z0-9_.-]+$/.test(url) ||
    /^\/api\/images\/[a-f0-9]{32}$/.test(url)
  ) ? url : '';
}

export function uploadedImage(url) {
  return typeof url === 'string' && /^\/api\/images\/[a-f0-9]{32}$/.test(url) ? url : '';
}

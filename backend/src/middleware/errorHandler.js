export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(error, req, res, next) {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON request.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request body exceeds the size limit for this endpoint.'
    });
  }
  if (error.code === 11000) {
    return res.status(409).json({
      error: 'An account with this email already exists.'
    });
  }
  if (error.status === 409) {
    return res.status(409).json({ error: 'The request conflicts with an existing record.' });
  }
  // Exception text can contain request data; keep credentials and tokens out of logs.
  console.error('Request failed. Error type:', error.name || 'Error');
  res.status(500).json({ error: 'The server could not complete the request.' });
}

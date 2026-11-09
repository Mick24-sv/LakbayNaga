export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(error, req, res, next) {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON request.' });
  }
  if (error.code === 11000) {
    return res.status(409).json({
      error: 'An account with this email already exists.'
    });
  }
  if (error.status === 409) {
    return res.status(409).json({ error: error.message });
  }
  console.error(error.message);
  res.status(500).json({ error: 'The server could not complete the request.' });
}

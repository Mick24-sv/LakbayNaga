const windowMs = 15 * 60 * 1000;

/**
 * Creates a fixed-window limiter for public authentication endpoints.
 * The map is local to this app instance and is periodically pruned as traffic
 * arrives so expired client records do not accumulate indefinitely.
 */
export function authRateLimit({ limit }) {
  const clients = new Map();
  let lastPruned = 0;

  return function limitAuthRequests(req, res, next) {
    const now = Date.now();
    if (now - lastPruned >= windowMs) {
      for (const [key, record] of clients) {
        if (record.resetAt <= now) clients.delete(key);
      }
      lastPruned = now;
    }

    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let record = clients.get(key);
    if (!record || record.resetAt <= now) {
      record = { count: 0, resetAt: now + windowMs };
      clients.set(key, record);
    }

    record.count += 1;
    if (record.count > limit) {
      res.setHeader('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    next();
  };
}

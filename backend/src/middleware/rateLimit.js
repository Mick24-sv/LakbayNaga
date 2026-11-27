const maxTrackedClients = 10_000;

/** Fixed-window, per-client limiter for sensitive authentication actions. */
export function rateLimit({ limit, windowMs, message = 'Too many requests. Please try again later.' }) {
  const clients = new Map();
  let callsSinceCleanup = 0;

  return function limitRequests(req, res, next) {
    const now = Date.now();
    const client = req.ip || req.socket.remoteAddress || 'unknown';
    let bucket = clients.get(client);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      clients.set(client, bucket);
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message });
    }

    // Keep expired entries from accumulating while avoiding a full map scan on
    // every request. The map is capped for deployments with many client IPs.
    callsSinceCleanup += 1;
    if (callsSinceCleanup >= 128) {
      callsSinceCleanup = 0;
      for (const [key, entry] of clients) {
        if (entry.resetAt <= now) clients.delete(key);
      }
    }
    if (clients.size > maxTrackedClients) {
      const oldest = clients.keys().next().value;
      if (oldest !== undefined) clients.delete(oldest);
    }

    next();
  };
}

/**
 * Drop this file into any backend's src/ directory.
 * Validates JWT locally using the shared secret — zero network hop.
 */
import jwt from 'jsonwebtoken';

const SECRET           = process.env.SHARED_JWT_SECRET || 'appsmagic-shared-jwt-2026';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL  || 'http://appsmagic-auth:4002';

export function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(h.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Attach /api/auth/* proxy routes to an Express app.
 * Every backend calls this once in its index.js so all auth
 * endpoints (login / register / refresh / me / verify) are
 * forwarded to the central auth-service.
 */
export function mountAuthProxy(app) {
  app.all('/api/auth/*', async (req, res) => {
    const path = req.path.replace('/api/auth', '/auth');
    const url  = `${AUTH_SERVICE_URL}${path}`;
    try {
      const resp = await fetch(url, {
        method:  req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization
            ? { Authorization: req.headers.authorization }
            : {}),
        },
        body: ['POST', 'PUT', 'PATCH'].includes(req.method)
          ? JSON.stringify(req.body) : undefined,
      });
      const data = await resp.json().catch(() => ({}));
      res.status(resp.status).json(data);
    } catch (err) {
      res.status(502).json({ error: 'Auth service unavailable', detail: err.message });
    }
  });
}

import { timingSafeEqual } from 'crypto';

const expected = Buffer.from(process.env.INTERNAL_API_KEY || '');

export function requireApiKey(req, res, next) {
  // In production the frontend is served by this same Express server (same-origin).
  // No header needs to be sent — the GROQ_API_KEY and INTERNAL_API_KEY never leave the server.
  // Auth is only enforced in dev/non-production so the Vite proxy can inject the key.
  if (process.env.NODE_ENV === 'production') return next();

  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'Unauthorized' });
  const actual = Buffer.from(key);
  // Lengths must match before timingSafeEqual (it throws on mismatched lengths)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

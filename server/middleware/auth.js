import { timingSafeEqual } from 'crypto';

const expected = Buffer.from(process.env.INTERNAL_API_KEY || '');

export function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'Unauthorized' });
  const actual = Buffer.from(key);
  // Lengths must match before timingSafeEqual (it throws on mismatched lengths)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

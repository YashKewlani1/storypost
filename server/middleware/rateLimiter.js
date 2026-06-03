import rateLimit from 'express-rate-limit';

// NOTE: on Vercel (serverless) this is per-instance, not global — each cold-start
// resets the counter. Acceptable because Google SSO already gates access to
// @loophealth.com accounts. Provides burst protection within a single instance.
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res, next, options) => {
    console.warn(`[RATE-LIMIT] 429 — ${req.method} ${req.path}`);
    res.status(options.statusCode).json(options.message);
  },
});

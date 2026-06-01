import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { limiter } from './middleware/rateLimiter.js';
import { requireApiKey } from './middleware/auth.js';
import authRouter, { passport } from './routes/auth.js';
import postRouter from './routes/post.js';
import interviewRouter from './routes/interview.js';
import transcribeRouter from './routes/transcribe.js';

const app = express();

const MOCK_MODE = process.env.MOCK_MODE === 'true';

if (!MOCK_MODE && !process.env.GROQ_API_KEY) {
  console.error('GROQ_API_KEY is required (or set MOCK_MODE=true)');
  process.exit(1);
}
if (process.env.NODE_ENV !== 'production' && !process.env.INTERNAL_API_KEY) {
  console.error('INTERNAL_API_KEY is required in dev (injected by Vite proxy)');
  process.exit(1);
}

if (MOCK_MODE) {
  console.warn('[MOCK MODE] Claude API calls are disabled — returning mock data');
}

app.use(helmet());
const PORT = process.env.PORT || 3000;
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5000' }));
app.set('trust proxy', 1); // trust first proxy hop so req.ip is the real client IP, not the proxy's

// Session — must come before passport
const IS_PROD = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   IS_PROD,   // HTTPS-only in prod
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth routes — public, no auth required
app.use('/auth', authRouter);

// Redirect unauthenticated browser visits to Google sign-in (production only)
if (IS_PROD) {
  app.use((req, res, next) => {
    // Let API calls, auth routes, and health check through
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path === '/health') return next();
    if (!req.isAuthenticated()) return res.redirect('/auth/google');
    next();
  });
}

// 1. Auth — rejects unauthenticated requests before any body is parsed or counted
//    In dev: checks x-api-key header (injected by Vite proxy)
//    In prod: checks passport session (set after Google SSO)
app.use('/api', IS_PROD
  ? (req, res, next) => req.isAuthenticated() ? next() : res.status(401).json({ error: 'Not authenticated' })
  : requireApiKey
);

// 2. Rate limiting — runs before body parsing so high-frequency callers are dropped
//    before CPU/memory is spent on parsing large payloads
app.use('/api', limiter);

// 3. Prevent any proxy or browser from caching API responses (posts contain personal content)
app.use('/api', (_, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// 4. Body parsing — after auth + rate limit so only legitimate, non-throttled requests pay the parse cost
app.use(express.json({ limit: '12mb' }));

app.use('/api/interview', interviewRouter);
app.use('/api/generate', postRouter);
app.use('/api/transcribe', transcribeRouter);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Serve the built frontend (production only — in dev the Vite server handles this)
const DIST = join(__dirname, '../frontend/dist');
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  // SPA fallback — all non-API routes return index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(join(DIST, 'index.html'));
  });
} else {
  // Catch-all for unmatched routes (dev mode — frontend runs separately)
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
}

// Global error handler — must be last and have 4 args so Express treats it as an error handler.
// Prevents stack traces, internal paths, and error details from ever reaching the client.
app.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 10 MB.' });
  }
  console.error('Unhandled error:', err.status ?? 500, err.message);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown — finish in-flight requests before exiting
function gracefulShutdown(signal) {
  console.log(`${signal} received — shutting down gracefully`);
  server.close(() => {
    console.log('All connections closed');
    process.exit(0);
  });
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

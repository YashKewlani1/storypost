import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { limiter } from './middleware/rateLimiter.js';
import { requireApiKey } from './middleware/auth.js';
import authRouter, { verifyAuthCookie } from './routes/auth.js';
import postRouter from './routes/post.js';
import interviewRouter from './routes/interview.js';
import transcribeRouter from './routes/transcribe.js';

const app = express();

const MOCK_MODE = process.env.MOCK_MODE === 'true';
const IS_PROD   = process.env.NODE_ENV === 'production';

if (!MOCK_MODE && !process.env.GROQ_API_KEY) {
  console.error('GROQ_API_KEY is required (or set MOCK_MODE=true)');
  process.exit(1);
}
if (!IS_PROD && !process.env.INTERNAL_API_KEY) {
  console.error('INTERNAL_API_KEY is required in dev (injected by Vite proxy)');
  process.exit(1);
}

if (MOCK_MODE) {
  console.warn('[MOCK MODE] Claude API calls are disabled — returning mock data');
}

app.use(helmet());
const PORT = process.env.PORT || 3000;
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5000' }));
app.set('trust proxy', 1);

// Cookie parser — needed to read the auth JWT cookie
app.use(cookieParser());

// Auth routes (Google OAuth redirect / callback) — always public
app.use('/auth', authRouter);

// Protect frontend pages in production — redirect to Google sign-in if no auth cookie
if (IS_PROD) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path === '/health') return next();
    if (!verifyAuthCookie(req)) return res.redirect('/auth/google');
    next();
  });
}

// 1. Auth for API routes
//    Dev: x-api-key header from Vite proxy
//    Prod: JWT cookie from Google SSO
app.use('/api', IS_PROD
  ? (req, res, next) => verifyAuthCookie(req) ? next() : res.status(401).json({ error: 'Not authenticated' })
  : requireApiKey
);

// 2. Rate limiting
app.use('/api', limiter);

// 3. No caching on API responses
app.use('/api', (_, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// 4. Body parsing
app.use(express.json({ limit: '12mb' }));

app.use('/api/interview', interviewRouter);
app.use('/api/generate', postRouter);
app.use('/api/transcribe', transcribeRouter);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Serve built frontend when running on Railway / local production
// On Vercel, static files are served directly from CDN — this block is skipped
const DIST = join(__dirname, '../frontend/dist');
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(join(DIST, 'index.html'));
  });
} else {
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
}

// Global error handler
app.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request body' });
  if (err.code === 'LIMIT_FILE_SIZE')      return res.status(413).json({ error: 'File too large. Maximum size is 10 MB.' });
  console.error('Unhandled error:', err.status ?? 500, err.message);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

// Start listening unless running inside Vercel (Vercel handles the HTTP layer)
if (!process.env.VERCEL) {
  const PORT_NUM = parseInt(PORT, 10);
  const server = app.listen(PORT_NUM, () => {
    console.log(`Server running on http://localhost:${PORT_NUM}`);
  });

  function gracefulShutdown(signal) {
    console.log(`${signal} received — shutting down gracefully`);
    server.close(() => { console.log('All connections closed'); process.exit(0); });
  }
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
}

export default app;

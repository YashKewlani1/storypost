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

const missingVars = [
  (!MOCK_MODE && !process.env.GROQ_API_KEY) && 'GROQ_API_KEY',
  (!IS_PROD  && !process.env.INTERNAL_API_KEY) && 'INTERNAL_API_KEY',
].filter(Boolean);

if (missingVars.length) {
  // On Vercel (serverless) process.exit() just restarts the function — use a
  // poison-pill middleware that returns a clear 503 instead so the error is visible.
  const msg = `Missing required env vars: ${missingVars.join(', ')}`;
  console.error(msg);
  if (process.env.VERCEL) {
    // Can't exit cleanly; poison all routes so the error surfaces to the caller
    app.use((_req, res) => res.status(503).json({ error: msg }));
  } else {
    process.exit(1);
  }
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

// Protect frontend pages in production — show sign-in page if no auth cookie
if (IS_PROD) {
  app.get('/signin', (req, res) => {
    if (verifyAuthCookie(req)) return res.redirect('/');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>StoryPost — Sign in</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F5F4F0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06);
      padding: 48px 40px 40px;
      width: 100%;
      max-width: 380px;
      text-align: center;
    }
    .logo { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 8px; letter-spacing: -0.3px; }
    .tagline { color: #6B7280; font-size: 14px; margin-bottom: 36px; }
    .btn-google {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 12px 20px;
      background: #fff;
      color: #111827;
      border: 1.5px solid #E5E7EB;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    }
    .btn-google:hover {
      border-color: #4F46E5;
      box-shadow: 0 2px 8px rgba(79,70,229,0.12);
      background: #FAFAFA;
    }
    .google-icon { width: 18px; height: 18px; flex-shrink: 0; }
    .footer { margin-top: 24px; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">✦ StoryPost</div>
    <p class="tagline">Turn your stories into LinkedIn posts</p>
    <a class="btn-google" href="/auth/google">
      <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Sign in with Google
    </a>
    <p class="footer">Access restricted to @loophealth.com accounts</p>
  </div>
</body>
</html>`);
  });

  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path === '/health' || req.path === '/signin') return next();
    if (!verifyAuthCookie(req)) return res.redirect('/signin');
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

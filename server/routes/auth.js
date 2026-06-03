import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const router = express.Router();

const ALLOWED_DOMAIN = 'loophealth.com';
const BASE_URL      = process.env.BASE_URL      || 'http://localhost:3000';
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET    = process.env.JWT_SECRET    || 'dev-jwt-secret-change-in-prod';
const IS_PROD       = process.env.NODE_ENV === 'production';

if (IS_PROD && (!CLIENT_ID || !CLIENT_SECRET || !process.env.JWT_SECRET || !process.env.BASE_URL)) {
  const missing = [
    !CLIENT_ID && 'GOOGLE_CLIENT_ID',
    !CLIENT_SECRET && 'GOOGLE_CLIENT_SECRET',
    !process.env.JWT_SECRET && 'JWT_SECRET',
    !process.env.BASE_URL && 'BASE_URL',
  ].filter(Boolean).join(', ');
  console.error(`FATAL: ${missing} required in production`);
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('auth', token, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
}

function verifyAuthCookie(req) {
  const token = req.cookies?.auth;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

// Build a self-verifying CSRF state token — no cookie needed.
// Format: <random>.<timestamp(base36)>.<hmac>
// On Vercel the Set-Cookie in a redirect response can be dropped by the
// browser before it follows the external redirect to Google, making the
// cookie-based state check unreliable. A signed state token sidesteps this.
function makeOAuthState() {
  const nonce = crypto.randomBytes(16).toString('hex');
  const ts    = Date.now().toString(36);
  const payload = `${nonce}.${ts}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex').slice(0, 24);
  return `${payload}.${sig}`;
}

function verifyOAuthState(state) {
  if (!state || typeof state !== 'string') return false;
  const parts = state.split('.');
  if (parts.length !== 3) return false;
  const [nonce, ts, sig] = parts;
  const payload = `${nonce}.${ts}`;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex').slice(0, 24);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  // Reject tokens older than 10 minutes
  const age = Date.now() - parseInt(ts, 36);
  return age >= 0 && age < 10 * 60 * 1000;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Step 1 — redirect browser to Google
router.get('/google', (_req, res) => {
  console.log('[AUTH] Starting Google OAuth flow');
  const state = makeOAuthState();
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  `${BASE_URL}/auth/google/callback`,
    response_type: 'code',
    scope:         'openid email profile',
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Step 2 — Google redirects back with a code
router.get('/google/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  // User declined consent or Google returned an error — redirect gracefully
  if (oauthError) return res.redirect('/signin');

  if (!verifyOAuthState(state)) {
    // State invalid or expired — send back to sign-in so they can retry cleanly
    return res.redirect('/signin?error=session_expired');
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  `${BASE_URL}/auth/google/callback`,
        grant_type:    'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = await userRes.json();

    // Domain gate
    if (!user.email?.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
      console.warn('[AUTH] Denied — account not on allowed domain');
      return res.redirect('/auth/denied');
    }

    // Issue JWT auth cookie — no session needed
    console.log('[AUTH] Login successful');
    setAuthCookie(res, { email: user.email, name: user.name });
    res.redirect('/');
  } catch (err) {
    console.error('[AUTH] Google OAuth error:', err.message);
    res.status(500).send('Authentication failed — please try again.');
  }
});

// Shown when the Google account isn't @loophealth.com
router.get('/denied', (_req, res) => {
  res.status(403).send(
    '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;max-width:400px">' +
    '<h2>Access denied</h2>' +
    '<p>Only <strong>@loophealth.com</strong> accounts can sign in.</p>' +
    '<p><a href="/auth/google">Try a different account →</a></p>' +
    '</body></html>'
  );
});

// Returns the logged-in user (used by frontend if needed)
router.get('/me', (req, res) => {
  const user = verifyAuthCookie(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ email: user.email, name: user.name });
});

// Sign out — clear cookie and land on the friendly sign-in page, not the OAuth flow
router.post('/logout', (req, res) => {
  console.log('[AUTH] Logout');
  // Must pass the same path/secure/sameSite options used when setting the cookie —
  // without them the browser treats it as a different cookie and ignores the clear.
  res.clearCookie('auth', { httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/' });
  res.redirect('/signin');
});

export { verifyAuthCookie };
export default router;

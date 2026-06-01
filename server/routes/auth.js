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

if (IS_PROD && (!CLIENT_ID || !CLIENT_SECRET)) {
  console.error('FATAL: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in production');
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

// ── Routes ───────────────────────────────────────────────────────────────────

// Step 1 — redirect browser to Google
router.get('/google', (_req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  // Store state nonce in a short-lived cookie (CSRF protection without a session)
  res.cookie('oauth_state', state, { httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 5 * 60 * 1000 });
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
  const { code, state } = req.query;
  const savedState      = req.cookies?.oauth_state;

  if (!state || state !== savedState) {
    return res.status(403).send('Invalid OAuth state — possible CSRF. Try signing in again.');
  }
  res.clearCookie('oauth_state', { path: '/' });

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
      return res.redirect('/auth/denied');
    }

    // Issue JWT auth cookie — no session needed
    setAuthCookie(res, { email: user.email, name: user.name });
    res.redirect('/');
  } catch (err) {
    console.error('Google OAuth error:', err.message);
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

// Sign out
router.post('/logout', (_req, res) => {
  res.clearCookie('auth');
  res.redirect('/auth/google');
});

export { verifyAuthCookie };
export default router;

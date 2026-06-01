import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const router = express.Router();

const ALLOWED_DOMAIN = 'loophealth.com';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  `${BASE_URL}/auth/google/callback`,
  },
  (_accessToken, _refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value || '';
    if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
      return done(null, false, { message: 'Only @loophealth.com accounts can sign in.' });
    }
    return done(null, { email, name: profile.displayName });
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Kick off Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['email', 'profile'] }));

// Google redirects here after sign-in
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/denied' }),
  (_req, res) => res.redirect('/')
);

// Domain not allowed
router.get('/denied', (_req, res) => {
  res.status(403).send(
    '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px">' +
    '<h2>Access denied</h2><p>Only <strong>@loophealth.com</strong> accounts can sign in.</p>' +
    '<a href="/auth/google">Try a different account</a></body></html>'
  );
});

// Used by the frontend to know who's logged in
router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ email: req.user.email, name: req.user.name });
});

router.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/auth/google');
  });
});

export { passport };
export default router;

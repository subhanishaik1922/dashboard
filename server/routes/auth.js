const express = require('express');
const router = express.Router();
const auth = require('../auth');

// Explicit dynamic flags to bypass Vercel build-time caching and data freezing
router.dynamic = 'force-dynamic';
router.revalidate = 0;
router.fetchCache = 'force-no-store';

/**
 * POST /api/auth/login
 * Validates the custom admin password strictly from process.env.ADMIN_PASSWORD
 * Issues a signed JSON Web Token (JWT)
 */
router.post('/login', (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Ensure ADMIN_PASSWORD in authentication route points strictly to process.env.ADMIN_PASSWORD
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.replace(/\r$/, '') : null;
    if (!ADMIN_PASSWORD || !ADMIN_PASSWORD.trim()) {
      console.error('\n🚨 =======================================================');
      console.error('🚨 [SECURITY ALERT] ADMIN_PASSWORD is NOT configured in .env!');
      console.error('🚨 All administrative access is strictly LOCKED.');
      console.error('🚨 Set ADMIN_PASSWORD in your .env file to enable dashboard management.');
      console.error('🚨 =======================================================\n');
      return res.status(401).json({
        success: false,
        message: 'Access denied: ADMIN_PASSWORD is not configured in the server environment (.env).'
      });
    }

    const result = auth.login(password);
    if (!result.success) {
      return res.status(result.statusCode || 401).json({
        success: false,
        message: result.message || 'Invalid admin password. Access denied.'
      });
    }

    // Set JWT in HTTP-only cookie for seamless browser/admin route protection
    res.setHeader('Set-Cookie', `admin_session=${result.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

    res.json({
      success: true,
      message: 'Admin JWT authentication successful.',
      token: result.token,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
      expiresAt: result.expiresAt
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/auth/status
 * Verifies if the supplied JWT token or cookie is valid
 */
router.get('/status', (req, res) => {
  const authHeader = req.headers.authorization || '';
  let token = null;

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-admin-token']) {
    token = String(req.headers['x-admin-token']).trim();
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/admin_session=([^;]+)/);
    if (match) token = match[1];
  }

  const decoded = auth.validateToken(token);
  res.json({
    success: true,
    authenticated: Boolean(decoded),
    user: decoded ? { role: decoded.role, user: decoded.user } : null
  });
});

/**
 * POST /api/auth/logout
 * Revokes current JWT session token and clears cookie
 */
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  let token = null;

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-admin-token']) {
    token = String(req.headers['x-admin-token']).trim();
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/admin_session=([^;]+)/);
    if (match) token = match[1];
  }

  auth.logout(token);
  res.setHeader('Set-Cookie', 'admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

  res.json({
    success: true,
    message: 'Logged out successfully. JWT session revoked.'
  });
});

module.exports = router;

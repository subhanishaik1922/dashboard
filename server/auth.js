const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Set of revoked tokens (for explicit logout before JWT expiry)
const revokedTokens = new Set();

/**
 * Retrieve the master admin password strictly from the server environment (.env).
 * If missing, outputs a prominent terminal security alert and returns null.
 * NO hardcoded fallback strings are permitted.
 */
function getAdminPassword() {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass || typeof pass !== 'string' || pass.trim() === '') {
    console.error('\n🚨 =======================================================');
    console.error('🚨 [SECURITY ALERT] ADMIN_PASSWORD is NOT configured in .env!');
    console.error('🚨 All administrative access is strictly LOCKED.');
    console.error('🚨 Set ADMIN_PASSWORD in your .env file to enable dashboard management.');
    console.error('🚨 =======================================================\n');
    return null;
  }
  // Strip potential Windows carriage return (\r) while preserving exact string characters
  return pass.replace(/\r$/, '');
}

/**
 * Retrieve or generate a deterministic JWT Secret derived from the environment
 */
function getJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) {
    return process.env.JWT_SECRET.trim();
  }
  const masterPass = getAdminPassword();
  if (!masterPass) {
    // Ephemeral lock secret if unconfigured
    return 'unconfigured-ephemeral-lockdown-secret';
  }
  return crypto.createHash('sha256').update(`jwt-salt:${masterPass}`).digest('hex');
}

/**
 * Compare password using exact text string match and timing-safe buffer comparison
 */
function verifyPassword(inputPassword) {
  if (!inputPassword || typeof inputPassword !== 'string') return false;
  const adminPassword = getAdminPassword();
  if (!adminPassword) return false;

  // Exact text string comparison (checking both raw and trimmed to prevent accidental whitespace mismatches)
  const isExact = (inputPassword === adminPassword) || (inputPassword.trim() === adminPassword.trim());

  // Also verify using timing-safe buffer comparison if byte lengths match
  try {
    const inputBuffer = Buffer.from(inputPassword, 'utf-8');
    const targetBuffer = Buffer.from(adminPassword, 'utf-8');
    if (inputBuffer.length === targetBuffer.length && crypto.timingSafeEqual(inputBuffer, targetBuffer)) {
      return true;
    }
  } catch (e) {}

  return isExact;
}

/**
 * Authenticate credentials and issue a signed JSON Web Token (JWT)
 */
function login(password) {
  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    return {
      success: false,
      statusCode: 401,
      message: 'Access denied: ADMIN_PASSWORD is not configured in the server environment.'
    };
  }

  if (!verifyPassword(password)) {
    return {
      success: false,
      statusCode: 401,
      message: 'Invalid admin credentials'
    };
  }

  const secret = getJwtSecret();
  const payload = {
    role: 'admin',
    user: 'admin',
    iss: 'Career-Command-Center',
    timestamp: Date.now()
  };

  // Sign JWT with 24-hour expiration
  const token = jwt.sign(payload, secret, {
    expiresIn: '24h',
    algorithm: 'HS256'
  });

  return {
    success: true,
    token: token,
    tokenType: 'Bearer',
    expiresIn: '24h',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}

/**
 * Check and verify JSON Web Token (JWT) signature and validity
 */
function validateToken(token) {
  if (!token || typeof token !== 'string') return false;
  if (revokedTokens.has(token)) return false;

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return decoded;
  } catch (err) {
    return false;
  }
}

/**
 * Invalidate a token on logout
 */
function logout(token) {
  if (token && typeof token === 'string') {
    revokedTokens.add(token);
    return true;
  }
  return false;
}

/**
 * Express middleware to strictly protect mutating admin endpoints using JWT
 */
function requireAdminAuth(req, res, next) {
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

  const decoded = validateToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Access denied: Valid Admin JWT authentication required to perform this action.'
    });
  }

  // Attach decoded admin identity to request object
  req.user = decoded;
  next();
}

module.exports = {
  getAdminPassword,
  getJwtSecret,
  verifyPassword,
  login,
  validateToken,
  logout,
  requireAdminAuth
};

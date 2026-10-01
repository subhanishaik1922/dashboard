require('dotenv').config();
const auth = require('../server/auth');
const db = require('../server/db');

async function runAuthVerification() {
  console.log('🔒 Starting Admin Security & Route Protection Tests...\n');

  let passed = 0;
  let total = 0;

  function assert(condition, name) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
    }
  }

  // 1. Password verification
  const adminPassword = auth.getAdminPassword();
  assert(auth.verifyPassword(adminPassword) === true, 'Valid password matches ADMIN_PASSWORD');
  assert(auth.verifyPassword('wrongpassword') === false, 'Invalid password is rejected');
  assert(auth.verifyPassword('') === false, 'Empty password is rejected');
  assert(auth.verifyPassword(null) === false, 'Null password is rejected');

  // 2. Token creation and validation
  const loginResult = auth.login(adminPassword);
  assert(loginResult.success === true, 'Login with ADMIN_PASSWORD succeeds');
  assert(typeof loginResult.token === 'string' && loginResult.token.split('.').length === 3, 'Generates secure standard 3-part JWT token');
  assert(Boolean(auth.validateToken(loginResult.token)), 'Generated token is marked valid in session registry / JWT validator');
  assert(auth.validateToken('fake_unauthorized_token_123') === false, 'Tampered token is rejected');

  // 3. Logout invalidation
  auth.logout(loginResult.token);
  assert(auth.validateToken(loginResult.token) === false, 'Logged-out token is successfully revoked');

  // 4. Mock Express middleware test
  let middlewarePassed = false;
  let errorStatus = null;
  let errorResponse = null;

  const reqMockUnauthorized = {
    headers: {}
  };
  const resMockUnauthorized = {
    status: (code) => {
      errorStatus = code;
      return {
        json: (payload) => { errorResponse = payload; }
      };
    }
  };

  auth.requireAdminAuth(reqMockUnauthorized, resMockUnauthorized, () => {
    middlewarePassed = true;
  });

  assert(!middlewarePassed && errorStatus === 401, 'requireAdminAuth blocks unauthenticated request with HTTP 401');
  assert(errorResponse && errorResponse.error === 'UNAUTHORIZED', 'requireAdminAuth returns error payload UNAUTHORIZED');

  // 5. Middleware with valid token
  middlewarePassed = false;
  const newSession = auth.login(adminPassword);
  const reqMockAuthorized = {
    headers: {
      authorization: `Bearer ${newSession.token}`
    }
  };
  const resMockAuthorized = {
    status: (code) => ({ json: () => {} })
  };

  auth.requireAdminAuth(reqMockAuthorized, resMockAuthorized, () => {
    middlewarePassed = true;
  });

  assert(middlewarePassed === true, 'requireAdminAuth permits request with valid Bearer token');
  auth.logout(newSession.token);

  console.log(`\n========================================`);
  console.log(`Auth Verification Summary: ${passed}/${total} checks passed.`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runAuthVerification().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

require('dotenv').config();
const auth = require('../server/auth');

async function testStrictPasswordAuth() {
  console.log('🔒 Testing Strict ADMIN_PASSWORD Authentication & Security Fallback Alert...\n');

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

  const originalEnvPass = process.env.ADMIN_PASSWORD;

  // Test 1: Exact string match with complex custom password
  const testCustomSecret = 'My$uper!Custom#P@ssword_2026';
  process.env.ADMIN_PASSWORD = testCustomSecret;

  assert(auth.getAdminPassword() === testCustomSecret, 'getAdminPassword strictly returns custom password from process.env');
  assert(auth.verifyPassword(testCustomSecret) === true, 'verifyPassword matches exact text string of custom password');
  assert(auth.verifyPassword('admin123') === false, 'Hardcoded default "admin123" is REJECTED when custom password is set');
  assert(auth.verifyPassword('my$uper!custom#p@ssword_2026') === false, 'Case sensitivity preserved in exact match');
  assert(auth.verifyPassword('wrong') === false, 'Arbitrary password rejected');

  const customLogin = auth.login(testCustomSecret);
  assert(customLogin.success === true, 'Login succeeds with exact custom password');
  assert(Boolean(customLogin.token), 'Returns valid JWT token');

  // Test 2: Windows CRLF handling
  process.env.ADMIN_PASSWORD = 'WindowsLineEndingPass\r';
  assert(auth.getAdminPassword() === 'WindowsLineEndingPass', 'Strips carriage return (\\r) from Windows line endings');
  assert(auth.verifyPassword('WindowsLineEndingPass') === true, 'Exact match works cleanly on Windows files');

  // Test 3: Missing / undefined ADMIN_PASSWORD triggers security alert and blocks access
  console.log('\n--- Testing Undefined/Missing ADMIN_PASSWORD Fallback Alert ---');
  delete process.env.ADMIN_PASSWORD;

  const missingResult = auth.getAdminPassword();
  assert(missingResult === null, 'getAdminPassword returns null when ADMIN_PASSWORD is missing (NO default string fallback)');

  const failedLogin = auth.login('admin123');
  assert(failedLogin.success === false, 'Login fails when ADMIN_PASSWORD is missing');
  assert(failedLogin.statusCode === 401, 'Returns 401 status');
  assert(failedLogin.message.includes('ADMIN_PASSWORD is not configured'), 'Returns informative configuration error message');

  // Restore original
  process.env.ADMIN_PASSWORD = originalEnvPass;
  console.log(`\n========================================`);
  console.log(`Strict Auth Summary: ${passed}/${total} checks passed.`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

testStrictPasswordAuth().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

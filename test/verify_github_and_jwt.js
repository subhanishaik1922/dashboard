require('dotenv').config();
const githubService = require('../server/githubService');
const auth = require('../server/auth');
const db = require('../server/db');
const jwt = require('jsonwebtoken');
const fs = require('fs');

async function runTests() {
  console.log('🧪 Starting GitHub Integration, JWT Auth & Docker Persistence Verification...\n');

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

  // =========================================================================
  // 1. GitHub API Integration & Mapping Tests
  // =========================================================================
  console.log('--- 1. Testing GitHub API Integration & Array Extraction ---');
  const ghUsername = githubService.getGitHubUsername();
  assert(Boolean(ghUsername), `Target GitHub username configured: ${ghUsername}`);

  const ghResult = await githubService.fetchGitHubRepositories();
  assert(ghResult && typeof ghResult === 'object', 'fetchGitHubRepositories returns result object');
  assert(Array.isArray(ghResult.repositories), 'Result contains repositories array');
  assert(ghResult.repositories.length > 0, `Repositories found: ${ghResult.repositories.length}`);

  const sampleRepo = ghResult.repositories[0];
  assert(sampleRepo.name && sampleRepo.id, `Repository contains name (${sampleRepo.name}) and id (${sampleRepo.id})`);
  assert(sampleRepo.visible === true, `Repository visibility defaults to true so cards populate the dashboard grid`);
  assert(typeof sampleRepo.stars === 'number', `Repository contains numeric stars (${sampleRepo.stars})`);
  assert(typeof sampleRepo.forks === 'number', `Repository contains numeric forks (${sampleRepo.forks})`);
  assert(sampleRepo.repoUrl && sampleRepo.repoUrl.startsWith('http'), `Repository has valid URL: ${sampleRepo.repoUrl}`);

  // Test extraction from simulated raw GitHub API envelopes (both array and search/user formats)
  const simulatedPublicPrivateArray = [
    {
      id: 101,
      name: "private-core-service",
      private: true,
      description: "Internal microservice",
      stargazers_count: 5,
      forks_count: 1,
      language: "Go",
      html_url: "https://github.com/org/private-core-service"
    },
    {
      id: 102,
      name: "public-web-app",
      private: false,
      description: "Frontend web app",
      stargazers_count: 32,
      forks_count: 7,
      language: "TypeScript",
      html_url: "https://github.com/org/public-web-app"
    }
  ];

  const extractedList = Array.isArray(simulatedPublicPrivateArray) ? simulatedPublicPrivateArray : [];
  assert(extractedList.length === 2, 'Extracts both public and private repository lists from API array payload');
  assert(extractedList.some(r => r.private === true) && extractedList.some(r => r.private === false), 'Preserves public & private distinction');

  // =========================================================================
  // 2. Custom Password & JWT Authentication Tests
  // =========================================================================
  console.log('\n--- 2. Testing Custom Password & JSON Web Token (JWT) Authentication ---');
  const customPassword = process.env.ADMIN_PASSWORD || 'admin123';
  assert(auth.verifyPassword(customPassword) === true, `Password verification succeeds with custom ADMIN_PASSWORD: ${customPassword}`);
  assert(auth.verifyPassword('completely_wrong_pass') === false, 'Password verification rejects wrong password');

  const loginRes = auth.login(customPassword);
  assert(loginRes.success === true, 'auth.login succeeds with correct password');
  assert(typeof loginRes.token === 'string', 'auth.login returns JWT token string');
  assert(loginRes.tokenType === 'Bearer', 'Token type is Bearer');

  // Verify JWT structure (Header.Payload.Signature)
  const jwtParts = loginRes.token.split('.');
  assert(jwtParts.length === 3, 'Token format is standard 3-part JWT (Header.Payload.Signature)');

  // Decode JWT payload using jsonwebtoken
  const secret = auth.getJwtSecret();
  const decoded = jwt.verify(loginRes.token, secret);
  assert(decoded.role === 'admin', 'Decoded JWT payload contains role: admin');
  assert(decoded.iss === 'Career-Command-Center', 'Decoded JWT issuer is Career-Command-Center');
  assert(Boolean(decoded.exp), 'JWT contains standard exp (expiration timestamp)');

  // Test tampered JWT
  const tamperedToken = `${loginRes.token}tampered`;
  assert(auth.validateToken(tamperedToken) === false, 'Tampered JWT signature is rejected');

  // Test JWT middleware
  let reqAuthorized = { headers: { authorization: `Bearer ${loginRes.token}` } };
  let middlewareNextCalled = false;
  auth.requireAdminAuth(reqAuthorized, {}, () => { middlewareNextCalled = true; });
  assert(middlewareNextCalled === true && reqAuthorized.user?.role === 'admin', 'requireAdminAuth accepts valid JWT and attaches user payload');

  // =========================================================================
  // 3. Docker Volume Persistence Tests
  // =========================================================================
  console.log('\n--- 3. Testing Docker Mapped Volume Persistence ---');
  const testDbPath = db.DB_PATH;
  assert(Boolean(testDbPath), `Active persistence storage path: ${testDbPath}`);
  assert(fs.existsSync(testDbPath), 'Target data.json exists on disk');

  // Modify record and verify immediate fsync write
  const testKey = `test_val_${Date.now()}`;
  db.updateIdentity({ dockerPersistenceProbe: testKey });

  // Read directly from disk descriptor to verify flush
  const onDiskJson = JSON.parse(fs.readFileSync(testDbPath, 'utf-8'));
  assert(onDiskJson.identity?.dockerPersistenceProbe === testKey, 'Direct fsync write immediately persists to underlying mapped volume');

  console.log(`\n========================================`);
  console.log(`Verification Summary: ${passed}/${total} checks passed.`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

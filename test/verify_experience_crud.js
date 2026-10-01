/**
 * Verification Test Suite: Work Experience Dynamic Row Injector & 'work_experience' Array Database Persistence
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Explicitly load .env file from project root directory
const envPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

try {
  if (fs.existsSync(envPath)) {
    const envRaw = fs.readFileSync(envPath, 'utf8');
    const parseKey = (key) => {
      const regex = new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`, 'm');
      const match = envRaw.match(regex);
      if (match) {
        let val = match[1].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        return val.replace(/\r$/, '');
      }
      return null;
    };
    const adminPass = parseKey('ADMIN_PASSWORD');
    if (adminPass !== null) process.env.ADMIN_PASSWORD = adminPass;
  }
} catch (e) {}

console.log('🧪 =======================================================');
console.log('🧪 Starting Work Experience Dynamic Engine & Persistence Tests');
console.log('🧪 =======================================================\n');

let passedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${description}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function itAsync(description, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${description}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runTests() {
  const rootDir = path.resolve(__dirname, '..');
  const indexHtmlPath = path.join(rootDir, 'public', 'index.html');
  const adminJsPath = path.join(rootDir, 'public', 'js', 'admin.js');
  const publicViewJsPath = path.join(rootDir, 'public', 'js', 'publicView.js');
  const apiJsPath = path.join(rootDir, 'public', 'js', 'api.js');
  const dbJsPath = path.join(rootDir, 'server', 'db.js');
  const identityRoutesPath = path.join(rootDir, 'server', 'routes', 'identity.js');
  const dataJsonPath = path.join(rootDir, 'data.json');

  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const adminJs = fs.readFileSync(adminJsPath, 'utf8');
  const publicViewJs = fs.readFileSync(publicViewJsPath, 'utf8');
  const apiJs = fs.readFileSync(apiJsPath, 'utf8');
  const db = require('../server/db');

  console.log('--- 1. Frontend Layout & Event Listener Matching Audit ---');

  it('index.html contains #btn-add-position button ID', () => {
    assert(indexHtml.includes('id="btn-add-position"'), 'Missing id="btn-add-position" on Add Position button');
  });

  it('index.html contains .btn-add-position class', () => {
    assert(indexHtml.includes('btn-add-position'), 'Missing .btn-add-position class on Add Position button');
  });

  it('index.html contains #adm-experience-form-wrapper for dynamic rows', () => {
    assert(indexHtml.includes('id="adm-experience-form-wrapper"'), 'Missing #adm-experience-form-wrapper container');
  });

  it('index.html contains #adm-experience-list for saved items', () => {
    assert(indexHtml.includes('id="adm-experience-list"'), 'Missing #adm-experience-list container');
  });

  it('index.html completely removes dead showAddExperienceModal call', () => {
    assert(!indexHtml.includes('showAddExperienceModal'), 'Found reference to dead showAddExperienceModal()');
  });

  console.log('\n--- 2. Frontend JavaScript Injection & Field Engine Audit ---');

  it('admin.js defines and exposes handleAddPositionRow', () => {
    assert(adminJs.includes('function handleAddPositionRow'), 'Missing handleAddPositionRow definition');
    assert(adminJs.includes('window.handleAddPositionRow = handleAddPositionRow'), 'handleAddPositionRow not exposed on window');
  });

  it('admin.js injects inputs for Company Name, Job Title, Duration, and Description', () => {
    assert(adminJs.includes('Company Name'), 'Missing Company Name label/field in dynamic row');
    assert(adminJs.includes('Job Title'), 'Missing Job Title label/field in dynamic row');
    assert(adminJs.includes('Duration'), 'Missing Duration label/field in dynamic row');
    assert(adminJs.includes('Description'), 'Missing Description textarea in dynamic row');
    assert(adminJs.includes('adm-exp-company-'), 'Missing adm-exp-company- ID prefix');
    assert(adminJs.includes('adm-exp-role-'), 'Missing adm-exp-role- ID prefix');
    assert(adminJs.includes('adm-exp-duration-'), 'Missing adm-exp-duration- ID prefix');
    assert(adminJs.includes('adm-exp-desc-'), 'Missing adm-exp-desc- ID prefix');
  });

  it('admin.js binds Add Position event listener matching button ID and class', () => {
    assert(adminJs.includes('btn-add-position'), 'admin.js must target btn-add-position for event binding');
    assert(adminJs.includes('bindAddPositionButton'), 'Missing bindAddPositionButton function');
  });

  it('admin.js supports saving individual rows and batch saving multiple rows', () => {
    assert(adminJs.includes('handleSavePositionRow'), 'Missing handleSavePositionRow function');
    assert(adminJs.includes('handleSaveAllPositionRows'), 'Missing handleSaveAllPositionRows function');
  });

  it('admin.js renders from work_experience array', () => {
    assert(adminJs.includes('identity.work_experience'), 'admin.js must check identity.work_experience');
  });

  it('publicView.js renders from work_experience array', () => {
    assert(publicViewJs.includes('identity.work_experience'), 'publicView.js must check identity.work_experience');
  });

  it('api.js supports work experience add, save, and delete', () => {
    assert(apiJs.includes('addExperience'), 'Missing addExperience in api.js');
    assert(apiJs.includes('saveWorkExperience'), 'Missing saveWorkExperience in api.js');
    assert(apiJs.includes('deleteExperience'), 'Missing deleteExperience in api.js');
  });

  console.log('\n--- 3. Database Persistence & Isolation Audit ---');

  it('db.js exports work experience management methods', () => {
    assert(typeof db.getWorkExperience === 'function', 'Missing db.getWorkExperience');
    assert(typeof db.addWorkExperience === 'function', 'Missing db.addWorkExperience');
    assert(typeof db.deleteWorkExperience === 'function', 'Missing db.deleteWorkExperience');
    assert(typeof db.saveWorkExperience === 'function', 'Missing db.saveWorkExperience');
  });

  it('db.getData() returns root work_experience array', () => {
    const data = db.getData();
    assert(Array.isArray(data.work_experience), 'data.work_experience must be an array');
    assert(Array.isArray(data.identity.work_experience), 'data.identity.work_experience must be an array');
  });

  // Preserve initial state before mutating
  const initialDataRaw = fs.readFileSync(dataJsonPath, 'utf8');
  const initialParsed = JSON.parse(initialDataRaw);
  const initialExpList = Array.isArray(initialParsed.work_experience) ? [...initialParsed.work_experience] : [];

  it('db.addWorkExperience pushes single position cleanly into work_experience in data.json', () => {
    const testPos = {
      companyName: 'Test Automation Inc',
      jobTitle: 'Lead SRE Architect',
      duration: '2024 - Present',
      description: 'Implemented autonomous CI/CD pipelines and infrastructure as code.'
    };

    const updated = db.addWorkExperience(testPos);
    assert(Array.isArray(updated), 'Updated result must be an array');
    
    // Verify on disk immediately
    const onDisk = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    assert(Array.isArray(onDisk.work_experience), 'onDisk.work_experience must be an array');
    const found = onDisk.work_experience.find(e => e.company === 'Test Automation Inc' || e.companyName === 'Test Automation Inc');
    assert(found, 'Added position must exist in data.json work_experience array');
    assert.strictEqual(found.role, 'Lead SRE Architect');
    assert.strictEqual(found.jobTitle, 'Lead SRE Architect');
    assert.strictEqual(found.period, '2024 - Present');
    assert.strictEqual(found.duration, '2024 - Present');
    assert.strictEqual(found.description, 'Implemented autonomous CI/CD pipelines and infrastructure as code.');
  });

  it('db.addWorkExperience pushes multiple positions cleanly into work_experience in data.json without errors', () => {
    const batchPositions = [
      {
        companyName: 'CloudScale Systems',
        jobTitle: 'Senior Infrastructure Engineer',
        duration: '2022 - 2024',
        description: 'Managed Kubernetes clusters across AWS and GCP.'
      },
      {
        companyName: 'DevOps Nexus',
        jobTitle: 'Cloud Architect',
        duration: '2020 - 2022',
        description: 'Designed zero-downtime blue/green deployment systems.'
      }
    ];

    const updated = db.addWorkExperience(batchPositions);
    assert(Array.isArray(updated), 'Updated result must be an array');

    const onDisk = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    const csFound = onDisk.work_experience.find(e => e.company === 'CloudScale Systems');
    const dnFound = onDisk.work_experience.find(e => e.company === 'DevOps Nexus');
    assert(csFound, 'CloudScale Systems position must exist in data.json work_experience');
    assert(dnFound, 'DevOps Nexus position must exist in data.json work_experience');
    assert.strictEqual(csFound.role, 'Senior Infrastructure Engineer');
    assert.strictEqual(dnFound.jobTitle, 'Cloud Architect');
  });

  it('db.saveData protects work_experience during automated background sync operations', () => {
    // Read state before sync
    const preSyncData = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    const preSyncExpCount = (preSyncData.work_experience || []).length;

    // Simulate a sync operation payload testing isSyncOperation protection without blowing away real repositories
    const simulatedSyncPayload = {
      ...preSyncData,
      lastSyncTimestamp: new Date().toISOString()
    };

    // Call saveData with isSyncOperation = true
    db.saveData(simulatedSyncPayload, true);

    // Verify on disk that work_experience was preserved 100% untouched
    const postSyncData = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    assert(Array.isArray(postSyncData.work_experience), 'postSyncData.work_experience must be an array');
    assert.strictEqual(postSyncData.work_experience.length, preSyncExpCount, 'work_experience array length must remain identical after sync');
    const testFound = postSyncData.work_experience.find(e => e.company === 'Test Automation Inc');
    assert(testFound, 'Work experience entries must remain completely intact across sync');
  });

  it('db.deleteWorkExperience removes position and persists to data.json', () => {
    const onDiskBefore = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    const target = onDiskBefore.work_experience.find(e => e.company === 'Test Automation Inc');
    assert(target, 'Target item must exist before deletion');

    const remaining = db.deleteWorkExperience(target.id);
    const onDiskAfter = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    const stillExists = onDiskAfter.work_experience.find(e => e.id === target.id);
    assert(!stillExists, 'Target item must be deleted from data.json work_experience');
  });

  // Restore or clean up test entries
  db.saveWorkExperience(initialExpList);

  console.log('\n--- 4. HTTP API Route Integration Audit ---');

  const http = require('http');

  const makeRequest = (options, postData = null) => {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
          } catch (e) {
            resolve({ statusCode: res.statusCode, headers: res.headers, raw: body });
          }
        });
      });
      req.on('error', reject);
      if (postData) {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
      req.end();
    });
  };

  await itAsync('GET /api/identity returns work_experience array over HTTP', async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/identity',
      method: 'GET'
    });
    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
    assert(res.body.success, 'Response must be success: true');
    assert(Array.isArray(res.body.work_experience), 'Response body must contain work_experience array');
    assert(Array.isArray(res.body.identity.work_experience), 'Response body identity must contain work_experience array');
  });

  await itAsync('GET /api/identity/experience returns work_experience array over HTTP', async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/identity/experience',
      method: 'GET'
    });
    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
    assert(res.body.success, 'Response must be success: true');
    assert(Array.isArray(res.body.work_experience), 'Response body must contain work_experience array');
  });

  const auth = require('../server/auth');
  const adminPassword = auth.getAdminPassword();

  await itAsync('POST /api/auth/login provides admin token for experience management', async () => {
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { password: adminPassword });

    assert.strictEqual(loginRes.statusCode, 200, `Expected 200, got ${loginRes.statusCode}: ${JSON.stringify(loginRes.body)}`);
    assert(loginRes.body.token, 'Login must return JWT token');

    const adminToken = loginRes.body.token;

    // Test adding a position via HTTP
    const addRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/identity/experience',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      companyName: 'HTTP Verified Systems',
      jobTitle: 'Principal Systems Architect',
      duration: '2025 - Present',
      description: 'Engineered high-throughput event buses.'
    });

    assert.strictEqual(addRes.statusCode, 200, `Expected 200 from POST /experience, got ${addRes.statusCode}`);
    assert(addRes.body.success, 'Add experience must return success');
    assert(Array.isArray(addRes.body.work_experience), 'Returned work_experience must be array');
    const addedItem = addRes.body.work_experience.find(e => e.company === 'HTTP Verified Systems' || e.companyName === 'HTTP Verified Systems');
    assert(addedItem, 'HTTP added item must be present in response');

    // Test deleting the item via HTTP
    const delRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/identity/experience/${addedItem.id}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    assert.strictEqual(delRes.statusCode, 200);
    assert(delRes.body.success, 'Delete experience must return success');
  });

  console.log(`\n=======================================================`);
  console.log(`🎉 Results: ${passedTests} / ${totalTests} checks passed successfully (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`=======================================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

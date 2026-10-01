const db = require('../server/db');
const vercelService = require('../server/vercelService');

async function runTests() {
  console.log('🧪 Starting Career Command Center System Verification Tests...\n');

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

  // 1. Verify Database read
  const data = db.getData();
  assert(data && data.identity, 'Database loads correctly with identity schema');
  assert(data.vercel && Array.isArray(data.vercel.cachedDeployments), 'Database contains vercel deployment cache');
  assert(data.github && Array.isArray(data.github.repositories), 'Database contains github repositories');
  assert(data.jobHunt && data.jobHunt.linkedin && data.jobHunt.naukri, 'Database contains jobHunt LinkedIn & Naukri trackers');

  // 2. Test Vercel Service status normalization
  assert(vercelService.normalizeStatus('READY') === 'Ready', 'Vercel status READY normalized to Ready');
  assert(vercelService.normalizeStatus('BUILDING') === 'Building', 'Vercel status BUILDING normalized to Building');
  assert(vercelService.normalizeStatus('ERROR') === 'Error', 'Vercel status ERROR normalized to Error');

  // 3. Test Vercel Service deployment fetch (with cache fallback)
  const vercelResult = await vercelService.fetchVercelDeployments();
  assert(vercelResult && Array.isArray(vercelResult.deployments), 'fetchVercelDeployments returns deployment array');
  assert(vercelResult.deployments.length > 0, `Deployments count > 0 (found ${vercelResult.deployments.length})`);
  assert(vercelResult.deployments[0].status && vercelResult.deployments[0].name, 'Deployments contain status and project name');

  // 4. Test CRUD Updates and Persistence on Disk
  const originalViews = data.jobHunt.linkedin.profileViews;
  const testNewViews = originalViews + 10;
  db.updateLinkedInMetrics({ profileViews: testNewViews });

  // Read fresh from disk directly using fs
  const fs = require('fs');
  const path = require('path');
  const diskData = JSON.parse(fs.readFileSync(db.DB_PATH, 'utf-8'));
  assert(diskData.jobHunt.linkedin.profileViews === testNewViews, 'LinkedIn metric update persisted to disk');

  // Restore original
  db.updateLinkedInMetrics({ profileViews: originalViews });

  // 5. Test Naukri Metric Update and Persistence
  const originalNaukriSearches = data.jobHunt.naukri.searchAppearances;
  const testNaukriSearches = originalNaukriSearches + 5;
  db.updateNaukriMetrics({ searchAppearances: testNaukriSearches });
  const diskData2 = JSON.parse(fs.readFileSync(db.DB_PATH, 'utf-8'));
  assert(diskData2.jobHunt.naukri.searchAppearances === testNaukriSearches, 'Naukri metric update persisted to disk');
  db.updateNaukriMetrics({ searchAppearances: originalNaukriSearches });

  // 6. Test GitHub repo toggle persistence
  const repo = data.github.repositories[0];
  const oldFeatured = repo.featured;
  db.updateRepoToggle(repo.id, { featured: !oldFeatured });
  const diskData3 = JSON.parse(fs.readFileSync(db.DB_PATH, 'utf-8'));
  const updatedRepo = diskData3.github.repositories.find(r => r.id === repo.id);
  assert(updatedRepo.featured === !oldFeatured, 'GitHub repo featured toggle persisted to disk');
  db.updateRepoToggle(repo.id, { featured: oldFeatured });

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

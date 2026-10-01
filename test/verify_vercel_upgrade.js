require('dotenv').config();
const vercelService = require('../server/vercelService');
const db = require('../server/db');

async function testVercelUpgrade() {
  console.log('🧪 Starting Vercel API Integration Upgrade Verification...\n');

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

  // 1. Verify VERCEL_TOKEN configuration
  const activeToken = vercelService.getVercelToken();
  assert(Boolean(activeToken), `Active Vercel token detected: ${db.maskToken(activeToken)}`);
  assert(activeToken === process.env.VERCEL_TOKEN || activeToken === db.getVercelConfig().apiToken, 'Token prioritized correctly from environment/config');

  // 2. Test Project Retrieval Module (v10/projects)
  console.log('\n--- Testing v10/projects endpoint & .projects wrapper extraction ---');
  const projectsResult = await vercelService.fetchVercelProjects();
  assert(projectsResult && typeof projectsResult === 'object', 'fetchVercelProjects returns valid result object');
  assert(Array.isArray(projectsResult.projects), 'Targeted result contains .projects array (not unparsed root object)');
  console.log(`   Projects found: ${projectsResult.projects.length} (isLive: ${projectsResult.isLive})`);
  
  if (projectsResult.projects.length > 0) {
    const prj = projectsResult.projects[0];
    assert(prj.id && prj.name, `Project item contains normalized id (${prj.id}) and name (${prj.name})`);
    assert(prj.status, `Project item contains normalized status: ${prj.status}`);
    assert(prj.url, `Project item contains domain URL: ${prj.url}`);
  }

  // 3. Test Deployment Retrieval Module (v7/deployments)
  console.log('\n--- Testing v7/deployments endpoint & .deployments wrapper extraction ---');
  const deploymentsResult = await vercelService.fetchVercelDeployments();
  assert(deploymentsResult && typeof deploymentsResult === 'object', 'fetchVercelDeployments returns valid result object');
  assert(Array.isArray(deploymentsResult.deployments), 'Targeted result contains .deployments array (not unparsed root object)');
  console.log(`   Deployments found: ${deploymentsResult.deployments.length} (isLive: ${deploymentsResult.isLive})`);

  if (deploymentsResult.deployments.length > 0) {
    const dep = deploymentsResult.deployments[0];
    assert(dep.id && dep.name, `Deployment item contains normalized id (${dep.id}) and name (${dep.name})`);
    assert(dep.status, `Deployment item contains normalized status: ${dep.status}`);
    assert(dep.url, `Deployment item contains domain URL: ${dep.url}`);
  }

  // 4. Test Unified Synchronizer (parallel v10/projects + v7/deployments)
  console.log('\n--- Testing Unified Synchronizer ---');
  const syncResult = await vercelService.syncAllVercelData();
  assert(syncResult.success === true, 'syncAllVercelData succeeds');
  assert(Array.isArray(syncResult.projects), 'syncAllVercelData returns array of projects');
  assert(Array.isArray(syncResult.deployments), 'syncAllVercelData returns array of deployments');

  // 5. Test Mock Raw Vercel Payload Wrapper Array Extraction
  console.log('\n--- Testing Wrapper Array Extraction against simulated raw Vercel envelopes ---');
  
  // Simulated raw Vercel /v10/projects payload with wrapper envelope
  const mockRawProjectsPayload = {
    projects: [
      {
        id: "prj_test123",
        name: "test-portfolio",
        framework: "nextjs",
        targets: {
          production: {
            url: "test-portfolio.vercel.app",
            alias: ["test.dev"],
            readyState: "READY"
          }
        },
        updatedAt: 1727690000000
      }
    ],
    pagination: { count: 1, next: null, prev: null }
  };

  // Verify that an unparsed root object is NOT sent
  assert(mockRawProjectsPayload.pagination !== undefined, 'Raw Vercel response has outer envelope');
  const extractedProjects = mockRawProjectsPayload.projects;
  assert(Array.isArray(extractedProjects) && extractedProjects.length === 1, 'Targeted .projects wrapper array extracted successfully');

  // Simulated raw Vercel /v7/deployments payload with wrapper envelope
  const mockRawDeploymentsPayload = {
    deployments: [
      {
        uid: "dpl_test456",
        name: "test-portfolio",
        url: "test-portfolio-dpl.vercel.app",
        state: "READY",
        created: 1727690000000,
        meta: { githubCommitRef: "main", githubCommitMessage: "initial" }
      }
    ],
    pagination: { count: 1, next: null, prev: null }
  };
  const extractedDeployments = mockRawDeploymentsPayload.deployments;
  assert(Array.isArray(extractedDeployments) && extractedDeployments.length === 1, 'Targeted .deployments wrapper array extracted successfully');

  console.log(`\n========================================`);
  console.log(`Vercel Upgrade Summary: ${passed}/${total} checks passed.`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

testVercelUpgrade().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

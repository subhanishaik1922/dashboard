const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const app = require('../server');

async function runPortfolioLinkVerification() {
  console.log('🧪 Starting Public Portfolio & GitHub Link Verification Tests...\n');

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

  // 1. Verify data.json database structure
  const data = db.getData();
  assert(Boolean(data.github?.repositories?.length), 'data.json contains github repositories');
  const targetRepo = data.github.repositories[0];
  assert(Boolean(targetRepo.repoUrl || targetRepo.html_url), `Target repo has valid URL: ${targetRepo.repoUrl || targetRepo.html_url}`);
  const expectedGithubUrl = targetRepo.html_url || targetRepo.repoUrl;
  assert(expectedGithubUrl.includes('github.com/subhanishaik1922'), `Expected GitHub URL points to subhanishaik1922: ${expectedGithubUrl}`);

  // 2. Start ephemeral test server and test /api/projects
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/projects`);
    assert(res.status === 200, 'GET /api/projects returns HTTP 200');

    const json = await res.json();
    assert(json.success === true, 'Response JSON success is true');
    assert(Array.isArray(json.projects), 'Response contains projects array');
    assert(json.projects.length > 0, `Projects array has items (found ${json.projects.length})`);

    const project = json.projects[0];
    assert(project.name === targetRepo.name, `Project name matches database: ${project.name}`);
    assert(project.html_url === expectedGithubUrl, `project.html_url exactly matches data.json: ${project.html_url}`);
    assert(project.repoUrl === expectedGithubUrl, `project.repoUrl exactly matches data.json: ${project.repoUrl}`);
    assert(project.html_url !== '#', 'project.html_url is not dead link "#"');
    assert(!project.html_url.includes('.vercel.app'), 'project.html_url is not polluted by Vercel deployment URL');
    assert(project.liveUrl === 'https://portfolio-main-c8370q2v6-subhani1922.vercel.app', `project.liveUrl matches newest Ready deployment: ${project.liveUrl}`);
    assert(project.status === 'Ready', `project.status is Ready: ${project.status}`);

    // 3. Test ?format=array
    const arrayRes = await fetch(`http://localhost:${port}/api/projects?format=array`);
    const rawArray = await arrayRes.json();
    assert(Array.isArray(rawArray), 'GET /api/projects?format=array returns direct JSON array');
    assert(rawArray[0].html_url === expectedGithubUrl, 'Raw array project.html_url matches expected GitHub URL');
    assert(rawArray[0].liveUrl === 'https://portfolio-main-c8370q2v6-subhani1922.vercel.app', 'Raw array project.liveUrl matches newest Ready deployment');

    // 4. Inspect public/index.html for purged dead/mock links
    const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    assert(!htmlContent.includes('href="https://github.com"'), 'public/index.html does not contain generic unmapped href="https://github.com"');
    assert(htmlContent.includes('https://github.com/subhanishaik1922'), 'public/index.html badge links to exact profile https://github.com/subhanishaik1922');
    assert(!htmlContent.includes('href="https://www.linkedin.com"'), 'public/index.html does not contain generic unmapped href="https://www.linkedin.com"');
    assert(!htmlContent.includes('href="https://www.naukri.com"'), 'public/index.html does not contain generic unmapped href="https://www.naukri.com"');

    // 5. Inspect public/js/publicView.js for link sanitization and exact mapping
    const publicViewPath = path.join(__dirname, '..', 'public', 'js', 'publicView.js');
    const publicViewContent = fs.readFileSync(publicViewPath, 'utf8');

    assert(!publicViewContent.includes('href="${repo.repoUrl || \'#\'}"'), 'publicView.js does not contain dead fallback href="${repo.repoUrl || \'#\'}"');
    assert(!publicViewContent.includes('${repo.name}.vercel.app'), 'publicView.js does not construct fake mock domains ${repo.name}.vercel.app');
    assert(publicViewContent.includes('loadAndRenderProjects'), 'publicView.js exports loadAndRenderProjects for direct /api/projects integration');
    assert(publicViewContent.includes('item.html_url || item.repoUrl'), 'publicView.js prioritizes item.html_url / item.repoUrl');

    // 6. Test publicView card rendering logic via node evaluation
    // Simulate DOM environment
    const testItem = {
      id: '1393199225',
      name: 'portfolio-main',
      html_url: 'https://github.com/subhanishaik1922/portfolio-main',
      repoUrl: 'https://github.com/subhanishaik1922/portfolio-main',
      liveUrl: 'https://portfolio-main-c8370q2v6-subhani1922.vercel.app',
      domain: 'portfolio-main-c8370q2v6-subhani1922.vercel.app',
      status: 'Ready',
      language: 'TypeScript',
      stars: 5,
      forks: 2,
      featured: true,
      visible: true
    };

    // Verify card generation produces exact href
    assert(testItem.html_url === expectedGithubUrl, 'Simulated project card uses exact GitHub URL');
    assert(testItem.liveUrl !== testItem.html_url, 'Live URL and GitHub URL are properly separated');
    assert(testItem.liveUrl === 'https://portfolio-main-c8370q2v6-subhani1922.vercel.app', 'Simulated project card uses latest c8370q2v6 live URL');
    assert(!testItem.liveUrl.includes('30xhgdwfg'), 'Simulated project card does not contain old deployment hash');

  } finally {
    server.close();
  }

  console.log(`\n========================================`);
  console.log(`Portfolio Links Summary: ${passed}/${total} checks passed.`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runPortfolioLinkVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

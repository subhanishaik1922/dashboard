const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const auth = require('../server/auth');
const app = require('../server');

async function runSocialAndResumeVerification() {
  console.log('🧪 Starting Active Social Links & Resume PDF Upload Engine Verification Tests...\n');

  let passed = 0;
  let total = 0;

  function testAssert(condition, name) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
    }
  }

  // 1. Database initial check and state snapshot
  const data = db.getData();
  testAssert(Boolean(data.identity), 'data.json contains identity object');
  testAssert(Boolean(data.jobHunt), 'data.json contains jobHunt object');
  testAssert(Boolean(data.linkedin_url), 'data.json contains isolated linkedin_url');
  testAssert(Boolean(data.naukri_url), 'data.json contains isolated naukri_url');
  testAssert(Boolean(data.resume_filename), 'data.json contains isolated resume_filename');

  const initialProtected = db.getProtectedState();
  const initialLinkedIn = initialProtected.linkedin_url;
  const initialNaukri = initialProtected.naukri_url;
  const initialResumeFilename = initialProtected.resume_filename;

  // Generate Admin JWT token for authenticated endpoint tests
  const loginResult = auth.login(auth.getAdminPassword());
  const adminToken = loginResult.token;
  testAssert(Boolean(adminToken), 'Generated valid admin JWT Bearer token');

  // Start ephemeral test server
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 2. Test GET /assets/resume.pdf static asset serving with binary attachment headers
    console.log('\n--- 1. Testing Local Static Resume PDF Serving (/assets/resume.pdf) ---');
    const staticRes = await fetch(`${baseUrl}/assets/resume.pdf`);
    testAssert(staticRes.status === 200, 'GET /assets/resume.pdf returns HTTP 200');
    testAssert(staticRes.headers.get('content-type') === 'application/pdf', 'GET /assets/resume.pdf Content-Type is application/pdf');
    testAssert((staticRes.headers.get('content-disposition') || '').includes('attachment; filename="resume.pdf"'), 'GET /assets/resume.pdf Content-Disposition is attachment; filename="resume.pdf"');
    const pdfBuf = await staticRes.arrayBuffer();
    const pdfHeader = Buffer.from(pdfBuf).subarray(0, 5).toString('utf8');
    testAssert(pdfHeader === '%PDF-', 'Served file contains valid %PDF- magic bytes header');
    testAssert(pdfBuf.byteLength > 100, `Served resume file has valid non-empty size (${pdfBuf.byteLength} bytes)`);

    // 2b. Test Dedicated Binary Download Route (/api/resume/download)
    console.log('\n--- 1b. Testing Dedicated Binary Download Route (/api/resume/download) ---');
    const downloadRes = await fetch(`${baseUrl}/api/resume/download`);
    testAssert(downloadRes.status === 200, 'GET /api/resume/download returns HTTP 200');
    testAssert(downloadRes.headers.get('content-type') === 'application/pdf', 'GET /api/resume/download Content-Type is application/pdf');
    testAssert((downloadRes.headers.get('content-disposition') || '').includes('attachment; filename="resume.pdf"'), 'GET /api/resume/download Content-Disposition is attachment; filename="resume.pdf"');
    const dlBuf = await downloadRes.arrayBuffer();
    const dlHeader = Buffer.from(dlBuf).subarray(0, 5).toString('utf8');
    testAssert(dlHeader === '%PDF-', 'GET /api/resume/download binary begins with valid %PDF- magic bytes');
    testAssert(dlBuf.byteLength > 100, `GET /api/resume/download payload has non-empty binary size (${dlBuf.byteLength} bytes)`);

    // 3. Test GET /api/resume/status
    console.log('\n--- 2. Testing Resume Status Endpoint (/api/resume/status) ---');
    const statusRes = await fetch(`${baseUrl}/api/resume/status`);
    testAssert(statusRes.status === 200, 'GET /api/resume/status returns HTTP 200');
    const statusJson = await statusRes.json();
    testAssert(statusJson.success === true, 'Resume status success is true');
    testAssert(statusJson.exists === true, 'Resume status confirms resume.pdf exists on disk');
    testAssert(statusJson.stats && statusJson.stats.filename === 'resume.pdf', 'Resume stats report filename resume.pdf');
    testAssert(statusJson.resumeUrl === '/assets/resume.pdf', 'Resume status reports URL /assets/resume.pdf');

    // 4. Test Resume Upload Security & PDF Validation
    console.log('\n--- 3. Testing Resume Upload Engine (POST /api/resume/upload) ---');
    
    // 4.1 Unauthenticated upload must be rejected
    const unauthRes = await fetch(`${baseUrl}/api/resume/upload`, {
      method: 'POST'
    });
    testAssert(unauthRes.status === 401, 'POST /api/resume/upload without token rejected with HTTP 401');

    // 4.2 Non-PDF upload must be rejected (simulate multipart with text/plain)
    const boundary = '---------------------------testBoundary12345';
    const nonPdfBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="resume"; filename="fake.txt"',
      'Content-Type: text/plain',
      '',
      'This is a fake text file, not a PDF.',
      `--${boundary}--`
    ].join('\r\n');

    const rejectRes = await fetch(`${baseUrl}/api/resume/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: nonPdfBody
    });
    testAssert(rejectRes.status === 400, 'POST /api/resume/upload with non-PDF file rejected with HTTP 400');
    const rejectJson = await rejectRes.json();
    testAssert(rejectJson.message.includes('PDF'), `Rejection message mentions PDF restriction: "${rejectJson.message}"`);

    // Backup original master resume bytes before upload test
    const diskPath = path.join(__dirname, '..', 'public', 'assets', 'resume.pdf');
    const originalMasterResumeBytes = fs.existsSync(diskPath) ? fs.readFileSync(diskPath) : null;

    // 4.3 Valid PDF upload replaces old file with 100% valid PDF structure
    function buildValidTestPdf(titleText) {
      const streamContent = `BT\n/F1 18 Tf\n50 700 Td\n(${titleText}) Tj\nET\n`;
      const streamLen = Buffer.byteLength(streamContent, 'utf8');
      let body = '%PDF-1.4\n';
      const objOffsets = [];
      function addObj(c) {
        objOffsets.push(Buffer.byteLength(body, 'utf8'));
        body += c;
      }
      addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
      addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
      addObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n');
      addObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
      addObj(`5 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}endstream\nendobj\n`);
      const xrefOffset = Buffer.byteLength(body, 'utf8');
      let xref = `xref\n0 ${objOffsets.length + 1}\n0000000000 65535 f \n`;
      for (const off of objOffsets) {
        xref += String(off).padStart(10, '0') + ' 00000 n \n';
      }
      const trailer = `trailer\n<< /Size ${objOffsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
      return body + xref + trailer;
    }

    const sampleNewPdf = buildValidTestPdf('Test Replacement Resume');
    const pdfBoundary = '---------------------------pdfBoundary98765';
    const validPdfBody = Buffer.concat([
      Buffer.from(`--${pdfBoundary}\r\nContent-Disposition: form-data; name="resume"; filename="updated_subhani_resume.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
      Buffer.from(sampleNewPdf, 'utf8'),
      Buffer.from(`\r\n--${pdfBoundary}--\r\n`)
    ]);

    const uploadRes = await fetch(`${baseUrl}/api/resume/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': `multipart/form-data; boundary=${pdfBoundary}`
      },
      body: validPdfBody
    });
    testAssert(uploadRes.status === 200, 'POST /api/resume/upload with valid PDF succeeds with HTTP 200');
    const uploadJson = await uploadRes.json();
    testAssert(uploadJson.success === true, 'Upload response success is true');
    testAssert(uploadJson.resumeUrl === '/assets/resume.pdf', 'Upload response confirms static path /assets/resume.pdf');
    testAssert(uploadJson.file && uploadJson.file.filename === 'resume.pdf', 'Upload engine saved target filename as resume.pdf');

    // Verify previous resume was archived safely
    const previousResumePath = path.join(__dirname, '..', 'public', 'assets', 'resume-previous.pdf');
    testAssert(fs.existsSync(previousResumePath), 'Previous resume version preserved to resume-previous.pdf');

    // Verify disk state
    testAssert(fs.existsSync(diskPath), 'public/assets/resume.pdf exists on disk after upload');
    const diskContent = fs.readFileSync(diskPath, 'utf8');
    testAssert(diskContent.includes('Test Replacement Resume'), 'Uploaded file successfully replaced old file on disk');

    // Verify data.json persistence
    const freshDb = db.getData();
    testAssert(freshDb.identity.resumeUrl === '/assets/resume.pdf', 'data.json identity.resumeUrl persisted as /assets/resume.pdf');
    testAssert(Boolean(freshDb.resume_filename), 'data.json contains resume_filename');

    // Restore master resume to keep production assets intact
    if (originalMasterResumeBytes) {
      fs.writeFileSync(diskPath, originalMasterResumeBytes);
      console.log('  ℹ️ Restored production master resume.pdf after upload test.');
    }

    // 5. Test Social Links API & Persistence
    console.log('\n--- 4. Testing Social Profile Links Engine (PUT / GET /api/social-links) ---');
    
    // 5.1 GET /api/social-links
    const getSocialRes = await fetch(`${baseUrl}/api/social-links`);
    testAssert(getSocialRes.status === 200, 'GET /api/social-links returns HTTP 200');
    const getSocialJson = await getSocialRes.json();
    testAssert(getSocialJson.success === true, 'GET /api/social-links success is true');
    testAssert(typeof (getSocialJson.linkedin_url || getSocialJson.linkedinUrl) === 'string', 'Returns string linkedin_url');
    testAssert(typeof (getSocialJson.naukri_url || getSocialJson.naukriUrl) === 'string', 'Returns string naukri_url');

    // 5.2 PUT /api/social-links unauthenticated check
    const unauthPut = await fetch(`${baseUrl}/api/social-links`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkedin_url: 'https://www.linkedin.com/in/test' })
    });
    testAssert(unauthPut.status === 401, 'PUT /api/social-links without auth rejected with HTTP 401');

    // 5.3 PUT /api/social-links with valid updates
    const testLinkedIn = 'https://www.linkedin.com/in/subhanishaik1922-verified';
    const testNaukri = 'https://www.naukri.com/mnjuser/profile?id=subhanishaik1922-verified';

    const putSocialRes = await fetch(`${baseUrl}/api/social-links`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        linkedin_url: testLinkedIn,
        naukri_url: testNaukri
      })
    });
    testAssert(putSocialRes.status === 200, 'PUT /api/social-links succeeds with HTTP 200');
    const putSocialJson = await putSocialRes.json();
    testAssert(putSocialJson.success === true, 'Social links update success is true');
    testAssert(putSocialJson.linkedin_url === testLinkedIn, 'Updated linkedin_url returned in response');
    testAssert(putSocialJson.naukri_url === testNaukri, 'Updated naukri_url returned in response');

    // Direct disk verification in data.json
    const diskData = JSON.parse(fs.readFileSync(db.DB_PATH, 'utf8'));
    testAssert(diskData.linkedin_url === testLinkedIn, 'linkedin_url persisted at root in data.json');
    testAssert(diskData.naukri_url === testNaukri, 'naukri_url persisted at root in data.json');
    testAssert(diskData.jobHunt.linkedin.profileUrl === testLinkedIn, 'LinkedIn profile URL persisted to disk in jobHunt.linkedin');
    testAssert(diskData.jobHunt.naukri.profileUrl === testNaukri, 'Naukri profile URL persisted to disk in jobHunt.naukri');
    testAssert(diskData.identity.linkedinUrl === testLinkedIn, 'LinkedIn profile URL synchronized into identity.linkedinUrl');
    testAssert(diskData.identity.naukriUrl === testNaukri, 'Naukri profile URL synchronized into identity.naukriUrl');

    // Restore user original URLs
    db.updateSocialLinks({ linkedin_url: initialLinkedIn, naukri_url: initialNaukri });

    // 5.4 Test Absolute Variable Protection during Automated Sync
    console.log('\n--- 4b. Testing 60-Minute Automated Sync Variable Protection ---');
    // Ensure clean state before sync
    db.updateResumeRecord({ filename: initialResumeFilename, path: '/assets/resume.pdf' });
    const preSyncState = db.getProtectedState();
    await app.runAutomatedLiveSync();
    const postSyncState = db.getProtectedState();
    testAssert(postSyncState.linkedin_url === preSyncState.linkedin_url, 'Automated sync left linkedin_url completely untouched');
    testAssert(postSyncState.naukri_url === preSyncState.naukri_url, 'Automated sync left naukri_url completely untouched');
    testAssert(postSyncState.resume_filename === preSyncState.resume_filename, 'Automated sync left resume_filename completely untouched');

    // 6. Test Public and Admin HTML Layout Structure
    console.log('\n--- 5. Testing HTML Layout & Form Controls (public/index.html) ---');
    const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Public action badges
    testAssert(html.includes('id="pub-badge-linkedin"'), 'public/index.html contains #pub-badge-linkedin');
    testAssert(html.includes('id="pub-badge-naukri"'), 'public/index.html contains #pub-badge-naukri');
    testAssert(html.includes('id="pub-badge-resume"'), 'public/index.html contains #pub-badge-resume');
    testAssert(html.includes('href="/assets/resume.pdf"'), 'public/index.html resume button links directly to /assets/resume.pdf');
    testAssert(html.includes('target="_blank"'), 'Action badges include target="_blank" to open in new tab');
    testAssert(html.includes('rel="noopener noreferrer"'), 'Action badges include rel="noopener noreferrer" for security');

    // Admin Tab 1 controls
    testAssert(html.includes('id="adm-social-linkedin"'), 'Admin Tab 1 contains LinkedIn URL input (#adm-social-linkedin)');
    testAssert(html.includes('id="adm-social-naukri"'), 'Admin Tab 1 contains Naukri URL input (#adm-social-naukri)');
    testAssert(html.includes('id="adm-resume-file"'), 'Admin Tab 1 contains resume file-picker input (#adm-resume-file)');
    testAssert(html.includes('Upload New Resume (PDF Only)'), 'Admin Tab 1 contains label "Upload New Resume (PDF Only)"');
    testAssert(html.includes('id="adm-resume-upload-btn"'), 'Admin Tab 1 contains upload button (#adm-resume-upload-btn)');
    testAssert(html.includes('handleResumeUpload()'), 'Upload button triggers handleResumeUpload()');
    testAssert(html.includes('handleSaveSocialLinks()'), 'Save profile links button triggers handleSaveSocialLinks()');

    // 7. Test Frontend Client Scripts
    console.log('\n--- 6. Testing Frontend Client Modules (public/js/) ---');
    const apiJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'api.js'), 'utf8');
    testAssert(apiJs.includes('uploadResume'), 'api.js defines uploadResume method');
    testAssert(apiJs.includes('getResumeStatus'), 'api.js defines getResumeStatus method');
    testAssert(apiJs.includes('updateSocialLinks'), 'api.js defines updateSocialLinks method');
    testAssert(apiJs.includes('getSocialLinks'), 'api.js defines getSocialLinks method');

    const adminJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'admin.js'), 'utf8');
    testAssert(adminJs.includes('handleResumeUpload'), 'admin.js defines handleResumeUpload');
    testAssert(adminJs.includes('handleResumeFileSelected'), 'admin.js defines handleResumeFileSelected');
    testAssert(adminJs.includes('handleSaveSocialLinks'), 'admin.js defines handleSaveSocialLinks');

    const publicViewJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'publicView.js'), 'utf8');
    testAssert(publicViewJs.includes('/assets/resume.pdf'), 'publicView.js prioritizes /assets/resume.pdf');
    testAssert(publicViewJs.includes('pub-badge-linkedin'), 'publicView.js handles #pub-badge-linkedin');
    testAssert(publicViewJs.includes('pub-badge-naukri'), 'publicView.js handles #pub-badge-naukri');

  } finally {
    server.close();
  }

  console.log(`\n========================================`);
  console.log(`Social & Resume Verification: ${passed}/${total} checks passed.`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSocialAndResumeVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

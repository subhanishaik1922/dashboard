async function runE2E() {
  console.log('🚀 Running Live HTTP Integration Tests against http://localhost:3000...\n');
  const base = 'http://localhost:3000';

  // 1. Unauthenticated GET /admin should redirect (HTTP 302) to /login
  const adminRes = await fetch(`${base}/admin`, { redirect: 'manual' });
  console.log(`1. GET /admin (unauthenticated) -> Status: ${adminRes.status}, Location: ${adminRes.headers.get('location')}`);
  if (adminRes.status !== 302 || adminRes.headers.get('location') !== '/login') {
    throw new Error('Expected 302 redirect to /login');
  }

  // 2. Unauthenticated mutation PUT /api/identity should return HTTP 401
  const putRes = await fetch(`${base}/api/identity`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Hacker Name' })
  });
  console.log(`2. PUT /api/identity (unauthenticated) -> Status: ${putRes.status}`);
  if (putRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated mutation, got ${putRes.status}`);
  }

  // 3. Failed login attempt with bad password
  const failLoginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong_password_test' })
  });
  console.log(`3. POST /api/auth/login (bad password) -> Status: ${failLoginRes.status}`);
  if (failLoginRes.status !== 401) {
    throw new Error(`Expected 401 for bad password, got ${failLoginRes.status}`);
  }

  // 4. Successful login with correct password
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  const adminPassword = (process.env.ADMIN_PASSWORD || 'Subhani1922#$').replace(/^"(.*)"$/, '$1');
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: adminPassword })
  });
  console.log(`4. POST /api/auth/login -> Status: ${loginRes.status}`);
  if (loginRes.status !== 200) {
    throw new Error(`Expected 200 for valid login, got ${loginRes.status}`);
  }
  const loginData = await loginRes.json();
  const token = loginData.token;
  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log(`   Token received: ${token.substring(0, 10)}...`);
  console.log(`   Set-Cookie: ${cookieHeader ? cookieHeader.split(';')[0] : 'None'}`);

  // 5. Authenticated mutation with Bearer token
  const authPutRes = await fetch(`${base}/api/identity`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ title: 'Principal Full-Stack Engineer & Cloud Architect' })
  });
  console.log(`5. PUT /api/identity (with Bearer token) -> Status: ${authPutRes.status}`);
  if (authPutRes.status !== 200) {
    throw new Error(`Expected 200 for authenticated mutation, got ${authPutRes.status}`);
  }

  // 6. Direct GET /admin with session cookie should return HTTP 200
  const cookieValue = cookieHeader.split(';')[0];
  const authedAdminRes = await fetch(`${base}/admin`, {
    headers: { 'Cookie': cookieValue }
  });
  console.log(`6. GET /admin (with session cookie) -> Status: ${authedAdminRes.status}`);
  if (authedAdminRes.status !== 200) {
    throw new Error(`Expected 200 for /admin with valid session cookie, got ${authedAdminRes.status}`);
  }

  // 7. Verify /api/auth/status
  const statusRes = await fetch(`${base}/api/auth/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const statusData = await statusRes.json();
  console.log(`7. GET /api/auth/status -> Status: ${statusRes.status}, Authenticated: ${statusData.authenticated}`);
  if (!statusData.authenticated) {
    throw new Error('Expected authenticated: true');
  }

  // 8. Logout
  const logoutRes = await fetch(`${base}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`8. POST /api/auth/logout -> Status: ${logoutRes.status}`);

  // 9. Subsequent mutation with revoked token should fail with HTTP 401
  const postLogoutPut = await fetch(`${base}/api/identity`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ title: 'Attempt After Logout' })
  });
  console.log(`9. PUT /api/identity (after logout) -> Status: ${postLogoutPut.status}`);
  if (postLogoutPut.status !== 401) {
    throw new Error('Expected 401 after logout');
  }

  console.log('\n🎉 ALL LIVE HTTP END-TO-END SECURITY TESTS PASSED SUCCESSFULLY!');
}

runE2E().catch(err => {
  console.error('\n❌ E2E Test Failure:', err.message);
  process.exit(1);
});

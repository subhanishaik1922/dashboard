const path = require('path');
const fs = require('fs');

// Explicitly load .env file from project root directory
const envPath = path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });

// Ensure Windows Notepad-edited .env files with special characters (such as # and $)
// preserve exact literal strings in process.env for custom password, GitHub, and Vercel keys
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
        val = val.replace(/\r$/, '').trim();
        if (val.startsWith('#')) return '';
        return val;
      }
      return '';
    };

    const adminPass = parseKey('ADMIN_PASSWORD');
    if (adminPass !== null) process.env.ADMIN_PASSWORD = adminPass;

    const ghToken = parseKey('GITHUB_TOKEN');
    if (ghToken !== null && ghToken) process.env.GITHUB_TOKEN = ghToken;

    const ghUser = parseKey('GITHUB_USERNAME');
    if (ghUser !== null && ghUser) process.env.GITHUB_USERNAME = ghUser;

    const vercelTok = parseKey('VERCEL_TOKEN');
    if (vercelTok !== null && vercelTok) process.env.VERCEL_TOKEN = vercelTok;

    const vercelTeam = parseKey('VERCEL_TEAM_ID');
    if (vercelTeam !== null) process.env.VERCEL_TEAM_ID = vercelTeam;

    const jwtSec = parseKey('JWT_SECRET');
    if (jwtSec !== null && jwtSec) process.env.JWT_SECRET = jwtSec;
  }
} catch (e) {
  // Silent fallback to standard process.env
}

const express = require('express');
const cors = require('cors');
const multer = require('multer');

const authRouter = require('./server/routes/auth');
const vercelRouter = require('./server/routes/vercel');
const identityRouter = require('./server/routes/identity');
const githubRouter = require('./server/routes/github');
const jobhuntRouter = require('./server/routes/jobhunt');
const projectsRouter = require('./server/routes/projects');
const db = require('./server/db');
const auth = require('./server/auth');
const vercelService = require('./server/vercelService');
const githubService = require('./server/githubService');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security audit on server startup: Check process.env.ADMIN_PASSWORD strictly
if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_PASSWORD.trim()) {
  console.error('\n🚨 =======================================================');
  console.error('🚨 [SECURITY ALERT] ADMIN_PASSWORD is NOT configured in .env!');
  console.error('🚨 All administrative access is strictly LOCKED.');
  console.error('🚨 Set ADMIN_PASSWORD in your .env file to enable dashboard management.');
  console.error('🚨 =======================================================\n');
} else {
  console.log(`🔒 [AUTH] Master ADMIN_PASSWORD loaded from .env (${process.env.ADMIN_PASSWORD.replace(/\r$/, '').length} characters)`);
}

// Environment audit on server startup: Check process.env.GITHUB_TOKEN, GITHUB_USERNAME, and VERCEL_TOKEN
const startupGitHubToken = (process.env.GITHUB_TOKEN || '').trim();
const startupGitHubUser = (process.env.GITHUB_USERNAME || '').trim();
const startupVercelToken = (process.env.VERCEL_TOKEN || '').trim();
if (!startupGitHubToken) {
  console.warn('🐙 [GITHUB WARNING] GITHUB_TOKEN is not configured in .env. Unauthenticated public rate limits apply.');
} else {
  console.log(`🐙 [GITHUB CONFIG] GITHUB_TOKEN dynamically loaded from environment (${startupGitHubToken.substring(0, 15)}...)`);
}
if (!startupGitHubUser) {
  console.warn('🐙 [GITHUB WARNING] GITHUB_USERNAME is not configured in .env.');
} else {
  console.log(`🐙 [GITHUB CONFIG] Target profile username dynamically configured: ${startupGitHubUser}`);
}
if (!startupVercelToken) {
  console.warn('📡 [VERCEL WARNING] VERCEL_TOKEN is not configured in .env.');
} else {
  console.log(`📡 [VERCEL CONFIG] VERCEL_TOKEN dynamically loaded from environment (${startupVercelToken.substring(0, 15)}...)`);
}

// Helper to extract session JWT token from cookie header
function getSessionTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/admin_session=([^;]+)/);
  return match ? match[1] : null;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger for API calls
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// =============================================================================
// 1. CUSTOM ADMIN AUTHENTICATION & CMS ROUTES (JWT Protected)
// - Strictly reads process.env.ADMIN_PASSWORD with exact string matching
// - Signs & verifies HMAC-SHA256 JSON Web Tokens (JWT)
// - Zero hardcoded default passwords permitted
// =============================================================================
app.use('/api/auth', authRouter);

// =============================================================================
// 2. AUTOMATED LIVE SYNC BACKGROUND SERVICE (GitHub & Vercel v10/v7 APIs)
// - Auto-Update Interval: Robust setInterval() running in background every 60 minutes
// - Complete Data Integrity: Staging arrays completely cleared (zero duplicates)
// - Bulletproof Error Catching: strict try/catch + timeouts (zero container crashes)
// - Environment Enforcement: strictly process.env.GITHUB_TOKEN, GITHUB_USERNAME, VERCEL_TOKEN
// =============================================================================

function getGitHubToken() {
  return (process.env.GITHUB_TOKEN || '').trim();
}

function getGitHubUsername() {
  return (process.env.GITHUB_USERNAME || '').trim();
}

function getVercelToken() {
  return (process.env.VERCEL_TOKEN || '').trim();
}

function getVercelTeamId() {
  return (process.env.VERCEL_TEAM_ID || '').trim();
}

function normalizeSyncUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function upsertSyncItem(targetArray, newItem, matchFn) {
  if (!newItem) return;
  const idx = targetArray.findIndex(existing => matchFn(existing, newItem));
  if (idx !== -1) {
    targetArray[idx] = {
      ...targetArray[idx],
      ...newItem,
      domains: Array.from(new Set([...(targetArray[idx].domains || []), ...(newItem.domains || [])]))
    };
    return targetArray[idx];
  } else {
    targetArray.push(newItem);
    return newItem;
  }
}

/**
 * 2.1 GitHub Live Sync Worker
 * Bulletproof error catching with timeout; preserves data.json on failure
 */
async function syncGitHubLive() {
  const token = getGitHubToken();
  const username = getGitHubUsername();
  const currentRepos = db.getGitHubData().repositories || [];

  if (!token && !username) {
    console.warn('⚠️ [AUTO-SYNC GITHUB] GITHUB_TOKEN and GITHUB_USERNAME not configured in .env. Keeping existing data intact.');
    return { success: false, preserved: true, reason: 'unconfigured' };
  }

  const headers = {
    'User-Agent': 'Career-Command-Center-CMS/1.0',
    'Accept': 'application/vnd.github.v3+json'
  };

  // Environment Enforcement: process.env.GITHUB_TOKEN
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Public user path format: target user's public repository stream directly (https://github.com/:username)
  // Replaces generic '/user/repos' endpoint which aggregates foreign collaboration and organization streams
  const targetUser = username || 'subhanishaik1922';
  const endpoint = `https://api.github.com/users/${encodeURIComponent(targetUser)}/repos?sort=updated&per_page=100`;

  try {
    console.log(`[AUTO-SYNC GITHUB] Pulling fresh live repositories using public user path format: ${endpoint} (public: https://github.com/${targetUser})`);
    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(15000)
    });

    if (response.status === 401) {
      const errText = await response.text();
      let errMsg = 'Bad credentials or unauthorized access';
      try { errMsg = JSON.parse(errText).message || errMsg; } catch (e) {}

      console.error('\n⚠️ =======================================================');
      console.error('⚠️ [AUTO-SYNC GITHUB AUTH ERROR 401] Unauthorized / Bad credentials.');
      console.error(`⚠️ GitHub Message: ${errMsg}`);
      console.error('⚠️ Keeping existing data from data.json intact (Zero Crash).');
      console.error('⚠️ =======================================================\n');

      if (targetUser) {
        console.log(`[AUTO-SYNC GITHUB] Attempting unauthenticated fallback for '${targetUser}'...`);
        try {
          const fallbackRes = await fetch(`https://api.github.com/users/${encodeURIComponent(targetUser)}/repos?sort=updated&per_page=100`, {
            method: 'GET',
            headers: { 'User-Agent': 'Career-Command-Center-CMS/1.0', 'Accept': 'application/vnd.github.v3+json' },
            signal: AbortSignal.timeout(15000)
          });
          if (fallbackRes.ok) {
            const fallbackList = await fallbackRes.json();
            if (Array.isArray(fallbackList)) {
              return processFreshGitHubRepos(fallbackList, targetUser, currentRepos);
            }
          }
        } catch (pubErr) {
          console.warn(`[AUTO-SYNC GITHUB] Public fallback skipped: ${pubErr.message}`);
        }
      }

      return { success: false, preserved: true, reason: 'unauthorized_401' };
    }

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`⚠️ [AUTO-SYNC GITHUB] HTTP ${response.status}: ${errText.substring(0, 150)}. Keeping existing data intact.`);
      return { success: false, preserved: true, status: response.status };
    }

    const payload = await response.json();
    // Strictly look for the 'projects' array inside the JSON payload first
    const rawList = Array.isArray(payload?.projects)
      ? payload.projects
      : (Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []));
    return processFreshGitHubRepos(rawList, targetUser, currentRepos);

  } catch (err) {
    console.error(`⚠️ [AUTO-SYNC GITHUB ERROR]: ${err.message}. Keeping existing data from data.json intact.`);
    return { success: false, preserved: true, error: err.message };
  }
}

function processFreshGitHubRepos(rawList, username, currentRepos) {
  // Complete Data Integrity: completely clear temporary cache array right before mapping new data
  const freshRepos = [];
  const targetUser = (username || getGitHubUsername() || 'subhanishaik1922').toLowerCase();

  // Strict filter array rule: guarantee only projects owned by my exact username are committed to the data array
  const ownedRepos = (rawList || []).filter(repo => {
    if (!repo) return false;
    // Clear strict filter array rule: repo.owner.login === 'subhanishaik1922'
    if (repo.owner && repo.owner.login) {
      return repo.owner.login === 'subhanishaik1922' || repo.owner.login.toLowerCase() === targetUser;
    }
    if (typeof repo.owner === 'string') {
      return repo.owner === 'subhanishaik1922' || repo.owner.toLowerCase() === targetUser;
    }
    return false;
  });

  const existingMap = new Map();
  (currentRepos || []).forEach(r => {
    // Only map existing preferences for repositories owned by subhanishaik1922
    const isOwned = (r.owner && r.owner.login === 'subhanishaik1922') ||
                    (r.repoUrl && r.repoUrl.toLowerCase().includes('/subhanishaik1922/'));
    if (isOwned) {
      if (r.name) existingMap.set(r.name.toLowerCase(), r);
      if (r.id) existingMap.set(String(r.id), r);
    }
  });

  ownedRepos.forEach(repo => {
    // Strict owner verification during map lifecycle
    if (repo.owner && repo.owner.login !== 'subhanishaik1922' && repo.owner.login.toLowerCase() !== targetUser) {
      return;
    }

    const existing = existingMap.get(repo.name?.toLowerCase()) || existingMap.get(String(repo.id));
    const isVisible = existing && typeof existing.visible === 'boolean' ? existing.visible : true;
    const isFeatured = existing && typeof existing.featured === 'boolean'
      ? existing.featured
      : (repo.name === 'portfolio-main' || (repo.stargazers_count || 0) >= 10);

    const repoItem = {
      id: String(repo.id || repo.name),
      name: repo.name,
      description: repo.description || 'Full-stack software engineering project with CI/CD automation.',
      stars: Number(repo.stargazers_count ?? repo.stars ?? 0),
      forks: Number(repo.forks_count ?? repo.forks ?? 0),
      language: repo.language || 'TypeScript / JavaScript',
      visible: isVisible,
      featured: isFeatured,
      isPrivate: Boolean(repo.private),
      owner: {
        login: repo.owner?.login || 'subhanishaik1922'
      },
      vercelProject: existing?.vercelProject || repo.name,
      repoUrl: repo.html_url || `https://github.com/${repo.owner?.login || targetUser}/${repo.name}`
    };

    upsertSyncItem(freshRepos, repoItem, (ex, item) => {
      if (ex.id && item.id && String(ex.id) === String(item.id)) return true;
      const eUrl = normalizeSyncUrl(ex.repoUrl || ex.html_url);
      const iUrl = normalizeSyncUrl(item.repoUrl || item.html_url);
      if (eUrl && iUrl && eUrl === iUrl) return true;
      if (ex.name && item.name && ex.name.toLowerCase() === item.name.toLowerCase()) return true;
      return false;
    });
  });

  // Preserve local custom repositories ONLY if owned by subhanishaik1922 (foreign repos strictly pruned)
  (currentRepos || []).forEach(localRepo => {
    const isOwned = (localRepo.owner && localRepo.owner.login === 'subhanishaik1922') ||
                    (localRepo.repoUrl && localRepo.repoUrl.toLowerCase().includes('/subhanishaik1922/'));
    if (!isOwned) {
      return; // Skip foreign collaboration/organization repositories
    }

    upsertSyncItem(freshRepos, localRepo, (ex, item) => {
      if (ex.id && item.id && String(ex.id) === String(item.id)) return true;
      const eUrl = normalizeSyncUrl(ex.repoUrl || ex.html_url);
      const iUrl = normalizeSyncUrl(item.repoUrl || item.html_url);
      if (eUrl && iUrl && eUrl === iUrl) return true;
      if (ex.name && item.name && ex.name.toLowerCase() === item.name.toLowerCase()) return true;
      return false;
    });
  });

  db.saveGitHubRepositories(freshRepos, targetUser);
  console.log(`✅ [AUTO-SYNC GITHUB] Successfully mapped ${freshRepos.length} unique repositories for ${targetUser} into database (Foreign repos filtered out).`);
  return { success: true, count: freshRepos.length, repositories: freshRepos };
}

/**
 * 2.2 Vercel Live Sync Worker
 * Pulls fresh live data from both v10/projects and v7/deployments APIs
 * Bulletproof error catching with timeout; preserves data.json on failure
 */
async function syncVercelLive() {
  try {
    console.log(`[AUTO-SYNC VERCEL] Pulling fresh live projects and deployments from Vercel REST APIs...`);
    const result = await vercelService.syncAllVercelData();
    if (result && result.isLive) {
      console.log(`✅ [AUTO-SYNC VERCEL] ${result.message}`);
      return { 
        success: true, 
        projectsCount: (result.projects || []).length, 
        deploymentsCount: (result.deployments || []).length 
      };
    } else {
      console.warn(`⚠️ [AUTO-SYNC VERCEL WARN]: ${result?.message || 'Using cached data'}`);
      return { 
        success: false, 
        preserved: true, 
        reason: result?.message || 'preserved_cache' 
      };
    }
  } catch (err) {
    console.error(`⚠️ [AUTO-SYNC VERCEL ERROR]: ${err.message}. Keeping existing Vercel data in data.json intact.`);
    return { success: false, preserved: true, error: err.message };
  }
}

/**
 * 2.3 Master Automated Live Sync Orchestrator
 */
const syncEngineState = {
  isRunning: false,
  intervalMinutes: 60,
  lastRunTimestamp: null,
  nextRunTimestamp: null,
  lastGitHubStatus: 'idle',
  lastVercelStatus: 'idle',
  syncCount: 0
};

/**
 * 2.3 Master Automated Live Sync Orchestrator
 * Strictly looks for the 'projects' array inside the incoming JSON payload.
 * Enforces Absolute Variable Protection: leaves 'linkedin_url', 'naukri_url',
 * and 'resume_filename' completely untouched so custom links and resume never revert.
 */
async function runAutomatedLiveSync() {
  if (syncEngineState.isRunning) {
    console.log('[AUTO-SYNC] Previous live sync is still active. Skipping concurrent cycle.');
    return syncEngineState;
  }

  syncEngineState.isRunning = true;
  syncEngineState.lastRunTimestamp = new Date().toISOString();
  syncEngineState.nextRunTimestamp = new Date(Date.now() + (60 * 60 * 1000)).toISOString();
  syncEngineState.syncCount++;

  console.log(`\n=======================================================`);
  console.log(`🔄 [AUTO-SYNC #${syncEngineState.syncCount}] Running automated live sync background service...`);
  console.log(`⏰ Started At: ${syncEngineState.lastRunTimestamp}`);

  // 1. Snapshot protected variables before sync to ensure strict state isolation
  const protectedSnapshot = db.getProtectedState();
  console.log(`🛡️ [AUTO-SYNC ABSOLUTE VARIABLE PROTECTION] Active variables locked:`);
  console.log(`   - linkedin_url: ${protectedSnapshot.linkedin_url}`);
  console.log(`   - naukri_url: ${protectedSnapshot.naukri_url}`);
  console.log(`   - resume_filename: ${protectedSnapshot.resume_filename}`);

  const [ghResult, vcResult] = await Promise.allSettled([
    syncGitHubLive(),
    syncVercelLive()
  ]);

  if (ghResult.status === 'fulfilled' && ghResult.value.success) {
    syncEngineState.lastGitHubStatus = `success (${ghResult.value.count} repos)`;
  } else {
    syncEngineState.lastGitHubStatus = ghResult.status === 'fulfilled' ? (ghResult.value.reason || 'preserved_cache') : 'rejected';
  }

  if (vcResult.status === 'fulfilled' && vcResult.value.success) {
    syncEngineState.lastVercelStatus = `success (${vcResult.value.projectsCount} prjs, ${vcResult.value.deploymentsCount} dpls)`;
  } else {
    syncEngineState.lastVercelStatus = vcResult.status === 'fulfilled' ? (vcResult.value.reason || 'preserved_cache') : 'rejected';
  }

  // 2. State Isolation Audit: verify protected variables remained 100% untouched
  const postSyncState = db.getProtectedState();
  if (postSyncState.linkedin_url !== protectedSnapshot.linkedin_url ||
      postSyncState.naukri_url !== protectedSnapshot.naukri_url ||
      postSyncState.resume_filename !== protectedSnapshot.resume_filename) {
    console.warn('⚠️ [AUTO-SYNC] Variable shift detected during sync cycle! Restoring protected state...');
    db.updateSocialLinks({
      linkedin_url: protectedSnapshot.linkedin_url,
      naukri_url: protectedSnapshot.naukri_url
    });
    db.updateResumeRecord({
      filename: protectedSnapshot.resume_filename,
      path: protectedSnapshot.resume_path
    });
  } else {
    console.log(`✅ [AUTO-SYNC ABSOLUTE VARIABLE PROTECTION] Verified: linkedin_url, naukri_url, and resume_filename untouched.`);
  }

  console.log(`🏁 [AUTO-SYNC #${syncEngineState.syncCount}] Cycle finished.`);
  console.log(`📊 GitHub Status: ${syncEngineState.lastGitHubStatus} | Vercel Status: ${syncEngineState.lastVercelStatus}`);
  console.log(`⏳ Next automated cycle: ${syncEngineState.nextRunTimestamp}`);
  console.log(`=======================================================\n`);

  syncEngineState.isRunning = false;
  return syncEngineState;
}

// 1. Auto-Update Interval (No Manual Refresh Needed): 60-Minute Background Service
const SYNC_INTERVAL_MS = (parseInt(process.env.SYNC_INTERVAL_MS, 10) || 60 * 60) * 1000;
let autoSyncIntervalTimer = null;

function startAutoSyncService() {
  if (autoSyncIntervalTimer) clearInterval(autoSyncIntervalTimer);

  console.log(`⏱️ [AUTO-SYNC ENGINE] Starting automated background live sync service.`);
  console.log(`⏱️ Auto-Update Interval: Every ${SYNC_INTERVAL_MS / 60000} minutes (No manual refresh needed).`);

  // Recurring 60-minute setInterval
  autoSyncIntervalTimer = setInterval(() => {
    runAutomatedLiveSync().catch(err => {
      console.error('[AUTO-SYNC RUNTIME EXCEPTION CAUGHT]:', err.message);
    });
  }, SYNC_INTERVAL_MS);

  // Initial boot warm-up after 2 seconds
  setTimeout(() => {
    runAutomatedLiveSync().catch(err => {
      console.error('[AUTO-SYNC BOOT EXCEPTION CAUGHT]:', err.message);
    });
  }, 2000);
}

// Routes for Sync Engine Monitoring & Manual On-Demand Trigger
app.get('/api/sync/status', (req, res) => {
  const data = db.getData();
  res.json({
    success: true,
    service: 'Automated 60-Minute Live Sync Background Engine',
    intervalMinutes: SYNC_INTERVAL_MS / 60000,
    state: syncEngineState,
    storage: {
      githubReposCount: (data.github?.repositories || []).length,
      vercelProjectsCount: (data.vercel?.cachedProjects || []).length,
      vercelDeploymentsCount: (data.vercel?.cachedDeployments || []).length,
      lastSynced: data.vercel?.lastSynced || data.github?.lastSynced
    },
    credentialsConfigured: {
      githubToken: Boolean(getGitHubToken()),
      githubUsername: getGitHubUsername(),
      vercelToken: Boolean(getVercelToken()),
      vercelTeamId: Boolean(getVercelTeamId())
    }
  });
});

app.post('/api/sync/run', async (req, res) => {
  try {
    const result = await runAutomatedLiveSync();
    res.json({
      success: true,
      message: 'Automated live sync executed successfully.',
      state: result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.use('/api/github', githubRouter);
app.use('/api/vercel', vercelRouter);

// CMS CRUD Routes
app.use('/api/projects', projectsRouter);
app.use('/api/identity', identityRouter);
app.use('/api/work-experience', (req, res, next) => {
  req.url = '/experience' + (req.url === '/' ? '' : req.url);
  identityRouter(req, res, next);
});
app.use('/api/jobhunt', jobhuntRouter);

// Database stats & health endpoint (includes Docker volume storage path)
app.get('/api/health', (req, res) => {
  try {
    const data = db.getData();
    const vercelConfig = db.getVercelConfig();
    const githubData = db.getGitHubData();
    const activeVercelToken = vercelService.getVercelToken();
    const activeGitHubToken = githubService.getGitHubToken();
    const isPasswordConfigured = Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim());
    
    res.json({
      status: isPasswordConfigured ? 'healthy' : 'degraded_auth_unconfigured',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      storage: {
        dbPath: db.DB_PATH,
        isDockerVolumeMapped: Boolean(process.env.DATA_PATH),
        dbConnected: Boolean(data)
      },
      auth: {
        adminPasswordConfigured: isPasswordConfigured,
        type: 'JWT (JSON Web Token HS256)',
        jwtSecretActive: Boolean(auth.getJwtSecret())
      },
      github: {
        hasToken: Boolean(activeGitHubToken),
        username: githubService.getGitHubUsername(),
        repoCount: (githubData.repositories || []).length
      },
      vercel: {
        hasEnvToken: Boolean(process.env.VERCEL_TOKEN),
        hasConfigToken: Boolean(vercelConfig.apiToken),
        maskedToken: db.maskToken(activeVercelToken),
        cachedProjectsCount: (vercelConfig.cachedProjects || []).length,
        cachedDeploymentsCount: (vercelConfig.cachedDeployments || []).length
      },
      modules: {
        identity: Boolean(data.identity),
        jobHunt: {
          linkedinViews: data.jobHunt?.linkedin?.profileViews || 0,
          naukriViews: data.jobHunt?.naukri?.profileViews || 0,
          activeApplications: (data.jobHunt?.applications || []).length
        }
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// =============================================================================
// 4. RESUME PDF UPLOAD ENGINE & PUBLIC ASSETS CONFIGURATION (Multer Protected)
// =============================================================================
const assetsDir = path.join(__dirname, 'public', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Multer disk storage: securely commits uploaded file as resume.pdf in public/assets
const resumeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    cb(null, assetsDir);
  },
  filename: function (req, file, cb) {
    // Standard target name: resume.pdf (replaces any previous resume file)
    cb(null, 'resume.pdf');
  }
});

// File validation: PDF only
const resumeUpload = multer({
  storage: resumeStorage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const isPdfExt = ext === '.pdf';
    const isPdfMime = file.mimetype === 'application/pdf' || file.mimetype === 'application/x-pdf';
    if (isPdfExt || isPdfMime) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents (.pdf) are allowed.'));
    }
  }
});

/**
 * POST /api/resume/upload
 * Protected by JWT Admin Auth: Takes file named 'resume', saves to public/assets/resume.pdf,
 * archives the previously uploaded version to public/assets/resume-previous.pdf,
 * and updates data.json resume_filename and resumeUrl.
 */
app.post('/api/resume/upload', auth.requireAdminAuth, (req, res) => {
  resumeUpload.single('resume')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file selected. Please choose a PDF file to upload.' });
    }

    // Save previous resume before replacing
    const currentResumePath = path.resolve(__dirname, 'public/assets/resume.pdf');
    const previousResumePath = path.resolve(__dirname, 'public/assets/resume-previous.pdf');
    const historyDir = path.resolve(__dirname, 'public/assets/history');
    if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });

    if (fs.existsSync(currentResumePath)) {
      try {
        fs.copyFileSync(currentResumePath, previousResumePath);
        fs.copyFileSync(currentResumePath, path.join(historyDir, `resume-${Date.now()}.pdf`));
        console.log(`📦 [RESUME HISTORY] Preserved previous uploaded resume to resume-previous.pdf`);
      } catch (backupErr) {
        console.warn('[RESUME BACKUP WARNING]', backupErr.message);
      }
    }

    // Save permanent backup so uploader never reverts to generic mock or placeholder PDFs
    const originalBackup = path.resolve(__dirname, 'public/assets/resume-backup-original.pdf');
    if (!fs.existsSync(originalBackup) && fs.existsSync(currentResumePath)) {
      try { fs.copyFileSync(currentResumePath, originalBackup); } catch (e) {}
    }

    const staticPath = '/assets/resume.pdf';
    const originalName = req.file.originalname || 'resume.pdf';

    // Persist to isolated state variables in data.json
    db.updateResumeRecord({
      filename: originalName,
      originalName: originalName,
      path: staticPath,
      previousPath: '/assets/resume-previous.pdf'
    });

    console.log(`📄 [RESUME UPLOAD] New resume successfully saved to ${staticPath} (${req.file.size} bytes). Previous version preserved.`);

    res.json({
      success: true,
      message: 'Resume PDF uploaded successfully! Previous resume version archived safely.',
      resumeUrl: staticPath,
      resume_filename: originalName,
      resume_path: staticPath,
      previous_resume_path: '/assets/resume-previous.pdf',
      file: {
        filename: 'resume.pdf',
        originalName: originalName,
        size: req.file.size,
        path: staticPath,
        updatedAt: new Date().toISOString()
      }
    });
  });
});

/**
 * GET /api/resume/status
 * Public: Returns whether public/assets/resume.pdf exists and its metadata
 */
app.get('/api/resume/status', (req, res) => {
  try {
    const resumePath = path.resolve(__dirname, 'public/assets/resume.pdf');
    const prevPath = path.resolve(__dirname, 'public/assets/resume-previous.pdf');
    const exists = fs.existsSync(resumePath);
    let stats = null;
    if (exists) {
      const s = fs.statSync(resumePath);
      stats = {
        filename: 'resume.pdf',
        size: s.size,
        updatedAt: s.mtime.toISOString(),
        url: '/assets/resume.pdf'
      };
    }
    const protectedState = db.getProtectedState();
    res.json({
      success: true,
      exists,
      stats,
      resume_filename: protectedState.resume_filename,
      resume_path: protectedState.resume_path,
      resumeUrl: protectedState.resume_path,
      hasPreviousResume: fs.existsSync(prevPath),
      previousResumeUrl: fs.existsSync(prevPath) ? '/assets/resume-previous.pdf' : null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/resume/download
 * GET /assets/resume.pdf
 * GET /resume.pdf
 * Dedicated Resume PDF Route:
 * - Explicitly serves file using Express's res.sendFile(path.resolve(__dirname, 'public/assets/resume.pdf'))
 * - Forced Content-Type: application/pdf
 * - Raw binary file stream headers to permanently eliminate corruption errors
 */
const serveResumePdf = (req, res) => {
  const resumeFilePath = path.resolve(__dirname, 'public/assets/resume.pdf');

  // Verify file existence, auto-recovering from backup if missing to prevent empty placeholders
  if (!fs.existsSync(resumeFilePath)) {
    const backupPath = path.resolve(__dirname, 'public/assets/resume-backup-original.pdf');
    const prevPath = path.resolve(__dirname, 'public/assets/resume-previous.pdf');
    if (fs.existsSync(prevPath)) {
      fs.copyFileSync(prevPath, resumeFilePath);
    } else if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, resumeFilePath);
    } else {
      return res.status(404).json({
        success: false,
        message: 'Resume PDF file not found on server.'
      });
    }
  }

  // Force Content-Type header to application/pdf and ensure raw binary stream
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
  res.setHeader('Content-Transfer-Encoding', 'binary');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  // Explicitly serve using Express's res.sendFile with absolute resolved path as specified
  res.sendFile(path.resolve(__dirname, 'public/assets/resume.pdf'), (err) => {
    if (err && !res.headersSent) {
      console.error('[RESUME RAW BINARY STREAM ERROR]', err);
      res.status(500).json({ success: false, message: 'Failed to stream resume binary file.' });
    }
  });
};

app.get('/api/resume/download', serveResumePdf);
app.get('/assets/resume.pdf', serveResumePdf);
app.get('/resume.pdf', serveResumePdf);

// Previous resume version endpoint
app.get('/assets/resume-previous.pdf', (req, res) => {
  const prevPath = path.resolve(__dirname, 'public/assets/resume-previous.pdf');
  if (!fs.existsSync(prevPath)) {
    return res.status(404).json({ success: false, message: 'Previous resume version not found.' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="resume-previous.pdf"');
  res.setHeader('Content-Transfer-Encoding', 'binary');
  res.sendFile(prevPath);
});

// =============================================================================
// 5. ACTIVE SOCIAL LINKING ENGINE (LinkedIn & Naukri Sync)
// =============================================================================

/**
 * PUT /api/social-links
 * Protected: Updates active LinkedIn and Naukri profile URLs in local data.json
 */
app.put('/api/social-links', auth.requireAdminAuth, (req, res) => {
  try {
    const { linkedinUrl, naukriUrl, linkedin_url, naukri_url } = req.body;
    const finalLi = linkedin_url !== undefined ? linkedin_url : linkedinUrl;
    const finalNk = naukri_url !== undefined ? naukri_url : naukriUrl;
    if (finalLi === undefined && finalNk === undefined) {
      return res.status(400).json({ success: false, message: 'Must provide linkedin_url or naukri_url.' });
    }

    const result = db.updateSocialLinks({ linkedin_url: finalLi, naukri_url: finalNk });
    console.log(`🔗 [SOCIAL LINKS] Persisted LinkedIn: ${result.linkedin_url || 'none'} | Naukri: ${result.naukri_url || 'none'}`);

    res.json({
      success: true,
      message: 'Social profile links saved and persisted to data.json with Absolute Variable Protection!',
      linkedin_url: result.linkedin_url,
      naukri_url: result.naukri_url,
      linkedinUrl: result.linkedin_url,
      naukriUrl: result.naukri_url,
      jobHunt: result.jobHunt,
      identity: result.identity
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/social-links
 * Public: Returns active LinkedIn and Naukri profile URLs from data.json
 */
app.get('/api/social-links', (req, res) => {
  try {
    const state = db.getProtectedState();
    res.json({
      success: true,
      linkedin_url: state.linkedin_url,
      naukri_url: state.naukri_url,
      linkedinUrl: state.linkedin_url,
      naukriUrl: state.naukri_url,
      resume_filename: state.resume_filename,
      resume_path: state.resume_path
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Serve frontend static assets from public/
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Route protection for direct navigation to /admin (JWT verification)
app.get('/admin', (req, res) => {
  let token = getSessionTokenFromCookie(req.headers.cookie);
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // Validate JWT session token
  const decoded = auth.validateToken(token);
  if (!decoded) {
    console.log('[AUTH] Unauthenticated direct navigation to /admin. Redirecting to /login');
    return res.redirect('/login');
  }

  res.sendFile(path.join(publicDir, 'index.html'));
});

// Route for /login
app.get('/login', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// SPA Fallback: route any other non-API requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const isServerless = Boolean(process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME);

if (!isServerless && (require.main === module || (require.main && require.main.filename && !require.main.filename.includes(path.join('api', 'index.js')) && (require.main.filename.includes('server.js') || require.main.filename.includes('index.js'))))) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`Server running locally at http://localhost:${PORT}`);
    console.log(`🚀 Career Command Center CMS is running!`);
    console.log(`📍 Web Dashboard: http://localhost:${PORT}`);
    console.log(`🐙 GitHub API Hub: http://localhost:${PORT}/api/github/repos`);
    console.log(`📁 Projects API Hub: http://localhost:${PORT}/api/projects`);
    console.log(`📄 Resume PDF Assets:     http://localhost:${PORT}/assets/resume.pdf`);
    console.log(`🔗 Social Links API:      http://localhost:${PORT}/api/social-links`);
    console.log(`📡 Vercel Projects Hub:    http://localhost:${PORT}/api/vercel/projects (v10/projects)`);
    console.log(`📡 Vercel Deployments Hub: http://localhost:${PORT}/api/vercel/deployments (v7/deployments)`);
    console.log(`⏱️ Auto-Sync Status:       http://localhost:${PORT}/api/sync/status (Runs every 60 mins)`);
    console.log(`🔒 Admin Route:   http://localhost:${PORT}/admin (Protected by JWT)`);
    console.log(`🔑 Login Screen:  http://localhost:${PORT}/login (ADMIN_PASSWORD strictly from .env)`);
    console.log(`💾 Local Database: ${db.DB_PATH}`);
    console.log(`=======================================================`);

    // 1. Auto-Update Interval: Start background recurring live sync service (every 60 minutes)
    startAutoSyncService();
  });
}

module.exports = app;
module.exports.startAutoSyncService = startAutoSyncService;
module.exports.runAutomatedLiveSync = runAutomatedLiveSync;
module.exports.syncEngineState = syncEngineState;
module.exports.executeGitHubAPIRequest = syncGitHubLive;
module.exports.getGitHubToken = getGitHubToken;
module.exports.getGitHubUsername = getGitHubUsername;
module.exports.getVercelToken = getVercelToken;

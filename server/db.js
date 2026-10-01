const fs = require('fs');
const path = require('path');

// Local database path right inside project folder directory (with optional DATA_PATH override)
const DB_PATH = (process.env.DATA_PATH && process.env.DATA_PATH.trim())
  ? path.resolve(process.env.DATA_PATH.trim())
  : path.join(__dirname, '..', 'data.json');

// In-memory cache for fast reads
let inMemoryData = null;

function ensureDataDirectory() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load data from data.json safely with Strict State Isolation
 */
function getData() {
  try {
    ensureDataDirectory();
    let parsedData = null;

    if (fs.existsSync(DB_PATH)) {
      try {
        const content = fs.readFileSync(DB_PATH, 'utf-8');
        if (content && content.trim()) {
          parsedData = JSON.parse(content);
        }
      } catch (parseErr) {
        console.warn(`[DB] Warning: Could not parse ${DB_PATH}:`, parseErr.message);
      }
    }

    if (!parsedData) {
      // Graceful fallback to legacy data/data.json or root data.json if primary is missing/empty/corrupted
      const rootPath = path.join(__dirname, '..', 'data.json');
      const legacyPath = path.join(__dirname, '..', 'data', 'data.json');
      const fallbackPath = path.resolve(DB_PATH) === path.resolve(legacyPath) ? rootPath : legacyPath;

      if (fs.existsSync(fallbackPath)) {
        try {
          const fallbackData = fs.readFileSync(fallbackPath, 'utf-8');
          if (fallbackData && fallbackData.trim()) {
            parsedData = JSON.parse(fallbackData);
            try {
              fs.writeFileSync(DB_PATH, fallbackData, 'utf-8');
            } catch (wErr) {}
          }
        } catch (e) {}
      }
    }

    inMemoryData = parsedData || {};

    // Absolute Variable Protection: Ensure isolated variables exist with robust fallbacks
    const defaultLinkedIn = 'https://www.linkedin.com/in/subhanishaik1922';
    const defaultNaukri = 'https://www.naukri.com/mnjuser/profile?id=subhanishaik1922';
    const defaultResume = 'resume.pdf';
    const defaultResumePath = '/assets/resume.pdf';

    inMemoryData.linkedin_url = inMemoryData.linkedin_url || inMemoryData.identity?.linkedin_url || inMemoryData.identity?.linkedinUrl || inMemoryData.jobHunt?.linkedin?.profileUrl || defaultLinkedIn;
    inMemoryData.naukri_url = inMemoryData.naukri_url || inMemoryData.identity?.naukri_url || inMemoryData.identity?.naukriUrl || inMemoryData.jobHunt?.naukri?.profileUrl || defaultNaukri;
    inMemoryData.resume_filename = inMemoryData.resume_filename || inMemoryData.identity?.resume_filename || defaultResume;
    inMemoryData.resume_path = inMemoryData.resume_path || inMemoryData.identity?.resumeUrl || defaultResumePath;

    // Work Experience array isolation: maintain root-level array synchronized with identity
    const defaultExp = Array.isArray(inMemoryData.work_experience)
      ? inMemoryData.work_experience
      : (Array.isArray(inMemoryData.identity?.work_experience)
        ? inMemoryData.identity.work_experience
        : (Array.isArray(inMemoryData.identity?.experience) ? inMemoryData.identity.experience : []));

    inMemoryData.work_experience = defaultExp;

    if (!inMemoryData.identity) inMemoryData.identity = {};
    inMemoryData.identity.linkedin_url = inMemoryData.linkedin_url;
    inMemoryData.identity.naukri_url = inMemoryData.naukri_url;
    inMemoryData.identity.linkedinUrl = inMemoryData.linkedin_url;
    inMemoryData.identity.naukriUrl = inMemoryData.naukri_url;
    inMemoryData.identity.resume_filename = inMemoryData.resume_filename;
    inMemoryData.identity.resumeUrl = inMemoryData.resume_path;
    inMemoryData.identity.work_experience = defaultExp;
    inMemoryData.identity.experience = defaultExp;

    if (!inMemoryData.jobHunt) inMemoryData.jobHunt = {};
    if (!inMemoryData.jobHunt.linkedin) inMemoryData.jobHunt.linkedin = {};
    if (!inMemoryData.jobHunt.naukri) inMemoryData.jobHunt.naukri = {};
    inMemoryData.jobHunt.linkedin.profileUrl = inMemoryData.linkedin_url;
    inMemoryData.jobHunt.naukri.profileUrl = inMemoryData.naukri_url;

    return inMemoryData;
  } catch (err) {
    console.error('[DB] Failed to read database:', err.message);
    if (inMemoryData) return inMemoryData;
    throw err;
  }
}

/**
 * Save data with reliable fsync write and Absolute Variable Protection
 * Ensures 'linkedin_url', 'naukri_url', and 'resume_filename' can NEVER be reverted by sync routines
 */
function saveData(data, isSyncOperation = false) {
  try {
    ensureDataDirectory();

    // Read current on-disk state to protect isolated variables
    let existingOnDisk = {};
    try {
      if (fs.existsSync(DB_PATH)) {
        existingOnDisk = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      }
    } catch (e) {
      existingOnDisk = inMemoryData || {};
    }

    // Absolute Variable Protection
    const protectedLinkedIn = isSyncOperation
      ? (existingOnDisk.linkedin_url || existingOnDisk.identity?.linkedin_url || existingOnDisk.identity?.linkedinUrl || data.linkedin_url || '')
      : (data.linkedin_url || existingOnDisk.linkedin_url || data.identity?.linkedin_url || data.identity?.linkedinUrl || '');

    const protectedNaukri = isSyncOperation
      ? (existingOnDisk.naukri_url || existingOnDisk.identity?.naukri_url || existingOnDisk.identity?.naukriUrl || data.naukri_url || '')
      : (data.naukri_url || existingOnDisk.naukri_url || data.identity?.naukri_url || data.identity?.naukriUrl || '');

    const protectedResumeFilename = isSyncOperation
      ? (existingOnDisk.resume_filename || existingOnDisk.identity?.resume_filename || data.resume_filename || 'resume.pdf')
      : (data.resume_filename || existingOnDisk.resume_filename || data.identity?.resume_filename || 'resume.pdf');

    const protectedResumePath = isSyncOperation
      ? (existingOnDisk.resume_path || existingOnDisk.identity?.resumeUrl || data.resume_path || '/assets/resume.pdf')
      : (data.resume_path || existingOnDisk.resume_path || data.identity?.resumeUrl || '/assets/resume.pdf');

    // Protect and isolate work_experience against sync reversion
    const protectedWorkExperience = isSyncOperation
      ? (Array.isArray(existingOnDisk.work_experience)
        ? existingOnDisk.work_experience
        : (Array.isArray(existingOnDisk.identity?.work_experience)
          ? existingOnDisk.identity.work_experience
          : (Array.isArray(existingOnDisk.identity?.experience) ? existingOnDisk.identity.experience : (Array.isArray(data.work_experience) ? data.work_experience : []))))
      : (Array.isArray(data.work_experience)
        ? data.work_experience
        : (Array.isArray(existingOnDisk.work_experience)
          ? existingOnDisk.work_experience
          : (Array.isArray(data.identity?.work_experience)
            ? data.identity.work_experience
            : (Array.isArray(data.identity?.experience) ? data.identity.experience : []))));

    // Force protected variables to top level
    data.linkedin_url = protectedLinkedIn;
    data.naukri_url = protectedNaukri;
    data.resume_filename = protectedResumeFilename;
    data.resume_path = protectedResumePath;
    data.work_experience = protectedWorkExperience;

    // Synchronize into identity object
    if (!data.identity) data.identity = isSyncOperation ? (existingOnDisk.identity || {}) : {};
    data.identity.linkedin_url = protectedLinkedIn;
    data.identity.naukri_url = protectedNaukri;
    data.identity.linkedinUrl = protectedLinkedIn;
    data.identity.naukriUrl = protectedNaukri;
    data.identity.resume_filename = protectedResumeFilename;
    data.identity.resumeUrl = protectedResumePath;
    data.identity.work_experience = protectedWorkExperience;
    data.identity.experience = protectedWorkExperience;

    // Synchronize into jobHunt object
    if (!data.jobHunt) data.jobHunt = isSyncOperation ? (existingOnDisk.jobHunt || {}) : {};
    if (!data.jobHunt.linkedin) data.jobHunt.linkedin = {};
    if (!data.jobHunt.naukri) data.jobHunt.naukri = {};
    data.jobHunt.linkedin.profileUrl = protectedLinkedIn;
    data.jobHunt.naukri.profileUrl = protectedNaukri;

    inMemoryData = data;
    const jsonString = JSON.stringify(data, null, 2);

    // Guaranteed immediate disk synchronization to local data.json
    const fd = fs.openSync(DB_PATH, 'w');
    try {
      fs.writeFileSync(fd, jsonString, 'utf-8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }

    // Mirror to alternate path (root data.json <-> data/data.json) if present
    try {
      const rootPath = path.join(__dirname, '..', 'data.json');
      const legacyPath = path.join(__dirname, '..', 'data', 'data.json');
      const mirrorPath = path.resolve(DB_PATH) === path.resolve(legacyPath) ? rootPath : legacyPath;
      if (fs.existsSync(path.dirname(mirrorPath))) {
        fs.writeFileSync(mirrorPath, jsonString, 'utf-8');
      }
    } catch (mErr) {}

    return true;
  } catch (err) {
    console.error('[DB] Direct fsync write failed, attempting atomic rename fallback:', err.message);
    try {
      const tempPath = `${DB_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_PATH);
      return true;
    } catch (fallbackErr) {
      console.error('[DB] Persistence fatal error:', fallbackErr.message);
      throw fallbackErr;
    }
  }
}

// Identity CRUD
function getIdentity() {
  const data = getData();
  return data.identity || {};
}

function updateIdentity(updates) {
  const data = getData();
  data.identity = {
    ...data.identity,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  // Synchronize social links into jobHunt if provided in identity updates
  if (updates && updates.linkedinUrl !== undefined) {
    if (!data.jobHunt) data.jobHunt = {};
    if (!data.jobHunt.linkedin) data.jobHunt.linkedin = {};
    data.jobHunt.linkedin.profileUrl = updates.linkedinUrl ? updates.linkedinUrl.trim() : '';
    data.jobHunt.linkedin.lastUpdated = new Date().toISOString();
  }
  if (updates && updates.naukriUrl !== undefined) {
    if (!data.jobHunt) data.jobHunt = {};
    if (!data.jobHunt.naukri) data.jobHunt.naukri = {};
    data.jobHunt.naukri.profileUrl = updates.naukriUrl ? updates.naukriUrl.trim() : '';
    data.jobHunt.naukri.lastUpdated = new Date().toISOString();
  }

  // Synchronize work experience if provided in identity updates
  if (updates && (updates.work_experience !== undefined || updates.experience !== undefined)) {
    const exp = updates.work_experience !== undefined ? updates.work_experience : updates.experience;
    data.work_experience = Array.isArray(exp) ? exp : [];
    data.identity.work_experience = data.work_experience;
    data.identity.experience = data.work_experience;
  }

  saveData(data);
  return data.identity;
}

// Work Experience CRUD (persists directly into 'work_experience' array in data.json)
function getWorkExperience() {
  const data = getData();
  return Array.isArray(data.work_experience) ? data.work_experience : [];
}

function addWorkExperience(entry) {
  const data = getData();
  if (!Array.isArray(data.work_experience)) data.work_experience = [];

  const entriesToAdd = Array.isArray(entry) ? entry : [entry];
  const addedEntries = [];

  for (const e of entriesToAdd) {
    if (!e) continue;
    const normalized = {
      id: e.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      company: e.companyName || e.company || 'Company',
      companyName: e.companyName || e.company || 'Company',
      role: e.jobTitle || e.role || 'Role',
      jobTitle: e.jobTitle || e.role || 'Role',
      period: e.duration || e.period || 'Current',
      duration: e.duration || e.period || 'Current',
      description: e.description || ''
    };
    
    const existingIdx = data.work_experience.findIndex(item => item.id === normalized.id);
    if (existingIdx !== -1) {
      data.work_experience[existingIdx] = { ...data.work_experience[existingIdx], ...normalized };
      addedEntries.push(data.work_experience[existingIdx]);
    } else {
      data.work_experience.unshift(normalized);
      addedEntries.push(normalized);
    }
  }

  if (!data.identity) data.identity = {};
  data.identity.work_experience = data.work_experience;
  data.identity.experience = data.work_experience;

  saveData(data, false);
  return data.work_experience;
}

function deleteWorkExperience(id) {
  const data = getData();
  if (!Array.isArray(data.work_experience)) return [];
  data.work_experience = data.work_experience.filter(e => e.id !== id);
  if (!data.identity) data.identity = {};
  data.identity.work_experience = data.work_experience;
  data.identity.experience = data.work_experience;
  saveData(data, false);
  return data.work_experience;
}

function saveWorkExperience(list) {
  const data = getData();
  const normalized = (Array.isArray(list) ? list : []).map(e => ({
    id: e.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    company: e.companyName || e.company || 'Company',
    companyName: e.companyName || e.company || 'Company',
    role: e.jobTitle || e.role || 'Role',
    jobTitle: e.jobTitle || e.role || 'Role',
    period: e.duration || e.period || 'Current',
    duration: e.duration || e.period || 'Current',
    description: e.description || ''
  }));
  data.work_experience = normalized;
  if (!data.identity) data.identity = {};
  data.identity.work_experience = normalized;
  data.identity.experience = normalized;
  saveData(data, false);
  return data.work_experience;
}

// Vercel CRUD
function getVercelConfig() {
  const data = getData();
  return data.vercel || { apiToken: '', cachedDeployments: [], cachedProjects: [] };
}

function updateVercelToken(token, teamId = '') {
  const data = getData();
  if (!data.vercel) data.vercel = {};
  data.vercel.apiToken = token ? token.trim() : '';
  if (teamId !== undefined) data.vercel.teamId = teamId.trim();
  data.vercel.lastTokenUpdate = new Date().toISOString();
  saveData(data);
  return {
    hasToken: Boolean(data.vercel.apiToken),
    maskedToken: maskToken(data.vercel.apiToken),
    teamId: data.vercel.teamId
  };
}

function deduplicateVercelItems(items) {
  if (!Array.isArray(items)) return [];
  const result = [];
  items.forEach(item => {
    if (!item) return;
    const newId = item.id;
    const newNormUrl = (item.url || item.fullUrl || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const newName = (item.name || '').toLowerCase();

    const idx = result.findIndex(existing => {
      if (newId && existing.id && existing.id === newId) return true;
      const exNormUrl = (existing.url || existing.fullUrl || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
      if (newNormUrl && exNormUrl && newNormUrl === exNormUrl) return true;
      if (newName && existing.name && existing.name.toLowerCase() === newName) return true;
      return false;
    });

    if (idx !== -1) {
      result[idx] = {
        ...result[idx],
        ...item,
        domains: Array.from(new Set([...(result[idx].domains || []), ...(item.domains || [])]))
      };
    } else {
      result.push(item);
    }
  });
  return result;
}

function deduplicateGitHubRepos(repos) {
  if (!Array.isArray(repos)) return [];
  const result = [];
  repos.forEach(repo => {
    if (!repo) return;
    const newId = repo.id ? String(repo.id) : null;
    const newNormUrl = (repo.repoUrl || repo.html_url || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const newName = (repo.name || '').toLowerCase();

    const idx = result.findIndex(existing => {
      if (newId && existing.id && String(existing.id) === newId) return true;
      const exNormUrl = (existing.repoUrl || existing.html_url || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
      if (newNormUrl && exNormUrl && newNormUrl === exNormUrl) return true;
      if (newName && existing.name && existing.name.toLowerCase() === newName) return true;
      return false;
    });

    if (idx !== -1) {
      const existing = result[idx];
      result[idx] = {
        ...existing,
        ...repo,
        visible: typeof existing.visible === 'boolean' ? existing.visible : (repo.visible !== false),
        featured: typeof existing.featured === 'boolean' ? existing.featured : Boolean(repo.featured),
        vercelProject: repo.vercelProject || existing.vercelProject || repo.name
      };
    } else {
      result.push({
        ...repo,
        visible: repo.visible !== false
      });
    }
  });
  return result;
}

function saveVercelDeployments(deployments) {
  const data = getData();
  if (!data.vercel) data.vercel = {};
  data.vercel.cachedDeployments = deduplicateVercelItems(deployments);
  data.vercel.lastSynced = new Date().toISOString();
  saveData(data, true);
  return data.vercel;
}

function saveVercelProjects(projects) {
  const data = getData();
  if (!data.vercel) data.vercel = {};
  data.vercel.cachedProjects = deduplicateVercelItems(projects);
  data.vercel.lastSynced = new Date().toISOString();
  saveData(data, true);
  return data.vercel;
}

function saveVercelData({ projects, deployments }) {
  const data = getData();
  if (!data.vercel) data.vercel = {};
  if (projects) data.vercel.cachedProjects = deduplicateVercelItems(projects);
  if (deployments) data.vercel.cachedDeployments = deduplicateVercelItems(deployments);
  data.vercel.lastSynced = new Date().toISOString();
  saveData(data, true);
  return data.vercel;
}

// GitHub CRUD
function getGitHubData() {
  const data = getData();
  return data.github || { repositories: [] };
}

function saveGitHubRepositories(repositories, username = null) {
  const data = getData();
  if (!data.github) data.github = {};
  if (username) data.github.username = username;
  data.github.repositories = deduplicateGitHubRepos(repositories);
  data.github.lastSynced = new Date().toISOString();
  saveData(data, true);
  return data.github;
}

function updateRepoToggle(repoId, updates) {
  const data = getData();
  if (!data.github || !Array.isArray(data.github.repositories)) {
    return null;
  }
  const repo = data.github.repositories.find(r => r.id === repoId || r.name === repoId);
  if (!repo) return null;

  Object.assign(repo, updates);
  saveData(data, false);
  return repo;
}

// Job Hunting CRUD (LinkedIn & Naukri)
function getJobHuntData() {
  const data = getData();
  return data.jobHunt || { linkedin: {}, naukri: {}, applications: [] };
}

function updateLinkedInMetrics(updates) {
  const data = getData();
  if (!data.jobHunt) data.jobHunt = {};
  data.jobHunt.linkedin = {
    ...data.jobHunt.linkedin,
    ...updates,
    profileViews: Number(updates.profileViews ?? data.jobHunt.linkedin?.profileViews ?? 0),
    searchAppearances: Number(updates.searchAppearances ?? data.jobHunt.linkedin?.searchAppearances ?? 0),
    applicationsCount: Number(updates.applicationsCount ?? data.jobHunt.linkedin?.applicationsCount ?? 0),
    inmailMessages: Number(updates.inmailMessages ?? data.jobHunt.linkedin?.inmailMessages ?? 0),
    lastUpdated: new Date().toISOString()
  };

  // Synchronize profileUrl into identity and root linkedin_url
  if (updates && updates.profileUrl !== undefined) {
    const clean = (updates.profileUrl || '').trim();
    data.linkedin_url = clean;
    if (!data.identity) data.identity = {};
    data.identity.linkedin_url = clean;
    data.identity.linkedinUrl = clean;
    data.identity.updatedAt = new Date().toISOString();
  }

  saveData(data, false);
  return data.jobHunt.linkedin;
}

function updateNaukriMetrics(updates) {
  const data = getData();
  if (!data.jobHunt) data.jobHunt = {};
  data.jobHunt.naukri = {
    ...data.jobHunt.naukri,
    ...updates,
    profileViews: Number(updates.profileViews ?? data.jobHunt.naukri?.profileViews ?? 0),
    searchAppearances: Number(updates.searchAppearances ?? data.jobHunt.naukri?.searchAppearances ?? 0),
    applicationsCount: Number(updates.applicationsCount ?? data.jobHunt.naukri?.applicationsCount ?? 0),
    recruiterActions: Number(updates.recruiterActions ?? data.jobHunt.naukri?.recruiterActions ?? 0),
    profileScore: Number(updates.profileScore ?? data.jobHunt.naukri?.profileScore ?? 95),
    lastUpdated: new Date().toISOString()
  };

  // Synchronize profileUrl into identity and root naukri_url
  if (updates && updates.profileUrl !== undefined) {
    const clean = (updates.profileUrl || '').trim();
    data.naukri_url = clean;
    if (!data.identity) data.identity = {};
    data.identity.naukri_url = clean;
    data.identity.naukriUrl = clean;
    data.identity.updatedAt = new Date().toISOString();
  }

  saveData(data, false);
  return data.jobHunt.naukri;
}

function updateSocialLinks({ linkedinUrl, naukriUrl, linkedin_url, naukri_url }) {
  const data = getData();
  if (!data.jobHunt) data.jobHunt = {};
  if (!data.jobHunt.linkedin) data.jobHunt.linkedin = {};
  if (!data.jobHunt.naukri) data.jobHunt.naukri = {};
  if (!data.identity) data.identity = {};

  const cleanLi = linkedin_url !== undefined ? linkedin_url : linkedinUrl;
  const cleanNk = naukri_url !== undefined ? naukri_url : naukriUrl;

  if (cleanLi !== undefined && cleanLi !== null) {
    const val = String(cleanLi).trim();
    data.linkedin_url = val;
    data.identity.linkedin_url = val;
    data.identity.linkedinUrl = val;
    data.jobHunt.linkedin.profileUrl = val;
    data.jobHunt.linkedin.lastUpdated = new Date().toISOString();
  }

  if (cleanNk !== undefined && cleanNk !== null) {
    const val = String(cleanNk).trim();
    data.naukri_url = val;
    data.identity.naukri_url = val;
    data.identity.naukriUrl = val;
    data.jobHunt.naukri.profileUrl = val;
    data.jobHunt.naukri.lastUpdated = new Date().toISOString();
  }

  data.identity.updatedAt = new Date().toISOString();
  saveData(data, false);
  return {
    linkedin_url: data.linkedin_url,
    naukri_url: data.naukri_url,
    linkedinUrl: data.linkedin_url,
    naukriUrl: data.naukri_url,
    identity: data.identity,
    jobHunt: data.jobHunt
  };
}

function getProtectedState() {
  const data = getData();
  return {
    linkedin_url: data.linkedin_url,
    naukri_url: data.naukri_url,
    resume_filename: data.resume_filename,
    resume_path: data.resume_path
  };
}

function updateResumeRecord({ filename, originalName, path: filePath, previousPath }) {
  const data = getData();
  const name = filename || originalName || 'resume.pdf';
  const resolvedPath = filePath || '/assets/resume.pdf';

  if (data.resume_filename && data.resume_filename !== name) {
    data.previous_resume_filename = data.resume_filename;
  }
  if (previousPath) {
    data.previous_resume_path = previousPath;
  }

  data.resume_filename = name;
  data.resume_path = resolvedPath;
  if (!data.identity) data.identity = {};
  data.identity.resume_filename = name;
  data.identity.resumeUrl = resolvedPath;
  data.identity.updatedAt = new Date().toISOString();

  saveData(data, false);
  return {
    resume_filename: data.resume_filename,
    resume_path: data.resume_path,
    previous_resume_filename: data.previous_resume_filename,
    previous_resume_path: data.previous_resume_path
  };
}

function addApplication(appData) {
  const data = getData();
  if (!data.jobHunt) data.jobHunt = {};
  if (!Array.isArray(data.jobHunt.applications)) {
    data.jobHunt.applications = [];
  }
  const newApp = {
    id: `app-${Date.now()}`,
    company: appData.company || 'Untitled Corp',
    role: appData.role || 'Full-Stack Engineer',
    source: appData.source || 'LinkedIn',
    status: appData.status || 'Applied',
    appliedDate: appData.appliedDate || new Date().toISOString().split('T')[0],
    notes: appData.notes || ''
  };
  data.jobHunt.applications.unshift(newApp);
  saveData(data, false);
  return newApp;
}

function updateApplication(appId, updates) {
  const data = getData();
  if (!data.jobHunt || !Array.isArray(data.jobHunt.applications)) return null;
  const app = data.jobHunt.applications.find(a => a.id === appId);
  if (!app) return null;
  Object.assign(app, updates);
  saveData(data, false);
  return app;
}

function deleteApplication(appId) {
  const data = getData();
  if (!data.jobHunt || !Array.isArray(data.jobHunt.applications)) return false;
  const initialLength = data.jobHunt.applications.length;
  data.jobHunt.applications = data.jobHunt.applications.filter(a => a.id !== appId);
  if (data.jobHunt.applications.length !== initialLength) {
    saveData(data, false);
    return true;
  }
  return false;
}

function maskToken(token) {
  if (!token) return '';
  if (token.length <= 8) return '****';
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

module.exports = {
  DB_PATH,
  getData,
  saveData,
  getIdentity,
  updateIdentity,
  getVercelConfig,
  updateVercelToken,
  saveVercelDeployments,
  saveVercelProjects,
  saveVercelData,
  getGitHubData,
  saveGitHubRepositories,
  updateRepoToggle,
  getJobHuntData,
  updateLinkedInMetrics,
  updateNaukriMetrics,
  updateSocialLinks,
  getProtectedState,
  updateResumeRecord,
  addApplication,
  updateApplication,
  deleteApplication,
  getWorkExperience,
  addWorkExperience,
  deleteWorkExperience,
  saveWorkExperience,
  maskToken
};

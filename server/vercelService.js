const db = require('./db');

const VERCEL_API_BASE = 'https://api.vercel.com';

/**
 * Map raw Vercel API readyState/state to standardized status ('Ready', 'Building', 'Error', 'Queued')
 */
function normalizeStatus(readyState, state) {
  const raw = (readyState || state || '').toUpperCase();
  switch (raw) {
    case 'READY':
      return 'Ready';
    case 'BUILDING':
    case 'INITIALIZING':
      return 'Building';
    case 'ERROR':
    case 'FAILED':
      return 'Error';
    case 'QUEUED':
      return 'Queued';
    case 'CANCELED':
      return 'Canceled';
    default:
      return raw ? raw.charAt(0) + raw.slice(1).toLowerCase() : 'Ready';
  }
}

/**
 * Normalize URLs for robust matching (removes protocol, trailing slashes, whitespace)
 */
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
}

/**
 * Duplicate-prevention filter:
 * If a project with the same Vercel ID or deployment URL (or project name) already exists in the array,
 * it updates the existing entry instead of adding a duplicate row.
 */
function upsertVercelItem(targetArray, newItem) {
  if (!newItem) return;
  const newId = newItem.id;
  const newNormUrl = normalizeUrl(newItem.url || newItem.fullUrl);
  const newName = (newItem.name || '').toLowerCase();

  const existingIndex = targetArray.findIndex(existing => {
    if (newId && existing.id && existing.id === newId) return true;
    const existingNormUrl = normalizeUrl(existing.url || existing.fullUrl);
    if (newNormUrl && existingNormUrl && newNormUrl === existingNormUrl) return true;
    if (newName && existing.name && existing.name.toLowerCase() === newName) return true;
    return false;
  });

  if (existingIndex !== -1) {
    const existing = targetArray[existingIndex];
    targetArray[existingIndex] = {
      ...existing,
      ...newItem,
      domains: Array.from(new Set([...(existing.domains || []), ...(newItem.domains || [])]))
    };
    return targetArray[existingIndex];
  } else {
    targetArray.push(newItem);
    return newItem;
  }
}

/**
 * Retrieve active Vercel Personal Access Token from environment or config
 */
function getVercelToken(tokenOverride = null) {
  const vercelConfig = db.getVercelConfig();
  return (tokenOverride || process.env.VERCEL_TOKEN || vercelConfig.apiToken || '').trim();
}

/**
 * Retrieve active Vercel Team ID from environment or config
 */
function getVercelTeamId() {
  const vercelConfig = db.getVercelConfig();
  return (process.env.VERCEL_TEAM_ID || vercelConfig.teamId || '').trim();
}

/**
 * Module 1: Project Retrieval Module
 * Hits active endpoint: https://api.vercel.com/v10/projects
 * Targets wrapper array: data.projects
 */
async function fetchVercelProjects(tokenOverride = null) {
  const token = getVercelToken(tokenOverride);
  const teamId = getVercelTeamId();
  const vercelConfig = db.getVercelConfig();

  if (!token) {
    console.log('[Vercel Projects] No token found. Serving local cached projects.');
    return {
      connected: false,
      isLive: false,
      message: 'No Vercel Personal Access Token configured.',
      projects: vercelConfig.cachedProjects || [],
      lastSynced: vercelConfig.lastSynced || null
    };
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    let url = `${VERCEL_API_BASE}/v10/projects`;
    if (teamId) {
      url += `?teamId=${encodeURIComponent(teamId)}`;
    }

    console.log(`[Vercel API] Fetching projects from: ${url}`);
    let response = await fetch(url, { method: 'GET', headers });

    // Resilient fallback: If teamId returns 403 or 404, retry at personal user scope
    if (!response.ok && (response.status === 403 || response.status === 404) && teamId) {
      console.warn(`[Vercel API v10/projects] Team scoping '${teamId}' returned HTTP ${response.status}. Retrying at personal account scope...`);
      url = `${VERCEL_API_BASE}/v10/projects`;
      response = await fetch(url, { method: 'GET', headers });
    }

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = errText;
      try {
        errMsg = JSON.parse(errText).error?.message || errText;
      } catch (e) {}

      console.warn(`[Vercel API v10/projects] HTTP ${response.status}: ${errMsg}`);
      return {
        connected: false,
        isLive: false,
        statusCode: response.status,
        message: `Vercel Projects API returned HTTP ${response.status}: ${errMsg}`,
        projects: vercelConfig.cachedProjects || [],
        lastSynced: vercelConfig.lastSynced || null
      };
    }

    // Explicitly target the .projects wrapper array from raw Vercel JSON payload
    const rawPayload = await response.json();
    const rawProjects = Array.isArray(rawPayload?.projects) ? rawPayload.projects : [];

    console.log(`[Vercel API] Extracted ${rawProjects.length} items from .projects wrapper array`);

    // 1. Ensure that the project list array is completely cleared out (set back to an empty array) right before fresh sync
    const projectList = [];

    // 2. Filter & upsert: if a project with same Vercel ID, deployment URL, or name exists, update instead of adding duplicate row
    rawProjects.forEach(prj => {
      const prod = prj.targets?.production || (Array.isArray(prj.latestDeployments) ? prj.latestDeployments[0] : null) || {};
      const rawStatus = prod.readyState || prod.state || 'READY';
      const status = normalizeStatus(rawStatus);
      const primaryDomain = prod.url ? prod.url.replace(/^https?:\/\//, '') : `${prj.name}.vercel.app`;
      const allDomains = Array.isArray(prod.alias) && prod.alias.length > 0 ? prod.alias : [primaryDomain];

      const projectItem = {
        id: prj.id || `prj_${prj.name}`,
        name: prj.name,
        framework: prj.framework || 'Web App',
        status: status,
        url: primaryDomain,
        fullUrl: `https://${primaryDomain}`,
        domains: allDomains,
        updatedAt: prj.updatedAt ? new Date(prj.updatedAt).toISOString() : new Date().toISOString(),
        repo: prj.link?.repo || prj.name
      };

      upsertVercelItem(projectList, projectItem);
    });

    // Persist deduplicated project list to local database
    db.saveVercelProjects(projectList);

    return {
      connected: true,
      isLive: true,
      message: `Successfully fetched ${projectList.length} projects from Vercel v10/projects.`,
      projects: projectList,
      lastSynced: new Date().toISOString()
    };
  } catch (err) {
    console.error('[Vercel Projects Error]:', err.message);
    return {
      connected: false,
      isLive: false,
      message: `Error connecting to Vercel Projects API: ${err.message}`,
      projects: vercelConfig.cachedProjects || [],
      lastSynced: vercelConfig.lastSynced || null
    };
  }
}

/**
 * Module 2: Deployment Retrieval Module
 * Hits active endpoint: https://api.vercel.com/v7/deployments
 * Targets wrapper array: data.deployments
 */
async function fetchVercelDeployments(tokenOverride = null) {
  const token = getVercelToken(tokenOverride);
  const teamId = getVercelTeamId();
  const vercelConfig = db.getVercelConfig();

  if (!token) {
    console.log('[Vercel Deployments] No token found. Serving local cached deployments.');
    return {
      connected: false,
      isLive: false,
      message: 'No Vercel Personal Access Token configured.',
      deployments: vercelConfig.cachedDeployments || [],
      lastSynced: vercelConfig.lastSynced || null
    };
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    let url = `${VERCEL_API_BASE}/v7/deployments?limit=20`;
    if (teamId) {
      url += `&teamId=${encodeURIComponent(teamId)}`;
    }

    console.log(`[Vercel API] Fetching deployments from: ${url}`);
    let response = await fetch(url, { method: 'GET', headers });

    // Resilient fallback: If teamId returns 403 or 404, retry at personal user scope
    if (!response.ok && (response.status === 403 || response.status === 404) && teamId) {
      console.warn(`[Vercel API v7/deployments] Team scoping '${teamId}' returned HTTP ${response.status}. Retrying at personal account scope...`);
      url = `${VERCEL_API_BASE}/v7/deployments?limit=20`;
      response = await fetch(url, { method: 'GET', headers });
    }

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = errText;
      try {
        errMsg = JSON.parse(errText).error?.message || errText;
      } catch (e) {}

      console.warn(`[Vercel API v7/deployments] HTTP ${response.status}: ${errMsg}`);
      return {
        connected: false,
        isLive: false,
        statusCode: response.status,
        message: `Vercel Deployments API returned HTTP ${response.status}: ${errMsg}`,
        deployments: vercelConfig.cachedDeployments || [],
        lastSynced: vercelConfig.lastSynced || null
      };
    }

    // Explicitly target the .deployments wrapper array from raw Vercel JSON payload
    const rawPayload = await response.json();
    const rawDeployments = Array.isArray(rawPayload?.deployments) ? rawPayload.deployments : [];

    console.log(`[Vercel API] Extracted ${rawDeployments.length} items from .deployments wrapper array`);

    // 1. Sort response payload array by 'created_at' / 'createdAt' / 'created' timestamp in descending order (latest first)
    rawDeployments.sort((a, b) => {
      const tsA = a.created_at || a.createdAt || a.created || 0;
      const tsB = b.created_at || b.createdAt || b.created || 0;
      return (typeof tsB === 'number' ? tsB : new Date(tsB).getTime()) - (typeof tsA === 'number' ? tsA : new Date(tsA).getTime());
    });

    // 1. Ensure that the deployment list array is completely cleared out right before fresh sync
    const deploymentList = [];

    // Group by project name to isolate multi-deployment histories
    const deploymentsByProject = new Map();
    rawDeployments.forEach(dep => {
      const projectName = (dep.name || '').toLowerCase();
      if (!deploymentsByProject.has(projectName)) {
        deploymentsByProject.set(projectName, []);
      }
      deploymentsByProject.get(projectName).push(dep);
    });

    // 2 & 3. For each project name, commit only the latest active 'Ready' production deployment
    deploymentsByProject.forEach((projectDeps, projectName) => {
      // Find latest deployment with status 'Ready'
      let chosenDep = projectDeps.find(d => {
        const s = normalizeStatus(d.readyState, d.state);
        return s === 'Ready';
      });

      // Fallback to absolute newest deployment if none are currently marked 'Ready'
      if (!chosenDep && projectDeps.length > 0) {
        chosenDep = projectDeps[0];
      }

      if (chosenDep) {
        const status = normalizeStatus(chosenDep.readyState, chosenDep.state);

        // 2. Explicitly map public portfolio card URL to 'alias' or 'url' property of newest deployment
        let domainName = '';
        if (Array.isArray(chosenDep.alias) && chosenDep.alias.length > 0) {
          domainName = chosenDep.alias[0];
        } else if (typeof chosenDep.alias === 'string' && chosenDep.alias.trim()) {
          domainName = chosenDep.alias.trim();
        } else if (chosenDep.url) {
          domainName = chosenDep.url;
        } else {
          domainName = `${chosenDep.name}.vercel.app`;
        }
        domainName = domainName.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        const fullUrl = `https://${domainName}`;

        const allDomains = Array.isArray(chosenDep.alias) && chosenDep.alias.length > 0
          ? Array.from(new Set([domainName, ...chosenDep.alias]))
          : [domainName];

        const deploymentItem = {
          id: chosenDep.uid || chosenDep.id || `dpl_${Date.now()}`,
          name: chosenDep.name,
          url: domainName,
          fullUrl: fullUrl,
          domains: allDomains,
          status: status,
          branch: chosenDep.meta?.githubCommitRef || chosenDep.meta?.branch || 'main',
          commit: chosenDep.meta?.githubCommitMessage || 'Live deployment update',
          commitHash: chosenDep.meta?.githubCommitSha ? chosenDep.meta.githubCommitSha.substring(0, 7) : 'prod',
          creator: chosenDep.creator?.username || chosenDep.creator?.name || 'Vercel Deployment',
          createdAt: chosenDep.created_at ? new Date(chosenDep.created_at).toISOString() : (chosenDep.created ? new Date(chosenDep.created).toISOString() : new Date().toISOString()),
          framework: chosenDep.framework || 'Web App',
          environment: chosenDep.target === 'production' ? 'production' : 'preview'
        };

        upsertVercelItem(deploymentList, deploymentItem);
      }
    });

    // Persist deduplicated deployments to local database
    db.saveVercelDeployments(deploymentList);

    return {
      connected: true,
      isLive: true,
      message: `Successfully fetched ${deploymentList.length} unique deployments from Vercel v7/deployments.`,
      deployments: deploymentList,
      lastSynced: new Date().toISOString()
    };
  } catch (err) {
    console.error('[Vercel Deployments Error]:', err.message);
    return {
      connected: false,
      isLive: false,
      message: `Error connecting to Vercel Deployments API: ${err.message}`,
      deployments: vercelConfig.cachedDeployments || [],
      lastSynced: vercelConfig.lastSynced || null
    };
  }
}

/**
 * Unified Synchronizer: Fetches both v10/projects and v7/deployments in parallel
 */
async function syncAllVercelData(tokenOverride = null) {
  const [projectsResult, deploymentsResult] = await Promise.all([
    fetchVercelProjects(tokenOverride),
    fetchVercelDeployments(tokenOverride)
  ]);

  const isLive = projectsResult.isLive || deploymentsResult.isLive;
  const connected = projectsResult.connected || deploymentsResult.connected;

  return {
    success: true,
    connected,
    isLive,
    message: isLive 
      ? `Synchronized ${projectsResult.projects?.length || 0} projects and ${deploymentsResult.deployments?.length || 0} deployments from Vercel REST API.`
      : (projectsResult.message || deploymentsResult.message || 'Serving local cached Vercel data.'),
    projects: projectsResult.projects || [],
    deployments: deploymentsResult.deployments || [],
    lastSynced: new Date().toISOString()
  };
}

/**
 * Verify a token by calling /v2/user
 */
async function verifyVercelToken(token) {
  if (!token) return { valid: false, message: 'Token cannot be empty' };
  try {
    const res = await fetch(`${VERCEL_API_BASE}/v2/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      return {
        valid: true,
        user: {
          username: data.user?.username,
          email: data.user?.email,
          name: data.user?.name
        }
      };
    } else {
      return {
        valid: false,
        statusCode: res.status,
        message: 'Invalid Vercel Personal Access Token or insufficient permissions.'
      };
    }
  } catch (err) {
    return {
      valid: false,
      message: `Network error verifying token: ${err.message}`
    };
  }
}

module.exports = {
  getVercelToken,
  getVercelTeamId,
  fetchVercelProjects,
  fetchVercelDeployments,
  syncAllVercelData,
  verifyVercelToken,
  normalizeStatus
};

const db = require('./db');

const GITHUB_API_BASE = 'https://api.github.com';

function getGitHubToken() {
  return (process.env.GITHUB_TOKEN || '').trim();
}

function getGitHubUsername() {
  return (process.env.GITHUB_USERNAME || '').trim();
}

/**
 * Normalize repository URLs for robust duplicate-prevention matching
 */
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
}

/**
 * Duplicate-prevention filter:
 * If a repository with the same GitHub ID, repo URL, or name already exists in targetArray,
 * update the existing entry in place instead of adding a duplicate row.
 */
function upsertGitHubRepo(targetArray, newRepo) {
  if (!newRepo) return;
  const newId = newRepo.id ? String(newRepo.id) : null;
  const newNormUrl = normalizeUrl(newRepo.repoUrl || newRepo.html_url);
  const newName = (newRepo.name || '').toLowerCase();

  const existingIndex = targetArray.findIndex(existing => {
    if (newId && existing.id && String(existing.id) === newId) return true;
    const existingNormUrl = normalizeUrl(existing.repoUrl || existing.html_url);
    if (newNormUrl && existingNormUrl && newNormUrl === existingNormUrl) return true;
    if (newName && existing.name && existing.name.toLowerCase() === newName) return true;
    return false;
  });

  if (existingIndex !== -1) {
    const existing = targetArray[existingIndex];
    targetArray[existingIndex] = {
      ...existing,
      ...newRepo,
      // Retain existing configuration (visibility & featured status) if set
      visible: typeof existing.visible === 'boolean' ? existing.visible : (newRepo.visible !== false),
      featured: typeof existing.featured === 'boolean' ? existing.featured : Boolean(newRepo.featured),
      vercelProject: newRepo.vercelProject || existing.vercelProject || newRepo.name
    };
    return targetArray[existingIndex];
  } else {
    targetArray.push({
      ...newRepo,
      visible: newRepo.visible !== false
    });
    return newRepo;
  }
}

/**
 * Process repository list, deduplicate, and persist to data.json
 */
function processAndSaveRepos(rawList, username, currentRepos) {
  const repoList = [];
  const targetUser = (username || getGitHubUsername() || 'subhanishaik1922').toLowerCase();

  // Strict filter array rule: repo.owner.login === 'subhanishaik1922'
  const ownedRepos = (rawList || []).filter(repo => {
    if (!repo) return false;
    if (repo.owner && repo.owner.login) {
      return repo.owner.login === 'subhanishaik1922' || repo.owner.login.toLowerCase() === targetUser;
    }
    if (typeof repo.owner === 'string') {
      return repo.owner === 'subhanishaik1922' || repo.owner.toLowerCase() === targetUser;
    }
    return false;
  });

  // Map existing configuration (toggles, custom names) for owned repositories
  const existingMap = new Map();
  (currentRepos || []).forEach(r => {
    const isOwned = (r.owner && r.owner.login === 'subhanishaik1922') ||
                    (r.repoUrl && r.repoUrl.toLowerCase().includes('/subhanishaik1922/'));
    if (isOwned) {
      if (r.name) existingMap.set(r.name.toLowerCase(), r);
      if (r.id) existingMap.set(String(r.id), r);
    }
  });

  ownedRepos.forEach(repo => {
    // Re-verify strict owner filter
    if (repo.owner && repo.owner.login !== 'subhanishaik1922' && repo.owner.login.toLowerCase() !== targetUser) {
      return;
    }

    const existing = existingMap.get(repo.name?.toLowerCase()) || existingMap.get(String(repo.id));

    const isVisible = existing && typeof existing.visible === 'boolean' 
      ? existing.visible 
      : true;

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
      repoUrl: repo.html_url || repo.repoUrl || `https://github.com/${repo.owner?.login || targetUser}/${repo.name}`,
      html_url: repo.html_url || repo.repoUrl || `https://github.com/${repo.owner?.login || targetUser}/${repo.name}`
    };

    upsertGitHubRepo(repoList, repoItem);
  });

  // Preserve local custom repos stored in data.json ONLY if owned by subhanishaik1922
  (currentRepos || []).forEach(localRepo => {
    const isOwned = (localRepo.owner && localRepo.owner.login === 'subhanishaik1922') ||
                    (localRepo.repoUrl && localRepo.repoUrl.toLowerCase().includes('/subhanishaik1922/'));
    if (!isOwned) {
      return; // Filter out foreign repositories
    }
    upsertGitHubRepo(repoList, localRepo);
  });

  // Persist mapped deduplicated repositories to data.json
  db.saveGitHubRepositories(repoList, targetUser);

  return {
    connected: true,
    isLive: true,
    message: `Successfully mapped ${repoList.length} repositories from GitHub API.`,
    repositories: repoList,
    lastSynced: new Date().toISOString()
  };
}

/**
 * Fetch repositories from GitHub REST API
 * Uses public user path format (https://api.github.com/users/:username/repos)
 * Gracefully handles 401 unauthorized / bad credentials without crashing
 */
async function fetchGitHubRepositories() {
  const token = getGitHubToken();
  const username = getGitHubUsername() || 'subhanishaik1922';
  const existingData = db.getGitHubData();
  const currentRepos = existingData.repositories || [];

  const headers = {
    'User-Agent': 'Career-Command-Center-CMS/1.0',
    'Accept': 'application/vnd.github.v3+json'
  };

  // 1. Read process.env.GITHUB_TOKEN directly for the Authorization Bearer header
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 2. Read target profile username dynamically from process.env.GITHUB_USERNAME
  // Public user path format (targets user's public repository stream directly)
  const endpoint = `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`;

  if (!endpoint) {
    console.warn('⚠️ [GitHub API Warning] Neither GITHUB_TOKEN nor GITHUB_USERNAME is configured.');
    return {
      connected: false,
      isLive: false,
      message: 'GITHUB_TOKEN and GITHUB_USERNAME are not configured in environment variables.',
      repositories: ensureDefaultVisibility(currentRepos)
    };
  }

  try {
    console.log(`[GitHub API] Fetching repositories dynamically from: ${endpoint}`);
    let response = await fetch(endpoint, {
      method: 'GET',
      headers
    });

    // 3. Gracefully handle 401 unauthorized or bad credentials error without crashing
    if (response.status === 401) {
      const errText = await response.text();
      let errMsg = 'Bad credentials or unauthorized';
      try {
        errMsg = JSON.parse(errText).message || errMsg;
      } catch (e) {}

      console.error('\n⚠️ =======================================================');
      console.error('⚠️ [GITHUB API AUTH ERROR 401] Unauthorized / Bad Credentials!');
      console.error(`⚠️ GitHub Error Message: ${errMsg}`);
      console.error('⚠️ process.env.GITHUB_TOKEN was rejected by GitHub API.');
      console.error('⚠️ Gracefully falling back to cached repositories without crashing.');
      console.error('⚠️ =======================================================\n');

      // Graceful fallback to public user repos if username is provided
      if (username) {
        console.log(`[GitHub API] Falling back to public user repos for '${username}'...`);
        try {
          const fallbackRes = await fetch(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`, {
            method: 'GET',
            headers: {
              'User-Agent': 'Career-Command-Center-CMS/1.0',
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          if (fallbackRes.ok) {
            const fallbackPayload = await fallbackRes.json();
            if (Array.isArray(fallbackPayload)) {
              return processAndSaveRepos(fallbackPayload, username, currentRepos);
            }
          }
        } catch (fallbackErr) {
          console.warn(`[GitHub API] Public fallback failed: ${fallbackErr.message}`);
        }
      }

      return {
        connected: false,
        isLive: false,
        statusCode: 401,
        message: `GitHub API 401 Unauthorized: ${errMsg}. Check process.env.GITHUB_TOKEN.`,
        repositories: ensureDefaultVisibility(currentRepos)
      };
    }

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = errText;
      try {
        errMsg = JSON.parse(errText).message || errText;
      } catch (e) {}

      console.warn(`[GitHub API] HTTP ${response.status}: ${errMsg}. Using local cached repositories.`);
      return {
        connected: false,
        isLive: false,
        statusCode: response.status,
        message: `GitHub API returned HTTP ${response.status}: ${errMsg}`,
        repositories: ensureDefaultVisibility(currentRepos)
      };
    }

    // Extract repository array from response
    const payload = await response.json();
    let rawList = [];

    if (Array.isArray(payload)) {
      rawList = payload;
    } else if (Array.isArray(payload?.items)) {
      rawList = payload.items;
    } else if (Array.isArray(payload?.repositories)) {
      rawList = payload.repositories;
    } else {
      console.warn('[GitHub API] Unexpected payload envelope, using cache');
      return {
        connected: false,
        isLive: false,
        message: 'Unexpected payload structure from GitHub',
        repositories: ensureDefaultVisibility(currentRepos)
      };
    }

    console.log(`[GitHub API] Successfully extracted ${rawList.length} repositories from GitHub API`);
    return processAndSaveRepos(rawList, username, currentRepos);
  } catch (err) {
    console.error('[GitHub API Error]:', err.message);
    return {
      connected: false,
      isLive: false,
      message: `Error connecting to GitHub API: ${err.message}`,
      repositories: ensureDefaultVisibility(currentRepos)
    };
  }
}

/**
 * Ensure repositories have visible: true by default so dashboard grid never remains blank
 */
function ensureDefaultVisibility(repos) {
  if (!Array.isArray(repos) || repos.length === 0) return [];
  return repos.map(r => ({
    ...r,
    visible: r.visible !== false // convert any false or undefined to true if previously defaulted wrong
  }));
}

module.exports = {
  getGitHubToken,
  getGitHubUsername,
  fetchGitHubRepositories,
  processAndSaveRepos,
  upsertGitHubRepo,
  ensureDefaultVisibility
};

const express = require('express');
const router = express.Router();
const db = require('../db');
const githubService = require('../githubService');
const { requireAdminAuth } = require('../auth');

// Explicit dynamic flags to bypass Vercel build-time caching and data freezing
router.dynamic = 'force-dynamic';
router.revalidate = 0;
router.fetchCache = 'force-no-store';

/**
 * GET /api/github/repos
 * Public: Returns repository list (triggers GitHub API synchronization if live or returns cached)
 */
router.get('/repos', async (req, res) => {
  try {
    const githubData = db.getGitHubData();
    let repositories = githubData.repositories || [];

    const activeUsername = githubService.getGitHubUsername() || 'subhanishaik1922';

    // Strict filter array rule: guarantee only projects owned by my exact username are returned
    repositories = repositories.filter(repo => {
      if (!repo) return false;
      if (repo.owner && repo.owner.login) {
        return repo.owner.login === 'subhanishaik1922' || repo.owner.login.toLowerCase() === activeUsername.toLowerCase();
      }
      if (typeof repo.owner === 'string') {
        return repo.owner === 'subhanishaik1922' || repo.owner.toLowerCase() === activeUsername.toLowerCase();
      }
      if (repo.repoUrl) {
        return repo.repoUrl.toLowerCase().includes('/subhanishaik1922/') || repo.repoUrl.toLowerCase().includes(`/${activeUsername.toLowerCase()}/`);
      }
      return false;
    });

    // Ensure all repositories default to visible so cards populate the dashboard grid
    const hasVisible = repositories.some(r => r.visible === true);
    if (!hasVisible && repositories.length > 0) {
      repositories = repositories.map(r => ({ ...r, visible: true }));
      db.saveGitHubRepositories(repositories, activeUsername);
    }

    res.json({
      success: true,
      username: activeUsername,
      profileUrl: `https://github.com/${activeUsername}`,
      repositories: repositories
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/github/sync
 * Protected: Calls GitHub API directly using GITHUB_TOKEN to refresh repositories list
 */
router.post('/sync', requireAdminAuth, async (req, res) => {
  try {
    const result = await githubService.fetchGitHubRepositories();
    res.json({
      success: true,
      message: result.message,
      isLive: result.isLive,
      repositories: result.repositories
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/github/repos/:id
 * Protected: Toggle repository visibility, featured status, or link to Vercel deployment
 */
router.patch('/repos/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedRepo = db.updateRepoToggle(id, updates);

    if (!updatedRepo) {
      return res.status(404).json({ success: false, message: 'Repository not found' });
    }

    res.json({
      success: true,
      message: `Repository '${updatedRepo.name}' updated successfully.`,
      repository: updatedRepo
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/github/repos
 * Protected: Add a new repository to the tracking list
 */
router.post('/repos', requireAdminAuth, (req, res) => {
  try {
    const { name, description, language, repoUrl, vercelProject } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Repository name is required' });
    }

    const data = db.getData();
    if (!data.github) data.github = { repositories: [] };
    if (!Array.isArray(data.github.repositories)) data.github.repositories = [];

    const cleanName = name.trim();
    const cleanRepoUrl = repoUrl ? repoUrl.trim() : `https://github.com/${githubService.getGitHubUsername()}/${cleanName}`;

    // Duplicate-prevention check: check if repository exists by name, ID, or repo URL
    const existingIndex = data.github.repositories.findIndex(r => 
      (r.name && r.name.toLowerCase() === cleanName.toLowerCase()) ||
      (r.repoUrl && cleanRepoUrl && r.repoUrl.toLowerCase().replace(/\/+$/, '') === cleanRepoUrl.toLowerCase().replace(/\/+$/, ''))
    );

    if (existingIndex !== -1) {
      // Update existing entry instead of adding a duplicate row
      const existing = data.github.repositories[existingIndex];
      data.github.repositories[existingIndex] = {
        ...existing,
        name: cleanName,
        description: description || existing.description,
        language: language || existing.language,
        vercelProject: vercelProject || existing.vercelProject,
        repoUrl: cleanRepoUrl
      };
      db.saveData(data);
      return res.json({
        success: true,
        message: `Repository '${cleanName}' already existed and was updated successfully.`,
        repository: data.github.repositories[existingIndex]
      });
    }

    const newRepo = {
      id: `repo-${Date.now()}`,
      name: cleanName,
      description: description || 'New software engineering project',
      stars: 0,
      forks: 0,
      language: language || 'JavaScript',
      visible: true,
      featured: false,
      vercelProject: vercelProject || cleanName.toLowerCase(),
      repoUrl: cleanRepoUrl
    };

    data.github.repositories.unshift(newRepo);
    db.saveData(data);

    res.json({
      success: true,
      message: `Repository '${newRepo.name}' added successfully.`,
      repository: newRepo
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

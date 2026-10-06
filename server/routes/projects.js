const express = require('express');
const router = express.Router();
const db = require('../db');

// Explicit dynamic flags to bypass Vercel build-time caching and data freezing
router.dynamic = 'force-dynamic';
router.revalidate = 0;
router.fetchCache = 'force-no-store';

/**
 * GET /api/projects
 * Public: Returns unified project attributes directly from data.json database structure.
 * Guarantees exact mapping of repo.html_url and repo.repoUrl for public cards.
 */
router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
  try {
    const data = db.getData();
    const repos = (data.github && Array.isArray(data.github.repositories)) ? data.github.repositories : [];
    const deployments = (data.vercel && Array.isArray(data.vercel.cachedDeployments)) ? data.vercel.cachedDeployments : [];
    const projects = (data.vercel && Array.isArray(data.vercel.cachedProjects)) ? data.vercel.cachedProjects : [];

    const activeUsername = data.github?.username || 'subhanishaik1922';

    // Map deployments and projects by name for fast lookup
    const deploymentMap = new Map();
    deployments.forEach(d => {
      if (d.name) deploymentMap.set(d.name.toLowerCase(), d);
    });

    const projectMap = new Map();
    projects.forEach(p => {
      if (p.name) projectMap.set(p.name.toLowerCase(), p);
    });

    const includeAll = req.query.all === 'true';

    const normalizedProjects = repos
      .filter(repo => repo && (includeAll || repo.visible !== false))
      .map(repo => {
        const repoName = (repo.name || '').trim();
        // Exact GitHub URL strictly mapped to data.json
        const githubUrl = repo.html_url || repo.repoUrl || (repo.owner?.login ? `https://github.com/${repo.owner.login}/${repoName}` : `https://github.com/${activeUsername}/${repoName}`);

        const linkedKey = (repo.vercelProject || repo.name || '').toLowerCase();
        const dep = deploymentMap.get(linkedKey) || deploymentMap.get(repoName.toLowerCase()) || null;
        const prj = projectMap.get(linkedKey) || projectMap.get(repoName.toLowerCase()) || null;

        // Strictly pick the latest active 'Ready' production link
        let liveUrl = null;
        let domain = null;
        let status = 'Ready';
        let branch = dep?.branch || 'main';
        let commit = dep?.commit || null;

        if (dep && dep.status === 'Ready') {
          liveUrl = dep.fullUrl || (dep.url ? `https://${dep.url}` : null);
          domain = dep.url || null;
          status = 'Ready';
        } else if (prj && prj.status === 'Ready') {
          liveUrl = prj.fullUrl || (prj.url ? `https://${prj.url}` : null);
          domain = prj.url || null;
          status = 'Ready';
        } else if (dep) {
          liveUrl = dep.fullUrl || (dep.url ? `https://${dep.url}` : null);
          domain = dep.url || null;
          status = dep.status || 'Ready';
        } else if (prj) {
          liveUrl = prj.fullUrl || (prj.url ? `https://${prj.url}` : null);
          domain = prj.url || null;
          status = prj.status || 'Ready';
        }

        return {
          id: repo.id ? String(repo.id) : repoName,
          name: repoName,
          description: repo.description || 'Full-stack software engineering project with CI/CD automation.',
          language: repo.language || 'Full-Stack',
          stars: typeof repo.stars === 'number' ? repo.stars : 0,
          forks: typeof repo.forks === 'number' ? repo.forks : 0,
          visible: repo.visible !== false,
          featured: Boolean(repo.featured),
          html_url: githubUrl,
          repoUrl: githubUrl,
          liveUrl: liveUrl,
          domain: domain,
          status: status,
          branch: branch,
          commit: commit,
          vercelProject: repo.vercelProject || repoName,
          owner: repo.owner || { login: activeUsername }
        };
      });

    // Support optional format=array query param
    if (req.query.format === 'array') {
      return res.json(normalizedProjects);
    }

    res.json({
      success: true,
      count: normalizedProjects.length,
      projects: normalizedProjects,
      data: normalizedProjects
    });
  } catch (err) {
    console.error('[API /projects Error]', err);
    res.status(500).json({ success: false, message: err.message, projects: [] });
  }
});

module.exports = router;

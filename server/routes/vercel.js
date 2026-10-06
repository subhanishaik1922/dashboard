const express = require('express');
const router = express.Router();
const db = require('../db');
const vercelService = require('../vercelService');
const { requireAdminAuth } = require('../auth');

// Explicit dynamic flags to bypass Vercel build-time caching and data freezing
router.dynamic = 'force-dynamic';
router.revalidate = 0;
router.fetchCache = 'force-no-store';

/**
 * GET /api/vercel/projects
 * Public: Hits https://api.vercel.com/v10/projects and returns .projects wrapper array
 */
router.get('/projects', async (req, res) => {
  try {
    const result = await vercelService.fetchVercelProjects();
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
      projects: db.getVercelConfig().cachedProjects || []
    });
  }
});

/**
 * GET /api/vercel/deployments
 * Public: Hits https://api.vercel.com/v7/deployments and returns .deployments and .projects wrapper arrays
 */
router.get('/deployments', async (req, res) => {
  try {
    // Fetch both to ensure both active projects and deployments are available to dashboard
    const result = await vercelService.syncAllVercelData();
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    const vercelConfig = db.getVercelConfig();
    res.status(500).json({
      success: false,
      message: err.message,
      deployments: vercelConfig.cachedDeployments || [],
      projects: vercelConfig.cachedProjects || []
    });
  }
});

/**
 * GET /api/vercel/config
 * Protected: Returns safe config info (token is masked)
 */
router.get('/config', requireAdminAuth, (req, res) => {
  const vercel = db.getVercelConfig();
  res.json({
    success: true,
    hasToken: Boolean(vercelService.getVercelToken()),
    maskedToken: db.maskToken(vercelService.getVercelToken()),
    teamId: vercelService.getVercelTeamId(),
    lastSynced: vercel.lastSynced || null,
    deploymentCount: (vercel.cachedDeployments || []).length,
    projectCount: (vercel.cachedProjects || []).length
  });
});

/**
 * POST /api/vercel/token
 * Protected: Securely updates the Vercel Personal Access Token
 */
router.post('/token', requireAdminAuth, async (req, res) => {
  try {
    const { token, teamId, verify } = req.body;
    
    if (typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Token must be a string' });
    }

    let verification = { valid: true };
    if (token && verify) {
      verification = await vercelService.verifyVercelToken(token);
      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          message: verification.message || 'Token verification failed with Vercel API.'
        });
      }
    }

    const updated = db.updateVercelToken(token, teamId);

    // If token is provided, trigger a fresh fetch right away across v10/projects and v7/deployments
    let syncResult = null;
    if (token) {
      syncResult = await vercelService.syncAllVercelData(token);
    }

    res.json({
      success: true,
      message: token ? 'Vercel Personal Access Token saved and synchronized successfully!' : 'Vercel token cleared.',
      config: updated,
      verification,
      syncResult
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/vercel/sync
 * Protected: Manually trigger live re-sync hitting both v10/projects and v7/deployments
 */
router.post('/sync', requireAdminAuth, async (req, res) => {
  try {
    const result = await vercelService.syncAllVercelData();
    res.json({
      success: true,
      message: result.message,
      isLive: result.isLive,
      connected: result.connected,
      projects: result.projects,
      deployments: result.deployments,
      lastSynced: result.lastSynced
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/vercel/simulate-status
 * Protected: Helper to test live UI badge transitions
 */
router.post('/simulate-status', requireAdminAuth, (req, res) => {
  try {
    const { deploymentId, status } = req.body;
    const config = db.getVercelConfig();
    const deployments = config.cachedDeployments || [];
    const item = deployments.find(d => d.id === deploymentId);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Deployment not found' });
    }

    item.status = status;
    item.updatedAt = new Date().toISOString();
    db.saveVercelDeployments(deployments);

    res.json({
      success: true,
      message: `Deployment ${item.name} status updated to ${status}`,
      deployment: item
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

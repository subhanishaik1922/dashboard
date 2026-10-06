const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdminAuth } = require('../auth');

// Explicit dynamic flags to bypass Vercel build-time caching and data freezing
router.dynamic = 'force-dynamic';
router.revalidate = 0;
router.fetchCache = 'force-no-store';

/**
 * GET /api/jobhunt
 * Public: Returns network sync metrics (LinkedIn, Naukri) and job application pipeline
 */
router.get('/', (req, res) => {
  try {
    const jobHunt = db.getJobHuntData();
    res.json({
      success: true,
      linkedin: jobHunt.linkedin || {},
      naukri: jobHunt.naukri || {},
      applications: jobHunt.applications || []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/jobhunt/linkedin
 * Protected: Updates LinkedIn metric tracker
 */
router.put('/linkedin', requireAdminAuth, (req, res) => {
  try {
    const updates = req.body;
    const updated = db.updateLinkedInMetrics(updates);
    res.json({
      success: true,
      message: 'LinkedIn metrics synchronized successfully.',
      linkedin: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/jobhunt/naukri
 * Protected: Updates Naukri metric tracker
 */
router.put('/naukri', requireAdminAuth, (req, res) => {
  try {
    const updates = req.body;
    const updated = db.updateNaukriMetrics(updates);
    res.json({
      success: true,
      message: 'Naukri FastForward metrics synchronized successfully.',
      naukri: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/jobhunt/applications
 * Protected: Add a new job application
 */
router.post('/applications', requireAdminAuth, (req, res) => {
  try {
    const app = db.addApplication(req.body);
    res.json({
      success: true,
      message: `Application for ${app.company} added to pipeline.`,
      application: app
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/jobhunt/applications/:id
 * Protected: Update status or notes of an application
 */
router.patch('/applications/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const updated = db.updateApplication(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    res.json({
      success: true,
      message: 'Application updated.',
      application: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/jobhunt/applications/:id
 * Protected: Delete an application
 */
router.delete('/applications/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const ok = db.deleteApplication(id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    res.json({
      success: true,
      message: 'Application deleted from pipeline.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

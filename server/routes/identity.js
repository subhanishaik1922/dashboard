const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdminAuth } = require('../auth');

// Explicit dynamic flags to bypass Vercel build-time caching and data freezing
router.dynamic = 'force-dynamic';
router.revalidate = 0;
router.fetchCache = 'force-no-store';

/**
 * GET /api/identity
 * Publicly readable: Fetch complete identity, personal details, bios, and resume data
 */
router.get('/', (req, res) => {
  try {
    const identity = db.getIdentity();
    const work_experience = db.getWorkExperience();
    identity.work_experience = work_experience;
    identity.experience = work_experience;
    res.json({ success: true, identity, work_experience });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/identity
 * Protected: Update personal info, bios, resume URLs, skills
 */
router.put('/', requireAdminAuth, (req, res) => {
  try {
    const updates = req.body;
    const updated = db.updateIdentity(updates);
    res.json({
      success: true,
      message: 'Identity and resume details successfully updated.',
      identity: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/identity/experience
 * Publicly readable: Fetch work experience list
 */
router.get('/experience', (req, res) => {
  try {
    const list = db.getWorkExperience();
    res.json({ success: true, work_experience: list, experience: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/identity/experience
 * Protected: Add single or multiple work experience entries cleanly into 'work_experience'
 */
router.post('/experience', requireAdminAuth, (req, res) => {
  try {
    const body = req.body;
    let entries = [];

    if (Array.isArray(body)) {
      entries = body;
    } else if (Array.isArray(body.positions)) {
      entries = body.positions;
    } else if (Array.isArray(body.work_experience)) {
      entries = body.work_experience;
    } else if (Array.isArray(body.experience)) {
      entries = body.experience;
    } else {
      entries = [body];
    }

    const normalized = entries.map(item => ({
      id: item.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      company: item.companyName || item.company || 'Company',
      companyName: item.companyName || item.company || 'Company',
      role: item.jobTitle || item.role || 'Role',
      jobTitle: item.jobTitle || item.role || 'Role',
      period: item.duration || item.period || 'Current',
      duration: item.duration || item.period || 'Current',
      description: item.description || ''
    }));

    const updatedList = db.addWorkExperience(normalized);
    res.json({
      success: true,
      message: `${normalized.length} position(s) added successfully to work_experience.`,
      work_experience: updatedList,
      experience: updatedList
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/identity/experience
 * Protected: Save or update the entire work experience list
 */
router.put('/experience', requireAdminAuth, (req, res) => {
  try {
    const body = req.body;
    const list = Array.isArray(body)
      ? body
      : (Array.isArray(body.work_experience) ? body.work_experience : (Array.isArray(body.experience) ? body.experience : []));

    const updatedList = db.saveWorkExperience(list);
    res.json({
      success: true,
      message: 'Work experience positions persisted successfully.',
      work_experience: updatedList,
      experience: updatedList
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/identity/experience/:id
 * Protected: Remove experience entry from work_experience array
 */
router.delete('/experience/:id', requireAdminAuth, (req, res) => {
  try {
    const updatedList = db.deleteWorkExperience(req.params.id);
    res.json({
      success: true,
      message: 'Experience position removed.',
      work_experience: updatedList,
      experience: updatedList
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/identity/education
 * Protected: Add an education entry
 */
router.post('/education', requireAdminAuth, (req, res) => {
  try {
    const { degree, institution, year } = req.body;
    const identity = db.getIdentity();
    if (!Array.isArray(identity.education)) {
      identity.education = [];
    }
    const newEdu = {
      id: `edu-${Date.now()}`,
      degree: degree || 'Degree',
      institution: institution || 'Institution',
      year: year || '2026'
    };
    identity.education.push(newEdu);
    db.updateIdentity({ education: identity.education });
    res.json({ success: true, education: identity.education });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/identity/education/:id
 * Protected: Delete education entry
 */
router.delete('/education/:id', requireAdminAuth, (req, res) => {
  try {
    const identity = db.getIdentity();
    if (!Array.isArray(identity.education)) {
      return res.status(404).json({ success: false, message: 'Education list empty' });
    }
    identity.education = identity.education.filter(e => e.id !== req.params.id);
    db.updateIdentity({ education: identity.education });
    res.json({ success: true, education: identity.education });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

/**
 * Admin Panel & Multi-Tab Management for Career Command Center
 */
const AdminView = {
  currentData: null,

  init(data) {
    this.currentData = data;
    this.populateTab1Identity(data.identity);
    this.populateTab2CodeHosting(data.github, data.vercel);
    this.populateTab3JobHunt(data.jobHunt);
  },

  /* =========================================================================
     TAB 1: IDENTITY & RESUME POPULATION
     ========================================================================= */
  populateTab1Identity(identity) {
    if (!identity) return;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('adm-fullname', identity.fullName);
    setVal('adm-title', identity.title);
    setVal('adm-email', identity.email);
    setVal('adm-phone', identity.phone);
    setVal('adm-location', identity.location);
    setVal('adm-availability', identity.availability);
    setVal('adm-shortbio', identity.shortBio);
    setVal('adm-longbio', identity.longBio);
    setVal('adm-resumeurl', identity.resumeUrl || '/assets/resume.pdf');
    setVal('adm-skills', Array.isArray(identity.skills) ? identity.skills.join(', ') : '');

    // Social Links inputs in Tab 1 (Strict State Isolation)
    const liUrl = identity.linkedin_url || identity.linkedinUrl || this.currentData?.jobHunt?.linkedin?.profileUrl || '';
    const nkUrl = identity.naukri_url || identity.naukriUrl || this.currentData?.jobHunt?.naukri?.profileUrl || '';
    setVal('adm-social-linkedin', liUrl);
    setVal('adm-social-naukri', nkUrl);

    const liPrev = document.getElementById('adm-social-linkedin-preview');
    if (liPrev && liUrl) liPrev.href = liUrl;
    const nkPrev = document.getElementById('adm-social-naukri-preview');
    if (nkPrev && nkUrl) nkPrev.href = nkUrl;

    const resumePrev = document.getElementById('adm-resume-preview-link');
    if (resumePrev) resumePrev.href = identity.resumeUrl || '/assets/resume.pdf';

    // Render Work Experience List (from root work_experience or identity.experience)
    const expContainer = document.getElementById('adm-experience-list');
    const expList = Array.isArray(identity.work_experience)
      ? identity.work_experience
      : (Array.isArray(identity.experience) ? identity.experience : []);

    if (expContainer) {
      if (expList.length === 0) {
        expContainer.innerHTML = `<div style="color: var(--text-dim); font-size: 0.88rem; padding: 0.5rem 0;">No work experience entries recorded yet. Click 'Add Position' above to insert your first role.</div>`;
      } else {
        expContainer.innerHTML = expList.map(exp => `
          <div class="exp-saved-item" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;">
            <div style="flex: 1;">
              <div style="font-weight: 700; font-size: 0.96rem; color: var(--text-main);">
                ${exp.role || exp.jobTitle || 'Role'} 
                <span style="font-weight: 500; color: var(--primary);">@ ${exp.company || exp.companyName || 'Company'}</span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-dim); font-family: var(--font-mono); margin: 3px 0 6px 0;">
                <i data-lucide="calendar" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>
                ${exp.period || exp.duration || 'Current'}
              </div>
              <div style="font-size: 0.86rem; color: var(--text-muted); line-height: 1.5; white-space: pre-line;">${exp.description || ''}</div>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button type="button" class="btn btn-danger btn-sm" onclick="handleDeleteExperience('${exp.id}')" title="Delete position">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    // Ensure 'Add Position' button click listener is bound
    bindAddPositionButton();
  },

  /* =========================================================================
     TAB 2: CODE & HOSTING (GITHUB + VERCEL API HUB)
     ========================================================================= */
  populateTab2CodeHosting(github, vercel) {
    // Vercel Configuration Status
    const tokenStatusText = document.getElementById('adm-vercel-token-status');
    const connBeaconText = document.getElementById('adm-vercel-conn-text');
    const connBeaconPill = document.getElementById('adm-vercel-conn-status');

    if (vercel?.apiToken) {
      if (tokenStatusText) tokenStatusText.textContent = `Stored Token: ${maskTokenStr(vercel.apiToken)} (Verified)`;
      if (connBeaconText) connBeaconText.textContent = 'Live Token Configured';
      if (connBeaconPill) connBeaconPill.className = 'sync-status-pill';
    } else {
      if (tokenStatusText) tokenStatusText.textContent = 'Stored Token: None configured (using local cache)';
      if (connBeaconText) connBeaconText.textContent = 'Cache Mode (No Token)';
      if (connBeaconPill) connBeaconPill.className = 'sync-status-pill building';
    }

    if (document.getElementById('adm-vercel-teamid') && vercel?.teamId) {
      document.getElementById('adm-vercel-teamid').value = vercel.teamId;
    }

    // Last Synced Badge
    const syncedBadge = document.getElementById('adm-last-synced-badge');
    if (syncedBadge && vercel?.lastSynced) {
      syncedBadge.textContent = `Synced: ${formatTime(vercel.lastSynced)}`;
    }

    // Render GitHub Repositories with Toggles (with duplicate prevention)
    const reposContainer = document.getElementById('adm-repos-list');
    if (reposContainer && github && Array.isArray(github.repositories)) {
      const cleanRepos = [];
      github.repositories.forEach(repo => {
        if (!repo) return;
        const newId = repo.id ? String(repo.id) : null;
        const newNormUrl = (repo.repoUrl || repo.html_url || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
        const newName = (repo.name || '').toLowerCase();

        const idx = cleanRepos.findIndex(existing => {
          if (newId && existing.id && String(existing.id) === newId) return true;
          const exNormUrl = (existing.repoUrl || existing.html_url || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
          if (newNormUrl && exNormUrl && newNormUrl === exNormUrl) return true;
          if (newName && existing.name && existing.name.toLowerCase() === newName) return true;
          return false;
        });

        if (idx !== -1) {
          cleanRepos[idx] = { ...cleanRepos[idx], ...repo };
        } else {
          cleanRepos.push(repo);
        }
      });

      reposContainer.innerHTML = cleanRepos.map(repo => `
        <div class="repo-item">
          <div class="repo-details">
            <div class="repo-title">
              <span>${repo.name}</span>
              ${repo.featured ? '<i data-lucide="star" style="width: 14px; height: 14px; color: #fbbf24; fill: #fbbf24;"></i>' : ''}
            </div>
            <div class="repo-subtitle">
              <span>${repo.language || 'Code'}</span> • 
              <span>Linked Vercel: <code>${repo.vercelProject || repo.name}</code></span>
            </div>
          </div>
          <div class="repo-controls">
            <label style="font-size: 0.78rem; color: var(--text-dim); display: flex; align-items: center; gap: 6px;" title="Show on Public Portfolio">
              <span>Public</span>
              <label class="switch">
                <input type="checkbox" ${repo.visible !== false ? 'checked' : ''} onchange="handleRepoToggle('${repo.id}', 'visible', this.checked)">
                <span class="slider"></span>
              </label>
            </label>
            <label style="font-size: 0.78rem; color: var(--text-dim); display: flex; align-items: center; gap: 6px;" title="Pin as Featured Project">
              <span>Star</span>
              <label class="switch">
                <input type="checkbox" ${repo.featured ? 'checked' : ''} onchange="handleRepoToggle('${repo.id}', 'featured', this.checked)">
                <span class="slider"></span>
              </label>
            </label>
          </div>
        </div>
      `).join('');
    }

    // Render Live Vercel Deployments and Projects Log (with duplicate prevention & array reset)
    const depContainer = document.getElementById('adm-deployments-list');
    const deployments = vercel?.cachedDeployments || [];
    const projects = vercel?.cachedProjects || [];
    
    if (depContainer) {
      if (deployments.length === 0 && projects.length === 0) {
        depContainer.innerHTML = `<div style="color: var(--text-dim); font-size: 0.88rem; padding: 1rem 0;">No active deployments or projects fetched yet. Click 'Re-Fetch Vercel API'.</div>`;
      } else {
        // 1. Completely clear out display array before populating
        const displayItems = [];

        // 2. Helper to upsert: if item with same Vercel ID, deployment URL, or name exists, update instead of adding duplicate row
        const upsertVercelDisplayItem = (item) => {
          if (!item) return;
          const newId = item.id;
          const newNormUrl = (item.url || item.fullUrl || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
          const newName = (item.name || '').toLowerCase();

          const existingIndex = displayItems.findIndex(existing => {
            if (newId && existing.id && existing.id === newId) return true;
            const exNormUrl = (existing.url || existing.fullUrl || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
            if (newNormUrl && exNormUrl && newNormUrl === exNormUrl) return true;
            if (newName && existing.name && existing.name.toLowerCase() === newName) return true;
            return false;
          });

          if (existingIndex !== -1) {
            displayItems[existingIndex] = { ...displayItems[existingIndex], ...item };
          } else {
            displayItems.push(item);
          }
        };

        // Populate deployments first (most recent)
        deployments.forEach(d => upsertVercelDisplayItem(d));

        // Incorporate projects, updating existing entries or appending if unique
        projects.forEach(p => {
          upsertVercelDisplayItem({
            id: p.id,
            name: p.name,
            url: p.url,
            fullUrl: p.fullUrl,
            status: p.status || 'Ready',
            branch: 'production',
            commit: `Vercel Project (${p.framework || 'Web App'})`,
            commitHash: 'v10',
            createdAt: p.updatedAt,
            isProjectItem: true
          });
        });

        depContainer.innerHTML = displayItems.map(dep => {
          const statusClass = (dep.status || 'ready').toLowerCase();
          const liveUrl = dep.fullUrl || (dep.url ? `https://${dep.url}` : '');
          const domainLabel = dep.url || (dep.fullUrl ? dep.fullUrl.replace(/^https?:\/\//, '') : 'Active Deployment');
          return `
            <div class="deployment-item">
              <div class="deployment-header">
                <span class="deployment-name">
                  ${dep.name}
                  ${dep.isProjectItem ? '<span class="tech-tag" style="font-size: 0.7rem; margin-left: 6px;">Project</span>' : ''}
                </span>
                <span class="deploy-status-pill ${statusClass}">
                  <span class="pulse-dot"></span>
                  <span>${dep.status}</span>
                </span>
              </div>
              <div class="deployment-details">
                <div>
                  <i data-lucide="globe" style="width: 12px; height: 12px; display: inline-block;"></i>
                  ${liveUrl ? `<a href="${liveUrl}" target="_blank" rel="noopener noreferrer" class="deployment-link">${domainLabel}</a>` : `<span class="deployment-link">${domainLabel}</span>`}
                </div>
                <div>
                  <i data-lucide="git-commit" style="width: 12px; height: 12px; display: inline-block;"></i>
                  <span>${dep.branch || 'main'}: ${dep.commit || 'Commit message'} (${dep.commitHash || 'sha'})</span>
                </div>
                <div style="font-size: 0.74rem; color: var(--text-dim); font-family: var(--font-mono);">
                  Created: ${formatTime(dep.createdAt)}
                </div>
              </div>
              <!-- Test Simulation Controls -->
              <div class="simulate-btn-group">
                <span style="font-size: 0.72rem; color: var(--text-dim); align-self: center; margin-right: 4px;">Simulate:</span>
                <button class="btn btn-secondary btn-sm" style="padding: 2px 7px; font-size: 0.72rem;" onclick="simulateVercelState('${dep.id}', 'Ready')">Ready</button>
                <button class="btn btn-secondary btn-sm" style="padding: 2px 7px; font-size: 0.72rem;" onclick="simulateVercelState('${dep.id}', 'Building')">Building</button>
                <button class="btn btn-secondary btn-sm" style="padding: 2px 7px; font-size: 0.72rem;" onclick="simulateVercelState('${dep.id}', 'Error')">Error</button>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  },

  /* =========================================================================
     TAB 3: JOB HUNTING (LINKEDIN & NAUKRI METRIC TRACKERS)
     ========================================================================= */
  populateTab3JobHunt(jobHunt) {
    if (!jobHunt) return;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val ?? 0;
    };

    // LinkedIn Form Population
    const li = jobHunt.linkedin || {};
    const liUrlInput = document.getElementById('adm-linkedin-url');
    if (liUrlInput) liUrlInput.value = li.profileUrl || '';
    const liHeadline = document.getElementById('adm-linkedin-headline');
    if (liHeadline) liHeadline.value = li.headline || '';

    setVal('adm-linkedin-views', li.profileViews || 0);
    setVal('adm-linkedin-searches', li.searchAppearances || 0);
    setVal('adm-linkedin-apps', li.applicationsCount || 0);
    setVal('adm-linkedin-inmails', li.inmailMessages || 0);

    const liPreviewLink = document.getElementById('adm-linkedin-preview-link');
    if (liPreviewLink && li.profileUrl) liPreviewLink.href = li.profileUrl;

    // Naukri Form Population
    const nk = jobHunt.naukri || {};
    const nkUrlInput = document.getElementById('adm-naukri-url');
    if (nkUrlInput) nkUrlInput.value = nk.profileUrl || '';
    const nkHeadline = document.getElementById('adm-naukri-headline');
    if (nkHeadline) nkHeadline.value = nk.headline || '';

    setVal('adm-naukri-views', nk.profileViews || 0);
    setVal('adm-naukri-searches', nk.searchAppearances || 0);
    setVal('adm-naukri-apps', nk.applicationsCount || 0);
    setVal('adm-naukri-actions', nk.recruiterActions || 0);

    const nkPreviewLink = document.getElementById('adm-naukri-preview-link');
    if (nkPreviewLink && nk.profileUrl) nkPreviewLink.href = nk.profileUrl;

    // KPI Aggregation
    const totalViews = (li.profileViews || 0) + (nk.profileViews || 0);
    const totalSearches = (li.searchAppearances || 0) + (nk.searchAppearances || 0);
    const totalApps = (li.applicationsCount || 0) + (nk.applicationsCount || 0);
    const totalInquiries = (li.inmailMessages || 0) + (nk.recruiterActions || 0);

    const setKpi = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setKpi('kpi-total-views', totalViews.toLocaleString());
    setKpi('kpi-total-searches', totalSearches.toLocaleString());
    setKpi('kpi-total-apps', totalApps.toLocaleString());
    setKpi('kpi-total-inquiries', totalInquiries.toLocaleString());

    // Job Application Pipeline Table
    const tbody = document.getElementById('adm-applications-tbody');
    const apps = jobHunt.applications || [];
    if (tbody) {
      if (apps.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">No active applications logged. Click 'Log Application' above.</td></tr>`;
      } else {
        tbody.innerHTML = apps.map(app => {
          const statusLower = (app.status || 'applied').toLowerCase().replace(' ', '-');
          return `
            <tr>
              <td style="font-weight: 700;">${app.company}</td>
              <td>${app.role}</td>
              <td>
                <span class="tech-tag" style="background: ${app.source === 'LinkedIn' ? 'rgba(0,119,181,0.2)' : (app.source === 'Naukri' ? 'rgba(255,117,85,0.2)' : 'var(--bg-secondary)')}">
                  ${app.source}
                </span>
              </td>
              <td style="font-family: var(--font-mono); font-size: 0.82rem;">${app.appliedDate || 'Recent'}</td>
              <td>
                <select class="form-select" style="padding: 2px 6px; font-size: 0.8rem; width: auto;" onchange="handleAppStatusChange('${app.id}', this.value)">
                  <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
                  <option value="Under Review" ${app.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                  <option value="Interviewing" ${app.status === 'Interviewing' ? 'selected' : ''}>Interviewing</option>
                  <option value="Offered" ${app.status === 'Offered' ? 'selected' : ''}>Offered</option>
                  <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                </select>
              </td>
              <td style="font-size: 0.84rem; color: var(--text-muted); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${app.notes || ''}">
                ${app.notes || '—'}
              </td>
              <td>
                <button class="btn btn-danger btn-sm" onclick="handleDeleteApp('${app.id}')" title="Delete application">
                  <i data-lucide="trash" style="width: 13px; height: 13px;"></i>
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  }
};

/* =========================================================================
   Event Handlers & User Actions
   ========================================================================= */

// Step Metric function (+5 / -5 / +1 / -1)
function stepMetric(inputId, delta) {
  const el = document.getElementById(inputId);
  if (el) {
    const current = parseInt(el.value || '0', 10);
    const updated = Math.max(0, current + delta);
    el.value = updated;
  }
}

// Tab 1 Identity Submit
async function handleIdentitySubmit(e) {
  e.preventDefault();
  try {
    const skillsArr = (document.getElementById('adm-skills').value || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const updates = {
      fullName: document.getElementById('adm-fullname').value,
      title: document.getElementById('adm-title').value,
      email: document.getElementById('adm-email').value,
      phone: document.getElementById('adm-phone').value,
      location: document.getElementById('adm-location').value,
      availability: document.getElementById('adm-availability').value,
      shortBio: document.getElementById('adm-shortbio').value,
      longBio: document.getElementById('adm-longbio').value,
      resumeUrl: document.getElementById('adm-resumeurl')?.value || '/assets/resume.pdf',
      linkedinUrl: document.getElementById('adm-social-linkedin')?.value || '',
      naukriUrl: document.getElementById('adm-social-naukri')?.value || '',
      skills: skillsArr
    };

    const res = await API.updateIdentity(updates);
    showToast('Identity & resume settings persisted successfully!', 'success');
    
    // Update local state and re-render public view
    PublicView.renderIdentity(res.identity);
    if (window.App && typeof window.App.loadData === 'function') {
      await window.App.loadData(true);
    }
  } catch (err) {
    showToast(`Error updating identity: ${err.message}`, 'error');
  }
}

// Resume File Selection Handler
function handleResumeFileSelected(e) {
  const fileInput = e.target;
  const fileInfo = document.getElementById('adm-resume-file-info');
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    if (fileInfo) {
      fileInfo.textContent = `Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`;
      fileInfo.style.color = 'var(--accent)';
    }
  }
}

// Resume PDF Upload & Replace Engine
async function handleResumeUpload() {
  const fileInput = document.getElementById('adm-resume-file');
  const uploadBtn = document.getElementById('adm-resume-upload-btn');
  const fileInfo = document.getElementById('adm-resume-file-info');

  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    showToast('Please select a PDF file first.', 'warning');
    return;
  }

  const file = fileInput.files[0];
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    showToast('Only PDF documents are allowed.', 'error');
    return;
  }

  try {
    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.innerHTML = `<i data-lucide="loader" class="spin" style="width: 16px; height: 16px;"></i> Uploading...`;
    }

    const res = await API.uploadResume(file);
    showToast(res.message || 'Resume uploaded and replaced successfully!', 'success');

    // Update active static path input and preview link
    const pathInput = document.getElementById('adm-resumeurl');
    if (pathInput) pathInput.value = res.resumeUrl || '/assets/resume.pdf';

    const prevLink = document.getElementById('adm-resume-preview-link');
    if (prevLink) prevLink.href = (res.resumeUrl || '/assets/resume.pdf') + '?t=' + Date.now();

    if (fileInfo) {
      fileInfo.textContent = `Uploaded: resume.pdf (${Math.round(file.size / 1024)} KB) • Active`;
      fileInfo.style.color = 'var(--success)';
    }

    // Refresh public view identity and resume download link
    const resumeBtn = document.getElementById('pub-badge-resume');
    if (resumeBtn) {
      resumeBtn.href = '/assets/resume.pdf?t=' + Date.now();
    }

    // Reload app data in background to ensure all components have fresh state
    if (window.App && typeof window.App.loadData === 'function') {
      await window.App.loadData(true);
    }
  } catch (err) {
    showToast(`Resume upload failed: ${err.message}`, 'error');
    if (fileInfo) {
      fileInfo.textContent = `Error: ${err.message}`;
      fileInfo.style.color = '#ef4444';
    }
  } finally {
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = `<i data-lucide="upload-cloud" style="width: 16px; height: 16px;"></i> Upload & Replace Resume`;
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

// Active Social Links Save Handler (from Tab 1)
async function handleSaveSocialLinks() {
  const linkedinInput = document.getElementById('adm-social-linkedin');
  const naukriInput = document.getElementById('adm-social-naukri');

  const linkedinUrl = linkedinInput ? linkedinInput.value.trim() : '';
  const naukriUrl = naukriInput ? naukriInput.value.trim() : '';

  if (!linkedinUrl && !naukriUrl) {
    showToast('Please enter at least one profile URL.', 'warning');
    return;
  }

  try {
    const res = await API.updateSocialLinks({
      linkedin_url: linkedinUrl,
      naukri_url: naukriUrl,
      linkedinUrl,
      naukriUrl
    });
    showToast('Social profile links saved and persisted to data.json with Absolute Variable Protection!', 'success');

    // Update Tab 1 preview links
    const liPrev = document.getElementById('adm-social-linkedin-preview');
    const returnedLi = res.linkedin_url || res.linkedinUrl;
    if (liPrev && returnedLi) liPrev.href = returnedLi;
    const nkPrev = document.getElementById('adm-social-naukri-preview');
    const returnedNk = res.naukri_url || res.naukriUrl;
    if (nkPrev && returnedNk) nkPrev.href = returnedNk;

    // Update Tab 3 inputs so they stay mirrored
    const tab3Li = document.getElementById('adm-linkedin-url');
    if (tab3Li && returnedLi) tab3Li.value = returnedLi;
    const tab3Nk = document.getElementById('adm-naukri-url');
    if (tab3Nk && returnedNk) tab3Nk.value = returnedNk;

    // Refresh public view badges
    if (window.App && typeof window.App.loadData === 'function') {
      await window.App.loadData(true);
    }
  } catch (err) {
    showToast(`Failed to save social links: ${err.message}`, 'error');
  }
}

// Tab 2 Vercel Token Save
async function handleVercelTokenSave(e) {
  e.preventDefault();
  try {
    const token = document.getElementById('adm-vercel-token').value;
    const teamId = document.getElementById('adm-vercel-teamid').value;

    const res = await API.saveVercelToken(token, teamId, false);
    showToast(res.message || 'Vercel configuration updated!', 'success');
    
    // Re-fetch all data to refresh deployments
    await App.loadData();
  } catch (err) {
    showToast(`Failed to update Vercel token: ${err.message}`, 'error');
  }
}

// Tab 2 Repo Visibility / Star Toggle
async function handleRepoToggle(repoId, field, checked) {
  try {
    await API.toggleRepo(repoId, { [field]: checked });
    showToast(`Repository ${field} status updated.`, 'info');
    await App.loadData();
  } catch (err) {
    showToast(`Failed to update repository: ${err.message}`, 'error');
  }
}

// Tab 2 Simulate Status (Ready -> Building -> Error)
async function simulateVercelState(deploymentId, status) {
  try {
    await API.simulateVercelStatus(deploymentId, status);
    showToast(`Simulated ${status} status for deployment.`, 'info');
    await App.loadData();
  } catch (err) {
    showToast(`Simulation error: ${err.message}`, 'error');
  }
}

// Tab 3 LinkedIn Submit
async function handleLinkedInSubmit(e) {
  e.preventDefault();
  try {
    const metrics = {
      profileUrl: document.getElementById('adm-linkedin-url').value,
      headline: document.getElementById('adm-linkedin-headline').value,
      profileViews: parseInt(document.getElementById('adm-linkedin-views').value, 10),
      searchAppearances: parseInt(document.getElementById('adm-linkedin-searches').value, 10),
      applicationsCount: parseInt(document.getElementById('adm-linkedin-apps').value, 10),
      inmailMessages: parseInt(document.getElementById('adm-linkedin-inmails').value, 10)
    };

    await API.updateLinkedIn(metrics);
    showToast('LinkedIn metrics synchronized & persisted!', 'success');
    await App.loadData();
  } catch (err) {
    showToast(`Failed to save LinkedIn metrics: ${err.message}`, 'error');
  }
}

// Tab 3 Naukri Submit
async function handleNaukriSubmit(e) {
  e.preventDefault();
  try {
    const metrics = {
      profileUrl: document.getElementById('adm-naukri-url').value,
      headline: document.getElementById('adm-naukri-headline').value,
      profileViews: parseInt(document.getElementById('adm-naukri-views').value, 10),
      searchAppearances: parseInt(document.getElementById('adm-naukri-searches').value, 10),
      applicationsCount: parseInt(document.getElementById('adm-naukri-apps').value, 10),
      recruiterActions: parseInt(document.getElementById('adm-naukri-actions').value, 10)
    };

    await API.updateNaukri(metrics);
    showToast('Naukri FastForward metrics synchronized & persisted!', 'success');
    await App.loadData();
  } catch (err) {
    showToast(`Failed to save Naukri metrics: ${err.message}`, 'error');
  }
}

// Tab 3 Application Status Change
async function handleAppStatusChange(appId, newStatus) {
  try {
    await API.updateApplication(appId, { status: newStatus });
    showToast(`Application status updated to ${newStatus}.`, 'info');
  } catch (err) {
    showToast(`Failed to update application: ${err.message}`, 'error');
  }
}

// Tab 3 Delete Application
async function handleDeleteApp(appId) {
  if (!confirm('Are you sure you want to remove this application from the pipeline?')) return;
  try {
    await API.deleteApplication(appId);
    showToast('Application deleted.', 'info');
    await App.loadData();
  } catch (err) {
    showToast(`Error deleting application: ${err.message}`, 'error');
  }
}

/* =========================================================================
   Tab 1: Work Experience Dynamic Form Engine & Event Handlers
   ========================================================================= */

// Ensure 'Add Position' button with id 'btn-add-position' or class 'btn-add-position' matches click listener
function bindAddPositionButton() {
  const addBtn = document.getElementById('btn-add-position') || document.querySelector('.btn-add-position');
  if (addBtn) {
    addBtn.onclick = handleAddPositionRow;
  }
}

// 1. Dynamic Row Injection Engine
function handleAddPositionRow() {
  const wrapper = document.getElementById('adm-experience-form-wrapper');
  if (!wrapper) {
    console.error('Work experience form wrapper (#adm-experience-form-wrapper) not found in DOM.');
    return;
  }

  const rowId = 'exp-row-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

  const rowCard = document.createElement('div');
  rowCard.className = 'admin-card exp-input-row';
  rowCard.id = rowId;
  rowCard.style.cssText = 'border: 1px solid var(--primary); background: var(--bg-card); padding: 1.25rem; border-radius: var(--radius-md); box-shadow: 0 4px 16px rgba(0,0,0,0.2); margin-bottom: 0.75rem;';

  rowCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.6rem;">
      <span style="font-weight: 700; font-size: 0.95rem; color: var(--primary); display: flex; align-items: center; gap: 6px;">
        <i data-lucide="briefcase" style="width: 16px; height: 16px;"></i> New Position Entry
      </span>
      <button type="button" class="btn btn-secondary btn-sm" onclick="handleRemovePositionRow('${rowId}')" title="Discard this row">
        <i data-lucide="x" style="width: 14px; height: 14px;"></i> Discard
      </button>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
      <div class="form-group" style="margin-bottom: 0;">
        <label for="adm-exp-company-${rowId}" style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; display: block;">Company Name *</label>
        <input type="text" id="adm-exp-company-${rowId}" class="form-input exp-company-input" placeholder="e.g. Acme Corp / Google" required>
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label for="adm-exp-role-${rowId}" style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; display: block;">Job Title *</label>
        <input type="text" id="adm-exp-role-${rowId}" class="form-input exp-role-input" placeholder="e.g. Senior DevOps / Cloud Architect" required>
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label for="adm-exp-duration-${rowId}" style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; display: block;">Duration *</label>
        <input type="text" id="adm-exp-duration-${rowId}" class="form-input exp-duration-input" placeholder="e.g. 2022 - Present / Jan 2021 - Dec 2023" required>
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 1rem;">
      <label for="adm-exp-desc-${rowId}" style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; display: block;">Description *</label>
      <textarea id="adm-exp-desc-${rowId}" class="form-input exp-desc-input" rows="3" placeholder="Key responsibilities, architectural systems built, and business impact..." required></textarea>
    </div>

    <div style="display: flex; justify-content: flex-end; align-items: center; gap: 0.75rem;">
      <button type="button" class="btn btn-secondary btn-sm" onclick="handleRemovePositionRow('${rowId}')">
        Cancel
      </button>
      <button type="button" id="btn-save-${rowId}" class="btn btn-primary btn-sm btn-save-position" onclick="handleSavePositionRow('${rowId}')">
        <i data-lucide="check" style="width: 14px; height: 14px;"></i> Save Position
      </button>
    </div>
  `;

  wrapper.appendChild(rowCard);

  if (window.lucide) {
    window.lucide.createIcons();
  }

  updateBatchControls();

  const companyInput = document.getElementById(`adm-exp-company-${rowId}`);
  if (companyInput) companyInput.focus();
}

// 2. Discard/Remove a specific dynamically injected row
function handleRemovePositionRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) {
    row.remove();
    updateBatchControls();
  }
}

// 3. Batch controls helper: if 2+ unsaved rows exist, offer a "Save All Positions" bar
function updateBatchControls() {
  const wrapper = document.getElementById('adm-experience-form-wrapper');
  if (!wrapper) return;

  const rows = wrapper.querySelectorAll('.exp-input-row');
  let batchBar = document.getElementById('adm-exp-batch-bar');

  if (rows.length >= 2) {
    if (!batchBar) {
      batchBar = document.createElement('div');
      batchBar.id = 'adm-exp-batch-bar';
      batchBar.style.cssText = 'background: rgba(59, 130, 246, 0.1); border: 1px solid var(--primary); border-radius: var(--radius-sm); padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;';
      wrapper.prepend(batchBar);
    }
    batchBar.innerHTML = `
      <span style="font-size: 0.86rem; color: var(--primary); font-weight: 600;">
        <i data-lucide="layers" style="width: 15px; height: 15px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>
        ${rows.length} new positions pending
      </span>
      <div style="display: flex; gap: 0.5rem;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="handleClearAllPositionRows()">Discard All</button>
        <button type="button" class="btn btn-primary btn-sm" onclick="handleSaveAllPositionRows()">
          <i data-lucide="check-check" style="width: 14px; height: 14px;"></i> Save All (${rows.length})
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  } else if (batchBar) {
    batchBar.remove();
  }
}

function handleClearAllPositionRows() {
  const wrapper = document.getElementById('adm-experience-form-wrapper');
  if (wrapper) {
    wrapper.innerHTML = '';
  }
}

// 4. Save an individual position row into 'work_experience' array
async function handleSavePositionRow(rowId) {
  const compEl = document.getElementById(`adm-exp-company-${rowId}`);
  const roleEl = document.getElementById(`adm-exp-role-${rowId}`);
  const durEl = document.getElementById(`adm-exp-duration-${rowId}`);
  const descEl = document.getElementById(`adm-exp-desc-${rowId}`);
  const saveBtn = document.getElementById(`btn-save-${rowId}`);

  const company = (compEl?.value || '').trim();
  const role = (roleEl?.value || '').trim();
  const period = (durEl?.value || '').trim();
  const description = (descEl?.value || '').trim();

  if (!company) {
    showToast('Company Name is required.', 'warning');
    if (compEl) compEl.focus();
    return;
  }
  if (!role) {
    showToast('Job Title / Role is required.', 'warning');
    if (roleEl) roleEl.focus();
    return;
  }

  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i data-lucide="loader" class="spin" style="width: 14px; height: 14px;"></i> Saving...`;
    }

    const payload = {
      company,
      companyName: company,
      role,
      jobTitle: role,
      period: period || 'Current',
      duration: period || 'Current',
      description
    };

    await API.addExperience(payload);
    showToast(`Position at "${company}" saved to work_experience!`, 'success');

    handleRemovePositionRow(rowId);

    if (window.App && typeof window.App.loadData === 'function') {
      await window.App.loadData(true);
    }
  } catch (err) {
    showToast(`Failed to save position: ${err.message}`, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i data-lucide="check" style="width: 14px; height: 14px;"></i> Save Position`;
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

// 5. Batch Save: push multiple positions at once into 'work_experience'
async function handleSaveAllPositionRows() {
  const wrapper = document.getElementById('adm-experience-form-wrapper');
  if (!wrapper) return;

  const rows = wrapper.querySelectorAll('.exp-input-row');
  if (rows.length === 0) return;

  const positions = [];
  for (const r of rows) {
    const id = r.id;
    const compEl = document.getElementById(`adm-exp-company-${id}`);
    const roleEl = document.getElementById(`adm-exp-role-${id}`);
    const durEl = document.getElementById(`adm-exp-duration-${id}`);
    const descEl = document.getElementById(`adm-exp-desc-${id}`);

    const company = (compEl?.value || '').trim();
    const role = (roleEl?.value || '').trim();
    const period = (durEl?.value || '').trim();
    const description = (descEl?.value || '').trim();

    if (!company || !role) {
      showToast('Please fill in Company Name and Job Title for all positions.', 'warning');
      if (!company && compEl) compEl.focus();
      else if (!role && roleEl) roleEl.focus();
      return;
    }

    positions.push({
      company,
      companyName: company,
      role,
      jobTitle: role,
      period: period || 'Current',
      duration: period || 'Current',
      description
    });
  }

  try {
    await API.addExperience(positions);
    showToast(`All ${positions.length} positions cleanly pushed into work_experience!`, 'success');
    wrapper.innerHTML = '';
    if (window.App && typeof window.App.loadData === 'function') {
      await window.App.loadData(true);
    }
  } catch (err) {
    showToast(`Batch save failed: ${err.message}`, 'error');
  }
}

// 6. Delete Experience Position
async function handleDeleteExperience(expId) {
  if (!confirm('Are you sure you want to remove this work experience position?')) return;
  try {
    await API.deleteExperience(expId);
    showToast('Experience position removed from work_experience.', 'info');
    if (window.App && typeof window.App.loadData === 'function') {
      await window.App.loadData(true);
    }
  } catch (err) {
    showToast(`Error deleting experience: ${err.message}`, 'error');
  }
}

// Global window exposure & DOM ready initialization
window.handleAddPositionRow = handleAddPositionRow;
window.handleRemovePositionRow = handleRemovePositionRow;
window.handleSavePositionRow = handleSavePositionRow;
window.handleSaveAllPositionRows = handleSaveAllPositionRows;
window.handleClearAllPositionRows = handleClearAllPositionRows;
window.handleDeleteExperience = handleDeleteExperience;
window.bindAddPositionButton = bindAddPositionButton;

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAddPositionButton);
  } else {
    bindAddPositionButton();
  }
}

// Modals
function showAddApplicationModal() {
  const modal = document.getElementById('modal-add-app');
  if (modal) modal.showModal();
}

function showAddRepoModal() {
  const modal = document.getElementById('modal-add-repo');
  if (modal) modal.showModal();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.close();
}

async function handleAddApplicationSubmit(e) {
  e.preventDefault();
  try {
    const payload = {
      company: document.getElementById('modal-app-company').value,
      role: document.getElementById('modal-app-role').value,
      source: document.getElementById('modal-app-source').value,
      status: document.getElementById('modal-app-status').value,
      notes: document.getElementById('modal-app-notes').value
    };

    await API.addApplication(payload);
    closeModal('modal-add-app');
    e.target.reset();
    showToast(`Added application for ${payload.company}`, 'success');
    await App.loadData();
  } catch (err) {
    showToast(`Error adding application: ${err.message}`, 'error');
  }
}

async function handleAddRepoSubmit(e) {
  e.preventDefault();
  try {
    const payload = {
      name: document.getElementById('modal-repo-name').value,
      description: document.getElementById('modal-repo-desc').value,
      language: document.getElementById('modal-repo-lang').value,
      vercelProject: document.getElementById('modal-repo-vercel').value
    };

    await API.addRepo(payload);
    closeModal('modal-add-repo');
    e.target.reset();
    showToast(`Added repository ${payload.name}`, 'success');
    await App.loadData();
  } catch (err) {
    showToast(`Error adding repo: ${err.message}`, 'error');
  }
}

function maskTokenStr(token) {
  if (!token) return 'None';
  if (token.length <= 8) return '****';
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

function formatTime(isoStr) {
  if (!isoStr) return 'Just now';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + d.toLocaleDateString() + ')';
  } catch (e) {
    return isoStr;
  }
}

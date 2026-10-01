/**
 * Public View Renderer for Career Command Center
 */
const PublicView = {
  renderIdentity(identity) {
    if (!identity) return;

    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text || '';
    };

    setText('pub-fullname', identity.fullName);
    setText('pub-title', identity.title);
    setText('pub-location', identity.location);
    setText('pub-email', identity.email);
    setText('pub-shortbio', identity.shortBio);

    const availText = document.getElementById('pub-availability-text');
    if (availText) {
      availText.textContent = identity.availability || 'Available';
    }

    // Resume link: strictly prioritize local /assets/resume.pdf
    const resumeBtn = document.getElementById('pub-badge-resume');
    if (resumeBtn) {
      const resumeUrl = identity.resumeUrl || '/assets/resume.pdf';
      resumeBtn.setAttribute('href', resumeUrl);
      resumeBtn.setAttribute('target', '_blank');
      resumeBtn.setAttribute('rel', 'noopener noreferrer');
      resumeBtn.setAttribute('download', 'resume.pdf');
    }

    // Skills cloud
    const skillsContainer = document.getElementById('pub-skills-cloud');
    if (skillsContainer && Array.isArray(identity.skills)) {
      skillsContainer.innerHTML = identity.skills
        .map(skill => `<span class="tech-tag" style="padding: 5px 12px; font-weight: 500;">${skill}</span>`)
        .join('');
    }

    // Experience list
    const expContainer = document.getElementById('pub-experience-list');
    const expList = Array.isArray(identity.work_experience)
      ? identity.work_experience
      : (Array.isArray(identity.experience) ? identity.experience : []);

    if (expContainer) {
      if (expList.length === 0) {
        expContainer.innerHTML = `<div style="color: var(--text-dim); font-size: 0.88rem;">No positions listed.</div>`;
      } else {
        expContainer.innerHTML = expList
          .map(exp => `
            <div style="border-left: 2px solid var(--border-color); padding-left: 1rem; position: relative;">
              <div style="position: absolute; left: -5px; top: 4px; width: 8px; height: 8px; border-radius: 50%; background: var(--primary);"></div>
              <div style="font-weight: 700; font-size: 0.98rem; color: var(--text-main);">${exp.role || exp.jobTitle || 'Role'} <span style="font-weight: 400; color: var(--primary);">@ ${exp.company || exp.companyName || 'Company'}</span></div>
              <div style="font-size: 0.78rem; color: var(--text-dim); font-family: var(--font-mono); margin-bottom: 0.35rem;">${exp.period || exp.duration || 'Current'}</div>
              <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; white-space: pre-line;">${exp.description || ''}</p>
            </div>
          `)
          .join('');
      }
    }
  },

  renderNetworkBadges(jobHunt, github, identity) {
    // LinkedIn Action Badge (reads dynamically from data.json)
    const liBadge = document.getElementById('pub-badge-linkedin');
    const liMetric = document.getElementById('pub-linkedin-badge-metric');
    const liUrl = identity?.linkedin_url || identity?.linkedinUrl || jobHunt?.linkedin?.profileUrl || '';
    if (liBadge && liUrl) {
      liBadge.href = liUrl;
      liBadge.target = '_blank';
      liBadge.rel = 'noopener noreferrer';
    }
    if (liMetric && jobHunt?.linkedin) {
      const views = jobHunt.linkedin.profileViews || 0;
      const apps = jobHunt.linkedin.applicationsCount || 0;
      liMetric.textContent = `${views}+ Views • ${apps} In-Flight`;
    }

    // Naukri FastForward Action Badge (reads dynamically from data.json)
    const nkBadge = document.getElementById('pub-badge-naukri');
    const nkMetric = document.getElementById('pub-naukri-badge-metric');
    const nkUrl = identity?.naukri_url || identity?.naukriUrl || jobHunt?.naukri?.profileUrl || '';
    if (nkBadge && nkUrl) {
      nkBadge.href = nkUrl;
      nkBadge.target = '_blank';
      nkBadge.rel = 'noopener noreferrer';
    }
    if (nkMetric && jobHunt?.naukri) {
      const views = jobHunt.naukri.profileViews || 0;
      const searches = jobHunt.naukri.searchAppearances || 0;
      nkMetric.textContent = `FastForward Verified • ${views} Views • ${searches} Matches`;
    }

    // GitHub Action Badge
    const ghBadge = document.getElementById('pub-badge-github');
    const ghMetric = document.getElementById('pub-github-badge-metric');
    if (ghBadge && github) {
      if (github.profileUrl) ghBadge.href = github.profileUrl;
      if (ghMetric && Array.isArray(github.repositories)) {
        const totalStars = github.repositories.reduce((acc, r) => acc + (r.stars || 0), 0);
        ghMetric.textContent = `${github.repositories.length} Repositories • ${totalStars} ★`;
      }
    }
  },

  async loadAndRenderProjects() {
    try {
      const res = await API.getProjects();
      const projects = Array.isArray(res) ? res : (res.projects || []);
      this.renderPortfolioCards(projects);
      return projects;
    } catch (err) {
      console.warn('[PublicView] Failed to load projects from /api/projects:', err.message);
    }
  },

  renderPortfolioCards(projectsInput, vercelDeployments = [], vercelProjects = []) {
    const container = document.getElementById('portfolio-cards-container');
    if (!container) return;

    // Fast lookup maps for linked Vercel deployments and projects
    const deploymentMap = new Map();
    (vercelDeployments || []).forEach(dep => {
      if (dep && dep.name) deploymentMap.set(dep.name.toLowerCase(), dep);
    });

    const projectMap = new Map();
    (vercelProjects || []).forEach(prj => {
      if (prj && prj.name) projectMap.set(prj.name.toLowerCase(), prj);
    });

    // Clean array for display
    const displayProjects = [];
    const norm = (url) => (!url || typeof url !== 'string' ? '' : url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, ''));

    const rawList = Array.isArray(projectsInput) ? projectsInput : [];

    rawList.forEach(item => {
      if (!item) return;
      if (item.visible === false) return;

      const itemName = (item.name || '').trim();
      const itemId = item.id ? String(item.id) : itemName;

      // STRICT URL MAPPING: Ensure exact GitHub repository URL from data.json
      const githubUrl = item.html_url || item.repoUrl || (item.owner?.login ? `https://github.com/${item.owner.login}/${itemName}` : `https://github.com/subhanishaik1922/${itemName}`);

      // Check linked Vercel deployment/project
      const linkedKey = (item.vercelProject || itemName).toLowerCase();
      const dep = deploymentMap.get(linkedKey) || deploymentMap.get(itemName.toLowerCase()) || null;
      const prj = projectMap.get(linkedKey) || projectMap.get(itemName.toLowerCase()) || null;

      // Genuine live deployment URL (never a mock or placeholder domain)
      const liveUrl = item.liveUrl || dep?.fullUrl || prj?.fullUrl || (dep?.url ? `https://${dep.url}` : (prj?.url ? `https://${prj.url}` : null));
      const displayDomain = item.domain || dep?.url || prj?.url || (liveUrl ? liveUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '') : null);

      const status = item.status || dep?.status || prj?.status || (liveUrl ? 'Ready' : 'Ready');
      const branchName = item.branch || dep?.branch || null;
      const commitMsg = item.commit || dep?.commit || null;

      const projectCard = {
        id: itemId,
        name: itemName,
        description: item.description || 'Full-stack software engineering project with CI/CD automation.',
        language: item.language || 'Full-Stack',
        stars: typeof item.stars === 'number' ? item.stars : 0,
        forks: typeof item.forks === 'number' ? item.forks : 0,
        featured: Boolean(item.featured),
        githubUrl: githubUrl,
        liveUrl: liveUrl,
        displayDomain: displayDomain,
        status: status,
        branch: branchName,
        commit: commitMsg
      };

      const existingIdx = displayProjects.findIndex(existing => {
        if (existing.id && projectCard.id && existing.id === projectCard.id) return true;
        if (existing.name.toLowerCase() === projectCard.name.toLowerCase()) return true;
        return false;
      });

      if (existingIdx !== -1) {
        displayProjects[existingIdx] = { ...displayProjects[existingIdx], ...projectCard };
      } else {
        displayProjects.push(projectCard);
      }
    });

    displayProjects.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    if (displayProjects.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; color: var(--text-dim); background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <i data-lucide="folder-git-2" style="width: 32px; height: 32px; margin-bottom: 0.75rem; color: var(--text-dim);"></i>
          <p style="font-size: 0.95rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;">No public repositories visible</p>
          <p style="font-size: 0.85rem;">Toggle project visibility in the Admin CMS to showcase repositories here.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = displayProjects.map(proj => {
      const statusClass = (proj.status || 'ready').toLowerCase();

      return `
        <div class="portfolio-card">
          <div>
            <div class="card-top">
              <a href="${proj.githubUrl}" target="_blank" rel="noopener noreferrer" class="project-title" title="Open ${proj.name} repository on GitHub">
                ${proj.featured ? '<i data-lucide="star" style="width: 16px; height: 16px; color: #fbbf24; fill: #fbbf24;"></i>' : ''}
                <span>${proj.name}</span>
              </a>
              <span class="deploy-status-pill ${statusClass}" title="Deployment Status: ${proj.status}">
                <span class="pulse-dot"></span>
                <span>${proj.status}</span>
              </span>
            </div>

            <p class="card-desc">${proj.description}</p>

            ${proj.liveUrl ? `
              <div style="margin-bottom: 0.85rem;">
                <a href="${proj.liveUrl}" target="_blank" rel="noopener noreferrer" class="domain-link" title="Open live production deployment on Vercel">
                  <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
                  <span>${proj.displayDomain}</span>
                </a>
              </div>
            ` : `
              <div style="margin-bottom: 0.85rem; font-size: 0.82rem; color: var(--text-dim); display: flex; align-items: center; gap: 6px;">
                <i data-lucide="git-branch" style="width: 13px; height: 13px;"></i>
                <span>Source Repository (Direct GitHub Codebase)</span>
              </div>
            `}
          </div>

          <div>
            ${proj.branch || proj.commit ? `
              <div style="font-size: 0.78rem; color: var(--text-dim); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 8px;">
                ${proj.branch ? `
                  <span style="font-family: var(--font-mono); background: var(--bg-secondary); padding: 1px 6px; border-radius: 4px;">
                    <i data-lucide="git-branch" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i> ${proj.branch}
                  </span>
                ` : ''}
                ${proj.commit ? `
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;" title="${proj.commit}">
                    ${proj.commit}
                  </span>
                ` : ''}
              </div>
            ` : ''}

            <div class="card-footer">
              <span class="tech-tag">${proj.language}</span>
              <div style="display: flex; align-items: center; gap: 12px;">
                <a href="${proj.githubUrl}" target="_blank" rel="noopener noreferrer" class="repo-github-btn" title="View source code on GitHub" style="display: inline-flex; align-items: center; gap: 4px; color: var(--text-dim); text-decoration: none; font-size: 0.8rem;">
                  <i data-lucide="github" style="width: 14px; height: 14px;"></i>
                  <span>GitHub</span>
                </a>
                <span style="display: flex; align-items: center; gap: 4px;" title="GitHub Stars">
                  <i data-lucide="star" style="width: 13px; height: 13px; color: #fbbf24;"></i> ${proj.stars}
                </span>
                <span style="display: flex; align-items: center; gap: 4px;" title="Forks">
                  <i data-lucide="git-fork" style="width: 13px; height: 13px;"></i> ${proj.forks}
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Re-initialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
};

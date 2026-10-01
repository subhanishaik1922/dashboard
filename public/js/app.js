/**
 * Application Orchestrator for Career Command Center with Strict Route Guards
 */
const App = {
  currentView: 'public',
  currentAdminTab: 'identity',
  data: {
    identity: null,
    vercel: null,
    github: null,
    jobHunt: null
  },

  async init() {
    try {
      this.initTheme();

      // Check current auth status with backend
      if (API.isAuthenticated()) {
        const isStillValid = await API.checkAuthStatus();
        this.updateNavAuthState(isStillValid);
      } else {
        this.updateNavAuthState(false);
      }

      await this.loadData();

      // Route based on initial URL
      this.handleInitialRouting();

      // Handle browser back/forward buttons
      window.addEventListener('popstate', () => {
        this.routeCurrentPath(window.location.pathname, false);
      });

      // Auto-poll Vercel status every 60 seconds
      setInterval(() => {
        this.loadData(true);
      }, 60000);

      console.log('⚡ Career Command Center initialized with Protected Admin Guard');
    } catch (err) {
      console.error('Initialization failed:', err);
      showToast('Error initializing application data.', 'error');
    }
  },

  initTheme() {
    const savedTheme = localStorage.getItem('ccc-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  },

  updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
      icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      if (window.lucide) window.lucide.createIcons();
    }
  },

  updateNavAuthState(isAuthenticated) {
    const logoutBtn = document.getElementById('nav-btn-logout');
    const adminIcon = document.getElementById('nav-admin-icon');
    const adminText = document.getElementById('nav-admin-text');

    if (isAuthenticated) {
      if (logoutBtn) logoutBtn.style.display = 'flex';
      if (adminIcon) adminIcon.setAttribute('data-lucide', 'sliders');
      if (adminText) adminText.textContent = 'Admin CMS';
    } else {
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (adminIcon) adminIcon.setAttribute('data-lucide', 'lock');
      if (adminText) adminText.textContent = 'Admin CMS';
    }

    if (window.lucide) window.lucide.createIcons();
  },

  handleInitialRouting() {
    const path = window.location.pathname;
    this.routeCurrentPath(path, false);
  },

  routeCurrentPath(path, pushState = true) {
    const isAuthed = API.isAuthenticated();

    if (path === '/admin') {
      if (!isAuthed) {
        // Strict guard: Redirect to /login
        console.warn('[ROUTER GUARD] Blocked unauthenticated access to /admin. Redirecting to /login');
        this.switchView('login', pushState ? '/login' : false);
        showToast('Admin authentication required. Please enter password.', 'info');
      } else {
        this.switchView('admin', pushState ? '/admin' : false);
      }
    } else if (path === '/login') {
      if (isAuthed) {
        this.switchView('admin', pushState ? '/admin' : false);
      } else {
        this.switchView('login', pushState ? '/login' : false);
      }
    } else {
      this.switchView('public', pushState ? '/' : false);
    }
  },

  switchView(viewName, newPath = null) {
    this.currentView = viewName;

    const pubPanel = document.getElementById('public-view');
    const admPanel = document.getElementById('admin-view');
    const lgnPanel = document.getElementById('login-view');
    const pubBtn = document.getElementById('nav-btn-public');
    const admBtn = document.getElementById('nav-btn-admin');

    // Hide all
    if (pubPanel) pubPanel.classList.remove('active');
    if (admPanel) admPanel.classList.remove('active');
    if (lgnPanel) lgnPanel.classList.remove('active');

    // Deselect buttons
    if (pubBtn) pubBtn.classList.remove('active');
    if (admBtn) admBtn.classList.remove('active');

    if (viewName === 'admin') {
      if (admPanel) admPanel.classList.add('active');
      if (admBtn) admBtn.classList.add('active');
    } else if (viewName === 'login') {
      if (lgnPanel) lgnPanel.classList.add('active');
      if (admBtn) admBtn.classList.add('active');
      // Focus password field
      setTimeout(() => {
        const passInput = document.getElementById('login-password-input');
        if (passInput) passInput.focus();
      }, 100);
    } else {
      if (pubPanel) pubPanel.classList.add('active');
      if (pubBtn) pubBtn.classList.add('active');
    }

    if (newPath !== false && typeof newPath === 'string') {
      if (window.location.pathname !== newPath) {
        window.history.pushState({}, '', newPath);
      }
    }

    if (window.lucide) window.lucide.createIcons();
  },

  handleUnauthorized(msg) {
    this.updateNavAuthState(false);
    this.switchView('login', '/login');
    showToast(msg || 'Admin access expired. Please log in again.', 'error');
  },

  async loadData(isBackground = false) {
    try {
      // 1. Ensure project and repository list arrays are completely cleared out (set back to empty arrays) right before fresh API sync
      if (this.data.vercel) {
        this.data.vercel.cachedProjects = [];
        this.data.vercel.cachedDeployments = [];
      }
      if (this.data.github) {
        this.data.github.repositories = [];
      }

      const [identityRes, vercelDepRes, githubRes, jobHuntRes, projectsRes] = await Promise.all([
        API.getIdentity(),
        API.getVercelDeployments(),
        API.getRepos(),
        API.getJobHunt(),
        API.getProjects().catch(err => {
          console.warn('[App] /api/projects fetch warning:', err.message);
          return null;
        })
      ]);

      let vercelConfigRes = { hasToken: false, maskedToken: '', teamId: '', lastSynced: null };
      if (API.isAuthenticated()) {
        try {
          vercelConfigRes = await API.getVercelConfig();
        } catch (e) {
          // Unauthenticated or not yet loaded
        }
      }

      // Deduplication helper for robust single-instance records
      const norm = (url) => (!url || typeof url !== 'string' ? '' : url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, ''));
      const dedupe = (items, matchFn) => {
        if (!Array.isArray(items)) return [];
        const result = [];
        items.forEach(item => {
          if (!item) return;
          const idx = result.findIndex(existing => matchFn(existing, item));
          if (idx !== -1) {
            result[idx] = { ...result[idx], ...item };
          } else {
            result.push(item);
          }
        });
        return result;
      };

      // 2. Filter & upsert: if a project or deployment with same Vercel ID or deployment URL exists, update existing
      const cleanDeployments = dedupe(vercelDepRes.deployments, (existing, item) => {
        if (item.id && existing.id && existing.id === item.id) return true;
        const eUrl = norm(existing.url || existing.fullUrl);
        const iUrl = norm(item.url || item.fullUrl);
        if (eUrl && iUrl && eUrl === iUrl) return true;
        if (existing.name && item.name && existing.name.toLowerCase() === item.name.toLowerCase()) return true;
        return false;
      });

      const cleanProjects = dedupe(vercelDepRes.projects, (existing, item) => {
        if (item.id && existing.id && existing.id === item.id) return true;
        const eUrl = norm(existing.url || existing.fullUrl);
        const iUrl = norm(item.url || item.fullUrl);
        if (eUrl && iUrl && eUrl === iUrl) return true;
        if (existing.name && item.name && existing.name.toLowerCase() === item.name.toLowerCase()) return true;
        return false;
      });

      // 3. Strict owner filter rule: repo.owner.login === 'subhanishaik1922'
      const targetOwner = (githubRes.username || 'subhanishaik1922').toLowerCase();
      const rawRepos = Array.isArray(githubRes.repositories) ? githubRes.repositories : [];
      const ownedRepos = rawRepos.filter(repo => {
        if (!repo) return false;
        if (repo.owner && repo.owner.login) {
          return repo.owner.login === 'subhanishaik1922' || repo.owner.login.toLowerCase() === targetOwner;
        }
        if (repo.repoUrl) {
          return repo.repoUrl.toLowerCase().includes('/subhanishaik1922/') || repo.repoUrl.toLowerCase().includes(`/${targetOwner}/`);
        }
        return false;
      });

      // Apply duplicate-prevention check to filtered GitHub repositories
      const cleanRepos = dedupe(ownedRepos, (existing, item) => {
        if (item.id && existing.id && String(existing.id) === String(item.id)) return true;
        const eUrl = norm(existing.repoUrl || existing.html_url);
        const iUrl = norm(item.repoUrl || item.html_url);
        if (eUrl && iUrl && eUrl === iUrl) return true;
        if (existing.name && item.name && existing.name.toLowerCase() === item.name.toLowerCase()) return true;
        return false;
      });

      // Process direct /api/projects response
      const apiProjects = (projectsRes && Array.isArray(projectsRes.projects))
        ? projectsRes.projects
        : (Array.isArray(projectsRes) ? projectsRes : null);

      this.data.identity = identityRes.identity;
      this.data.vercel = {
        apiToken: vercelConfigRes.hasToken ? (vercelConfigRes.maskedToken || 'configured') : '',
        teamId: vercelConfigRes.teamId || '',
        cachedDeployments: cleanDeployments,
        cachedProjects: cleanProjects,
        lastSynced: vercelDepRes.lastSynced || vercelConfigRes.lastSynced,
        isLive: vercelDepRes.isLive,
        connected: vercelDepRes.connected
      };
      this.data.github = {
        username: githubRes.username,
        profileUrl: githubRes.profileUrl,
        repositories: cleanRepos
      };
      this.data.jobHunt = {
        linkedin: jobHuntRes.linkedin,
        naukri: jobHuntRes.naukri,
        applications: jobHuntRes.applications
      };
      this.data.projects = apiProjects || cleanRepos;

      // Update Nav Beacon
      this.updateVercelBeacon(this.data.vercel);

      // Render Public View using direct project attributes from /api/projects
      PublicView.renderIdentity(this.data.identity);
      PublicView.renderNetworkBadges(this.data.jobHunt, this.data.github, this.data.identity);
      if (apiProjects && apiProjects.length > 0) {
        PublicView.renderPortfolioCards(apiProjects, this.data.vercel.cachedDeployments, this.data.vercel.cachedProjects);
      } else {
        PublicView.renderPortfolioCards(this.data.github.repositories, this.data.vercel.cachedDeployments, this.data.vercel.cachedProjects);
      }

      // Render Admin View
      AdminView.init(this.data);

      if (window.lucide) {
        window.lucide.createIcons();
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
      if (!isBackground) {
        showToast(`Failed to load data: ${err.message}`, 'error');
      }
    }
  },

  updateVercelBeacon(vercel) {
    const beacon = document.getElementById('nav-vercel-beacon');
    const beaconText = document.getElementById('nav-vercel-text');
    if (!beacon || !beaconText) return;

    const deployments = vercel?.cachedDeployments || [];
    const hasError = deployments.some(d => (d.status || '').toLowerCase() === 'error');
    const isBuilding = deployments.some(d => (d.status || '').toLowerCase() === 'building');

    if (hasError) {
      beacon.className = 'sync-status-pill error';
      beaconText.textContent = 'Vercel: Deployment Alert';
    } else if (isBuilding) {
      beacon.className = 'sync-status-pill building';
      beaconText.textContent = 'Vercel: Building Active';
    } else {
      beacon.className = 'sync-status-pill';
      beaconText.textContent = vercel?.isLive ? 'Vercel: Live Connected' : 'Vercel: Synced';
    }
  }
};

/* Unified Route Navigator */
function navigateToRoute(event, targetPath) {
  if (event) event.preventDefault();
  App.routeCurrentPath(targetPath, true);
}

/* Login Submit Handler */
async function handleLoginSubmit(event) {
  event.preventDefault();
  const passwordInput = document.getElementById('login-password-input');
  const alertBox = document.getElementById('login-alert-box');
  const alertText = document.getElementById('login-alert-text');
  const submitBtn = document.getElementById('login-submit-btn');

  if (!passwordInput || !passwordInput.value) return;

  const password = passwordInput.value;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Verifying...</span>`;
  }

  try {
    const res = await API.login(password);
    
    // Hide alert if visible
    if (alertBox) alertBox.classList.remove('visible');
    passwordInput.value = '';

    App.updateNavAuthState(true);
    showToast('Admin authentication successful! CMS unlocked.', 'success');

    // Reload state to get admin configs
    await App.loadData();

    // Navigate to /admin
    App.switchView('admin', '/admin');
  } catch (err) {
    console.error('Login error:', err);
    if (alertBox && alertText) {
      alertText.textContent = err.message || 'Invalid admin password. Access denied.';
      alertBox.classList.add('visible');
    }
    showToast(err.message || 'Authentication failed', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i data-lucide="unlock" style="width: 16px; height: 16px;"></i><span>Authenticate & Enter Admin</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

/* Logout Handler */
async function handleLogout() {
  try {
    await API.logout();
    App.updateNavAuthState(false);
    showToast('Logged out of Admin CMS. System locked.', 'info');
    App.switchView('public', '/');
  } catch (err) {
    showToast(`Logout error: ${err.message}`, 'error');
  }
}

/* Show/Hide Password Eye Toggle */
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  const icon = btn.querySelector('i');
  if (icon) {
    icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
    if (window.lucide) window.lucide.createIcons();
  }
}

/* Admin Tab Switcher */
function switchAdminTab(tabName) {
  App.currentAdminTab = tabName;

  const tabs = ['identity', 'code', 'jobhunt'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const content = document.getElementById(`tab-content-${t}`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (content) content.classList.toggle('active', t === tabName);
  });

  if (window.lucide) window.lucide.createIcons();
}

/* Vercel Live Sync Trigger */
async function syncVercelDeployments() {
  const icon = document.getElementById('pub-refresh-icon');
  const adminIcon = document.getElementById('admin-sync-icon');

  if (icon) icon.classList.add('lucide-spin');
  if (adminIcon) adminIcon.classList.add('lucide-spin');

  try {
    // 1. Ensure project list array is completely cleared out right before a new API sync
    if (App.data.vercel) {
      App.data.vercel.cachedProjects = [];
      App.data.vercel.cachedDeployments = [];
    }

    const res = await API.syncVercel();
    showToast(res.message || 'Vercel deployments synchronized!', 'success');
    await App.loadData();
  } catch (err) {
    showToast(`Vercel sync error: ${err.message}`, 'error');
  } finally {
    if (icon) icon.classList.remove('lucide-spin');
    if (adminIcon) adminIcon.classList.remove('lucide-spin');
  }
}

/* Theme Toggle */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('ccc-theme', newTheme);
  App.updateThemeIcon(newTheme);
}

/* Toast Notification Utility */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.1rem; opacity:0.6;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* Data Backup Exporter */
function exportDataBackup() {
  const jsonStr = JSON.stringify(App.data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `career-command-center-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Database snapshot downloaded successfully.', 'success');
}

/* Resume Download Handler */
function handleResumeDownload(e) {
  const url = e.currentTarget.getAttribute('href');
  if (!url || url === '#' || url === '#resume') {
    e.preventDefault();
    showToast('Resume PDF link can be uploaded in Admin Tab 1 (Identity & Resume).', 'info');
    return;
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

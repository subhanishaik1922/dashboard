/**
 * API Service Client for Career Command Center with Bearer Auth Protection
 */
const API = {
  TOKEN_KEY: 'ccc_admin_token',

  getToken() {
    return sessionStorage.getItem(this.TOKEN_KEY) || localStorage.getItem(this.TOKEN_KEY) || null;
  },

  setToken(token) {
    if (token) {
      sessionStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.TOKEN_KEY, token);
    } else {
      this.clearToken();
    }
  },

  clearToken() {
    sessionStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  },

  /**
   * Dynamically determines API Base URL:
   * 1. Window or process NEXT_PUBLIC_VERCEL_URL fallback
   * 2. Browser relative routing (clean path like /api/deployments)
   * 3. SSR / default fallback to http://localhost:3000
   */
  getBaseUrl() {
    // 1. Process environment or injected window variable
    if (typeof window !== 'undefined' && (window.NEXT_PUBLIC_VERCEL_URL || window.__API_BASE_URL__)) {
      const u = window.NEXT_PUBLIC_VERCEL_URL || window.__API_BASE_URL__;
      return u.startsWith('http') ? u.replace(/\/+$/, '') : `https://${u}`.replace(/\/+$/, '');
    }
    if (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL)) {
      const u = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
      return u.startsWith('http') ? u.replace(/\/+$/, '') : `https://${u}`.replace(/\/+$/, '');
    }
    // 2. Browser environment: use clean relative routing
    if (typeof window !== 'undefined' && window.location) {
      return '';
    }
    // 3. Fallback: localhost
    return (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');
  },

  /**
   * Constructs fully-qualified or clean relative API route path
   */
  buildUrl(endpoint) {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const cleanPath = endpoint.startsWith('/api')
      ? endpoint
      : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const base = this.getBaseUrl();
    return base ? `${base}${cleanPath}` : cleanPath;
  },

  async request(endpoint, options = {}) {
    let url = this.buildUrl(endpoint);
    const token = this.getToken();

    // Cache-busting timestamp for GET requests to prevent Vercel CDN data freezing
    const method = (options.method || 'GET').toUpperCase();
    if (method === 'GET') {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}_t=${Date.now()}`;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      credentials: 'same-origin',
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (response.status === 401) {
        console.warn(`[API Auth] 401 Unauthorized encountered on ${endpoint}`);
        this.clearToken();
        if (typeof window !== 'undefined' && window.App && typeof window.App.handleUnauthorized === 'function') {
          window.App.handleUnauthorized(data.message || 'Session expired or invalid password.');
        }
        throw new Error(data.message || 'Unauthorized: Admin authentication required.');
      }

      if (!response.ok) {
        throw new Error(data.message || `Request failed with HTTP ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error.message);
      throw error;
    }
  },

  // Authentication endpoints
  async login(password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: { password }
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  },

  async checkAuthStatus() {
    try {
      const res = await this.request('/auth/status');
      if (!res.authenticated) {
        this.clearToken();
      }
      return res.authenticated;
    } catch (e) {
      this.clearToken();
      return false;
    }
  },

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout API warning:', e.message);
    } finally {
      this.clearToken();
    }
  },

  // Identity & Resume endpoints
  getIdentity() {
    return this.request('/identity');
  },
  updateIdentity(data) {
    return this.request('/identity', { method: 'PUT', body: data });
  },
  addExperience(data) {
    return this.request('/identity/experience', { method: 'POST', body: data });
  },
  saveWorkExperience(positions) {
    return this.request('/identity/experience', { method: 'PUT', body: positions });
  },
  deleteExperience(id) {
    return this.request(`/identity/experience/${id}`, { method: 'DELETE' });
  },

  // Vercel API Hub endpoints
  getVercelConfig() {
    return this.request('/vercel/config');
  },
  getVercelDeployments() {
    return this.request('/vercel/deployments');
  },
  saveVercelToken(token, teamId, verify = false) {
    return this.request('/vercel/token', {
      method: 'POST',
      body: { token, teamId, verify }
    });
  },
  syncVercel() {
    return this.request('/vercel/sync', { method: 'POST' });
  },
  simulateVercelStatus(deploymentId, status) {
    return this.request('/vercel/simulate-status', {
      method: 'POST',
      body: { deploymentId, status }
    });
  },

  // Projects & Portfolio endpoints
  getProjects() {
    return this.request('/projects');
  },

  // GitHub Repositories endpoints
  getRepos() {
    return this.request('/github/repos');
  },
  toggleRepo(id, updates) {
    return this.request(`/github/repos/${id}`, {
      method: 'PATCH',
      body: updates
    });
  },
  addRepo(repoData) {
    return this.request('/github/repos', {
      method: 'POST',
      body: repoData
    });
  },

  // Job Hunt & Network Sync (LinkedIn & Naukri)
  getJobHunt() {
    return this.request('/jobhunt');
  },
  updateLinkedIn(metrics) {
    return this.request('/jobhunt/linkedin', {
      method: 'PUT',
      body: metrics
    });
  },
  updateNaukri(metrics) {
    return this.request('/jobhunt/naukri', {
      method: 'PUT',
      body: metrics
    });
  },
  addApplication(appData) {
    return this.request('/jobhunt/applications', {
      method: 'POST',
      body: appData
    });
  },
  updateApplication(id, updates) {
    return this.request(`/jobhunt/applications/${id}`, {
      method: 'PATCH',
      body: updates
    });
  },
  deleteApplication(id) {
    return this.request(`/jobhunt/applications/${id}`, {
      method: 'DELETE'
    });
  },

  // Social Links endpoints (LinkedIn & Naukri)
  getSocialLinks() {
    return this.request('/social-links');
  },
  updateSocialLinks(links) {
    return this.request('/social-links', {
      method: 'PUT',
      body: links
    });
  },

  // Resume PDF Upload Engine endpoints
  async uploadResume(file) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('resume', file);

    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const uploadUrl = this.buildUrl('/resume/upload');
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Upload failed with HTTP ${response.status}`);
    }
    return data;
  },

  getResumeStatus() {
    return this.request('/resume/status');
  }
};

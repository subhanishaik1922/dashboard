/**
 * Script to trigger a fresh live data sync for GitHub and Vercel
 * using GITHUB_TOKEN, GITHUB_USERNAME, and VERCEL_TOKEN from .env
 */
const fs = require('fs');
const path = require('path');

// 1. Explicitly load .env file from project root directory
const envPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

try {
  if (fs.existsSync(envPath)) {
    const envRaw = fs.readFileSync(envPath, 'utf8');
    const parseKey = (key) => {
      const regex = new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`, 'm');
      const match = envRaw.match(regex);
      if (match) {
        let val = match[1].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        return val.replace(/\r$/, '');
      }
      return null;
    };

    const ghToken = parseKey('GITHUB_TOKEN');
    if (ghToken !== null && ghToken) process.env.GITHUB_TOKEN = ghToken;

    const ghUser = parseKey('GITHUB_USERNAME');
    if (ghUser !== null && ghUser) process.env.GITHUB_USERNAME = ghUser;

    const vercelTok = parseKey('VERCEL_TOKEN');
    if (vercelTok !== null && vercelTok) process.env.VERCEL_TOKEN = vercelTok;

    const vercelTeam = parseKey('VERCEL_TEAM_ID');
    if (vercelTeam !== null) process.env.VERCEL_TEAM_ID = vercelTeam;
  }
} catch (e) {
  console.warn('Warning parsing .env:', e.message);
}

const db = require('../server/db');

async function triggerLiveSync() {
  console.log('🔄 =======================================================');
  console.log('🔄 Initiating Direct Live GitHub & Vercel Data Synchronization');
  console.log('🔄 =======================================================\n');

  const githubToken = (process.env.GITHUB_TOKEN || '').trim();
  const githubUsername = (process.env.GITHUB_USERNAME || 'subhanishaik1922').trim();
  const vercelToken = (process.env.VERCEL_TOKEN || '').trim();
  const vercelTeamId = (process.env.VERCEL_TEAM_ID || '').trim();

  console.log(`🐙 [GITHUB CONFIG] Target User: ${githubUsername}`);
  console.log(`🐙 [GITHUB CONFIG] Token configured: ${githubToken ? 'Yes (' + githubToken.substring(0, 15) + '...)' : 'No'}`);
  console.log(`📡 [VERCEL CONFIG] Token configured: ${vercelToken ? 'Yes (' + vercelToken.substring(0, 15) + '...)' : 'No'}`);

  // Snapshot user protected state before sync
  const currentDb = db.getData();
  const protectedLinkedIn = currentDb.linkedin_url || 'https://www.linkedin.com/in/mahaboob-subhani-shaik-961a68228/';
  const protectedNaukri = currentDb.naukri_url || 'https://www.naukri.com/mnjuser/profile?id=&altresid';
  const protectedResumeFilename = currentDb.resume_filename || 'Mahaboob_Subhani_Shaik_DevOps_Resume (1).pdf';
  const protectedResumePath = currentDb.resume_path || '/assets/resume.pdf';
  const protectedWorkExperience = Array.isArray(currentDb.work_experience) ? currentDb.work_experience : [];

  console.log('\n🛡️ [STATE ISOLATION] Preserving protected variables and Work Experience:');
  console.log(`   - linkedin_url: ${protectedLinkedIn}`);
  console.log(`   - naukri_url: ${protectedNaukri}`);
  console.log(`   - resume_filename: ${protectedResumeFilename}`);
  console.log(`   - work_experience positions count: ${protectedWorkExperience.length}`);

  // 1. Fetch live GitHub Repositories
  console.log('\n--- 1. Fetching Live GitHub Repositories ---');
  let realRepos = [];
  const ghHeaders = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Career-Command-Center-CMS/1.0'
  };
  if (githubToken) {
    ghHeaders['Authorization'] = `token ${githubToken}`;
  }

  try {
    // Try authenticated user/repos or user specific repos
    const ghUrl = `https://api.github.com/users/${encodeURIComponent(githubUsername)}/repos?sort=updated&per_page=100`;
    console.log(`Fetching from: ${ghUrl}`);
    const ghRes = await fetch(ghUrl, { headers: ghHeaders });

    if (ghRes.ok) {
      const rawGhList = await ghRes.json();
      console.log(`Received ${rawGhList.length} raw repositories from GitHub API.`);

      // Strictly filter to subhanishaik1922 and exclude any foreign/dummy repos
      const owned = rawGhList.filter(r => {
        if (!r) return false;
        const ownerLogin = (r.owner && r.owner.login ? r.owner.login : '').toLowerCase();
        return ownerLogin === githubUsername.toLowerCase() || ownerLogin === 'subhanishaik1922';
      });

      console.log(`Filtered to ${owned.length} repositories strictly owned by ${githubUsername}.`);

      realRepos = owned.map(r => ({
        id: String(r.id),
        name: r.name,
        description: r.description || 'Full-stack software engineering project with CI/CD automation.',
        stars: Number(r.stargazers_count ?? 0),
        forks: Number(r.forks_count ?? 0),
        language: r.language || 'TypeScript / JavaScript',
        visible: true,
        featured: r.name === 'portfolio-main' || (r.stargazers_count || 0) >= 10,
        isPrivate: Boolean(r.private),
        owner: {
          login: r.owner?.login || githubUsername
        },
        vercelProject: r.name,
        repoUrl: r.html_url || `https://github.com/${githubUsername}/${r.name}`,
        html_url: r.html_url || `https://github.com/${githubUsername}/${r.name}`
      }));
    } else {
      console.warn(`GitHub API returned HTTP ${ghRes.status}: ${await ghRes.text()}`);
    }
  } catch (ghErr) {
    console.error('Error fetching GitHub repositories:', ghErr.message);
  }

  // 2. Fetch live Vercel Projects and Deployments
  console.log('\n--- 2. Fetching Live Vercel Projects & Deployments ---');
  let realProjects = [];
  let realDeployments = [];

  if (vercelToken) {
    const vcHeaders = {
      'Authorization': `Bearer ${vercelToken}`,
      'Content-Type': 'application/json'
    };

    // Helper to query Vercel with automatic personal scope fallback on 403
    const queryVercel = async (endpointPath) => {
      let teamParam = vercelTeamId ? `teamId=${encodeURIComponent(vercelTeamId)}` : '';
      let url = `https://api.vercel.com/${endpointPath}${teamParam ? (endpointPath.includes('?') ? '&' : '?') + teamParam : ''}`;
      let res = await fetch(url, { headers: vcHeaders });
      if (res.status === 403 && teamParam) {
        console.log(`[Vercel Scope] Retrying ${endpointPath} at personal account scope...`);
        url = `https://api.vercel.com/${endpointPath}`;
        res = await fetch(url, { headers: vcHeaders });
      }
      if (!res.ok) {
        console.warn(`[Vercel Warn] ${endpointPath} returned HTTP ${res.status}`);
        return null;
      }
      return await res.json();
    };

    try {
      // 2a. Fetch projects (v10/projects)
      const prjData = await queryVercel('v10/projects');
      if (prjData) {
        const rawPrjs = Array.isArray(prjData.projects) ? prjData.projects : (Array.isArray(prjData) ? prjData : []);
        console.log(`Received ${rawPrjs.length} Vercel projects.`);
        realProjects = rawPrjs.map(p => {
          const mainTarget = p.targets?.production || null;
          let prodDomain = '';
          if (mainTarget && mainTarget.url) prodDomain = mainTarget.url;
          else if (Array.isArray(p.alias) && p.alias.length > 0) prodDomain = p.alias[0];
          else prodDomain = `${p.name}.vercel.app`;

          return {
            id: p.id,
            name: p.name,
            framework: p.framework || 'Web App',
            status: 'Ready',
            url: prodDomain.replace(/^https?:\/\//, ''),
            fullUrl: prodDomain.startsWith('http') ? prodDomain : `https://${prodDomain}`,
            domains: Array.isArray(p.alias) ? p.alias : [prodDomain],
            updatedAt: new Date(p.updatedAt || Date.now()).toISOString(),
            repo: p.link?.repo || p.name
          };
        });
      }

      // 2b. Fetch deployments (v7/deployments)
      const dplData = await queryVercel('v7/deployments?limit=30');
      if (dplData) {
        const rawDpls = Array.isArray(dplData.deployments) ? dplData.deployments : (Array.isArray(dplData) ? dplData : []);
        console.log(`Received ${rawDpls.length} Vercel deployments.`);

        // Sort descending by creation timestamp (newest first)
        rawDpls.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.created_at || a.created || 0).getTime();
          const timeB = new Date(b.createdAt || b.created_at || b.created || 0).getTime();
          return timeB - timeA;
        });

        realDeployments = rawDpls.map(d => {
          let depUrl = d.url || (Array.isArray(d.alias) && d.alias.length > 0 ? d.alias[0] : '');
          return {
            id: d.uid || d.id,
            name: d.name,
            url: depUrl.replace(/^https?:\/\//, ''),
            fullUrl: depUrl.startsWith('http') ? depUrl : `https://${depUrl}`,
            domains: Array.isArray(d.alias) ? d.alias : [depUrl],
            status: d.readyState === 'READY' || d.state === 'READY' ? 'Ready' : (d.state || d.readyState || 'Ready'),
            branch: d.meta?.githubCommitRef || 'main',
            commit: d.meta?.githubCommitMessage || 'Live deployment',
            commitHash: (d.meta?.githubCommitSha || '').substring(0, 7) || 'latest',
            creator: d.creator?.username || githubUsername,
            createdAt: new Date(d.createdAt || d.created_at || Date.now()).toISOString(),
            framework: 'Web App',
            environment: d.target || 'production'
          };
        });
      }
    } catch (vcErr) {
      console.error('Error fetching Vercel data:', vcErr.message);
    }
  }

  // 3. Link newest ready deployment to projects & repositories
  if (realDeployments.length > 0 && realRepos.length > 0) {
    const readyDeployments = realDeployments.filter(d => (d.status || '').toLowerCase() === 'ready');
    realRepos.forEach(repo => {
      const match = readyDeployments.find(d => d.name.toLowerCase() === repo.name.toLowerCase());
      if (match) {
        repo.liveUrl = match.fullUrl;
        repo.deploymentUrl = match.url;
      }
    });
  }

  console.log('\n--- 3. Committing Synchronized Real Data to data.json ---');

  // Build clean, complete database state with real data only
  const freshDb = {
    github: {
      username: githubUsername,
      profileUrl: `https://github.com/${githubUsername}`,
      repositories: realRepos,
      lastSynced: new Date().toISOString()
    },
    vercel: {
      apiToken: vercelToken,
      teamId: vercelTeamId,
      autoSync: true,
      lastSynced: new Date().toISOString(),
      cachedDeployments: realDeployments,
      cachedProjects: realProjects
    },
    linkedin_url: protectedLinkedIn,
    naukri_url: protectedNaukri,
    resume_filename: protectedResumeFilename,
    resume_path: protectedResumePath,
    work_experience: protectedWorkExperience,
    identity: {
      ...currentDb.identity,
      linkedin_url: protectedLinkedIn,
      naukri_url: protectedNaukri,
      linkedinUrl: protectedLinkedIn,
      naukriUrl: protectedNaukri,
      resume_filename: protectedResumeFilename,
      resumeUrl: protectedResumePath,
      work_experience: protectedWorkExperience,
      experience: protectedWorkExperience,
      updatedAt: new Date().toISOString()
    },
    jobHunt: {
      ...currentDb.jobHunt,
      linkedin: {
        ...(currentDb.jobHunt?.linkedin || {}),
        profileUrl: protectedLinkedIn
      },
      naukri: {
        ...(currentDb.jobHunt?.naukri || {}),
        profileUrl: protectedNaukri
      }
    }
  };

  // Ensure any dummy repositories like "synced-repo" (id 999) are 100% purged
  freshDb.github.repositories = freshDb.github.repositories.filter(r => r.name !== 'synced-repo' && r.id !== 999 && r.id !== '999');

  // Save directly with fsync
  const dataJsonPath = path.join(__dirname, '..', 'data.json');
  const fd = fs.openSync(dataJsonPath, 'w');
  try {
    fs.writeFileSync(fd, JSON.stringify(freshDb, null, 2), 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  console.log(`✅ Successfully committed ${freshDb.github.repositories.length} real GitHub repositories to data.json`);
  freshDb.github.repositories.forEach((r, idx) => {
    console.log(`   ${idx + 1}. [${r.name}] -> ${r.repoUrl} (${r.language})`);
  });

  console.log(`✅ Successfully committed ${freshDb.vercel.cachedProjects.length} real Vercel projects`);
  console.log(`✅ Successfully committed ${freshDb.vercel.cachedDeployments.length} real Vercel deployments`);
  console.log(`✅ Work experience positions retained: ${freshDb.work_experience.length}`);
  console.log(`✅ Protected social links retained: LinkedIn (${freshDb.linkedin_url}) | Naukri (${freshDb.naukri_url})`);
  console.log('\n🎉 Live Data Sync Complete!');
}

triggerLiveSync().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Automated Background Git Synchronization Utility for Antigravity & Vercel
 * Watches workspace files for changes and automatically executes:
 *   git add . && git commit -m "Auto-update from Antigravity" && git push origin main
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chokidar = require('chokidar');

// Load environment from project root .env
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// Ensure Windows PATH prioritizes the real Git installation
const gitPath = 'C:\\Program Files\\Git\\cmd';
const customEnv = {
  ...process.env,
  PATH: `${gitPath};${process.env.PATH || ''}`
};

function runGit(command, options = {}) {
  try {
    return execSync(command, {
      cwd: projectRoot,
      env: customEnv,
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      timeout: 30000,
      ...options
    });
  } catch (err) {
    if (!options.silent) {
      console.error(`[GIT ERROR] ${command} failed:`, err.message);
    }
    throw err;
  }
}

/**
 * Configure authenticated git credentials and remote using .env
 */
function ensureGitConfigured() {
  const token = (process.env.GITHUB_TOKEN || '').trim();
  const username = (process.env.GITHUB_USERNAME || 'subhanishaik1922').trim();

  // 1. Ensure git repo initialized
  if (!fs.existsSync(path.join(projectRoot, '.git'))) {
    console.log('[AUTO-GIT-SYNC] Initializing git repository...');
    runGit('git init -b main');
  }

  // 2. Ensure user config exists
  try {
    runGit('git config user.name', { silent: true });
  } catch (e) {
    runGit(`git config user.name "${username}"`);
  }
  try {
    runGit('git config user.email', { silent: true });
  } catch (e) {
    runGit(`git config user.email "${username}@gmail.com"`);
  }

  // 3. Configure remote with token auth
  const repoName = 'portfolio-main';
  const remoteUrl = token
    ? `https://${token}@github.com/${username}/${repoName}.git`
    : `https://github.com/${username}/${repoName}.git`;

  try {
    const currentRemote = runGit('git remote get-url origin', { silent: true }).trim();
    if (!currentRemote.includes(token) && token) {
      runGit(`git remote set-url origin ${remoteUrl}`);
      console.log(`[AUTO-GIT-SYNC] Configured origin remote with authenticated token.`);
    }
  } catch (e) {
    runGit(`git remote add origin ${remoteUrl}`);
    console.log(`[AUTO-GIT-SYNC] Added origin remote: https://github.com/${username}/${repoName}.git`);
  }

  // 4. Ensure current branch is main
  try {
    const currentBranch = runGit('git rev-parse --abbrev-ref HEAD', { silent: true }).trim();
    if (currentBranch !== 'main') {
      runGit('git branch -M main');
    }
  } catch (e) {}
}

let isSyncing = false;
let pendingSync = false;

/**
 * Executes: git add . && git commit -m "Auto-update from Antigravity" && git push origin main
 */
async function executeGitSync(reason = 'File change detected') {
  if (isSyncing) {
    pendingSync = true;
    return;
  }

  isSyncing = true;
  pendingSync = false;

  try {
    ensureGitConfigured();

    // Check if there are changes to stage or commit
    const status = runGit('git status --porcelain', { silent: true }).trim();
    if (!status) {
      console.log(`[AUTO-GIT-SYNC] Working tree clean. No changes to commit.`);
      isSyncing = false;
      return;
    }

    console.log(`\n=======================================================`);
    console.log(`🚀 [AUTO-GIT-SYNC] Initiating Automated Sync (${reason})`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log(`=======================================================`);

    // 1. Stage all changes
    console.log(`📦 [1/3] Staging changes (git add .)...`);
    runGit('git add .');

    // 2. Commit changes
    const commitMsg = `Auto-update from Antigravity`;
    console.log(`📝 [2/3] Committing changes (git commit -m "${commitMsg}")...`);
    try {
      runGit(`git commit -m "${commitMsg}"`);
    } catch (commitErr) {
      if (commitErr.message.includes('nothing to commit')) {
        console.log(`[AUTO-GIT-SYNC] Nothing new to commit.`);
        isSyncing = false;
        return;
      }
      throw commitErr;
    }

    // 3. Push to remote origin main
    console.log(`📡 [3/3] Pushing to remote (git push origin main)...`);
    try {
      runGit('git push origin main');
      console.log(`✅ [AUTO-GIT-SYNC] Successfully pushed to origin main!`);
      console.log(`⚡ Vercel automated git-hook will trigger deployment automatically.`);
    } catch (pushErr) {
      console.warn(`⚠️ [AUTO-GIT-SYNC] Direct push failed, attempting rebase pull & retry...`);
      try {
        runGit('git pull --rebase origin main');
        runGit('git push origin main');
        console.log(`✅ [AUTO-GIT-SYNC] Successfully rebased and pushed to origin main!`);
      } catch (retryErr) {
        console.error(`❌ [AUTO-GIT-SYNC FATAL] Push failed:`, retryErr.message);
      }
    }
    console.log(`=======================================================\n`);
  } catch (err) {
    console.error(`❌ [AUTO-GIT-SYNC ERROR]`, err.message);
  } finally {
    isSyncing = false;
    if (pendingSync) {
      setTimeout(() => executeGitSync('Queued changes'), 1000);
    }
  }
}

/**
 * Start the background file-watcher
 */
function startWatcher() {
  ensureGitConfigured();

  const ignoredPatterns = [
    '**/.git/**',
    '**/node_modules/**',
    '**/.env',
    '**/*.log',
    '**/*.tmp',
    '**/public/assets/history/**',
    '**/.gemini/**',
    '**/temp*'
  ];

  console.log(`👁️ [AUTO-GIT-SYNC] Starting Antigravity File Watcher...`);
  console.log(`📁 Watching directory: ${projectRoot}`);
  console.log(`⏱️ Debounce delay: 2000ms`);

  let debounceTimer = null;
  const changedFiles = new Set();

  const watcher = chokidar.watch(projectRoot, {
    ignored: ignoredPatterns,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  const queueSync = (event, filePath) => {
    const relPath = path.relative(projectRoot, filePath);
    changedFiles.add(`${event}: ${relPath}`);

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const summary = Array.from(changedFiles).slice(0, 5).join(', ');
      const moreCount = changedFiles.size > 5 ? ` (+${changedFiles.size - 5} more)` : '';
      changedFiles.clear();
      executeGitSync(`Detected ${summary}${moreCount}`);
    }, 2000);
  };

  watcher
    .on('add', fp => queueSync('add', fp))
    .on('change', fp => queueSync('change', fp))
    .on('unlink', fp => queueSync('unlink', fp))
    .on('error', err => console.error('[WATCHER ERROR]', err.message));

  console.log(`✅ [AUTO-GIT-SYNC] File watcher active and listening for Antigravity changes.\n`);
  return watcher;
}

// CLI handler
const args = process.argv.slice(2);
if (args.includes('--once') || args.includes('-1')) {
  executeGitSync('Manual trigger --once').catch(err => {
    console.error(err);
    process.exit(1);
  });
} else {
  startWatcher();
}

module.exports = {
  startWatcher,
  executeGitSync,
  ensureGitConfigured
};

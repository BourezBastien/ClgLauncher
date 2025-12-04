// @ts-nocheck
/**
 * @description Update checker utility for CLG Launcher.
 */

import { t } from '../stores/i18n.js';
import { showDialog } from '../stores/ui.js';

let translate = (key) => key;
t.subscribe(fn => translate = fn);

// GitHub repository configuration
const GITHUB_OWNER = 'BourezBastien';
const GITHUB_REPO = 'ClgLauncher';

// Manual version check from GitHub releases
export async function checkForUpdate() {
  try {
    const currentVersion = await window.electron.invoke('get-app-version');

    // Fetch latest release from GitHub API
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CLGLauncher/1.0.0'
      }
    });
    
    if (!response.ok) {
      console.log('GitHub API not available, skipping version check');
      return null;
    }
    
    const releaseData = await response.json();
    const latestVersion = releaseData.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present
    
    console.log(`Current: ${currentVersion.version}, Latest: ${latestVersion}`);
    
    // Compare versions
    if (latestVersion !== currentVersion.version) {
      return {
        available: true,
        current: currentVersion.version,
        latest: latestVersion,
        releaseNotes: releaseData.body,
        downloadUrl: releaseData.html_url,
        assets: releaseData.assets
      };
    }
    
    return { available: false, current: currentVersion.version, latest: latestVersion };
    
  } catch (error) {
    console.log('Version check failed:', error.message);
    return null; // Silent fail - don't interrupt process
  }
}

// Show update notification dialog
export async function showUpdateNotification(updateInfo) {
  return new Promise((resolve) => {
    showDialog({
      title: translate('notifications.updateAvailable'),
      message: `${translate('notifications.updateAvailableMessage')}`,
      buttons: [
        {
          label: translate('notifications.updateNow'),
          type: 'confirm',
          action: () => {
            window.electron.openExternal(updateInfo.downloadUrl || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
            resolve(true); 
          }
        },
        {
          label: translate('notifications.later'),
          primary: false,
          action: () => {
            // User chose to skip for now
            console.log('Update reminder skipped');
            resolve(false); // User chose to skip
          }
        }
      ]
    });
  });
}

// Check for updates with optional notification
export async function checkForUpdatesWithNotification(showNotification = true) {
  const updateInfo = await checkForUpdate();
  
  if (updateInfo?.available && showNotification) {
    await showUpdateNotification(updateInfo);
  }
  
  return updateInfo;
}
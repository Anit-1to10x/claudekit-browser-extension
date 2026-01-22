/**
 * 10X.in Universal Browser Automation - Popup Script v2.0
 * Minimalist, powerful interface
 * Developed by team 10X.in
 */

// Activity counters
const ACTIVITY_KEYS = {
  linkedin: 'activity_linkedin_today',
  instagram: 'activity_instagram_today',
  twitter: 'activity_twitter_today',
  google: 'activity_google_today'
};

// State
let isRecording = false;

/**
 * Initialize popup
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[10X Popup] Initializing v2.0...');

  // Update shortcut display for Windows/Mac
  updateShortcutDisplay();

  // Load connection status
  await updateConnectionStatus();

  // Load activity stats
  await updateActivityStats();

  // Check recording state
  await checkRecordingState();

  // Setup event listeners
  setupEventListeners();

  // Auto-refresh every 5 seconds
  setInterval(async () => {
    await updateConnectionStatus();
    await updateActivityStats();
  }, 5000);

  console.log('[10X Popup] Initialized');
});

/**
 * Update shortcut display based on OS
 */
function updateShortcutDisplay() {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';
  const shiftKey = isMac ? '⇧' : 'Shift';

  // Update command palette hint
  document.querySelector('.shortcut').textContent = `${cmdKey}${shiftKey}K`;

  // Update action shortcuts
  const shortcuts = document.querySelectorAll('.action-shortcut');
  shortcuts.forEach(el => {
    const text = el.textContent;
    if (isMac) {
      el.textContent = text.replace('Ctrl', '⌘').replace('Shift', '⇧');
    } else {
      el.textContent = text.replace('⌘', 'Ctrl+').replace('⇧', 'Shift+');
    }
  });
}

/**
 * Update connection status
 */
async function updateConnectionStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_CONNECTION_STATUS' });

    const statusCard = document.getElementById('connection-status');
    const statusIndicator = statusCard.querySelector('.status-indicator');
    const statusText = statusIndicator.querySelector('.status-text');

    if (response && response.connected) {
      statusIndicator.className = 'status-indicator status-connected';
      statusText.textContent = 'Connected';
    } else {
      statusIndicator.className = 'status-indicator status-disconnected';
      statusText.textContent = 'Disconnected';
    }
  } catch (error) {
    console.error('[10X Popup] Error checking connection:', error);
    const statusCard = document.getElementById('connection-status');
    const statusIndicator = statusCard.querySelector('.status-indicator');
    statusIndicator.className = 'status-indicator status-disconnected';
    statusIndicator.querySelector('.status-text').textContent = 'Error';
  }
}

/**
 * Update activity stats
 */
async function updateActivityStats() {
  const today = new Date().toISOString().split('T')[0];

  try {
    const keys = Object.values(ACTIVITY_KEYS).map(key => `${key}_${today}`);
    const result = await chrome.storage.local.get(keys);

    // Update counts
    document.getElementById('linkedin-count').textContent =
      result[`${ACTIVITY_KEYS.linkedin}_${today}`] || 0;
    document.getElementById('instagram-count').textContent =
      result[`${ACTIVITY_KEYS.instagram}_${today}`] || 0;
    document.getElementById('twitter-count').textContent =
      result[`${ACTIVITY_KEYS.twitter}_${today}`] || 0;
    document.getElementById('google-count').textContent =
      result[`${ACTIVITY_KEYS.google}_${today}`] || 0;

  } catch (error) {
    console.error('[10X Popup] Error loading activity stats:', error);
  }
}

/**
 * Check if recording is active
 */
async function checkRecordingState() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_RECORDING_STATE' });
      if (response && response.isRecording) {
        isRecording = true;
        updateRecordingUI(true);
      }
    }
  } catch (error) {
    // Tab might not have content script loaded
    console.log('[10X Popup] Could not check recording state');
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Reconnect button
  document.getElementById('reconnect-btn').addEventListener('click', handleReconnect);

  // Open Command Palette button
  document.getElementById('open-palette-btn').addEventListener('click', handleOpenPalette);

  // Quick action buttons
  document.getElementById('record-btn').addEventListener('click', handleRecord);
  document.getElementById('scrape-btn').addEventListener('click', handleScrape);
  document.getElementById('workflows-btn').addEventListener('click', handleWorkflows);

  // Footer navigation
  document.getElementById('workflows-tab-btn').addEventListener('click', handleWorkflowsTab);
  document.getElementById('activity-tab-btn').addEventListener('click', handleActivityTab);
  document.getElementById('settings-btn').addEventListener('click', handleSettings);
}

/**
 * Handle reconnect
 */
async function handleReconnect() {
  console.log('[10X Popup] Manual reconnect requested');

  try {
    await chrome.runtime.sendMessage({ type: 'RECONNECT' });

    const statusCard = document.getElementById('connection-status');
    const statusIndicator = statusCard.querySelector('.status-indicator');
    statusIndicator.className = 'status-indicator status-connecting';
    statusIndicator.querySelector('.status-text').textContent = 'Reconnecting...';

    setTimeout(updateConnectionStatus, 2000);
  } catch (error) {
    console.error('[10X Popup] Reconnect failed:', error);
    showNotification('Failed to reconnect', 'error');
  }
}

/**
 * Handle opening command palette
 */
async function handleOpenPalette() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_COMMAND_PALETTE' });
      window.close(); // Close popup after opening palette
    }
  } catch (error) {
    console.error('[10X Popup] Error opening command palette:', error);
    showNotification('Could not open command palette on this page', 'error');
  }
}

/**
 * Handle record action
 */
async function handleRecord() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showNotification('No active tab found', 'error');
      return;
    }

    if (isRecording) {
      // Stop recording
      await chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' });
      isRecording = false;
      updateRecordingUI(false);
      showNotification('Recording stopped');
    } else {
      // Start recording
      await chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' });
      isRecording = true;
      updateRecordingUI(true);
      showNotification('Recording started');
    }
  } catch (error) {
    console.error('[10X Popup] Error toggling recording:', error);
    showNotification('Could not toggle recording on this page', 'error');
  }
}

/**
 * Update recording UI state
 */
function updateRecordingUI(recording) {
  const container = document.querySelector('.container');
  const recordBtn = document.getElementById('record-btn');
  const actionText = recordBtn.querySelector('.action-text');
  const actionIcon = recordBtn.querySelector('.action-icon');

  if (recording) {
    container.classList.add('recording');
    actionText.textContent = 'Stop Recording';
    actionIcon.textContent = '⏹';
  } else {
    container.classList.remove('recording');
    actionText.textContent = 'Record Actions';
    actionIcon.textContent = '⏺';
  }
}

/**
 * Handle scrape action
 */
async function handleScrape() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showNotification('No active tab found', 'error');
      return;
    }

    showNotification('Scraping page...');

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' });

    if (response && response.success) {
      const dataCount = response.data?.summary?.totalItems || 0;
      showNotification(`Scraped ${dataCount} items`, 'success');

      // Copy to clipboard if data found
      if (dataCount > 0 && response.data) {
        try {
          await navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
          showNotification('Data copied to clipboard', 'success');
        } catch (e) {
          console.log('[10X Popup] Could not copy to clipboard');
        }
      }
    } else {
      showNotification('No data found on this page', 'error');
    }
  } catch (error) {
    console.error('[10X Popup] Error scraping page:', error);
    showNotification('Could not scrape this page', 'error');
  }
}

/**
 * Handle workflows button
 */
async function handleWorkflows() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'OPEN_COMMAND_PALETTE',
        filter: 'workflow'
      });
      window.close();
    }
  } catch (error) {
    console.error('[10X Popup] Error opening workflows:', error);
    showNotification('Could not open workflows on this page', 'error');
  }
}

/**
 * Handle workflows tab
 */
async function handleWorkflowsTab() {
  try {
    // Open workflow builder in new tab
    const builderUrl = chrome.runtime.getURL('ui/workflow-builder/builder.html');
    await chrome.tabs.create({ url: builderUrl });
    window.close();
  } catch (error) {
    console.error('[10X Popup] Error opening workflow builder:', error);
    showNotification('Could not open workflow builder', 'error');
  }
}

/**
 * Handle activity tab
 */
async function handleActivityTab() {
  try {
    // Get activities and show them
    const response = await chrome.runtime.sendMessage({
      type: 'GET_ACTIVITIES',
      filters: {}
    });

    if (response && response.success && response.activities.length > 0) {
      // Export recent activities
      const csv = convertActivitiesToCSV(response.activities.slice(0, 100));
      downloadCSV(csv, `10x-activity-${new Date().toISOString().split('T')[0]}.csv`);
      showNotification('Activity exported', 'success');
    } else {
      showNotification('No activities to export');
    }
  } catch (error) {
    console.error('[10X Popup] Error exporting activities:', error);
    showNotification('Could not export activities', 'error');
  }
}

/**
 * Handle settings button
 */
function handleSettings() {
  chrome.tabs.create({ url: chrome.runtime.getURL('popup/settings.html') });
  window.close();
}

/**
 * Convert activities to CSV
 */
function convertActivitiesToCSV(activities) {
  const headers = ['timestamp', 'type', 'platform', 'name', 'headline', 'company', 'url'];
  const rows = activities.map(activity => [
    new Date(activity.timestamp).toISOString(),
    activity.type || '',
    activity.platform || '',
    activity.data?.name || '',
    activity.data?.headline || '',
    activity.data?.company || '',
    activity.url || ''
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Download CSV file
 */
function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification show ${type}`;

  // Hide after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

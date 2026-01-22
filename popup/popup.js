/**
 * 10X.in Universal Browser Automation - Popup Script
 *
 * Developed by team 10X.in
 * Displays connection status, activity stats, rate limits, and prospect management
 */

// Rate limit configuration (must match handlers)
const RATE_LIMITS = {
  linkedin_connections: { daily: 15, key: 'linkedin_connections_today' },
  linkedin_messages: { daily: 40, key: 'linkedin_messages_today' },
  linkedin_profile_views: { daily: 100, key: 'linkedin_profile_views_today' },
  linkedin_likes: { daily: 50, key: 'linkedin_likes_today' }
};

// Activity counters
const ACTIVITY_KEYS = {
  linkedin: 'activity_linkedin_today',
  instagram: 'activity_instagram_today',
  twitter: 'activity_twitter_today',
  google: 'activity_google_today'
};

/**
 * Initialize popup
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[10X Popup] Initializing...');

  // Set extension ID
  document.getElementById('extension-id').textContent = chrome.runtime.id;

  // Load connection status
  await updateConnectionStatus();

  // Load activity stats
  await updateActivityStats();

  // Load rate limits
  await updateRateLimits();

  // Setup event listeners
  setupEventListeners();

  // Auto-refresh every 5 seconds
  setInterval(async () => {
    await updateConnectionStatus();
    await updateActivityStats();
    await updateRateLimits();
  }, 5000);

  console.log('[10X Popup] Initialized');
});

/**
 * Update connection status
 */
async function updateConnectionStatus() {
  try {
    // Query background worker for connection status
    const response = await chrome.runtime.sendMessage({ type: 'GET_CONNECTION_STATUS' });

    const statusCard = document.getElementById('connection-status');
    const statusIndicator = statusCard.querySelector('.status-indicator');

    if (response && response.connected) {
      // Connected
      statusIndicator.className = 'status-indicator status-connected';
      statusIndicator.querySelector('.status-text').textContent = 'Connected';
    } else {
      // Disconnected
      statusIndicator.className = 'status-indicator status-disconnected';
      statusIndicator.querySelector('.status-text').textContent = 'Disconnected';
    }
  } catch (error) {
    console.error('[10X Popup] Error checking connection:', error);

    // Show disconnected state on error
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
    // Get all activity counts for today
    const keys = Object.values(ACTIVITY_KEYS).map(key => `${key}_${today}`);
    const result = await chrome.storage.local.get(keys);

    // Update LinkedIn count
    const linkedinCount = result[`${ACTIVITY_KEYS.linkedin}_${today}`] || 0;
    document.getElementById('linkedin-count').textContent = linkedinCount;

    // Update Instagram count
    const instagramCount = result[`${ACTIVITY_KEYS.instagram}_${today}`] || 0;
    document.getElementById('instagram-count').textContent = instagramCount;

    // Update Twitter count
    const twitterCount = result[`${ACTIVITY_KEYS.twitter}_${today}`] || 0;
    document.getElementById('twitter-count').textContent = twitterCount;

    // Update Google count
    const googleCount = result[`${ACTIVITY_KEYS.google}_${today}`] || 0;
    document.getElementById('google-count').textContent = googleCount;

  } catch (error) {
    console.error('[10X Popup] Error loading activity stats:', error);
  }
}

/**
 * Update rate limits
 */
async function updateRateLimits() {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Get all rate limit counts for today
    const keys = Object.values(RATE_LIMITS).map(config => `${config.key}_${today}`);
    const result = await chrome.storage.local.get(keys);

    // Update each rate limit
    for (const [limitKey, config] of Object.entries(RATE_LIMITS)) {
      const storageKey = `${config.key}_${today}`;
      const count = result[storageKey] || 0;
      const percentage = Math.min((count / config.daily) * 100, 100);

      // Update count text
      const countEl = document.querySelector(`[data-limit="${limitKey}"]`);
      if (countEl) {
        countEl.textContent = `${count}/${config.daily}`;
      }

      // Update progress bar
      const progressEl = document.querySelector(`[data-progress="${limitKey}"]`);
      if (progressEl) {
        progressEl.style.width = `${percentage}%`;

        // Change color if limit reached
        if (percentage >= 100) {
          progressEl.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        } else {
          progressEl.style.background = 'linear-gradient(90deg, #6366f1, #4f46e5)';
        }
      }
    }
  } catch (error) {
    console.error('[10X Popup] Error loading rate limits:', error);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });

  // Reconnect button
  document.getElementById('reconnect-btn').addEventListener('click', async () => {
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
      alert('Failed to reconnect. Check console for details.');
    }
  });

  // Clear stats button
  document.getElementById('clear-stats-btn').addEventListener('click', async () => {
    if (!confirm('Clear all activity stats and rate limit counters for today?')) {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const keysToRemove = [
        ...Object.values(ACTIVITY_KEYS).map(key => `${key}_${today}`),
        ...Object.values(RATE_LIMITS).map(config => `${config.key}_${today}`)
      ];

      await chrome.storage.local.remove(keysToRemove);
      console.log('[10X Popup] Stats cleared');

      await updateActivityStats();
      await updateRateLimits();

      showNotification('Stats cleared successfully');
    } catch (error) {
      console.error('[10X Popup] Error clearing stats:', error);
      alert('Failed to clear stats. Check console for details.');
    }
  });

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/settings.html') });
  });

  // Activity filters
  document.getElementById('activity-type-filter').addEventListener('change', loadActivities);
  document.getElementById('prospects-only-filter').addEventListener('change', loadActivities);

  // Activity actions
  document.getElementById('export-activities-btn').addEventListener('click', exportActivities);
  document.getElementById('clear-activities-btn').addEventListener('click', clearActivities);
  document.getElementById('load-more-activities').addEventListener('click', () => {
    activityOffset += activityLimit;
    loadActivities(false);
  });

  // Prospect actions
  document.getElementById('csv-file-input').addEventListener('change', handleCSVImport);
  document.getElementById('export-prospects-btn').addEventListener('click', exportProspects);
  document.getElementById('clear-prospects-btn').addEventListener('click', clearProspects);
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.dataset.content === tabName);
  });

  // Load content for the active tab
  if (tabName === 'activity') {
    activityOffset = 0;
    loadActivities();
  } else if (tabName === 'prospects') {
    loadProspects();
  }
}

// Activity pagination
let activityOffset = 0;
const activityLimit = 20;

/**
 * Load activities from database
 */
async function loadActivities(reset = true) {
  if (reset) activityOffset = 0;

  try {
    const filters = {};

    // Apply type filter
    const typeFilter = document.getElementById('activity-type-filter').value;
    if (typeFilter) {
      filters.type = typeFilter;
    }

    // Apply prospect filter
    const prospectsOnly = document.getElementById('prospects-only-filter').checked;
    if (prospectsOnly) {
      filters.isProspect = true;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'GET_ACTIVITIES',
      filters
    });

    if (response.success) {
      const activities = response.activities.slice(activityOffset, activityOffset + activityLimit);
      const activityList = document.getElementById('activity-list');

      if (reset) {
        activityList.innerHTML = '';
      }

      if (activities.length === 0 && reset) {
        activityList.innerHTML = '<div class="empty-state"><p>No activities yet</p></div>';
        return;
      }

      activities.forEach(activity => {
        const item = createActivityItem(activity);
        activityList.appendChild(item);
      });

      // Show/hide load more button
      const loadMoreBtn = document.getElementById('load-more-activities');
      loadMoreBtn.style.display = response.activities.length > activityOffset + activityLimit ? 'block' : 'none';
    }
  } catch (error) {
    console.error('[10X Popup] Error loading activities:', error);
  }
}

/**
 * Create activity item element
 */
function createActivityItem(activity) {
  const item = document.createElement('div');
  item.className = 'activity-item';

  let iconType = 'view';
  let iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" stroke-width="2"/></svg>';

  if (activity.type === 'LINKEDIN_CONNECTION_REQUEST') {
    iconType = 'connect';
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor" stroke-width="2"/></svg>';
  } else if (activity.type === 'LINKEDIN_MESSAGE_SENT') {
    iconType = 'message';
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" stroke="currentColor" stroke-width="2"/></svg>';
  }

  const timeAgo = getTimeAgo(activity.timestamp);

  item.innerHTML = `
    <div class="activity-item-icon ${iconType}">
      ${iconSvg}
    </div>
    <div class="activity-item-content">
      <div class="activity-item-header">
        <span class="activity-item-name">${activity.data.name || activity.data.username || 'Unknown'}</span>
        ${activity.isProspect ? '<span class="activity-item-badge">Prospect</span>' : ''}
      </div>
      <div class="activity-item-details">${activity.data.headline || activity.data.company || ''}</div>
      <div class="activity-item-time">${timeAgo}</div>
    </div>
  `;

  return item;
}

/**
 * Get relative time string
 */
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Export activities to CSV
 */
async function exportActivities() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVITIES', filters: {} });

    if (response.success && response.activities.length > 0) {
      const csv = convertActivitiesToCSV(response.activities);
      downloadCSV(csv, `activities-${new Date().toISOString().split('T')[0]}.csv`);
      showNotification('Activities exported successfully');
    } else {
      alert('No activities to export');
    }
  } catch (error) {
    console.error('[10X Popup] Error exporting activities:', error);
    alert('Failed to export activities');
  }
}

/**
 * Convert activities to CSV
 */
function convertActivitiesToCSV(activities) {
  const headers = ['timestamp', 'type', 'platform', 'name', 'headline', 'company', 'url', 'isProspect'];
  const rows = activities.map(activity => [
    new Date(activity.timestamp).toISOString(),
    activity.type,
    activity.platform,
    activity.data.name || '',
    activity.data.headline || '',
    activity.data.company || '',
    activity.url,
    activity.isProspect ? 'Yes' : 'No'
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Clear all activities
 */
async function clearActivities() {
  if (!confirm('Clear all activities? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_ACTIVITIES' });
    activityOffset = 0;
    loadActivities();
    showNotification('Activities cleared successfully');
  } catch (error) {
    console.error('[10X Popup] Error clearing activities:', error);
    alert('Failed to clear activities');
  }
}

/**
 * Load prospects from database
 */
async function loadProspects() {
  try {
    const [prospectsResponse, activitiesResponse] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'GET_ALL_PROSPECTS' }),
      chrome.runtime.sendMessage({ type: 'GET_ACTIVITIES', filters: { isProspect: true } })
    ]);

    if (prospectsResponse.success) {
      const prospects = prospectsResponse.prospects;
      const prospectsList = document.getElementById('prospects-list');

      // Update stats
      document.getElementById('total-prospects').textContent = prospects.length;
      document.getElementById('prospect-interactions').textContent = activitiesResponse.success ? activitiesResponse.activities.length : 0;

      // Render prospects
      prospectsList.innerHTML = '';

      if (prospects.length === 0) {
        prospectsList.innerHTML = '<div class="empty-state"><p>No prospects imported yet</p></div>';
        return;
      }

      prospects.forEach(prospect => {
        const item = createProspectItem(prospect);
        prospectsList.appendChild(item);
      });
    }
  } catch (error) {
    console.error('[10X Popup] Error loading prospects:', error);
  }
}

/**
 * Create prospect item element
 */
function createProspectItem(prospect) {
  const item = document.createElement('div');
  item.className = 'prospect-item';

  item.innerHTML = `
    <div class="prospect-item-name">${prospect.name || 'Unknown'}</div>
    <div class="prospect-item-details">
      ${prospect.email ? `📧 ${prospect.email}` : ''}
      ${prospect.company ? `  🏢 ${prospect.company}` : ''}
    </div>
  `;

  return item;
}

/**
 * Handle CSV import
 */
async function handleCSVImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const prospects = parseCSV(text);

    if (prospects.length === 0) {
      alert('No valid prospects found in CSV');
      return;
    }

    // Save prospects to database
    for (const prospect of prospects) {
      await chrome.runtime.sendMessage({
        type: 'SAVE_PROSPECT',
        prospect
      });
    }

    showNotification(`Imported ${prospects.length} prospects successfully`);
    loadProspects();
  } catch (error) {
    console.error('[10X Popup] Error importing CSV:', error);
    alert('Failed to import CSV. Make sure it has a linkedin_url column.');
  }

  // Reset file input
  event.target.value = '';
}

/**
 * Parse CSV file
 */
function parseCSV(text) {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const linkedinUrlIndex = headers.findIndex(h => h.includes('linkedin') && h.includes('url'));

  if (linkedinUrlIndex === -1) {
    throw new Error('CSV must have a linkedin_url column');
  }

  const prospects = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const linkedinUrl = values[linkedinUrlIndex];

    if (linkedinUrl && linkedinUrl.includes('linkedin.com')) {
      const prospect = { linkedin_url: linkedinUrl };

      headers.forEach((header, index) => {
        if (values[index] && header !== 'linkedin_url') {
          prospect[header] = values[index];
        }
      });

      prospects.push(prospect);
    }
  }

  return prospects;
}

/**
 * Export prospects to CSV
 */
async function exportProspects() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_PROSPECTS' });

    if (response.success && response.prospects.length > 0) {
      const csv = convertProspectsToCSV(response.prospects);
      downloadCSV(csv, `prospects-${new Date().toISOString().split('T')[0]}.csv`);
      showNotification('Prospects exported successfully');
    } else {
      alert('No prospects to export');
    }
  } catch (error) {
    console.error('[10X Popup] Error exporting prospects:', error);
    alert('Failed to export prospects');
  }
}

/**
 * Convert prospects to CSV
 */
function convertProspectsToCSV(prospects) {
  if (prospects.length === 0) return '';

  const allKeys = [...new Set(prospects.flatMap(p => Object.keys(p)))];
  const headers = ['linkedin_url', ...allKeys.filter(k => k !== 'linkedin_url')];

  const rows = prospects.map(prospect =>
    headers.map(header => prospect[header] || '')
  );

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
 * Clear all prospects
 */
async function clearProspects() {
  if (!confirm('Clear all prospects? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_PROSPECTS' });
    loadProspects();
    showNotification('Prospects cleared successfully');
  } catch (error) {
    console.error('[10X Popup] Error clearing prospects:', error);
    alert('Failed to clear prospects');
  }
}

/**
 * Show notification toast
 */
function showNotification(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    padding: 12px 16px;
    background: #10b981;
    color: white;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Calculate percentage
 */
function calculatePercentage(current, max) {
  return Math.min((current / max) * 100, 100);
}

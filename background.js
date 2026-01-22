/**
 * 10X.in Universal Browser Automation - Background Service Worker
 *
 * Developed by team 10X.in
 * Multi-platform browser automation with activity tracking and prospect management
 * Connects to WebSocket server and executes browser automation commands
 */

/**
 * 10X.in Universal Browser Automation v2.0 - Background Service Worker
 * GOD-LEVEL Browser Automation
 *
 * Developed by team 10X.in
 */

// Configuration
const CONFIG = {
  WEBSOCKET_URL: 'ws://localhost:3000/ws',
  HTTP_API_URL: 'http://localhost:3000/api',
  RECONNECT_DELAY: 5000,
  MAX_RECONNECT_ATTEMPTS: 10,
  HEARTBEAT_INTERVAL: 30000
};

// State
let ws = null;
let reconnectAttempts = 0;
let reconnectTimeout = null;
let heartbeatInterval = null;
let isConnected = false;
let pendingCommands = [];

// Database stores (IndexedDB)
const DB_NAME = '10XBrowser';
const DB_VERSION = 2;
const STORES = {
  ACTIVITIES: 'activities',
  COMMANDS: 'commands',
  RESULTS: 'results',
  SETTINGS: 'settings',
  PROSPECTS: 'prospects',
  WORKFLOWS: 'workflows',
  RECORDINGS: 'recordings',
  SELECTORS: 'selectors',
  SCHEDULES: 'schedules',
  VARIABLES: 'variables'
};

// State for new features
let lastWorkflowId = null;
let activeRecording = null;

let db = null;

// Initialize IndexedDB
function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[10X Browser] Database error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[10X Browser] Database initialized');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('[10X Browser] Database upgrade needed');

      // Activities store
      if (!db.objectStoreNames.contains(STORES.ACTIVITIES)) {
        const activitiesStore = db.createObjectStore(STORES.ACTIVITIES, {
          keyPath: 'id',
          autoIncrement: true
        });
        activitiesStore.createIndex('timestamp', 'timestamp', { unique: false });
        activitiesStore.createIndex('platform', 'platform', { unique: false });
        activitiesStore.createIndex('type', 'type', { unique: false });
        activitiesStore.createIndex('url', 'url', { unique: false });
        activitiesStore.createIndex('date', 'date', { unique: false });
      }

      // Prospects store
      if (!db.objectStoreNames.contains(STORES.PROSPECTS)) {
        const prospectsStore = db.createObjectStore(STORES.PROSPECTS, {
          keyPath: 'linkedin_url'
        });
        prospectsStore.createIndex('email', 'email', { unique: false });
        prospectsStore.createIndex('name', 'name', { unique: false });
        prospectsStore.createIndex('company', 'company', { unique: false });
      }

      // Commands store
      if (!db.objectStoreNames.contains(STORES.COMMANDS)) {
        db.createObjectStore(STORES.COMMANDS, {
          keyPath: 'id',
          autoIncrement: true
        });
      }

      // Results store
      if (!db.objectStoreNames.contains(STORES.RESULTS)) {
        db.createObjectStore(STORES.RESULTS, {
          keyPath: 'commandId'
        });
      }

      // Settings store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      // Workflows store (v2)
      if (!db.objectStoreNames.contains(STORES.WORKFLOWS)) {
        const workflowStore = db.createObjectStore(STORES.WORKFLOWS, { keyPath: 'id' });
        workflowStore.createIndex('name', 'name', { unique: false });
        workflowStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Recordings store (v2)
      if (!db.objectStoreNames.contains(STORES.RECORDINGS)) {
        const recordingStore = db.createObjectStore(STORES.RECORDINGS, { keyPath: 'id' });
        recordingStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Selectors cache store (v2)
      if (!db.objectStoreNames.contains(STORES.SELECTORS)) {
        const selectorStore = db.createObjectStore(STORES.SELECTORS, { keyPath: 'key' });
        selectorStore.createIndex('domain', 'domain', { unique: false });
      }

      // Schedules store (v2)
      if (!db.objectStoreNames.contains(STORES.SCHEDULES)) {
        const scheduleStore = db.createObjectStore(STORES.SCHEDULES, { keyPath: 'id' });
        scheduleStore.createIndex('workflowId', 'workflowId', { unique: false });
      }

      // Variables store (v2)
      if (!db.objectStoreNames.contains(STORES.VARIABLES)) {
        db.createObjectStore(STORES.VARIABLES, { keyPath: 'key' });
      }
    };
  });
}

// Database Helper Functions
function normalizeLinkedInUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);

    // Extract username from paths like /in/username/ or /in/username
    if (pathParts[0] === 'in' && pathParts[1]) {
      const username = pathParts[1];
      return `https://www.linkedin.com/in/${username}`;
    }

    return url;
  } catch (error) {
    return url;
  }
}

function saveActivity(activity) {
  if (!db) {
    console.warn('[10X Browser] Database not initialized');
    return Promise.reject(new Error('Database not initialized'));
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ACTIVITIES], 'readwrite');
    const store = transaction.objectStore(STORES.ACTIVITIES);

    // Add date field for easy querying
    activity.date = new Date(activity.timestamp).toISOString().split('T')[0];

    const request = store.add(activity);

    request.onsuccess = () => {
      console.log('[10X Browser] Activity saved:', activity.type);
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('[10X Browser] Failed to save activity:', request.error);
      reject(request.error);
    };
  });
}

function getActivities(filters = {}) {
  if (!db) return Promise.reject(new Error('Database not initialized'));

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.ACTIVITIES], 'readonly');
    const store = transaction.objectStore(STORES.ACTIVITIES);
    const request = store.getAll();

    request.onsuccess = () => {
      let activities = request.result;

      // Apply filters
      if (filters.platform) {
        activities = activities.filter(a => a.platform === filters.platform);
      }
      if (filters.type) {
        activities = activities.filter(a => a.type === filters.type);
      }
      if (filters.date) {
        activities = activities.filter(a => a.date === filters.date);
      }
      if (filters.isProspect !== undefined) {
        activities = activities.filter(a => a.isProspect === filters.isProspect);
      }

      // Sort by timestamp descending
      activities.sort((a, b) => b.timestamp - a.timestamp);

      resolve(activities);
    };

    request.onerror = () => reject(request.error);
  });
}

async function checkProspect(linkedinUrl) {
  if (!db) return null;

  const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PROSPECTS], 'readonly');
    const store = transaction.objectStore(STORES.PROSPECTS);
    const request = store.get(normalizedUrl);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

function saveProspect(prospect) {
  if (!db) return Promise.reject(new Error('Database not initialized'));

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PROSPECTS], 'readwrite');
    const store = transaction.objectStore(STORES.PROSPECTS);

    // Normalize URL
    if (prospect.linkedin_url) {
      prospect.linkedin_url = normalizeLinkedInUrl(prospect.linkedin_url);
    }

    const request = store.put(prospect);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllProspects() {
  if (!db) return Promise.reject(new Error('Database not initialized'));

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PROSPECTS], 'readonly');
    const store = transaction.objectStore(STORES.PROSPECTS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Initialize extension
console.log('[10X Browser] Extension loaded');

// Initialize database first, then connect
initDatabase()
  .then(() => {
    console.log('[10X Browser] Database ready');
    connectToWebSocket();
  })
  .catch((error) => {
    console.error('[10X Browser] Failed to initialize database:', error);
    // Still try to connect even if database fails
    connectToWebSocket();
  });

/**
 * Connect to Canvas WebSocket Server
 */
function connectToWebSocket() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    console.log('[10X Browser] Already connected or connecting');
    return;
  }

  console.log(`[10X Browser] Connecting to ${CONFIG.WEBSOCKET_URL}...`);

  try {
    ws = new WebSocket(CONFIG.WEBSOCKET_URL);

    ws.onopen = handleWebSocketOpen;
    ws.onmessage = handleWebSocketMessage;
    ws.onerror = handleWebSocketError;
    ws.onclose = handleWebSocketClose;

  } catch (error) {
    console.error('[10X Browser] WebSocket connection error:', error);
    scheduleReconnect();
  }
}

/**
 * Handle WebSocket open
 */
function handleWebSocketOpen() {
  console.log('[10X Browser] ✅ Connected to Canvas WebSocket');
  isConnected = true;
  reconnectAttempts = 0;

  // Clear reconnect timeout
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Send identification message
  sendToWebSocket({
    type: 'extension-connected',
    payload: {
      extensionId: chrome.runtime.id,
      version: chrome.runtime.getManifest().version,
      capabilities: [
        'navigate',
        'click',
        'type',
        'scrape',
        'linkedin',
        'instagram',
        'twitter',
        'google'
      ]
    }
  });

  // Start heartbeat
  startHeartbeat();

  // Process pending commands
  processPendingCommands();

  // Update extension badge
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
}

/**
 * Handle WebSocket message from Canvas
 */
async function handleWebSocketMessage(event) {
  try {
    const message = JSON.parse(event.data);
    console.log('[10X Browser] Received command:', message.type);

    switch (message.type) {
      case 'browser-command':
        await executeBrowserCommand(message.payload);
        break;

      case 'linkedin-action':
        await executeLinkedInAction(message.payload);
        break;

      case 'instagram-action':
        await executeInstagramAction(message.payload);
        break;

      case 'twitter-action':
        await executeTwitterAction(message.payload);
        break;

      case 'google-action':
        await executeGoogleAction(message.payload);
        break;

      case 'ping':
        sendToWebSocket({ type: 'pong', timestamp: Date.now() });
        break;

      default:
        console.warn('[10X Browser] Unknown message type:', message.type);
    }

  } catch (error) {
    console.error('[10X Browser] Error handling message:', error);
    sendToWebSocket({
      type: 'error',
      error: error.message,
      originalMessage: event.data
    });
  }
}

/**
 * Handle WebSocket error
 */
function handleWebSocketError(error) {
  console.error('[10X Browser] WebSocket error:', error);
  isConnected = false;

  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
}

/**
 * Handle WebSocket close
 */
function handleWebSocketClose(event) {
  console.log('[10X Browser] WebSocket closed:', event.code, event.reason);
  isConnected = false;

  stopHeartbeat();

  chrome.action.setBadgeText({ text: '✗' });
  chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });

  // Auto-reconnect
  scheduleReconnect();
}

/**
 * Schedule reconnection
 */
function scheduleReconnect() {
  if (reconnectAttempts >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
    console.error('[10X Browser] Max reconnect attempts reached');
    return;
  }

  const delay = CONFIG.RECONNECT_DELAY * Math.pow(2, reconnectAttempts); // Exponential backoff
  reconnectAttempts++;

  console.log(`[10X Browser] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${CONFIG.MAX_RECONNECT_ATTEMPTS})`);

  reconnectTimeout = setTimeout(() => {
    connectToWebSocket();
  }, delay);
}

/**
 * Start heartbeat
 */
function startHeartbeat() {
  stopHeartbeat();

  heartbeatInterval = setInterval(() => {
    if (isConnected) {
      sendToWebSocket({ type: 'heartbeat', timestamp: Date.now() });
    }
  }, CONFIG.HEARTBEAT_INTERVAL);
}

/**
 * Stop heartbeat
 */
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

/**
 * Send message to WebSocket
 */
function sendToWebSocket(message) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[10X Browser] WebSocket not connected, queueing command');
    pendingCommands.push(message);
    return false;
  }

  try {
    ws.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error('[10X Browser] Error sending message:', error);
    pendingCommands.push(message);
    return false;
  }
}

/**
 * Process pending commands
 */
function processPendingCommands() {
  if (pendingCommands.length === 0) return;

  console.log(`[10X Browser] Processing ${pendingCommands.length} pending commands`);

  const commands = [...pendingCommands];
  pendingCommands = [];

  commands.forEach(command => {
    sendToWebSocket(command);
  });
}

/**
 * Execute browser command
 */
async function executeBrowserCommand(command) {
  console.log('[10X Browser] Executing command:', command.action);

  try {
    let result;

    switch (command.action) {
      case 'NAVIGATE':
        result = await navigateToUrl(command.url);
        break;

      case 'CLICK':
        result = await clickElement(command.selector, command.options);
        break;

      case 'TYPE':
        result = await typeText(command.selector, command.text, command.options);
        break;

      case 'SCRAPE':
        result = await scrapeData(command.selectors);
        break;

      case 'EXECUTE_SCRIPT':
        result = await executeScript(command.script, command.args);
        break;

      default:
        throw new Error(`Unknown action: ${command.action}`);
    }

    // Send success response
    sendToWebSocket({
      type: 'command-result',
      commandId: command.id,
      success: true,
      result
    });

  } catch (error) {
    console.error('[10X Browser] Command failed:', error);

    sendToWebSocket({
      type: 'command-result',
      commandId: command.id,
      success: false,
      error: error.message
    });
  }
}

/**
 * Navigate to URL
 */
async function navigateToUrl(url) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.tabs.update(tab.id, { url });

  // Wait for page load
  await new Promise((resolve) => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });

  return { success: true, url };
}

/**
 * Click element
 */
async function clickElement(selector, options = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (sel, opts) => {
      const element = document.querySelector(sel);
      if (!element) {
        throw new Error(`Element not found: ${sel}`);
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (opts.delay) {
        return new Promise(resolve => {
          setTimeout(() => {
            element.click();
            resolve({ clicked: true, selector: sel });
          }, opts.delay);
        });
      } else {
        element.click();
        return { clicked: true, selector: sel };
      }
    },
    args: [selector, options]
  });

  return result[0].result;
}

/**
 * Type text
 */
async function typeText(selector, text, options = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (sel, txt, opts) => {
      const element = document.querySelector(sel);
      if (!element) {
        throw new Error(`Element not found: ${sel}`);
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();

      // Clear existing text if specified
      if (opts.clear) {
        element.value = '';
      }

      // Type character by character if humanize is enabled
      if (opts.humanize) {
        return new Promise(resolve => {
          let i = 0;
          const interval = setInterval(() => {
            if (i < txt.length) {
              element.value += txt[i];
              element.dispatchEvent(new Event('input', { bubbles: true }));
              i++;
            } else {
              clearInterval(interval);
              element.dispatchEvent(new Event('change', { bubbles: true }));
              resolve({ typed: true, selector: sel, text: txt });
            }
          }, 50 + Math.random() * 50); // 50-100ms per character
        });
      } else {
        element.value = opts.clear ? txt : element.value + txt;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return { typed: true, selector: sel, text: txt };
      }
    },
    args: [selector, text, options]
  });

  return result[0].result;
}

/**
 * Scrape data
 */
async function scrapeData(selectors) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (sels) => {
      const data = {};

      for (const [key, selector] of Object.entries(sels)) {
        const element = document.querySelector(selector);
        data[key] = element ? element.textContent.trim() : null;
      }

      return data;
    },
    args: [selectors]
  });

  return result[0].result;
}

/**
 * Execute script
 */
async function executeScript(script, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: new Function('args', script),
    args: [args]
  });

  return result[0].result;
}

/**
 * Execute LinkedIn action
 */
async function executeLinkedInAction(action) {
  console.log('[10X Browser] LinkedIn action:', action.type);

  // Import LinkedIn handler
  const { default: LinkedInHandler } = await import('./handlers/linkedin.js');
  const handler = new LinkedInHandler();

  const result = await handler.execute(action);

  sendToWebSocket({
    type: 'action-result',
    platform: 'linkedin',
    actionType: action.type,
    success: true,
    result
  });
}

/**
 * Execute Instagram action
 */
async function executeInstagramAction(action) {
  console.log('[10X Browser] Instagram action:', action.type);

  const { default: InstagramHandler } = await import('./handlers/instagram.js');
  const handler = new InstagramHandler();

  const result = await handler.execute(action);

  sendToWebSocket({
    type: 'action-result',
    platform: 'instagram',
    actionType: action.type,
    success: true,
    result
  });
}

/**
 * Execute Twitter action
 */
async function executeTwitterAction(action) {
  console.log('[10X Browser] Twitter action:', action.type);

  const { default: TwitterHandler } = await import('./handlers/twitter.js');
  const handler = new TwitterHandler();

  const result = await handler.execute(action);

  sendToWebSocket({
    type: 'action-result',
    platform: 'twitter',
    actionType: action.type,
    success: true,
    result
  });
}

/**
 * Execute Google action
 */
async function executeGoogleAction(action) {
  console.log('[10X Browser] Google action:', action.type);

  const { default: GoogleHandler } = await import('./handlers/google.js');
  const handler = new GoogleHandler();

  const result = await handler.execute(action);

  sendToWebSocket({
    type: 'action-result',
    platform: 'google',
    actionType: action.type,
    success: true,
    result
  });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[10X Browser] Message from content script:', message.type);

  (async () => {
    try {
      switch (message.type) {
        case 'ACTIVITY_TRACKED':
          // Save activities to database
          if (Array.isArray(message.activity)) {
            // Multiple activities
            for (const activity of message.activity) {
              // Check if it's a prospect
              if (activity.platform === 'linkedin' && activity.url) {
                const prospect = await checkProspect(activity.url);
                if (prospect) {
                  activity.isProspect = true;
                  activity.prospectData = prospect;
                }
              }
              await saveActivity(activity);
            }
          } else {
            // Single activity
            const activity = message.activity;
            if (activity.platform === 'linkedin' && activity.url) {
              const prospect = await checkProspect(activity.url);
              if (prospect) {
                activity.isProspect = true;
                activity.prospectData = prospect;
              }
            }
            await saveActivity(activity);
          }

          // Forward activity to WebSocket
          sendToWebSocket({
            type: 'activity-tracked',
            platform: message.platform,
            activity: message.activity
          });

          sendResponse({ success: true });
          break;

        case 'GET_CONNECTION_STATUS':
          sendResponse({ connected: isConnected });
          break;

        case 'GET_ACTIVITIES':
          const activities = await getActivities(message.filters);
          sendResponse({ success: true, activities });
          break;

        case 'CHECK_PROSPECT':
          const prospect = await checkProspect(message.url);
          sendResponse({ success: true, prospect, isProspect: !!prospect });
          break;

        case 'SAVE_PROSPECT':
          await saveProspect(message.prospect);
          sendResponse({ success: true });
          break;

        case 'GET_ALL_PROSPECTS':
          const prospects = await getAllProspects();
          sendResponse({ success: true, prospects });
          break;

        case 'CLEAR_ACTIVITIES':
          if (db) {
            const transaction = db.transaction([STORES.ACTIVITIES], 'readwrite');
            const store = transaction.objectStore(STORES.ACTIVITIES);
            await store.clear();
          }
          sendResponse({ success: true });
          break;

        case 'CLEAR_PROSPECTS':
          if (db) {
            const transaction = db.transaction([STORES.PROSPECTS], 'readwrite');
            const store = transaction.objectStore(STORES.PROSPECTS);
            await store.clear();
          }
          sendResponse({ success: true });
          break;

        case 'RECONNECT':
          // Manual reconnect from popup
          console.log('[10X Browser] Manual reconnect requested');
          if (ws) {
            ws.close();
          }
          reconnectAttempts = 0;
          connectToWebSocket();
          sendResponse({ success: true });
          break;

        // ========== Recording Handlers ==========
        case 'RECORDING_STARTED':
          activeRecording = { startTime: Date.now(), tabId: sender.tab?.id };
          console.log('[10X Browser] Recording started');
          sendResponse({ success: true });
          break;

        case 'RECORDING_STOPPED':
          if (activeRecording) {
            // Save recording to database
            const recordingData = {
              id: `rec_${Date.now()}`,
              timestamp: activeRecording.startTime,
              duration: Date.now() - activeRecording.startTime,
              actionCount: message.actionCount || 0,
              url: sender.tab?.url
            };
            await saveToStore(STORES.RECORDINGS, recordingData);
          }
          activeRecording = null;
          sendResponse({ success: true });
          break;

        case 'START_RECORDING':
          // Send to active tab
          const [recTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (recTab) {
            chrome.tabs.sendMessage(recTab.id, { type: 'START_RECORDING' });
          }
          sendResponse({ success: true });
          break;

        case 'STOP_RECORDING':
          const [stopTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (stopTab) {
            chrome.tabs.sendMessage(stopTab.id, { type: 'STOP_RECORDING' });
          }
          sendResponse({ success: true });
          break;

        // ========== Workflow Handlers ==========
        case 'SAVE_WORKFLOW':
          await saveToStore(STORES.WORKFLOWS, message.workflow);
          lastWorkflowId = message.workflow.id;
          sendResponse({ success: true, id: message.workflow.id });
          break;

        case 'GET_WORKFLOWS':
          const workflows = await getAllFromStore(STORES.WORKFLOWS);
          sendResponse({ success: true, workflows });
          break;

        case 'GET_WORKFLOW':
          const workflow = await getFromStore(STORES.WORKFLOWS, message.id);
          sendResponse({ success: true, workflow });
          break;

        case 'DELETE_WORKFLOW':
          await deleteFromStore(STORES.WORKFLOWS, message.id);
          sendResponse({ success: true });
          break;

        case 'RUN_WORKFLOW':
          // Execute workflow in active tab
          const [wfTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (wfTab) {
            const wf = await getFromStore(STORES.WORKFLOWS, message.workflowId);
            if (wf) {
              chrome.tabs.sendMessage(wfTab.id, { type: 'EXECUTE_WORKFLOW', workflow: wf });
              lastWorkflowId = message.workflowId;
            }
          }
          sendResponse({ success: true });
          break;

        case 'RUN_LAST_WORKFLOW':
          if (lastWorkflowId) {
            const [lastTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const lastWf = await getFromStore(STORES.WORKFLOWS, lastWorkflowId);
            if (lastWf && lastTab) {
              chrome.tabs.sendMessage(lastTab.id, { type: 'EXECUTE_WORKFLOW', workflow: lastWf });
            }
          }
          sendResponse({ success: true, workflowId: lastWorkflowId });
          break;

        case 'GET_RECENT_WORKFLOWS':
          const recentWfs = await getAllFromStore(STORES.WORKFLOWS);
          const sorted = recentWfs.sort((a, b) => (b.statistics?.lastRun || 0) - (a.statistics?.lastRun || 0));
          sendResponse({ success: true, workflows: sorted.slice(0, 5) });
          break;

        case 'WORKFLOW_ACTION':
          // Handle workflow actions from content script
          console.log('[10X Browser] Workflow action:', message.action);
          sendResponse({ success: true });
          break;

        // ========== Scraping Handlers ==========
        case 'SCRAPE_PAGE':
          const [scrapeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (scrapeTab) {
            chrome.tabs.sendMessage(scrapeTab.id, { type: 'SCRAPE_PAGE' }, (response) => {
              sendResponse(response || { error: 'No response from tab' });
            });
          } else {
            sendResponse({ error: 'No active tab' });
          }
          break;

        case 'EXTRACT_BY_TYPE':
          const [extractTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (extractTab) {
            chrome.tabs.sendMessage(extractTab.id, { type: 'EXTRACT_BY_TYPE', dataType: message.dataType }, (response) => {
              sendResponse(response || { error: 'No response from tab' });
            });
          }
          break;

        // ========== NLP Command Handlers ==========
        case 'EXECUTE_NLP_COMMAND':
          const [nlpTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (nlpTab) {
            chrome.tabs.sendMessage(nlpTab.id, { type: 'EXECUTE_NLP_COMMAND', parsed: message.parsed }, (response) => {
              sendResponse(response || { error: 'No response from tab' });
            });
          }
          break;

        case 'PARSE_COMMAND':
          const [parseTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (parseTab) {
            chrome.tabs.sendMessage(parseTab.id, { type: 'PARSE_COMMAND', command: message.command }, (response) => {
              sendResponse(response || { error: 'No response from tab' });
            });
          }
          break;

        // ========== Variables Handlers ==========
        case 'SET_VARIABLE':
          await saveToStore(STORES.VARIABLES, { key: message.key, value: message.value, updatedAt: Date.now() });
          sendResponse({ success: true });
          break;

        case 'GET_VARIABLE':
          const variable = await getFromStore(STORES.VARIABLES, message.key);
          sendResponse({ success: true, value: variable?.value });
          break;

        case 'DELETE_VARIABLE':
          await deleteFromStore(STORES.VARIABLES, message.key);
          sendResponse({ success: true });
          break;

        // ========== UI Handlers ==========
        case 'OPEN_COMMAND_PALETTE':
          const [paletteTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (paletteTab) {
            chrome.tabs.sendMessage(paletteTab.id, { type: 'OPEN_COMMAND_PALETTE' });
          }
          sendResponse({ success: true });
          break;

        case 'OPEN_SETTINGS':
          chrome.runtime.openOptionsPage();
          sendResponse({ success: true });
          break;

        case 'SHOW_HELP':
          chrome.tabs.create({ url: 'https://10x.in/docs/extension' });
          sendResponse({ success: true });
          break;

        case 'OPEN_WORKFLOW_BUILDER':
          chrome.tabs.create({ url: chrome.runtime.getURL('ui/workflow-builder/builder.html') });
          sendResponse({ success: true });
          break;

        case 'SHOW_WORKFLOWS':
          // Could open a workflows management page
          chrome.tabs.create({ url: chrome.runtime.getURL('ui/workflow-builder/builder.html') });
          sendResponse({ success: true });
          break;

        // ========== Screenshot Handler ==========
        case 'TAKE_SCREENSHOT':
          const [ssTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (ssTab) {
            const dataUrl = await chrome.tabs.captureVisibleTab(ssTab.windowId, { format: 'png' });
            sendResponse({ success: true, dataUrl });
          }
          break;

        // ========== Element Selection Handler ==========
        case 'ELEMENT_SELECTED':
          console.log('[10X Browser] Element selected:', message.info);
          // Forward to any listeners
          sendToWebSocket({ type: 'element-selected', info: message.info });
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[10X Browser] Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep channel open for async response
});

// ========== Database Helper Functions ==========

async function saveToStore(storeName, data) {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

async function getFromStore(storeName, key) {
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllFromStore(storeName) {
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function deleteFromStore(storeName, key) {
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[10X Browser] Extension installed:', details.reason);

  if (details.reason === 'install') {
    // Open welcome page
    chrome.tabs.create({ url: 'popup/welcome.html' });
  }

  if (details.reason === 'update') {
    console.log('[10X Browser] Extension updated to v2.0 - GOD-LEVEL features enabled');
  }
});

// ========== Keyboard Command Handlers ==========

chrome.commands.onCommand.addListener(async (command) => {
  console.log('[10X Browser] Command received:', command);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  switch (command) {
    case 'open-command-palette':
      chrome.tabs.sendMessage(tab.id, { type: 'OPEN_COMMAND_PALETTE' });
      break;

    case 'start-recording':
      chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' });
      break;

    case 'scrape-page':
      chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' }, (response) => {
        if (response?.result) {
          // Copy to clipboard via content script
          chrome.tabs.sendMessage(tab.id, {
            type: 'COPY_TO_CLIPBOARD',
            text: JSON.stringify(response.result, null, 2)
          });
        }
      });
      break;

    case 'run-last-workflow':
      if (lastWorkflowId) {
        const workflow = await getFromStore(STORES.WORKFLOWS, lastWorkflowId);
        if (workflow) {
          chrome.tabs.sendMessage(tab.id, { type: 'EXECUTE_WORKFLOW', workflow });
        }
      }
      break;
  }
});

// ========== Tab Orchestration ==========

class TabOrchestrator {
  constructor() {
    this.runningTasks = new Map();
    this.maxConcurrent = 5;
  }

  async runParallel(tasks) {
    const queue = [...tasks];
    const results = [];

    while (queue.length > 0 || this.runningTasks.size > 0) {
      // Start new tasks up to limit
      while (queue.length > 0 && this.runningTasks.size < this.maxConcurrent) {
        const task = queue.shift();
        const tabPromise = this.executeInNewTab(task);
        this.runningTasks.set(task.id, tabPromise);
      }

      // Wait for any to complete
      if (this.runningTasks.size > 0) {
        const completed = await Promise.race([...this.runningTasks.values()]);
        results.push(completed);
        this.runningTasks.delete(completed.taskId);
      }
    }

    return results;
  }

  async executeInNewTab(task) {
    const tab = await chrome.tabs.create({ url: task.url, active: false });

    // Wait for page load
    await new Promise(resolve => {
      const listener = (tabId, info) => {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });

    // Execute task actions
    let result = null;
    try {
      for (const action of task.actions || []) {
        await chrome.tabs.sendMessage(tab.id, action);
      }
      result = { taskId: task.id, success: true };
    } catch (error) {
      result = { taskId: task.id, success: false, error: error.message };
    }

    // Close tab if requested
    if (task.closeOnComplete) {
      await chrome.tabs.remove(tab.id);
    }

    return result;
  }
}

const tabOrchestrator = new TabOrchestrator();

console.log('[10X Browser] Background service worker v2.0 initialized');

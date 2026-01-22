/**
 * 10X.in Universal Browser Automation - Content Script v2.0
 * GOD-LEVEL Browser Automation
 *
 * Developed by team 10X.in
 *
 * Features:
 * - Self-healing selector engine (8 strategies)
 * - Natural language command processing
 * - AI-powered auto-scraper
 * - Action recorder
 * - Command palette UI
 * - Floating widget
 * - Multi-platform support
 */

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

const PLATFORMS = {
  LINKEDIN: 'LINKEDIN',
  INSTAGRAM: 'INSTAGRAM',
  TWITTER: 'TWITTER',
  GOOGLE: 'GOOGLE',
  FACEBOOK: 'FACEBOOK',
  YOUTUBE: 'YOUTUBE',
  AMAZON: 'AMAZON',
  GENERIC: 'GENERIC'
};

function detectPlatform() {
  const hostname = window.location.hostname.toLowerCase();

  if (hostname.includes('linkedin.com')) return PLATFORMS.LINKEDIN;
  if (hostname.includes('instagram.com')) return PLATFORMS.INSTAGRAM;
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) return PLATFORMS.TWITTER;
  if (hostname.includes('facebook.com')) return PLATFORMS.FACEBOOK;
  if (hostname.includes('youtube.com')) return PLATFORMS.YOUTUBE;
  if (hostname.includes('amazon.')) return PLATFORMS.AMAZON;
  if (hostname.includes('google.com')) return PLATFORMS.GOOGLE;

  return PLATFORMS.GENERIC;
}

const currentPlatform = detectPlatform();

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================

// Modules are loaded via manifest.json content_scripts array
// They expose global singletons: selectorEngine, intentParser, contextManager,
// autoScraper, actionRecorder, elementHighlighter, commandPalette, floatingWidget

/**
 * Initialize all modules
 */
async function initializeModules() {
  console.log('[10X.in] Initializing GOD-LEVEL automation modules...');

  // Initialize selector engine
  if (typeof selectorEngine !== 'undefined') {
    await selectorEngine.initialize();
    console.log('[10X.in] ✓ Selector Engine initialized');
  }

  // Initialize context manager and analyze page
  if (typeof contextManager !== 'undefined') {
    await contextManager.analyzeCurrentPage();
    console.log('[10X.in] ✓ Context Manager initialized');
  }

  // Initialize command palette with dependencies
  if (typeof commandPalette !== 'undefined') {
    commandPalette.initialize({
      intentParser: typeof intentParser !== 'undefined' ? intentParser : null,
      actionRecorder: typeof actionRecorder !== 'undefined' ? actionRecorder : null,
      workflowEngine: null, // Loaded in background
      autoScraper: typeof autoScraper !== 'undefined' ? autoScraper : null
    });
    console.log('[10X.in] ✓ Command Palette initialized');
  }

  // Initialize floating widget
  if (typeof floatingWidget !== 'undefined') {
    floatingWidget.initialize({
      actionRecorder: typeof actionRecorder !== 'undefined' ? actionRecorder : null,
      commandPalette: typeof commandPalette !== 'undefined' ? commandPalette : null
    });
    console.log('[10X.in] ✓ Floating Widget initialized');
  }

  console.log(`[10X.in] 🚀 GOD-LEVEL automation ready on ${currentPlatform}`);
}

// ============================================================================
// ACTIVITY TRACKING
// ============================================================================

let activityBuffer = [];
const ACTIVITY_BUFFER_SIZE = 10;
const ACTIVITY_FLUSH_INTERVAL = 5000;

function trackActivity(type, data = {}) {
  const activity = {
    type,
    platform: currentPlatform,
    url: window.location.href,
    timestamp: Date.now(),
    data
  };

  activityBuffer.push(activity);

  // Record in context manager
  if (typeof contextManager !== 'undefined') {
    contextManager.recordAction({ type, ...data });
  }

  if (activityBuffer.length >= ACTIVITY_BUFFER_SIZE) {
    flushActivityBuffer();
  }
}

function flushActivityBuffer() {
  if (activityBuffer.length === 0) return;

  const activities = [...activityBuffer];
  activityBuffer = [];

  chrome.runtime.sendMessage({
    type: 'ACTIVITY_TRACKED',
    platform: currentPlatform,
    activity: activities
  }).catch(error => {
    console.debug('[10X.in] Failed to send activities:', error);
  });
}

setInterval(flushActivityBuffer, ACTIVITY_FLUSH_INTERVAL);
window.addEventListener('beforeunload', flushActivityBuffer);

// Track page view
trackActivity('PAGE_VIEW', {
  title: document.title,
  referrer: document.referrer
});

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Click tracking
document.addEventListener('click', (event) => {
  const target = event.target;

  // Track button clicks
  const button = target.closest('button, [role="button"]');
  if (button) {
    trackActivity('BUTTON_CLICK', {
      text: button.textContent?.trim().substring(0, 100),
      ariaLabel: button.getAttribute('aria-label')
    });
  }

  // Track link clicks
  const link = target.closest('a');
  if (link && link.href) {
    trackActivity('LINK_CLICK', {
      url: link.href,
      text: link.textContent?.trim().substring(0, 100)
    });
  }
}, true);

// Form submission tracking
document.addEventListener('submit', (event) => {
  trackActivity('FORM_SUBMIT', {
    action: event.target.action,
    method: event.target.method
  });
}, true);

// Scroll depth tracking
let maxScrollDepth = 0;
window.addEventListener('scroll', () => {
  const scrollPercentage = Math.round(
    (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
  );

  if (scrollPercentage > maxScrollDepth) {
    maxScrollDepth = scrollPercentage;
    if ([25, 50, 75, 100].includes(scrollPercentage)) {
      trackActivity('SCROLL_DEPTH', { percentage: scrollPercentage });
    }
  }
});

// ============================================================================
// DOM UTILITIES
// ============================================================================

async function waitForElement(selector, timeout = 10000) {
  // Use selector engine if available
  if (typeof selectorEngine !== 'undefined') {
    return selectorEngine.find({ selector }, { timeout });
  }

  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
}

async function clickElement(selector, options = {}) {
  const { scrollIntoView = true, delay = 0 } = options;

  let element;

  // Use selector engine for smart element finding
  if (typeof selectorEngine !== 'undefined') {
    element = await selectorEngine.find(
      typeof selector === 'string' ? { selector } : selector,
      { timeout: options.timeout || 10000 }
    );
  } else {
    element = await waitForElement(selector);
  }

  if (!element) {
    throw new Error(`Element not found: ${JSON.stringify(selector)}`);
  }

  if (scrollIntoView) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  element.click();

  // Flash element for visual feedback
  if (typeof elementHighlighter !== 'undefined') {
    elementHighlighter.flashElement(element);
  }

  return { success: true };
}

async function typeText(selector, text, options = {}) {
  const { clear = false, humanize = true, pressEnter = false } = options;

  let element;

  if (typeof selectorEngine !== 'undefined') {
    element = await selectorEngine.find(
      typeof selector === 'string' ? { selector } : selector,
      { timeout: options.timeout || 10000 }
    );
  } else {
    element = await waitForElement(selector);
  }

  if (!element) {
    throw new Error(`Element not found: ${JSON.stringify(selector)}`);
  }

  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await new Promise(resolve => setTimeout(resolve, 300));

  element.focus();

  if (clear) {
    element.value = '';
    if (element.textContent !== undefined) element.textContent = '';
  }

  if (humanize) {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (element.value !== undefined) {
        element.value += char;
      }
      if (element.textContent !== undefined && element.tagName !== 'INPUT') {
        element.textContent += char;
      }

      element.dispatchEvent(new InputEvent('input', { data: char, bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70));
    }
  } else {
    element.value = text;
    element.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }

  element.dispatchEvent(new Event('change', { bubbles: true }));

  if (pressEnter) {
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
  }

  return { success: true };
}

// ============================================================================
// DATA EXTRACTION
// ============================================================================

function extractData(selectors) {
  const data = {};

  for (const [key, selector] of Object.entries(selectors)) {
    try {
      const elements = document.querySelectorAll(selector);

      if (elements.length === 0) {
        data[key] = null;
      } else if (elements.length === 1) {
        data[key] = extractElementData(elements[0]);
      } else {
        data[key] = Array.from(elements).map(el => extractElementData(el));
      }
    } catch (error) {
      data[key] = null;
    }
  }

  return data;
}

function extractElementData(element) {
  return {
    text: element.textContent?.trim(),
    html: element.innerHTML,
    attributes: Array.from(element.attributes).reduce((acc, attr) => {
      acc[attr.name] = attr.value;
      return acc;
    }, {}),
    tag: element.tagName.toLowerCase(),
    classes: Array.from(element.classList),
    visible: isElementVisible(element)
  };
}

function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[10X.in] Received command:', message.type);

  (async () => {
    try {
      let result;

      switch (message.type) {
        // ========== Data Extraction ==========
        case 'EXTRACT_DATA':
          result = extractData(message.selectors);
          break;

        case 'EXTRACT_PROFILE':
          if (typeof contextManager !== 'undefined') {
            const context = await contextManager.analyzeCurrentPage();
            result = context.profile;
          } else {
            result = { error: 'Context manager not available' };
          }
          break;

        case 'SCRAPE_PAGE':
          if (typeof autoScraper !== 'undefined') {
            result = await autoScraper.detectAndExtract();
          } else {
            result = { error: 'Auto scraper not available' };
          }
          break;

        case 'SCRAPE_SUMMARY':
          if (typeof autoScraper !== 'undefined') {
            result = await autoScraper.getSummary();
          } else {
            result = { error: 'Auto scraper not available' };
          }
          break;

        case 'EXTRACT_BY_TYPE':
          if (typeof autoScraper !== 'undefined') {
            result = autoScraper.extractByType(message.dataType);
          } else {
            result = { error: 'Auto scraper not available' };
          }
          break;

        // ========== DOM Actions ==========
        case 'CLICK_ELEMENT':
          result = await clickElement(message.selector || message.descriptor, message.options);
          break;

        case 'TYPE_TEXT':
          result = await typeText(message.selector || message.descriptor, message.text, message.options);
          break;

        case 'WAIT_FOR_ELEMENT':
          const element = await waitForElement(message.selector, message.timeout);
          result = { found: !!element };
          break;

        case 'SCROLL':
          if (message.direction === 'top') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (message.direction === 'bottom') {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          } else if (message.y !== undefined) {
            window.scrollTo({ top: message.y, left: message.x || 0, behavior: 'smooth' });
          }
          result = { success: true };
          break;

        // ========== Recording ==========
        case 'START_RECORDING':
          if (typeof actionRecorder !== 'undefined') {
            await actionRecorder.startRecording();
            result = { success: true };
          } else {
            result = { error: 'Action recorder not available' };
          }
          break;

        case 'STOP_RECORDING':
          if (typeof actionRecorder !== 'undefined') {
            const recording = await actionRecorder.stopRecording();
            result = { success: true, recording };
          } else {
            result = { error: 'Action recorder not available' };
          }
          break;

        case 'GET_RECORDING_STATUS':
          if (typeof actionRecorder !== 'undefined') {
            result = actionRecorder.getStatus();
          } else {
            result = { isRecording: false };
          }
          break;

        case 'PAUSE_RECORDING':
          if (typeof actionRecorder !== 'undefined') {
            actionRecorder.pauseRecording();
            result = { success: true };
          }
          break;

        case 'RESUME_RECORDING':
          if (typeof actionRecorder !== 'undefined') {
            actionRecorder.resumeRecording();
            result = { success: true };
          }
          break;

        // ========== Element Selection ==========
        case 'START_ELEMENT_SELECTION':
          if (typeof elementHighlighter !== 'undefined') {
            elementHighlighter.startSelection((element, info) => {
              chrome.runtime.sendMessage({
                type: 'ELEMENT_SELECTED',
                info
              });
            });
            result = { success: true };
          }
          break;

        case 'STOP_ELEMENT_SELECTION':
          if (typeof elementHighlighter !== 'undefined') {
            elementHighlighter.stopSelection();
            result = { success: true };
          }
          break;

        // ========== UI ==========
        case 'OPEN_COMMAND_PALETTE':
          if (typeof commandPalette !== 'undefined') {
            commandPalette.open();
            result = { success: true };
          }
          break;

        case 'CLOSE_COMMAND_PALETTE':
          if (typeof commandPalette !== 'undefined') {
            commandPalette.close();
            result = { success: true };
          }
          break;

        case 'TOGGLE_WIDGET':
          if (typeof floatingWidget !== 'undefined') {
            if (floatingWidget.isExpanded) {
              floatingWidget.collapse();
            } else {
              floatingWidget.expand();
            }
            result = { success: true };
          }
          break;

        // ========== NLP Commands ==========
        case 'EXECUTE_NLP_COMMAND':
          if (typeof intentParser !== 'undefined') {
            const parsed = message.parsed || intentParser.parse(message.command);
            result = await executeNLPCommand(parsed);
          } else {
            result = { error: 'Intent parser not available' };
          }
          break;

        case 'PARSE_COMMAND':
          if (typeof intentParser !== 'undefined') {
            result = intentParser.parse(message.command);
          } else {
            result = { error: 'Intent parser not available' };
          }
          break;

        // ========== Context ==========
        case 'GET_CONTEXT':
          if (typeof contextManager !== 'undefined') {
            result = contextManager.getContext();
          } else {
            result = { platform: currentPlatform };
          }
          break;

        case 'GET_SUGGESTIONS':
          if (typeof contextManager !== 'undefined') {
            result = contextManager.getSuggestions();
          } else {
            result = [];
          }
          break;

        // ========== Utility ==========
        case 'GET_PLATFORM':
          result = { platform: currentPlatform };
          break;

        case 'PING':
          result = { pong: true, timestamp: Date.now(), platform: currentPlatform };
          break;

        case 'GET_PAGE_INFO':
          result = {
            url: window.location.href,
            title: document.title,
            platform: currentPlatform
          };
          break;

        // ========== Selector Engine ==========
        case 'FIND_ELEMENT':
          if (typeof selectorEngine !== 'undefined') {
            const el = await selectorEngine.find(message.descriptor, message.options);
            result = el ? { found: true, selector: selectorEngine.generateCSSSelector(el) } : { found: false };
          }
          break;

        case 'GENERATE_SELECTORS':
          if (typeof selectorEngine !== 'undefined' && message.selector) {
            const el = document.querySelector(message.selector);
            if (el) {
              result = selectorEngine.generateSelectors(el);
            }
          }
          break;

        default:
          throw new Error(`Unknown command: ${message.type}`);
      }

      sendResponse({ success: true, result });
    } catch (error) {
      console.error('[10X.in] Command failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep message channel open
});

// ============================================================================
// NLP COMMAND EXECUTION
// ============================================================================

async function executeNLPCommand(parsed) {
  if (!parsed || parsed.intent === 'UNKNOWN') {
    return { error: 'Could not understand command' };
  }

  const { intent, params } = parsed;

  switch (intent) {
    case 'SCRAPE':
      if (typeof autoScraper !== 'undefined') {
        if (params.entityType?.pattern) {
          return autoScraper.extractByType(params.target?.type);
        }
        return autoScraper.detectAndExtract();
      }
      break;

    case 'CLICK':
      return clickElement(params.element || { text: params.target });

    case 'TYPE':
      return typeText(params.element || { text: params.target }, params.text);

    case 'NAVIGATE':
      if (params.url) {
        window.location.href = params.url;
        return { success: true, navigating: params.url };
      }
      break;

    case 'WAIT':
      if (params.duration) {
        await new Promise(resolve => setTimeout(resolve, params.duration));
        return { success: true, waited: params.duration };
      }
      if (params.element) {
        await waitForElement(params.element.selector || params.condition);
        return { success: true };
      }
      break;

    case 'SCROLL':
      if (params.direction === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (params.direction === 'bottom') {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
      return { success: true };

    case 'WORKFLOW':
      // Delegate to background
      chrome.runtime.sendMessage({ type: 'WORKFLOW_ACTION', action: params.action, name: params.workflowName });
      return { success: true, delegated: true };

    default:
      return { error: `Unsupported intent: ${intent}` };
  }

  return { error: 'Command execution failed' };
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Shift + K - Command Palette
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
    e.preventDefault();
    if (typeof commandPalette !== 'undefined') {
      commandPalette.toggle();
    }
  }

  // Ctrl/Cmd + Shift + R - Toggle Recording
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
    e.preventDefault();
    if (typeof actionRecorder !== 'undefined') {
      if (actionRecorder.isRecording) {
        actionRecorder.stopRecording();
      } else {
        actionRecorder.startRecording();
      }
    }
  }

  // Ctrl/Cmd + Shift + S - Scrape Page
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    if (typeof autoScraper !== 'undefined' && typeof commandPalette !== 'undefined') {
      commandPalette.scrapePage();
    }
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeModules);
} else {
  initializeModules();
}

// Check connection to background
chrome.runtime.sendMessage({ type: 'GET_CONNECTION_STATUS' })
  .then(response => {
    console.log('[10X.in] Background connection:', response?.connected ? '✓' : '✗');
  })
  .catch(() => {
    console.log('[10X.in] Background worker initializing...');
  });

// Re-analyze page on navigation (SPA support)
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    if (typeof contextManager !== 'undefined') {
      contextManager.analyzeCurrentPage();
    }
    trackActivity('PAGE_VIEW', {
      title: document.title,
      referrer: lastUrl
    });
  }
});

urlObserver.observe(document, { subtree: true, childList: true });

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    detectPlatform,
    extractData,
    clickElement,
    typeText,
    waitForElement,
    trackActivity,
    PLATFORMS
  };
}

console.log('[10X.in] Content script v2.0 loaded');

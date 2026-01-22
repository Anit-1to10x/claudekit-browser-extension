/**
 * 10X.in Universal Browser Automation - Content Script
 *
 * Developed by team 10X.in
 * Injected into all websites to provide:
 * - Universal DOM manipulation across all platforms
 * - Multi-platform activity tracking (LinkedIn, Instagram, Twitter, Google)
 * - Platform detection and data extraction
 * - Command execution from background worker
 */

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

const PLATFORMS = {
  LINKEDIN: 'linkedin',
  INSTAGRAM: 'instagram',
  TWITTER: 'twitter',
  GOOGLE: 'google',
  GENERIC: 'generic'
};

/**
 * Detect current platform based on URL and DOM
 */
function detectPlatform() {
  const hostname = window.location.hostname.toLowerCase();
  const url = window.location.href.toLowerCase();

  if (hostname.includes('linkedin.com')) {
    return PLATFORMS.LINKEDIN;
  } else if (hostname.includes('instagram.com')) {
    return PLATFORMS.INSTAGRAM;
  } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return PLATFORMS.TWITTER;
  } else if (hostname.includes('google.com') || hostname.includes('youtube.com')) {
    return PLATFORMS.GOOGLE;
  }

  return PLATFORMS.GENERIC;
}

const currentPlatform = detectPlatform();
console.log(`[10X Content] Loaded on ${currentPlatform} platform`);

// ============================================================================
// PLATFORM-SPECIFIC SELECTORS
// ============================================================================

const SELECTORS = {
  [PLATFORMS.LINKEDIN]: {
    profileName: '.text-heading-xlarge',
    profileHeadline: '.text-body-medium',
    connectionButton: 'button[aria-label*="Connect"]',
    messageButton: 'button[aria-label*="Message"]',
    postButton: 'button[aria-label="Open share box to create a post"]',
    postContent: '.share-creation-state__text-editor',
    sendButton: 'button[aria-label="Send"]',
    feedPosts: '.feed-shared-update-v2',
    likeButton: 'button[aria-label*="Like"]',
    commentButton: 'button[aria-label*="Comment"]',
    shareButton: 'button[aria-label*="Share"]',
    searchBox: 'input[aria-label="Search"]'
  },

  [PLATFORMS.INSTAGRAM]: {
    profileName: 'header h2',
    profileBio: 'header section span',
    followButton: 'button:has-text("Follow")',
    messageButton: 'button:has-text("Message")',
    likeButton: 'button[aria-label*="Like"]',
    commentButton: 'button[aria-label*="Comment"]',
    shareButton: 'button[aria-label*="Share"]',
    dmInput: 'textarea[placeholder*="Message"]',
    sendButton: 'button[type="submit"]',
    posts: 'article',
    stories: 'canvas'
  },

  [PLATFORMS.TWITTER]: {
    profileName: '[data-testid="UserName"]',
    profileBio: '[data-testid="UserDescription"]',
    followButton: '[data-testid*="follow"]',
    tweetButton: 'a[data-testid="SideNav_NewTweet_Button"]',
    tweetInput: '[data-testid="tweetTextarea_0"]',
    sendTweetButton: '[data-testid="tweetButton"]',
    likeButton: '[data-testid="like"]',
    retweetButton: '[data-testid="retweet"]',
    replyButton: '[data-testid="reply"]',
    dmButton: '[data-testid="sendDMFromProfile"]',
    tweets: '[data-testid="tweet"]'
  },

  [PLATFORMS.GOOGLE]: {
    searchBox: 'input[name="q"]',
    searchButton: 'input[type="submit"][value="Google Search"]',
    results: '#search .g',
    resultTitle: 'h3',
    resultUrl: 'cite',
    resultDescription: '.VwiC3b'
  }
};

// ============================================================================
// ACTIVITY TRACKING
// ============================================================================

let activityBuffer = [];
const ACTIVITY_BUFFER_SIZE = 10;
const ACTIVITY_FLUSH_INTERVAL = 5000; // 5 seconds

/**
 * Track user activity
 */
function trackActivity(type, data = {}) {
  const activity = {
    type,
    platform: currentPlatform,
    url: window.location.href,
    timestamp: Date.now(),
    data
  };

  activityBuffer.push(activity);
  console.log(`[10X Content] Activity tracked: ${type}`, data);

  // Flush buffer if full
  if (activityBuffer.length >= ACTIVITY_BUFFER_SIZE) {
    flushActivityBuffer();
  }
}

/**
 * Flush activity buffer to background worker
 */
function flushActivityBuffer() {
  if (activityBuffer.length === 0) return;

  const activities = [...activityBuffer];
  activityBuffer = [];

  chrome.runtime.sendMessage({
    type: 'ACTIVITY_TRACKED',
    platform: currentPlatform,
    activity: activities
  }).catch(error => {
    console.error('[10X Content] Failed to send activities:', error);
  });
}

// Flush buffer periodically
setInterval(flushActivityBuffer, ACTIVITY_FLUSH_INTERVAL);

// Flush buffer before page unload
window.addEventListener('beforeunload', () => {
  flushActivityBuffer();
});

// ============================================================================
// EVENT LISTENERS FOR USER ACTIONS
// ============================================================================

/**
 * Track page view
 */
trackActivity('PAGE_VIEW', {
  title: document.title,
  referrer: document.referrer
});

/**
 * Track clicks on specific elements
 */
document.addEventListener('click', (event) => {
  const target = event.target;
  const selectors = SELECTORS[currentPlatform] || {};

  // Check if clicked element matches platform-specific selectors
  for (const [key, selector] of Object.entries(selectors)) {
    if (target.matches(selector) || target.closest(selector)) {
      trackActivity('CLICK', {
        element: key,
        selector,
        text: target.textContent?.trim().substring(0, 100)
      });
      break;
    }
  }

  // Track link clicks
  const link = target.closest('a');
  if (link && link.href) {
    trackActivity('LINK_CLICK', {
      url: link.href,
      text: link.textContent?.trim().substring(0, 100)
    });
  }

  // Track button clicks
  const button = target.closest('button');
  if (button) {
    trackActivity('BUTTON_CLICK', {
      text: button.textContent?.trim().substring(0, 100),
      ariaLabel: button.getAttribute('aria-label')
    });
  }
}, true);

/**
 * Track form submissions
 */
document.addEventListener('submit', (event) => {
  const form = event.target;

  trackActivity('FORM_SUBMIT', {
    action: form.action,
    method: form.method,
    fieldCount: form.elements.length
  });
}, true);

/**
 * Track input focus (potential lead capture)
 */
document.addEventListener('focus', (event) => {
  const target = event.target;

  if (target.matches('input, textarea')) {
    trackActivity('INPUT_FOCUS', {
      type: target.type,
      name: target.name,
      placeholder: target.placeholder
    });
  }
}, true);

/**
 * Track scroll depth
 */
let maxScrollDepth = 0;
window.addEventListener('scroll', () => {
  const scrollPercentage = Math.round(
    (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
  );

  if (scrollPercentage > maxScrollDepth) {
    maxScrollDepth = scrollPercentage;

    // Track milestones: 25%, 50%, 75%, 100%
    if ([25, 50, 75, 100].includes(scrollPercentage)) {
      trackActivity('SCROLL_DEPTH', {
        percentage: scrollPercentage
      });
    }
  }
});

// ============================================================================
// DATA EXTRACTION UTILITIES
// ============================================================================

/**
 * Extract data from current page based on selectors
 */
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
      console.error(`[10X Content] Error extracting ${key}:`, error);
      data[key] = null;
    }
  }

  return data;
}

/**
 * Extract data from a single element
 */
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

/**
 * Check if element is visible
 */
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

/**
 * Extract LinkedIn profile data
 */
function extractLinkedInProfile() {
  const selectors = SELECTORS[PLATFORMS.LINKEDIN];

  return {
    name: document.querySelector(selectors.profileName)?.textContent?.trim(),
    headline: document.querySelector(selectors.profileHeadline)?.textContent?.trim(),
    url: window.location.href,
    connectionStatus: !!document.querySelector(selectors.connectionButton),
    canMessage: !!document.querySelector(selectors.messageButton)
  };
}

/**
 * Extract Instagram profile data
 */
function extractInstagramProfile() {
  const selectors = SELECTORS[PLATFORMS.INSTAGRAM];

  return {
    username: window.location.pathname.split('/')[1],
    name: document.querySelector(selectors.profileName)?.textContent?.trim(),
    bio: document.querySelector(selectors.profileBio)?.textContent?.trim(),
    url: window.location.href,
    isFollowing: !document.querySelector(selectors.followButton)
  };
}

/**
 * Extract Twitter profile data
 */
function extractTwitterProfile() {
  const selectors = SELECTORS[PLATFORMS.TWITTER];

  return {
    username: window.location.pathname.split('/')[1],
    name: document.querySelector(selectors.profileName)?.textContent?.trim(),
    bio: document.querySelector(selectors.profileBio)?.textContent?.trim(),
    url: window.location.href
  };
}

// ============================================================================
// DOM MANIPULATION UTILITIES
// ============================================================================

/**
 * Wait for element to appear in DOM
 */
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);

    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations) => {
      const element = document.querySelector(selector);

      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
}

/**
 * Click element with retry
 */
async function clickElement(selector, options = {}) {
  const { waitFor = true, scrollIntoView = true, delay = 0 } = options;

  try {
    let element;

    if (waitFor) {
      element = await waitForElement(selector);
    } else {
      element = document.querySelector(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
    }

    if (scrollIntoView) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    element.click();

    return { success: true, selector };
  } catch (error) {
    console.error(`[10X Content] Click failed:`, error);
    throw error;
  }
}

/**
 * Type text into input with human-like timing
 */
async function typeText(selector, text, options = {}) {
  const { waitFor = true, clear = false, humanize = true, pressEnter = false } = options;

  try {
    let element;

    if (waitFor) {
      element = await waitForElement(selector);
    } else {
      element = document.querySelector(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 300));

    element.focus();

    if (clear) {
      element.value = '';
      element.textContent = '';
    }

    if (humanize) {
      // Type character by character with random delays
      for (let i = 0; i < text.length; i++) {
        const char = text[i];

        // Simulate typing
        element.value += char;
        element.textContent += char;

        // Dispatch events
        element.dispatchEvent(new InputEvent('input', { data: char, bubbles: true }));

        // Random delay between 50-150ms
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      }
    } else {
      element.value = text;
      element.textContent = text;
      element.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }

    element.dispatchEvent(new Event('change', { bubbles: true }));

    if (pressEnter) {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    }

    return { success: true, selector, text };
  } catch (error) {
    console.error(`[10X Content] Type failed:`, error);
    throw error;
  }
}

// ============================================================================
// MESSAGE LISTENER FROM BACKGROUND WORKER
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`[10X Content] Received command:`, message.type);

  (async () => {
    try {
      let result;

      switch (message.type) {
        case 'EXTRACT_DATA':
          result = extractData(message.selectors);
          break;

        case 'EXTRACT_PROFILE':
          switch (currentPlatform) {
            case PLATFORMS.LINKEDIN:
              result = extractLinkedInProfile();
              break;
            case PLATFORMS.INSTAGRAM:
              result = extractInstagramProfile();
              break;
            case PLATFORMS.TWITTER:
              result = extractTwitterProfile();
              break;
            default:
              throw new Error(`Profile extraction not supported for ${currentPlatform}`);
          }
          break;

        case 'CLICK_ELEMENT':
          result = await clickElement(message.selector, message.options);
          break;

        case 'TYPE_TEXT':
          result = await typeText(message.selector, message.text, message.options);
          break;

        case 'WAIT_FOR_ELEMENT':
          const element = await waitForElement(message.selector, message.timeout);
          result = { found: true, selector: message.selector };
          break;

        case 'GET_PLATFORM':
          result = { platform: currentPlatform };
          break;

        case 'PING':
          result = { pong: true, timestamp: Date.now() };
          break;

        default:
          throw new Error(`Unknown command: ${message.type}`);
      }

      sendResponse({ success: true, result });
    } catch (error) {
      console.error(`[10X Content] Command failed:`, error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep message channel open for async response
});

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('[10X Content] Content script initialized');

// Check connection to background worker
chrome.runtime.sendMessage({ type: 'GET_CONNECTION_STATUS' })
  .then(response => {
    console.log('[10X Content] Background worker connection:', response.connected ? '✓' : '✗');
  })
  .catch(error => {
    console.error('[10X Content] Failed to connect to background worker:', error);
  });

// Export utilities for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    detectPlatform,
    extractData,
    extractElementData,
    clickElement,
    typeText,
    waitForElement,
    trackActivity,
    PLATFORMS,
    SELECTORS
  };
}

/**
 * 10X.in Instagram Automation Handler
 *
 * Developed by team 10X.in
 * Handles Instagram automation actions with rate limiting and error handling.
 * Supports: like_post, comment, follow, send_dm, view_story
 *
 * Rate Limits:
 * - Likes: 100/day
 * - Comments: 30/day
 * - Follows: 50/day
 * - DMs: 50/day
 * - Story Views: 200/day
 */

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

const RATE_LIMITS = {
  LIKE_POST: { max: 100, window: 86400000 }, // 100 per day (24 hours)
  COMMENT: { max: 30, window: 86400000 },    // 30 per day
  FOLLOW: { max: 50, window: 86400000 },     // 50 per day
  SEND_DM: { max: 50, window: 86400000 },    // 50 per day
  VIEW_STORY: { max: 200, window: 86400000 } // 200 per day
};

// Storage keys for tracking actions
const STORAGE_KEYS = {
  LIKE_POST: 'instagram_likes',
  COMMENT: 'instagram_comments',
  FOLLOW: 'instagram_follows',
  SEND_DM: 'instagram_dms',
  VIEW_STORY: 'instagram_story_views'
};

// ============================================================================
// INSTAGRAM SELECTORS (Updated for current Instagram UI)
// ============================================================================

const SELECTORS = {
  // Profile page
  profileName: 'header h2',
  profileBio: 'header section > div:last-child span',
  followButton: 'header button:has-text("Follow"), header button._acan._acap._acas._aj1-',
  messageButton: 'header button:has-text("Message"), header button._acan._acao._acas._aj1-',
  followingButton: 'header button:has-text("Following")',

  // Post interactions
  likeButton: 'svg[aria-label*="Like"], svg[aria-label*="Unlike"], button span[aria-label*="Like"]',
  unlikeButton: 'svg[aria-label*="Unlike"]',
  commentButton: 'svg[aria-label*="Comment"], button span[aria-label*="Comment"]',
  shareButton: 'svg[aria-label*="Share"], button span[aria-label*="Share"]',
  saveButton: 'svg[aria-label*="Save"], button span[aria-label*="Save"]',

  // Comment section
  commentInput: 'textarea[placeholder*="Add a comment"], textarea[aria-label*="Add a comment"]',
  postCommentButton: 'button[type="submit"]:has-text("Post")',

  // Direct messages
  dmInput: 'textarea[placeholder*="Message"], div[contenteditable="true"][aria-label*="Message"]',
  dmSendButton: 'button[type="submit"] svg[aria-label*="Send"], button:has-text("Send")',

  // Stories
  storyCanvas: 'canvas',
  storyContainer: 'section[role="dialog"]',
  nextStoryButton: 'button[aria-label*="Next"]',

  // Feed
  posts: 'article[role="presentation"]',
  feedPost: 'article',

  // Navigation
  searchBox: 'input[placeholder*="Search"], input[aria-label*="Search"]',
  homeLink: 'a[href="/"]',
  dmLink: 'a[href*="/direct/"]'
};

// ============================================================================
// HUMAN-LIKE DELAYS
// ============================================================================

/**
 * Generate random delay between min and max milliseconds
 */
function randomDelay(min = 2000, max = 5000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// RATE LIMITING FUNCTIONS
// ============================================================================

/**
 * Get action history from storage
 */
async function getActionHistory(actionType) {
  const key = STORAGE_KEYS[actionType];

  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      const history = result[key] || [];
      resolve(history);
    });
  });
}

/**
 * Save action to history
 */
async function saveAction(actionType, data = {}) {
  const key = STORAGE_KEYS[actionType];
  const history = await getActionHistory(actionType);

  history.push({
    timestamp: Date.now(),
    ...data
  });

  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: history }, () => {
      resolve();
    });
  });
}

/**
 * Check if action is within rate limit
 */
async function checkRateLimit(actionType) {
  const limit = RATE_LIMITS[actionType];
  const history = await getActionHistory(actionType);

  // Filter actions within the time window
  const now = Date.now();
  const windowStart = now - limit.window;
  const recentActions = history.filter(action => action.timestamp > windowStart);

  // Clean up old actions
  if (recentActions.length < history.length) {
    const key = STORAGE_KEYS[actionType];
    await new Promise((resolve) => {
      chrome.storage.local.set({ [key]: recentActions }, () => resolve());
    });
  }

  const isWithinLimit = recentActions.length < limit.max;
  const remaining = Math.max(0, limit.max - recentActions.length);
  const resetTime = recentActions.length > 0 ? recentActions[0].timestamp + limit.window : now;

  return {
    allowed: isWithinLimit,
    remaining,
    resetTime,
    total: limit.max
  };
}

// ============================================================================
// DOM UTILITIES
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

    const observer = new MutationObserver(() => {
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
 * Click element with human-like behavior
 */
async function clickElement(selector, options = {}) {
  const { scrollIntoView = true, delay = null } = options;

  try {
    const element = await waitForElement(selector);

    if (scrollIntoView) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(randomDelay(500, 1000));
    }

    const waitTime = delay !== null ? delay : randomDelay(2000, 5000);
    await sleep(waitTime);

    element.click();

    return { success: true, selector };
  } catch (error) {
    console.error(`[Instagram Handler] Click failed:`, error);
    throw error;
  }
}

/**
 * Type text with human-like timing
 */
async function typeText(selector, text, options = {}) {
  const { clear = false, humanize = true, pressEnter = false } = options;

  try {
    const element = await waitForElement(selector);

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(randomDelay(500, 1000));

    element.focus();
    await sleep(randomDelay(200, 500));

    if (clear) {
      element.value = '';
      element.textContent = '';
    }

    if (humanize) {
      // Type character by character
      for (let i = 0; i < text.length; i++) {
        const char = text[i];

        element.value += char;
        element.textContent += char;

        element.dispatchEvent(new InputEvent('input', { data: char, bubbles: true }));

        // Random delay between 50-200ms per character
        await sleep(50 + Math.random() * 150);
      }
    } else {
      element.value = text;
      element.textContent = text;
      element.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }

    element.dispatchEvent(new Event('change', { bubbles: true }));

    if (pressEnter) {
      await sleep(randomDelay(500, 1000));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    }

    return { success: true, selector, text };
  } catch (error) {
    console.error(`[Instagram Handler] Type failed:`, error);
    throw error;
  }
}

// ============================================================================
// INSTAGRAM ACTION HANDLERS
// ============================================================================

/**
 * Like a post
 */
async function likePost(postUrl) {
  const actionType = 'LIKE_POST';

  // Check rate limit
  const rateLimit = await checkRateLimit(actionType);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Rate limit exceeded',
      rateLimit
    };
  }

  try {
    // Navigate to post if needed
    if (window.location.href !== postUrl) {
      window.location.href = postUrl;
      await sleep(randomDelay(3000, 5000));
    }

    // Find and click like button
    const likeButton = await waitForElement(SELECTORS.likeButton);

    // Check if already liked
    const isLiked = likeButton.querySelector('svg[aria-label*="Unlike"]');
    if (isLiked) {
      return {
        success: true,
        alreadyLiked: true,
        message: 'Post already liked',
        rateLimit
      };
    }

    // Click like button
    await clickElement(SELECTORS.likeButton);

    // Save action
    await saveAction(actionType, { postUrl });

    // Update rate limit info
    const newRateLimit = await checkRateLimit(actionType);

    return {
      success: true,
      postUrl,
      rateLimit: newRateLimit,
      message: 'Post liked successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      postUrl,
      rateLimit
    };
  }
}

/**
 * Comment on a post
 */
async function comment(postUrl, commentText) {
  const actionType = 'COMMENT';

  // Check rate limit
  const rateLimit = await checkRateLimit(actionType);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Rate limit exceeded',
      rateLimit
    };
  }

  try {
    // Navigate to post if needed
    if (window.location.href !== postUrl) {
      window.location.href = postUrl;
      await sleep(randomDelay(3000, 5000));
    }

    // Click comment button to open comment input
    await clickElement(SELECTORS.commentButton);

    // Type comment
    await typeText(SELECTORS.commentInput, commentText, {
      clear: true,
      humanize: true,
      pressEnter: false
    });

    // Click post button
    await clickElement(SELECTORS.postCommentButton);

    // Save action
    await saveAction(actionType, { postUrl, comment: commentText });

    // Update rate limit info
    const newRateLimit = await checkRateLimit(actionType);

    return {
      success: true,
      postUrl,
      comment: commentText,
      rateLimit: newRateLimit,
      message: 'Comment posted successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      postUrl,
      rateLimit
    };
  }
}

/**
 * Follow a user
 */
async function follow(profileUrl) {
  const actionType = 'FOLLOW';

  // Check rate limit
  const rateLimit = await checkRateLimit(actionType);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Rate limit exceeded',
      rateLimit
    };
  }

  try {
    // Navigate to profile if needed
    if (window.location.href !== profileUrl) {
      window.location.href = profileUrl;
      await sleep(randomDelay(3000, 5000));
    }

    // Check if already following
    const isFollowing = document.querySelector(SELECTORS.followingButton);
    if (isFollowing) {
      return {
        success: true,
        alreadyFollowing: true,
        message: 'Already following this user',
        profileUrl,
        rateLimit
      };
    }

    // Click follow button
    await clickElement(SELECTORS.followButton);

    // Save action
    await saveAction(actionType, { profileUrl });

    // Update rate limit info
    const newRateLimit = await checkRateLimit(actionType);

    return {
      success: true,
      profileUrl,
      rateLimit: newRateLimit,
      message: 'User followed successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      profileUrl,
      rateLimit
    };
  }
}

/**
 * Send a direct message
 */
async function sendDM(profileUrl, messageText) {
  const actionType = 'SEND_DM';

  // Check rate limit
  const rateLimit = await checkRateLimit(actionType);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Rate limit exceeded',
      rateLimit
    };
  }

  try {
    // Navigate to profile if needed
    if (!window.location.href.includes(profileUrl)) {
      window.location.href = profileUrl;
      await sleep(randomDelay(3000, 5000));
    }

    // Click message button
    await clickElement(SELECTORS.messageButton);

    // Wait for DM input to appear
    await sleep(randomDelay(2000, 3000));

    // Type message
    await typeText(SELECTORS.dmInput, messageText, {
      clear: true,
      humanize: true,
      pressEnter: false
    });

    // Click send button
    await clickElement(SELECTORS.dmSendButton);

    // Save action
    await saveAction(actionType, { profileUrl, message: messageText });

    // Update rate limit info
    const newRateLimit = await checkRateLimit(actionType);

    return {
      success: true,
      profileUrl,
      message: messageText,
      rateLimit: newRateLimit,
      result: 'DM sent successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      profileUrl,
      rateLimit
    };
  }
}

/**
 * View a story
 */
async function viewStory(profileUrl) {
  const actionType = 'VIEW_STORY';

  // Check rate limit
  const rateLimit = await checkRateLimit(actionType);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Rate limit exceeded',
      rateLimit
    };
  }

  try {
    // Navigate to profile if needed
    if (!window.location.href.includes(profileUrl)) {
      window.location.href = profileUrl;
      await sleep(randomDelay(3000, 5000));
    }

    // Click on story (usually in profile picture with ring)
    const storyElement = document.querySelector('canvas') ||
                        document.querySelector('[role="button"] img[alt*="profile picture"]');

    if (!storyElement) {
      return {
        success: false,
        error: 'No story available',
        profileUrl,
        rateLimit
      };
    }

    storyElement.click();

    // Wait for story to load
    await sleep(randomDelay(3000, 5000));

    // Wait a bit to simulate viewing
    await sleep(randomDelay(5000, 8000));

    // Save action
    await saveAction(actionType, { profileUrl });

    // Update rate limit info
    const newRateLimit = await checkRateLimit(actionType);

    return {
      success: true,
      profileUrl,
      rateLimit: newRateLimit,
      message: 'Story viewed successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      profileUrl,
      rateLimit
    };
  }
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

/**
 * Handle messages from background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.platform !== 'instagram') {
    return;
  }

  console.log(`[Instagram Handler] Received action:`, message.action);

  (async () => {
    try {
      let result;

      switch (message.action) {
        case 'like_post':
          result = await likePost(message.data.postUrl);
          break;

        case 'comment':
          result = await comment(message.data.postUrl, message.data.commentText);
          break;

        case 'follow':
          result = await follow(message.data.profileUrl);
          break;

        case 'send_dm':
          result = await sendDM(message.data.profileUrl, message.data.messageText);
          break;

        case 'view_story':
          result = await viewStory(message.data.profileUrl);
          break;

        case 'check_rate_limit':
          const limits = {};
          for (const actionType of Object.keys(RATE_LIMITS)) {
            limits[actionType] = await checkRateLimit(actionType);
          }
          result = { limits };
          break;

        default:
          throw new Error(`Unknown action: ${message.action}`);
      }

      sendResponse({ success: true, result });
    } catch (error) {
      console.error(`[Instagram Handler] Action failed:`, error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep message channel open for async response
});

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('[Instagram Handler] Instagram handler initialized');

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    likePost,
    comment,
    follow,
    sendDM,
    viewStory,
    checkRateLimit,
    RATE_LIMITS,
    SELECTORS
  };
}

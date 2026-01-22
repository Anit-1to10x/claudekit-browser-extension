/**
 * 10X.in Twitter/X Automation Handler
 *
 * Developed by team 10X.in
 * Handles all Twitter/X platform automation actions with rate limiting,
 * media support, and comprehensive error handling.
 *
 * Rate Limits:
 * - Tweets: 10/day
 * - Likes: 100/day
 * - Retweets: 50/day
 * - Replies: 50/day
 * - Follows: 50/day
 * - DMs: 20/day
 */

class TwitterHandler {
  constructor() {
    this.platform = 'twitter';
    this.domain = ['twitter.com', 'x.com'];

    // Rate limit configuration (per day)
    this.rateLimits = {
      tweet: { limit: 10, window: 86400000 }, // 24 hours
      like: { limit: 100, window: 86400000 },
      retweet: { limit: 50, window: 86400000 },
      reply: { limit: 50, window: 86400000 },
      follow: { limit: 50, window: 86400000 },
      send_dm: { limit: 20, window: 86400000 }
    };

    // Delays between actions (milliseconds)
    this.delays = {
      short: 1000,  // 1 second
      medium: 2000, // 2 seconds
      long: 3000    // 3 seconds
    };

    // Selectors for Twitter/X (updated for current UI)
    this.selectors = {
      // Compose tweet
      tweetButton: '[data-testid="SideNav_NewTweet_Button"]',
      tweetComposer: '[data-testid="tweetTextarea_0"]',
      tweetSubmit: '[data-testid="tweetButtonInline"]',
      mediaUpload: 'input[data-testid="fileInput"]',

      // Like/Retweet/Reply
      likeButton: '[data-testid="like"]',
      retweetButton: '[data-testid="retweet"]',
      retweetConfirm: '[data-testid="retweetConfirm"]',
      replyButton: '[data-testid="reply"]',

      // Follow
      followButton: '[data-testid="followButton"]',

      // DM
      dmButton: '[data-testid="sendDMFromProfile"]',
      dmComposer: '[data-testid="dmComposerTextInput"]',
      dmSend: '[data-testid="dmComposerSendButton"]',

      // Error/Success indicators
      errorMessage: '[data-testid="toast"]',
      successIndicator: '[data-testid="toast"][data-type="success"]'
    };
  }

  /**
   * Check if action is within rate limits
   */
  async checkRateLimit(action) {
    const key = `twitter_${action}_history`;
    const history = await this.getActionHistory(key);
    const limit = this.rateLimits[action];

    if (!limit) {
      return { allowed: true };
    }

    // Filter actions within the time window
    const now = Date.now();
    const recentActions = history.filter(timestamp =>
      now - timestamp < limit.window
    );

    if (recentActions.length >= limit.limit) {
      const oldestAction = Math.min(...recentActions);
      const resetTime = oldestAction + limit.window;
      const waitTime = resetTime - now;

      return {
        allowed: false,
        remaining: 0,
        resetIn: waitTime,
        message: `Rate limit exceeded. ${recentActions.length}/${limit.limit} ${action}s used. Resets in ${Math.ceil(waitTime / 60000)} minutes.`
      };
    }

    return {
      allowed: true,
      remaining: limit.limit - recentActions.length,
      total: limit.limit
    };
  }

  /**
   * Record action for rate limiting
   */
  async recordAction(action) {
    const key = `twitter_${action}_history`;
    const history = await this.getActionHistory(key);
    history.push(Date.now());

    // Keep only actions within the window
    const limit = this.rateLimits[action];
    const now = Date.now();
    const filtered = history.filter(timestamp =>
      now - timestamp < limit.window
    );

    await chrome.storage.local.set({ [key]: filtered });
  }

  /**
   * Get action history from storage
   */
  async getActionHistory(key) {
    const result = await chrome.storage.local.get(key);
    return result[key] || [];
  }

  /**
   * Wait for specified delay
   */
  async delay(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Wait for element to appear
   */
  async waitForElement(selector, timeout = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      await this.delay(100);
    }

    throw new Error(`Element not found: ${selector}`);
  }

  /**
   * Click element with retry
   */
  async clickElement(selector, options = {}) {
    const { retry = 3, delay = this.delays.short } = options;

    for (let i = 0; i < retry; i++) {
      try {
        const element = await this.waitForElement(selector);
        element.click();
        await this.delay(delay);
        return true;
      } catch (error) {
        if (i === retry - 1) throw error;
        await this.delay(this.delays.medium);
      }
    }

    return false;
  }

  /**
   * Type text into element
   */
  async typeText(selector, text, options = {}) {
    const { delay = 50 } = options;
    const element = await this.waitForElement(selector);

    // Focus element
    element.focus();
    await this.delay(this.delays.short);

    // Type character by character
    for (const char of text) {
      element.textContent += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await this.delay(delay);
    }

    return element;
  }

  /**
   * POST A TWEET
   */
  async tweet(params) {
    const { text, media = [] } = params;

    // Check rate limit
    const rateCheck = await this.checkRateLimit('tweet');
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: rateCheck.message,
        rateLimitInfo: rateCheck
      };
    }

    try {
      // Click tweet button
      await this.clickElement(this.selectors.tweetButton);
      await this.delay(this.delays.medium);

      // Upload media if provided
      if (media.length > 0) {
        const fileInput = await this.waitForElement(this.selectors.mediaUpload);

        for (const mediaUrl of media) {
          // Fetch and convert to File object
          const response = await fetch(mediaUrl);
          const blob = await response.blob();
          const file = new File([blob], 'upload.jpg', { type: blob.type });

          // Create DataTransfer to set files
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;

          // Trigger change event
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          await this.delay(this.delays.long);
        }
      }

      // Type tweet text
      await this.typeText(this.selectors.tweetComposer, text);
      await this.delay(this.delays.medium);

      // Submit tweet
      await this.clickElement(this.selectors.tweetSubmit);
      await this.delay(this.delays.long);

      // Record action
      await this.recordAction('tweet');

      return {
        success: true,
        action: 'tweet',
        message: 'Tweet posted successfully',
        rateLimitInfo: {
          remaining: rateCheck.remaining - 1,
          total: rateCheck.total
        }
      };
    } catch (error) {
      return {
        success: false,
        action: 'tweet',
        error: error.message
      };
    }
  }

  /**
   * LIKE A TWEET
   */
  async like(params) {
    const { tweetUrl } = params;

    // Check rate limit
    const rateCheck = await this.checkRateLimit('like');
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: rateCheck.message,
        rateLimitInfo: rateCheck
      };
    }

    try {
      // Navigate to tweet if URL provided
      if (tweetUrl && window.location.href !== tweetUrl) {
        window.location.href = tweetUrl;
        await this.delay(this.delays.long);
      }

      // Click like button
      const likeBtn = await this.waitForElement(this.selectors.likeButton);

      // Check if already liked
      if (likeBtn.getAttribute('data-testid') === 'unlike') {
        return {
          success: false,
          action: 'like',
          error: 'Tweet already liked'
        };
      }

      await this.clickElement(this.selectors.likeButton);
      await this.delay(this.delays.short);

      // Record action
      await this.recordAction('like');

      return {
        success: true,
        action: 'like',
        message: 'Tweet liked successfully',
        rateLimitInfo: {
          remaining: rateCheck.remaining - 1,
          total: rateCheck.total
        }
      };
    } catch (error) {
      return {
        success: false,
        action: 'like',
        error: error.message
      };
    }
  }

  /**
   * RETWEET A TWEET
   */
  async retweet(params) {
    const { tweetUrl } = params;

    // Check rate limit
    const rateCheck = await this.checkRateLimit('retweet');
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: rateCheck.message,
        rateLimitInfo: rateCheck
      };
    }

    try {
      // Navigate to tweet if URL provided
      if (tweetUrl && window.location.href !== tweetUrl) {
        window.location.href = tweetUrl;
        await this.delay(this.delays.long);
      }

      // Click retweet button
      await this.clickElement(this.selectors.retweetButton);
      await this.delay(this.delays.short);

      // Confirm retweet
      await this.clickElement(this.selectors.retweetConfirm);
      await this.delay(this.delays.short);

      // Record action
      await this.recordAction('retweet');

      return {
        success: true,
        action: 'retweet',
        message: 'Tweet retweeted successfully',
        rateLimitInfo: {
          remaining: rateCheck.remaining - 1,
          total: rateCheck.total
        }
      };
    } catch (error) {
      return {
        success: false,
        action: 'retweet',
        error: error.message
      };
    }
  }

  /**
   * REPLY TO A TWEET
   */
  async reply(params) {
    const { tweetUrl, text } = params;

    // Check rate limit
    const rateCheck = await this.checkRateLimit('reply');
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: rateCheck.message,
        rateLimitInfo: rateCheck
      };
    }

    try {
      // Navigate to tweet if URL provided
      if (tweetUrl && window.location.href !== tweetUrl) {
        window.location.href = tweetUrl;
        await this.delay(this.delays.long);
      }

      // Click reply button
      await this.clickElement(this.selectors.replyButton);
      await this.delay(this.delays.medium);

      // Type reply text
      await this.typeText(this.selectors.tweetComposer, text);
      await this.delay(this.delays.medium);

      // Submit reply
      await this.clickElement(this.selectors.tweetSubmit);
      await this.delay(this.delays.long);

      // Record action
      await this.recordAction('reply');

      return {
        success: true,
        action: 'reply',
        message: 'Reply posted successfully',
        rateLimitInfo: {
          remaining: rateCheck.remaining - 1,
          total: rateCheck.total
        }
      };
    } catch (error) {
      return {
        success: false,
        action: 'reply',
        error: error.message
      };
    }
  }

  /**
   * FOLLOW A USER
   */
  async follow(params) {
    const { profileUrl } = params;

    // Check rate limit
    const rateCheck = await this.checkRateLimit('follow');
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: rateCheck.message,
        rateLimitInfo: rateCheck
      };
    }

    try {
      // Navigate to profile
      if (profileUrl && window.location.href !== profileUrl) {
        window.location.href = profileUrl;
        await this.delay(this.delays.long);
      }

      // Click follow button
      const followBtn = await this.waitForElement(this.selectors.followButton);

      // Check if already following
      if (followBtn.textContent.toLowerCase().includes('following')) {
        return {
          success: false,
          action: 'follow',
          error: 'Already following this user'
        };
      }

      await this.clickElement(this.selectors.followButton);
      await this.delay(this.delays.short);

      // Record action
      await this.recordAction('follow');

      return {
        success: true,
        action: 'follow',
        message: 'User followed successfully',
        rateLimitInfo: {
          remaining: rateCheck.remaining - 1,
          total: rateCheck.total
        }
      };
    } catch (error) {
      return {
        success: false,
        action: 'follow',
        error: error.message
      };
    }
  }

  /**
   * SEND DIRECT MESSAGE
   */
  async send_dm(params) {
    const { profileUrl, text } = params;

    // Check rate limit
    const rateCheck = await this.checkRateLimit('send_dm');
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: rateCheck.message,
        rateLimitInfo: rateCheck
      };
    }

    try {
      // Navigate to profile
      if (profileUrl && window.location.href !== profileUrl) {
        window.location.href = profileUrl;
        await this.delay(this.delays.long);
      }

      // Click DM button
      await this.clickElement(this.selectors.dmButton);
      await this.delay(this.delays.medium);

      // Type DM text
      await this.typeText(this.selectors.dmComposer, text);
      await this.delay(this.delays.medium);

      // Send DM
      await this.clickElement(this.selectors.dmSend);
      await this.delay(this.delays.long);

      // Record action
      await this.recordAction('send_dm');

      return {
        success: true,
        action: 'send_dm',
        message: 'Direct message sent successfully',
        rateLimitInfo: {
          remaining: rateCheck.remaining - 1,
          total: rateCheck.total
        }
      };
    } catch (error) {
      return {
        success: false,
        action: 'send_dm',
        error: error.message
      };
    }
  }

  /**
   * Execute action based on type
   */
  async execute(action, params) {
    // Validate domain
    const currentDomain = window.location.hostname;
    if (!this.domain.some(d => currentDomain.includes(d))) {
      return {
        success: false,
        error: `Not on Twitter/X domain. Current: ${currentDomain}`
      };
    }

    // Execute action
    switch (action) {
      case 'tweet':
        return await this.tweet(params);
      case 'like':
        return await this.like(params);
      case 'retweet':
        return await this.retweet(params);
      case 'reply':
        return await this.reply(params);
      case 'follow':
        return await this.follow(params);
      case 'send_dm':
        return await this.send_dm(params);
      default:
        return {
          success: false,
          error: `Unknown action: ${action}`
        };
    }
  }

  /**
   * Get rate limit status for all actions
   */
  async getRateLimitStatus() {
    const status = {};

    for (const action of Object.keys(this.rateLimits)) {
      const check = await this.checkRateLimit(action);
      status[action] = check;
    }

    return status;
  }
}

// Export handler
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TwitterHandler;
}

// Make available globally for content script
if (typeof window !== 'undefined') {
  window.TwitterHandler = TwitterHandler;
}

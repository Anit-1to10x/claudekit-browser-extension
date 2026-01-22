/**
 * 10X.in LinkedIn Handler
 *
 * Developed by team 10X.in
 * LinkedIn-specific automation actions with rate limiting and error handling
 * Actions: view_profile, send_connection, send_message, like_post, comment, send_inmail
 */

// Rate limiting configuration
const RATE_LIMITS = {
  connections: {
    daily: 15,
    key: 'linkedin_connections_today'
  },
  messages: {
    daily: 40,
    key: 'linkedin_messages_today'
  },
  profileViews: {
    daily: 100,
    key: 'linkedin_profile_views_today'
  },
  likes: {
    daily: 50,
    key: 'linkedin_likes_today'
  },
  comments: {
    daily: 30,
    key: 'linkedin_comments_today'
  },
  inmails: {
    daily: 5,
    key: 'linkedin_inmails_today'
  }
};

// LinkedIn selectors (current UI as of 2025)
const SELECTORS = {
  // Connection request
  connectButton: 'button[aria-label*="Invite"][aria-label*="connect"], button.pvs-profile-actions__action:has-text("Connect")',
  connectButtonAlt: 'button:has-text("Connect")',
  addNoteButton: 'button[aria-label="Add a note"]',
  noteTextarea: 'textarea[name="message"]',
  sendInviteButton: 'button[aria-label="Send now"]',
  sendInviteButtonAlt: 'button[aria-label="Send invitation"]',

  // Messaging
  messageButton: 'button[aria-label*="Message"], .pvs-profile-actions__action:has-text("Message")',
  messageBox: 'div[role="textbox"][aria-label*="Write a message"]',
  messageBoxAlt: '.msg-form__contenteditable',
  sendMessageButton: 'button[type="submit"][aria-label*="Send"], button.msg-form__send-button',

  // Profile
  profileName: 'h1.text-heading-xlarge',
  profileHeadline: 'div.text-body-medium',
  profileLocation: 'span.text-body-small.inline.t-black--light.break-words',

  // Post interactions
  likeButton: 'button[aria-label*="Like"], button.react-button__trigger',
  commentButton: 'button[aria-label*="Comment"]',
  commentBox: 'div[role="textbox"][aria-label*="Add a comment"]',
  submitCommentButton: 'button.comments-comment-box__submit-button',

  // InMail
  inmailButton: 'button[aria-label*="InMail"]',
  inmailSubject: 'input[name="subject"]',
  inmailBody: 'textarea[name="body"]',
  sendInmailButton: 'button[type="submit"][aria-label*="Send"]'
};

// Utility: Random delay between actions (humanize)
const randomDelay = (min = 1000, max = 3000) => {
  return new Promise(resolve => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    setTimeout(resolve, delay);
  });
};

// Utility: Check and update rate limit
const checkRateLimit = async (actionType) => {
  const config = RATE_LIMITS[actionType];
  if (!config) return { allowed: true };

  const today = new Date().toISOString().split('T')[0];
  const storageKey = `${config.key}_${today}`;

  const result = await chrome.storage.local.get(storageKey);
  const count = result[storageKey] || 0;

  if (count >= config.daily) {
    return {
      allowed: false,
      remaining: 0,
      limit: config.daily,
      resetDate: today
    };
  }

  // Increment counter
  await chrome.storage.local.set({ [storageKey]: count + 1 });

  return {
    allowed: true,
    remaining: config.daily - count - 1,
    limit: config.daily,
    resetDate: today
  };
};

// Utility: Execute script in active tab
const executeInTab = async (func, args = []) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    throw new Error('No active tab found');
  }

  // Ensure we're on LinkedIn
  if (!tab.url || !tab.url.includes('linkedin.com')) {
    throw new Error('Not on LinkedIn. Current URL: ' + tab.url);
  }

  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func,
    args
  });

  if (!result || !result[0]) {
    throw new Error('Script execution failed');
  }

  return result[0].result;
};

// Utility: Wait for element
const waitForElement = async (selector, timeout = 10000) => {
  return await executeInTab((sel, maxWait) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkElement = () => {
        const element = document.querySelector(sel);
        if (element) {
          resolve(true);
          return;
        }

        if (Date.now() - startTime > maxWait) {
          reject(new Error(`Element not found: ${sel}`));
          return;
        }

        setTimeout(checkElement, 100);
      };

      checkElement();
    });
  }, [selector, timeout]);
};

/**
 * LinkedIn Handler Class
 */
class LinkedInHandler {
  constructor() {
    this.platform = 'linkedin';
  }

  /**
   * Main execution method - routes to specific action handlers
   */
  async execute(action) {
    console.log(`[LinkedIn Handler] Executing action: ${action.type}`);

    try {
      let result;

      switch (action.type) {
        case 'view_profile':
          result = await this.viewProfile(action);
          break;

        case 'send_connection':
          result = await this.sendConnection(action);
          break;

        case 'send_message':
          result = await this.sendMessage(action);
          break;

        case 'like_post':
          result = await this.likePost(action);
          break;

        case 'comment':
          result = await this.commentOnPost(action);
          break;

        case 'send_inmail':
          result = await this.sendInMail(action);
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      return {
        success: true,
        action: action.type,
        timestamp: new Date().toISOString(),
        ...result
      };

    } catch (error) {
      console.error(`[LinkedIn Handler] Error executing ${action.type}:`, error);

      return {
        success: false,
        action: action.type,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Action: View Profile
   */
  async viewProfile(action) {
    const { profileUrl } = action;

    if (!profileUrl) {
      throw new Error('profileUrl is required');
    }

    // Check rate limit
    const rateLimit = await checkRateLimit('profileViews');
    if (!rateLimit.allowed) {
      throw new Error(`Daily profile view limit reached (${rateLimit.limit}/day). Resets tomorrow.`);
    }

    // Navigate to profile
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.update(tab.id, { url: profileUrl });

    // Wait for page load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract profile data
    const profileData = await executeInTab(() => {
      const getName = () => {
        const nameEl = document.querySelector('h1.text-heading-xlarge');
        return nameEl ? nameEl.textContent.trim() : null;
      };

      const getHeadline = () => {
        const headlineEl = document.querySelector('div.text-body-medium');
        return headlineEl ? headlineEl.textContent.trim() : null;
      };

      const getLocation = () => {
        const locationEl = document.querySelector('span.text-body-small.inline.t-black--light.break-words');
        return locationEl ? locationEl.textContent.trim() : null;
      };

      const getConnectionDegree = () => {
        const degreeEl = document.querySelector('span.dist-value');
        return degreeEl ? degreeEl.textContent.trim() : null;
      };

      return {
        name: getName(),
        headline: getHeadline(),
        location: getLocation(),
        connectionDegree: getConnectionDegree(),
        profileUrl: window.location.href
      };
    });

    // Random delay to appear human
    await randomDelay(2000, 4000);

    return {
      profileData,
      rateLimit
    };
  }

  /**
   * Action: Send Connection Request
   */
  async sendConnection(action) {
    const { profileUrl, note } = action;

    if (!profileUrl) {
      throw new Error('profileUrl is required');
    }

    // Check rate limit
    const rateLimit = await checkRateLimit('connections');
    if (!rateLimit.allowed) {
      throw new Error(`Daily connection limit reached (${rateLimit.limit}/day). Resets tomorrow.`);
    }

    // Navigate to profile if not already there
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url || !tab.url.includes(profileUrl)) {
      await chrome.tabs.update(tab.id, { url: profileUrl });
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await randomDelay(1000, 2000);

    // Click connect button
    const connectResult = await executeInTab(() => {
      // Try multiple selectors
      const selectors = [
        'button[aria-label*="Invite"][aria-label*="connect"]',
        'button:has-text("Connect")',
        '.pvs-profile-actions__action button:contains("Connect")'
      ];

      let connectBtn = null;
      for (const sel of selectors) {
        connectBtn = document.querySelector(sel);
        if (connectBtn) break;
      }

      if (!connectBtn) {
        // Check if already connected
        const messageBtn = document.querySelector('button[aria-label*="Message"]');
        if (messageBtn) {
          return { alreadyConnected: true };
        }
        throw new Error('Connect button not found');
      }

      connectBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      connectBtn.click();
      return { clicked: true };
    });

    if (connectResult.alreadyConnected) {
      return {
        status: 'already_connected',
        message: 'Already connected with this person'
      };
    }

    await randomDelay(1000, 2000);

    // Add note if provided
    if (note && note.trim().length > 0) {
      await executeInTab((noteText) => {
        const addNoteBtn = document.querySelector('button[aria-label="Add a note"]');
        if (addNoteBtn) {
          addNoteBtn.click();

          // Wait a bit for textarea to appear
          setTimeout(() => {
            const textarea = document.querySelector('textarea[name="message"]');
            if (textarea) {
              textarea.value = noteText;
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }, 500);
        }
      }, [note]);

      await randomDelay(1500, 2500);
    }

    // Click send invitation
    await executeInTab(() => {
      const sendBtn = document.querySelector('button[aria-label="Send now"]') ||
                      document.querySelector('button[aria-label="Send invitation"]') ||
                      document.querySelector('button[aria-label*="Send"]');

      if (!sendBtn) {
        throw new Error('Send button not found');
      }

      sendBtn.click();
    });

    await randomDelay(1000, 2000);

    return {
      status: 'sent',
      note: note || null,
      rateLimit
    };
  }

  /**
   * Action: Send Message
   */
  async sendMessage(action) {
    const { profileUrl, message } = action;

    if (!profileUrl) {
      throw new Error('profileUrl is required');
    }

    if (!message || message.trim().length === 0) {
      throw new Error('message text is required');
    }

    // Check rate limit
    const rateLimit = await checkRateLimit('messages');
    if (!rateLimit.allowed) {
      throw new Error(`Daily message limit reached (${rateLimit.limit}/day). Resets tomorrow.`);
    }

    // Navigate to profile
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url || !tab.url.includes(profileUrl)) {
      await chrome.tabs.update(tab.id, { url: profileUrl });
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await randomDelay(1000, 2000);

    // Click message button
    await executeInTab(() => {
      const messageBtn = document.querySelector('button[aria-label*="Message"]') ||
                         document.querySelector('.pvs-profile-actions__action:has-text("Message")');

      if (!messageBtn) {
        throw new Error('Message button not found. Are you connected?');
      }

      messageBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageBtn.click();
    });

    await randomDelay(2000, 3000);

    // Type message
    await executeInTab((msgText) => {
      const selectors = [
        'div[role="textbox"][aria-label*="Write a message"]',
        '.msg-form__contenteditable',
        'div.msg-form__contenteditable'
      ];

      let messageBox = null;
      for (const sel of selectors) {
        messageBox = document.querySelector(sel);
        if (messageBox) break;
      }

      if (!messageBox) {
        throw new Error('Message box not found');
      }

      messageBox.focus();
      messageBox.textContent = msgText;

      // Trigger input events
      messageBox.dispatchEvent(new Event('input', { bubbles: true }));
      messageBox.dispatchEvent(new Event('change', { bubbles: true }));
    }, [message]);

    await randomDelay(1500, 2500);

    // Send message
    await executeInTab(() => {
      const sendBtn = document.querySelector('button[type="submit"][aria-label*="Send"]') ||
                      document.querySelector('button.msg-form__send-button');

      if (!sendBtn) {
        throw new Error('Send button not found');
      }

      // Check if button is disabled
      if (sendBtn.disabled) {
        throw new Error('Send button is disabled');
      }

      sendBtn.click();
    });

    await randomDelay(1000, 2000);

    return {
      status: 'sent',
      messageLength: message.length,
      rateLimit
    };
  }

  /**
   * Action: Like Post
   */
  async likePost(action) {
    const { postUrl } = action;

    if (!postUrl) {
      throw new Error('postUrl is required');
    }

    // Check rate limit
    const rateLimit = await checkRateLimit('likes');
    if (!rateLimit.allowed) {
      throw new Error(`Daily like limit reached (${rateLimit.limit}/day). Resets tomorrow.`);
    }

    // Navigate to post
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url || !tab.url.includes(postUrl)) {
      await chrome.tabs.update(tab.id, { url: postUrl });
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await randomDelay(1000, 2000);

    // Click like button
    const likeResult = await executeInTab(() => {
      const likeBtn = document.querySelector('button[aria-label*="React Like"]') ||
                      document.querySelector('button.react-button__trigger');

      if (!likeBtn) {
        throw new Error('Like button not found');
      }

      // Check if already liked
      const ariaPressed = likeBtn.getAttribute('aria-pressed');
      if (ariaPressed === 'true') {
        return { alreadyLiked: true };
      }

      likeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      likeBtn.click();

      return { liked: true };
    });

    await randomDelay(500, 1500);

    return {
      status: likeResult.alreadyLiked ? 'already_liked' : 'liked',
      rateLimit
    };
  }

  /**
   * Action: Comment on Post
   */
  async commentOnPost(action) {
    const { postUrl, comment } = action;

    if (!postUrl) {
      throw new Error('postUrl is required');
    }

    if (!comment || comment.trim().length === 0) {
      throw new Error('comment text is required');
    }

    // Check rate limit
    const rateLimit = await checkRateLimit('comments');
    if (!rateLimit.allowed) {
      throw new Error(`Daily comment limit reached (${rateLimit.limit}/day). Resets tomorrow.`);
    }

    // Navigate to post
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url || !tab.url.includes(postUrl)) {
      await chrome.tabs.update(tab.id, { url: postUrl });
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await randomDelay(1000, 2000);

    // Click comment button to focus comment box
    await executeInTab(() => {
      const commentBtn = document.querySelector('button[aria-label*="Comment"]');
      if (commentBtn) {
        commentBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        commentBtn.click();
      }
    });

    await randomDelay(1000, 2000);

    // Type comment
    await executeInTab((commentText) => {
      const commentBox = document.querySelector('div[role="textbox"][aria-label*="Add a comment"]') ||
                         document.querySelector('.comments-comment-box__textarea');

      if (!commentBox) {
        throw new Error('Comment box not found');
      }

      commentBox.focus();
      commentBox.textContent = commentText;

      // Trigger input events
      commentBox.dispatchEvent(new Event('input', { bubbles: true }));
      commentBox.dispatchEvent(new Event('change', { bubbles: true }));
    }, [comment]);

    await randomDelay(1500, 2500);

    // Submit comment
    await executeInTab(() => {
      const submitBtn = document.querySelector('button.comments-comment-box__submit-button') ||
                        document.querySelector('button[type="submit"][aria-label*="Post"]');

      if (!submitBtn) {
        throw new Error('Submit button not found');
      }

      if (submitBtn.disabled) {
        throw new Error('Submit button is disabled');
      }

      submitBtn.click();
    });

    await randomDelay(1000, 2000);

    return {
      status: 'posted',
      commentLength: comment.length,
      rateLimit
    };
  }

  /**
   * Action: Send InMail
   */
  async sendInMail(action) {
    const { profileUrl, subject, body } = action;

    if (!profileUrl) {
      throw new Error('profileUrl is required');
    }

    if (!subject || subject.trim().length === 0) {
      throw new Error('subject is required');
    }

    if (!body || body.trim().length === 0) {
      throw new Error('body is required');
    }

    // Check rate limit
    const rateLimit = await checkRateLimit('inmails');
    if (!rateLimit.allowed) {
      throw new Error(`Daily InMail limit reached (${rateLimit.limit}/day). Resets tomorrow.`);
    }

    // Navigate to profile
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url || !tab.url.includes(profileUrl)) {
      await chrome.tabs.update(tab.id, { url: profileUrl });
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await randomDelay(1000, 2000);

    // Click InMail button (requires Premium)
    await executeInTab(() => {
      const inmailBtn = document.querySelector('button[aria-label*="InMail"]');

      if (!inmailBtn) {
        throw new Error('InMail button not found. Do you have LinkedIn Premium?');
      }

      inmailBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      inmailBtn.click();
    });

    await randomDelay(2000, 3000);

    // Fill subject
    await executeInTab((subjectText) => {
      const subjectInput = document.querySelector('input[name="subject"]');

      if (!subjectInput) {
        throw new Error('Subject field not found');
      }

      subjectInput.value = subjectText;
      subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
    }, [subject]);

    await randomDelay(500, 1000);

    // Fill body
    await executeInTab((bodyText) => {
      const bodyTextarea = document.querySelector('textarea[name="body"]') ||
                           document.querySelector('div[role="textbox"]');

      if (!bodyTextarea) {
        throw new Error('Body field not found');
      }

      if (bodyTextarea.tagName === 'TEXTAREA') {
        bodyTextarea.value = bodyText;
      } else {
        bodyTextarea.textContent = bodyText;
      }

      bodyTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    }, [body]);

    await randomDelay(1500, 2500);

    // Send InMail
    await executeInTab(() => {
      const sendBtn = document.querySelector('button[type="submit"][aria-label*="Send"]');

      if (!sendBtn) {
        throw new Error('Send button not found');
      }

      if (sendBtn.disabled) {
        throw new Error('Send button is disabled');
      }

      sendBtn.click();
    });

    await randomDelay(1000, 2000);

    return {
      status: 'sent',
      subject,
      bodyLength: body.length,
      rateLimit
    };
  }
}

export default LinkedInHandler;

/**
 * 10X.in Context Manager
 * Maintains page and session context for intelligent automation
 */

class ContextManager {
  constructor() {
    this.pageContext = null;
    this.sessionContext = {
      startTime: Date.now(),
      pagesVisited: [],
      actionsPerformed: [],
      extractedData: {},
      variables: {}
    };

    this.platformDetectors = this.initializePlatformDetectors();
    this.pageAnalysisCache = new Map();
  }

  /**
   * Initialize platform-specific detectors
   */
  initializePlatformDetectors() {
    return {
      LINKEDIN: {
        hosts: ['linkedin.com', 'www.linkedin.com'],
        indicators: {
          profile: /\/in\/[\w-]+/,
          company: /\/company\//,
          jobs: /\/jobs\//,
          feed: /\/feed/,
          messaging: /\/messaging/,
          mynetwork: /\/mynetwork/
        },
        selectors: {
          name: '.text-heading-xlarge, .pv-top-card--list li:first-child',
          headline: '.text-body-medium, .pv-top-card--list-bullet',
          company: '.pv-text-details__right-panel-item-text',
          location: '.pv-top-card--list-bullet:last-child',
          connections: '.pv-top-card--list-bullet:contains("connections")'
        }
      },
      TWITTER: {
        hosts: ['twitter.com', 'x.com', 'www.twitter.com', 'www.x.com'],
        indicators: {
          profile: /^\/@?[\w]+$/,
          tweet: /\/status\/\d+/,
          home: /\/home/,
          explore: /\/explore/,
          messages: /\/messages/
        },
        selectors: {
          name: '[data-testid="UserName"] span:first-child',
          username: '[data-testid="UserName"] span:nth-child(2)',
          bio: '[data-testid="UserDescription"]',
          followers: '[href$="/followers"] span',
          following: '[href$="/following"] span'
        }
      },
      INSTAGRAM: {
        hosts: ['instagram.com', 'www.instagram.com'],
        indicators: {
          profile: /^\/[\w.]+\/?$/,
          post: /\/p\/[\w-]+/,
          reel: /\/reel\/[\w-]+/,
          stories: /\/stories\//,
          explore: /\/explore/
        },
        selectors: {
          name: 'header h2',
          fullName: 'header section span',
          bio: 'header section > div:last-child span',
          posts: 'header section ul li:first-child span',
          followers: 'header section ul li:nth-child(2) span',
          following: 'header section ul li:last-child span'
        }
      },
      GOOGLE: {
        hosts: ['google.com', 'www.google.com'],
        indicators: {
          search: /\/search/,
          images: /tbm=isch/,
          news: /tbm=nws/,
          maps: /maps\.google/
        },
        selectors: {
          searchBox: 'input[name="q"], textarea[name="q"]',
          results: '#search .g',
          resultTitle: 'h3',
          resultUrl: 'cite',
          resultSnippet: '.VwiC3b'
        }
      },
      FACEBOOK: {
        hosts: ['facebook.com', 'www.facebook.com'],
        indicators: {
          profile: /\/profile\.php|^\/[\w.]+$/,
          page: /^\/[\w]+$/,
          groups: /\/groups\//,
          marketplace: /\/marketplace/
        },
        selectors: {
          name: 'h1',
          bio: '[data-pagelet="ProfileTilesFeed"]'
        }
      },
      YOUTUBE: {
        hosts: ['youtube.com', 'www.youtube.com'],
        indicators: {
          video: /\/watch/,
          channel: /\/@[\w]+|\/channel\//,
          playlist: /\/playlist/,
          shorts: /\/shorts\//
        },
        selectors: {
          videoTitle: 'h1.ytd-video-primary-info-renderer',
          channelName: '#owner-name a',
          views: '.view-count',
          likes: '#menu .ytd-toggle-button-renderer'
        }
      },
      AMAZON: {
        hosts: ['amazon.com', 'www.amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr'],
        indicators: {
          product: /\/dp\/[\w]+/,
          search: /\/s\?/,
          cart: /\/cart/
        },
        selectors: {
          productTitle: '#productTitle',
          price: '.a-price .a-offscreen',
          rating: '.a-icon-star span',
          reviews: '#acrCustomerReviewText'
        }
      }
    };
  }

  /**
   * Analyze current page and build context
   */
  async analyzeCurrentPage() {
    const url = window.location.href;
    const hostname = window.location.hostname;

    // Check cache
    const cacheKey = url;
    if (this.pageAnalysisCache.has(cacheKey)) {
      const cached = this.pageAnalysisCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 30000) { // 30 second cache
        return cached.context;
      }
    }

    const context = {
      url,
      hostname,
      pathname: window.location.pathname,
      title: document.title,
      platform: this.detectPlatform(hostname),
      pageType: null,
      profile: null,
      data: {},
      elements: {},
      forms: [],
      timestamp: Date.now()
    };

    // Detect page type
    context.pageType = this.detectPageType(context.platform, window.location);

    // Extract platform-specific data
    if (context.platform !== 'GENERIC') {
      context.profile = await this.extractProfileData(context.platform);
      context.data = await this.extractPlatformData(context.platform, context.pageType);
    }

    // Analyze page structure
    context.elements = this.analyzePageElements();
    context.forms = this.analyzeForms();

    // Cache result
    this.pageAnalysisCache.set(cacheKey, {
      context,
      timestamp: Date.now()
    });

    this.pageContext = context;
    this.addToSession(context);

    return context;
  }

  /**
   * Detect platform from hostname
   */
  detectPlatform(hostname) {
    for (const [platform, config] of Object.entries(this.platformDetectors)) {
      if (config.hosts.some(host => hostname.includes(host))) {
        return platform;
      }
    }
    return 'GENERIC';
  }

  /**
   * Detect page type within a platform
   */
  detectPageType(platform, location) {
    if (platform === 'GENERIC') return 'unknown';

    const config = this.platformDetectors[platform];
    if (!config?.indicators) return 'unknown';

    const fullPath = location.pathname + location.search;

    for (const [pageType, pattern] of Object.entries(config.indicators)) {
      if (pattern.test(fullPath)) {
        return pageType;
      }
    }

    return 'unknown';
  }

  /**
   * Extract profile data from current page
   */
  async extractProfileData(platform) {
    const config = this.platformDetectors[platform];
    if (!config?.selectors) return null;

    const profile = {};

    for (const [field, selector] of Object.entries(config.selectors)) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          profile[field] = element.textContent?.trim();
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }

    // Add URL if on profile page
    if (Object.keys(profile).length > 0) {
      profile.url = window.location.href;
    }

    return Object.keys(profile).length > 0 ? profile : null;
  }

  /**
   * Extract platform-specific data
   */
  async extractPlatformData(platform, pageType) {
    const data = {};

    switch (platform) {
      case 'LINKEDIN':
        if (pageType === 'profile') {
          data.experience = this.extractLinkedInExperience();
          data.education = this.extractLinkedInEducation();
          data.skills = this.extractLinkedInSkills();
        }
        break;

      case 'GOOGLE':
        if (pageType === 'search') {
          data.searchQuery = this.getGoogleSearchQuery();
          data.resultCount = this.getGoogleResultCount();
        }
        break;

      case 'AMAZON':
        if (pageType === 'product') {
          data.product = this.extractAmazonProduct();
        }
        break;
    }

    return data;
  }

  /**
   * Extract LinkedIn experience
   */
  extractLinkedInExperience() {
    const experiences = [];
    const expSection = document.querySelector('#experience');
    if (!expSection) return experiences;

    const items = expSection.querySelectorAll('li.artdeco-list__item');
    for (const item of items) {
      const title = item.querySelector('.t-bold span')?.textContent?.trim();
      const company = item.querySelector('.t-14.t-normal span')?.textContent?.trim();
      if (title || company) {
        experiences.push({ title, company });
      }
    }

    return experiences;
  }

  /**
   * Extract LinkedIn education
   */
  extractLinkedInEducation() {
    const education = [];
    const eduSection = document.querySelector('#education');
    if (!eduSection) return education;

    const items = eduSection.querySelectorAll('li.artdeco-list__item');
    for (const item of items) {
      const school = item.querySelector('.t-bold span')?.textContent?.trim();
      const degree = item.querySelector('.t-14.t-normal span')?.textContent?.trim();
      if (school) {
        education.push({ school, degree });
      }
    }

    return education;
  }

  /**
   * Extract LinkedIn skills
   */
  extractLinkedInSkills() {
    const skills = [];
    const skillsSection = document.querySelector('#skills');
    if (!skillsSection) return skills;

    const items = skillsSection.querySelectorAll('.skill-card-name');
    for (const item of items) {
      const skill = item.textContent?.trim();
      if (skill) skills.push(skill);
    }

    return skills;
  }

  /**
   * Get Google search query
   */
  getGoogleSearchQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  }

  /**
   * Get Google result count
   */
  getGoogleResultCount() {
    const stats = document.querySelector('#result-stats');
    return stats?.textContent?.trim() || null;
  }

  /**
   * Extract Amazon product data
   */
  extractAmazonProduct() {
    return {
      title: document.querySelector('#productTitle')?.textContent?.trim(),
      price: document.querySelector('.a-price .a-offscreen')?.textContent?.trim(),
      rating: document.querySelector('.a-icon-star span')?.textContent?.trim(),
      reviews: document.querySelector('#acrCustomerReviewText')?.textContent?.trim(),
      asin: window.location.pathname.match(/\/dp\/([\w]+)/)?.[1]
    };
  }

  /**
   * Analyze page elements
   */
  analyzePageElements() {
    return {
      buttons: document.querySelectorAll('button, [role="button"]').length,
      links: document.querySelectorAll('a[href]').length,
      inputs: document.querySelectorAll('input, textarea').length,
      images: document.querySelectorAll('img').length,
      videos: document.querySelectorAll('video').length,
      forms: document.querySelectorAll('form').length,
      tables: document.querySelectorAll('table').length,
      lists: document.querySelectorAll('ul, ol').length
    };
  }

  /**
   * Analyze forms on the page
   */
  analyzeForms() {
    const forms = [];
    const formElements = document.querySelectorAll('form');

    for (const form of formElements) {
      const fields = [];
      const inputs = form.querySelectorAll('input, select, textarea');

      for (const input of inputs) {
        if (input.type === 'hidden') continue;

        fields.push({
          type: input.type || input.tagName.toLowerCase(),
          name: input.name || input.id,
          label: this.findLabelFor(input),
          required: input.required,
          placeholder: input.placeholder
        });
      }

      if (fields.length > 0) {
        forms.push({
          id: form.id,
          action: form.action,
          method: form.method,
          fields
        });
      }
    }

    return forms;
  }

  /**
   * Find label for an input
   */
  findLabelFor(input) {
    // Try explicit label
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) return label.textContent?.trim();
    }

    // Try parent label
    const parentLabel = input.closest('label');
    if (parentLabel) {
      return parentLabel.textContent?.replace(input.value || '', '').trim();
    }

    // Try aria-label
    return input.getAttribute('aria-label');
  }

  /**
   * Add page visit to session
   */
  addToSession(context) {
    this.sessionContext.pagesVisited.push({
      url: context.url,
      title: context.title,
      platform: context.platform,
      pageType: context.pageType,
      timestamp: Date.now()
    });

    // Keep last 50 pages
    if (this.sessionContext.pagesVisited.length > 50) {
      this.sessionContext.pagesVisited.shift();
    }
  }

  /**
   * Record an action in session
   */
  recordAction(action) {
    this.sessionContext.actionsPerformed.push({
      ...action,
      url: window.location.href,
      timestamp: Date.now()
    });

    // Keep last 100 actions
    if (this.sessionContext.actionsPerformed.length > 100) {
      this.sessionContext.actionsPerformed.shift();
    }
  }

  /**
   * Store extracted data
   */
  storeExtractedData(key, data) {
    this.sessionContext.extractedData[key] = {
      data,
      url: window.location.href,
      timestamp: Date.now()
    };
  }

  /**
   * Set a session variable
   */
  setVariable(name, value) {
    this.sessionContext.variables[name] = value;
  }

  /**
   * Get a session variable
   */
  getVariable(name) {
    return this.sessionContext.variables[name];
  }

  /**
   * Get current context
   */
  getContext() {
    return {
      page: this.pageContext,
      session: this.sessionContext
    };
  }

  /**
   * Get platform-specific selectors
   */
  getSelectors(platform = null) {
    const p = platform || this.pageContext?.platform;
    if (!p || p === 'GENERIC') return {};
    return this.platformDetectors[p]?.selectors || {};
  }

  /**
   * Check if we're on a specific platform
   */
  isOnPlatform(platform) {
    return this.pageContext?.platform === platform;
  }

  /**
   * Check if we're on a specific page type
   */
  isPageType(pageType) {
    return this.pageContext?.pageType === pageType;
  }

  /**
   * Get suggestions based on current context
   */
  getSuggestions() {
    const suggestions = [];
    const context = this.pageContext;

    if (!context) return suggestions;

    // Platform-specific suggestions
    switch (context.platform) {
      case 'LINKEDIN':
        if (context.pageType === 'profile') {
          suggestions.push(
            { action: 'connect', label: 'Send Connection Request' },
            { action: 'message', label: 'Send Message' },
            { action: 'scrape', label: 'Extract Profile Data' }
          );
        }
        if (context.pageType === 'feed') {
          suggestions.push(
            { action: 'scrape', label: 'Extract Posts' },
            { action: 'like', label: 'Like Posts' }
          );
        }
        break;

      case 'TWITTER':
        if (context.pageType === 'profile') {
          suggestions.push(
            { action: 'follow', label: 'Follow User' },
            { action: 'message', label: 'Send DM' },
            { action: 'scrape', label: 'Extract Tweets' }
          );
        }
        break;

      case 'GOOGLE':
        if (context.pageType === 'search') {
          suggestions.push(
            { action: 'scrape', label: 'Extract Search Results' },
            { action: 'click', label: 'Click First Result' }
          );
        }
        break;
    }

    // Generic suggestions
    if (context.elements.forms > 0) {
      suggestions.push({ action: 'fill-form', label: 'Auto-fill Form' });
    }

    if (context.elements.tables > 0) {
      suggestions.push({ action: 'scrape-tables', label: 'Extract Table Data' });
    }

    return suggestions;
  }

  /**
   * Clear caches
   */
  clearCache() {
    this.pageAnalysisCache.clear();
  }

  /**
   * Reset session
   */
  resetSession() {
    this.sessionContext = {
      startTime: Date.now(),
      pagesVisited: [],
      actionsPerformed: [],
      extractedData: {},
      variables: {}
    };
    this.clearCache();
  }
}

// Create singleton
const contextManager = new ContextManager();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ContextManager, contextManager };
}

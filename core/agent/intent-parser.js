/**
 * 10X.in Natural Language Intent Parser
 * 100% Offline - No API Required
 *
 * Parses natural language commands into structured actions
 */

class IntentParser {
  constructor() {
    this.patterns = this.initializePatterns();
    this.entityExtractors = this.initializeEntityExtractors();
    this.contextStack = [];
    this.commandHistory = [];
    this.platformContext = null;
  }

  /**
   * Initialize intent patterns for various command types
   */
  initializePatterns() {
    return {
      // Scraping/Extraction intents
      SCRAPE: {
        patterns: [
          /(?:scrape|extract|get|grab|collect|pull|harvest|fetch|find)\s+(?:all\s+)?(?:the\s+)?(.+?)(?:\s+from\s+(?:this\s+)?(?:page|site|website))?$/i,
          /(?:what\s+are|show\s+me|list)\s+(?:all\s+)?(?:the\s+)?(.+?)(?:\s+(?:on|from|in)\s+(?:this\s+)?(?:page|site))?$/i,
          /(?:give\s+me|i\s+(?:want|need))\s+(?:all\s+)?(?:the\s+)?(.+)/i,
          /(?:download|export|save)\s+(?:all\s+)?(?:the\s+)?(.+)/i
        ],
        keywords: ['scrape', 'extract', 'get', 'grab', 'collect', 'pull', 'harvest', 'fetch', 'download', 'export']
      },

      // Click/Tap intents
      CLICK: {
        patterns: [
          /(?:click|tap|press|hit|select)\s+(?:on\s+)?(?:the\s+)?(.+)/i,
          /(?:open|expand|toggle|activate)\s+(?:the\s+)?(.+)/i,
          /(?:submit|send|post)\s+(?:the\s+)?(?:form|button|message)?/i
        ],
        keywords: ['click', 'tap', 'press', 'hit', 'select', 'open', 'expand', 'toggle', 'submit', 'send']
      },

      // Typing/Input intents
      TYPE: {
        patterns: [
          /(?:type|enter|input|write|put)\s+['"]?(.+?)['"]?\s+(?:in|into|to)\s+(?:the\s+)?(.+)/i,
          /(?:fill|populate)\s+(?:the\s+)?(.+?)\s+(?:with|as)\s+['"]?(.+?)['"]?/i,
          /(?:set|change)\s+(?:the\s+)?(.+?)\s+to\s+['"]?(.+?)['"]?/i,
          /(?:search|find|look)\s+(?:for\s+)?['"]?(.+?)['"]?/i
        ],
        keywords: ['type', 'enter', 'input', 'write', 'fill', 'populate', 'set', 'search']
      },

      // Navigation intents
      NAVIGATE: {
        patterns: [
          /(?:go|navigate|head|travel)\s+(?:to\s+)?(.+)/i,
          /(?:open|visit|load|browse)\s+(?:the\s+)?(?:website\s+)?(.+)/i,
          /(?:take\s+me\s+to|bring\s+me\s+to)\s+(.+)/i,
          /(?:show\s+me)\s+(.+?)\s+(?:page|website|site)/i
        ],
        keywords: ['go', 'navigate', 'open', 'visit', 'load', 'browse']
      },

      // Wait/Delay intents
      WAIT: {
        patterns: [
          /(?:wait|pause|delay|sleep|hold)\s+(?:for\s+)?(\d+)\s*(?:s|sec|seconds?|ms|milliseconds?|m|min|minutes?)?/i,
          /(?:wait|hold|pause)\s+(?:until|for|till)\s+(?:the\s+)?(.+?)(?:\s+(?:appears?|loads?|shows?|is\s+visible))?/i,
          /(?:wait\s+for|until)\s+(?:page\s+)?(?:loads?|ready)/i
        ],
        keywords: ['wait', 'pause', 'delay', 'sleep', 'hold']
      },

      // Workflow intents
      WORKFLOW: {
        patterns: [
          /(?:run|execute|start|launch|play)\s+(?:the\s+)?(?:workflow\s+)?['"]?(.+?)['"]?(?:\s+workflow)?$/i,
          /(?:record|capture|save)\s+(?:my\s+)?(?:actions?|steps?|workflow)/i,
          /(?:stop|end|finish)\s+(?:recording|capturing)/i,
          /(?:create|make|build|new)\s+(?:a\s+)?(?:new\s+)?workflow/i
        ],
        keywords: ['run', 'execute', 'start', 'record', 'capture', 'workflow']
      },

      // Scroll intents
      SCROLL: {
        patterns: [
          /(?:scroll)\s+(?:to\s+)?(?:the\s+)?(top|bottom|up|down|left|right)/i,
          /(?:scroll|go)\s+(?:to\s+)?(.+?)(?:\s+section)?/i,
          /(?:page\s+)?(up|down)/i
        ],
        keywords: ['scroll', 'page up', 'page down']
      },

      // Screenshot/Capture intents
      SCREENSHOT: {
        patterns: [
          /(?:take|capture|grab|save)\s+(?:a\s+)?(?:screenshot|screen\s*shot|snapshot|picture)/i,
          /(?:screenshot|snapshot)\s+(?:the\s+)?(?:page|screen|element)/i
        ],
        keywords: ['screenshot', 'snapshot', 'capture', 'picture']
      },

      // Form-related intents
      FORM: {
        patterns: [
          /(?:fill|complete|populate)\s+(?:the\s+|this\s+)?form/i,
          /(?:auto-?fill|autofill)\s+(?:the\s+)?(?:form|fields?)/i,
          /(?:submit|send)\s+(?:the\s+|this\s+)?form/i,
          /(?:clear|reset)\s+(?:the\s+|this\s+)?form/i
        ],
        keywords: ['fill', 'complete', 'autofill', 'form', 'submit']
      },

      // Profile/Social actions
      SOCIAL: {
        patterns: [
          /(?:connect|follow|add|friend|link)\s+(?:with\s+)?(?:this\s+)?(?:person|user|profile|account)?/i,
          /(?:message|dm|text|contact)\s+(?:this\s+)?(?:person|user|profile)?/i,
          /(?:like|heart|favorite|star)\s+(?:this\s+)?(?:post|photo|tweet|content)?/i,
          /(?:comment|reply)\s+(?:on\s+)?(?:this\s+)?(?:post|photo|tweet)?/i,
          /(?:share|retweet|repost)\s+(?:this\s+)?(?:post|content)?/i,
          /(?:view|check|see)\s+(?:this\s+)?(?:profile|account|page)/i
        ],
        keywords: ['connect', 'follow', 'message', 'like', 'comment', 'share', 'retweet', 'view profile']
      },

      // Loop/Repeat intents
      LOOP: {
        patterns: [
          /(?:repeat|loop|do)\s+(?:this\s+)?(\d+)\s+times?/i,
          /(?:for\s+each|foreach|iterate)\s+(?:item|element|row)\s+(?:in\s+)?(.+)/i,
          /(?:do|perform)\s+(.+?)\s+(?:for\s+)?(?:all|every|each)\s+(.+)/i
        ],
        keywords: ['repeat', 'loop', 'for each', 'iterate']
      },

      // Conditional intents
      CONDITION: {
        patterns: [
          /(?:if|when|check\s+if)\s+(.+?)\s+(?:then\s+)?(.+)/i,
          /(?:only\s+if|unless)\s+(.+)/i,
          /(?:skip|ignore)\s+(?:if|when)\s+(.+)/i
        ],
        keywords: ['if', 'when', 'check', 'only if', 'unless', 'skip']
      },

      // Variable/Storage intents
      VARIABLE: {
        patterns: [
          /(?:save|store|remember|set)\s+(?:this\s+)?(?:as\s+)?['"]?(\w+)['"]?/i,
          /(?:use|get|recall|fetch)\s+(?:the\s+)?(?:saved|stored)?\s*['"]?(\w+)['"]?/i,
          /(?:clear|delete|forget)\s+(?:the\s+)?(?:variable\s+)?['"]?(\w+)['"]?/i
        ],
        keywords: ['save', 'store', 'remember', 'variable']
      },

      // Multi-tab intents
      TAB: {
        patterns: [
          /(?:open|create)\s+(?:a\s+)?(?:new\s+)?tab/i,
          /(?:switch|go)\s+(?:to\s+)?tab\s+(\d+)/i,
          /(?:close|kill)\s+(?:this\s+)?tab/i,
          /(?:in\s+)?(?:a\s+)?(?:new\s+)?tab\s+(.+)/i
        ],
        keywords: ['new tab', 'tab', 'switch tab', 'close tab']
      }
    };
  }

  /**
   * Initialize entity extractors for different data types
   */
  initializeEntityExtractors() {
    return {
      // Email addresses
      email: {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        aliases: ['emails', 'email addresses', 'email ids', 'mail addresses', 'e-mails']
      },

      // Phone numbers
      phone: {
        pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
        aliases: ['phones', 'phone numbers', 'telephone', 'contact numbers', 'mobile numbers']
      },

      // URLs
      url: {
        pattern: /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
        aliases: ['urls', 'links', 'hyperlinks', 'web addresses', 'websites']
      },

      // Names (capitalized words)
      name: {
        pattern: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
        aliases: ['names', 'full names', 'people', 'persons', 'contacts']
      },

      // Prices
      price: {
        pattern: /[$€£¥]\s*[\d,]+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:USD|EUR|GBP|dollars?)/gi,
        aliases: ['prices', 'costs', 'amounts', 'values', 'money', 'pricing']
      },

      // Dates
      date: {
        pattern: /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})\b/gi,
        aliases: ['dates', 'date', 'when', 'time', 'posted on', 'published']
      },

      // Social handles
      socialHandle: {
        pattern: /@[\w]+/g,
        aliases: ['handles', 'usernames', 'twitter handles', 'instagram handles', 'mentions']
      },

      // Hashtags
      hashtag: {
        pattern: /#[\w]+/g,
        aliases: ['hashtags', 'tags', 'topics']
      },

      // Product titles (common patterns)
      productTitle: {
        selector: 'h1, h2, [class*="product-title"], [class*="item-title"], [data-testid*="title"]',
        aliases: ['products', 'product names', 'items', 'titles', 'product titles']
      },

      // Reviews
      review: {
        selector: '[class*="review"], [data-testid*="review"], .review-text, .comment-text',
        aliases: ['reviews', 'comments', 'feedback', 'ratings']
      },

      // Images
      image: {
        selector: 'img[src]',
        aliases: ['images', 'photos', 'pictures', 'pics', 'thumbnails']
      },

      // Headlines
      headline: {
        selector: 'h1, h2, h3, [class*="headline"], [class*="title"]',
        aliases: ['headlines', 'titles', 'headings', 'headers']
      },

      // Table data
      table: {
        selector: 'table, [role="table"], [class*="table"]',
        aliases: ['table', 'tables', 'table data', 'grid', 'rows']
      },

      // Lists
      list: {
        selector: 'ul, ol, [role="list"]',
        aliases: ['list', 'lists', 'items', 'bullet points', 'numbered list']
      },

      // Cards (social profiles, products, etc.)
      card: {
        selector: '[class*="card"], [class*="profile"], article, [class*="item"]',
        aliases: ['cards', 'profiles', 'results', 'entries', 'articles']
      }
    };
  }

  /**
   * Parse a natural language command
   * @param {string} input - The user's command
   * @param {Object} context - Current page/session context
   * @returns {Object} Parsed intent with action and parameters
   */
  parse(input, context = {}) {
    if (!input || typeof input !== 'string') {
      return { intent: 'UNKNOWN', confidence: 0, error: 'Invalid input' };
    }

    const normalizedInput = this.normalizeInput(input);
    this.platformContext = context.platform || this.detectPlatform();

    // Try to match against all intent patterns
    const matches = [];

    for (const [intentType, config] of Object.entries(this.patterns)) {
      for (const pattern of config.patterns) {
        const match = normalizedInput.match(pattern);
        if (match) {
          const confidence = this.calculateConfidence(normalizedInput, config, match);
          matches.push({
            intent: intentType,
            match,
            confidence,
            pattern: pattern.source
          });
        }
      }

      // Also check keywords for partial matches
      for (const keyword of config.keywords) {
        if (normalizedInput.toLowerCase().includes(keyword.toLowerCase())) {
          matches.push({
            intent: intentType,
            match: [keyword],
            confidence: 0.6,
            keyword: true
          });
        }
      }
    }

    if (matches.length === 0) {
      return this.handleUnknownIntent(normalizedInput);
    }

    // Sort by confidence and get best match
    matches.sort((a, b) => b.confidence - a.confidence);
    const best = matches[0];

    // Extract parameters based on intent type
    const params = this.extractParameters(best.intent, normalizedInput, best.match);

    // Build the parsed result
    const result = {
      intent: best.intent,
      confidence: best.confidence,
      raw: input,
      normalized: normalizedInput,
      params,
      platform: this.platformContext,
      suggestions: this.generateSuggestions(best.intent, params),
      alternatives: matches.slice(1, 4).map(m => ({ intent: m.intent, confidence: m.confidence }))
    };

    // Add to history for context
    this.commandHistory.push({ input, result, timestamp: Date.now() });
    if (this.commandHistory.length > 50) {
      this.commandHistory.shift();
    }

    return result;
  }

  /**
   * Normalize input text
   */
  normalizeInput(input) {
    return input
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'");
  }

  /**
   * Calculate confidence score for a match
   */
  calculateConfidence(input, config, match) {
    let confidence = 0.7; // Base confidence for pattern match

    // Bonus for longer matches
    if (match[0].length > input.length * 0.5) {
      confidence += 0.1;
    }

    // Bonus for keyword presence
    const keywordsFound = config.keywords.filter(k =>
      input.toLowerCase().includes(k.toLowerCase())
    ).length;
    confidence += Math.min(keywordsFound * 0.05, 0.15);

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Extract parameters based on intent type
   */
  extractParameters(intent, input, match) {
    const params = {};

    switch (intent) {
      case 'SCRAPE':
        params.target = this.identifyScrapingTarget(match[1] || input);
        params.entityType = this.matchEntityType(params.target);
        params.selector = params.entityType?.selector || null;
        params.pattern = params.entityType?.pattern || null;
        break;

      case 'CLICK':
        params.target = match[1] || '';
        params.element = this.describeElement(params.target);
        break;

      case 'TYPE':
        if (match[1] && match[2]) {
          // "type X into Y" format
          params.text = match[1].replace(/['"]/g, '');
          params.target = match[2];
        } else if (match[1]) {
          // "search for X" format
          params.text = match[1].replace(/['"]/g, '');
          params.target = this.inferInputTarget(input);
        }
        params.element = this.describeElement(params.target);
        break;

      case 'NAVIGATE':
        params.url = this.parseUrl(match[1] || '');
        params.newTab = input.toLowerCase().includes('new tab');
        break;

      case 'WAIT':
        if (match[1] && !isNaN(parseInt(match[1]))) {
          params.duration = this.parseWaitDuration(match[1], input);
        } else if (match[1]) {
          params.condition = match[1];
          params.element = this.describeElement(match[1]);
        } else {
          params.duration = 1000; // Default 1 second
        }
        break;

      case 'WORKFLOW':
        if (match[1]) {
          params.workflowName = match[1].replace(/['"]/g, '');
        }
        params.action = this.identifyWorkflowAction(input);
        break;

      case 'SCROLL':
        params.direction = this.parseScrollDirection(match[1] || match[0]);
        params.target = match[1] && !['up', 'down', 'top', 'bottom'].includes(match[1].toLowerCase())
          ? match[1]
          : null;
        break;

      case 'FORM':
        params.action = this.parseFormAction(input);
        params.data = this.extractFormData(input);
        break;

      case 'SOCIAL':
        params.action = this.parseSocialAction(input);
        params.target = this.parseSocialTarget(input);
        params.message = this.extractQuotedText(input);
        break;

      case 'LOOP':
        if (match[1] && !isNaN(parseInt(match[1]))) {
          params.count = parseInt(match[1]);
        } else {
          params.collection = match[1] || match[2];
        }
        params.action = match[2] || null;
        break;

      case 'CONDITION':
        params.condition = match[1];
        params.action = match[2];
        break;

      case 'VARIABLE':
        params.variableName = match[1];
        params.action = this.parseVariableAction(input);
        break;

      case 'TAB':
        params.action = this.parseTabAction(input);
        params.tabNumber = match[1] ? parseInt(match[1]) : null;
        params.url = this.parseUrl(match[1] || '');
        break;
    }

    return params;
  }

  /**
   * Identify what to scrape from user input
   */
  identifyScrapingTarget(target) {
    if (!target) return null;

    const normalized = target.toLowerCase().trim();

    // Check against known entity types
    for (const [type, config] of Object.entries(this.entityExtractors)) {
      if (config.aliases) {
        for (const alias of config.aliases) {
          if (normalized.includes(alias.toLowerCase())) {
            return { type, original: target };
          }
        }
      }
    }

    // Return as generic selector description
    return { type: 'custom', original: target };
  }

  /**
   * Match target to known entity extractor
   */
  matchEntityType(target) {
    if (!target) return null;

    const type = target.type;
    if (type && this.entityExtractors[type]) {
      return this.entityExtractors[type];
    }

    return null;
  }

  /**
   * Describe an element from natural language
   */
  describeElement(description) {
    if (!description) return null;

    const desc = description.toLowerCase().trim();
    const element = {
      text: description,
      tagName: null,
      role: null,
      attributes: {}
    };

    // Detect button-like elements
    if (desc.match(/\b(button|btn|submit|send|save|ok|cancel|close|next|previous|back|continue)\b/i)) {
      element.tagName = 'button';
      element.role = 'button';
    }

    // Detect input fields
    if (desc.match(/\b(input|field|textbox|text\s*box|search\s*box|search\s*bar|form\s*field)\b/i)) {
      element.tagName = 'input';
      element.role = 'textbox';
    }

    // Detect links
    if (desc.match(/\b(link|anchor|href)\b/i)) {
      element.tagName = 'a';
      element.role = 'link';
    }

    // Detect specific platform elements
    if (this.platformContext) {
      Object.assign(element.attributes, this.getPlatformHints(desc));
    }

    return element;
  }

  /**
   * Get platform-specific selector hints
   */
  getPlatformHints(description) {
    const hints = {};
    const desc = description.toLowerCase();

    switch (this.platformContext) {
      case 'LINKEDIN':
        if (desc.includes('connect')) hints.ariaLabel = 'Invite';
        if (desc.includes('message')) hints.ariaLabel = 'Message';
        if (desc.includes('follow')) hints.ariaLabel = 'Follow';
        break;

      case 'TWITTER':
        if (desc.includes('tweet')) hints['data-testid'] = 'tweetButton';
        if (desc.includes('like')) hints['data-testid'] = 'like';
        if (desc.includes('retweet')) hints['data-testid'] = 'retweet';
        if (desc.includes('reply')) hints['data-testid'] = 'reply';
        break;

      case 'INSTAGRAM':
        if (desc.includes('follow')) hints.className = 'follow';
        if (desc.includes('like')) hints['aria-label'] = 'Like';
        if (desc.includes('comment')) hints['aria-label'] = 'Comment';
        break;

      case 'GOOGLE':
        if (desc.includes('search')) hints.name = 'q';
        break;
    }

    return hints;
  }

  /**
   * Infer input target from context
   */
  inferInputTarget(input) {
    const lower = input.toLowerCase();

    if (lower.includes('search')) {
      return 'search box';
    }
    if (lower.includes('username') || lower.includes('user name')) {
      return 'username field';
    }
    if (lower.includes('password')) {
      return 'password field';
    }
    if (lower.includes('email')) {
      return 'email field';
    }

    return 'input field';
  }

  /**
   * Parse URL from user input
   */
  parseUrl(input) {
    if (!input) return null;

    // Already a valid URL
    if (input.match(/^https?:\/\//i)) {
      return input;
    }

    // Common site shortcuts
    const shortcuts = {
      'linkedin': 'https://www.linkedin.com',
      'twitter': 'https://twitter.com',
      'x': 'https://x.com',
      'instagram': 'https://www.instagram.com',
      'facebook': 'https://www.facebook.com',
      'google': 'https://www.google.com',
      'youtube': 'https://www.youtube.com',
      'github': 'https://github.com',
      'amazon': 'https://www.amazon.com'
    };

    const normalized = input.toLowerCase().replace(/[^\w]/g, '');
    if (shortcuts[normalized]) {
      return shortcuts[normalized];
    }

    // Looks like a domain
    if (input.match(/^[\w-]+\.\w{2,}$/)) {
      return `https://${input}`;
    }

    // Assume it's a Google search
    return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
  }

  /**
   * Parse wait duration
   */
  parseWaitDuration(value, input) {
    const num = parseInt(value);
    const lower = input.toLowerCase();

    if (lower.includes('minute') || lower.includes('min')) {
      return num * 60000;
    }
    if (lower.includes('second') || lower.includes('sec') || lower.includes('s')) {
      return num * 1000;
    }
    if (lower.includes('ms') || lower.includes('millisecond')) {
      return num;
    }

    // Default to seconds if number is small, milliseconds if large
    return num < 100 ? num * 1000 : num;
  }

  /**
   * Identify workflow action type
   */
  identifyWorkflowAction(input) {
    const lower = input.toLowerCase();

    if (lower.includes('record') || lower.includes('capture')) return 'record';
    if (lower.includes('stop')) return 'stop';
    if (lower.includes('run') || lower.includes('execute') || lower.includes('play')) return 'run';
    if (lower.includes('create') || lower.includes('new')) return 'create';
    if (lower.includes('edit') || lower.includes('modify')) return 'edit';
    if (lower.includes('delete') || lower.includes('remove')) return 'delete';
    if (lower.includes('list') || lower.includes('show')) return 'list';

    return 'run';
  }

  /**
   * Parse scroll direction
   */
  parseScrollDirection(input) {
    const lower = (input || '').toLowerCase();

    if (lower.includes('top') || lower.includes('beginning')) return 'top';
    if (lower.includes('bottom') || lower.includes('end')) return 'bottom';
    if (lower.includes('up')) return 'up';
    if (lower.includes('down')) return 'down';
    if (lower.includes('left')) return 'left';
    if (lower.includes('right')) return 'right';

    return 'down'; // Default
  }

  /**
   * Parse form action
   */
  parseFormAction(input) {
    const lower = input.toLowerCase();

    if (lower.includes('fill') || lower.includes('populate') || lower.includes('auto')) return 'fill';
    if (lower.includes('submit') || lower.includes('send')) return 'submit';
    if (lower.includes('clear') || lower.includes('reset')) return 'clear';
    if (lower.includes('validate') || lower.includes('check')) return 'validate';

    return 'fill';
  }

  /**
   * Extract form data from input
   */
  extractFormData(input) {
    const data = {};

    // Try to extract "field: value" patterns
    const fieldPattern = /(\w+):\s*['"]?([^'"]+)['"]?/g;
    let match;
    while ((match = fieldPattern.exec(input)) !== null) {
      data[match[1].toLowerCase()] = match[2];
    }

    return data;
  }

  /**
   * Parse social media action
   */
  parseSocialAction(input) {
    const lower = input.toLowerCase();

    if (lower.includes('connect')) return 'connect';
    if (lower.includes('follow')) return 'follow';
    if (lower.includes('unfollow')) return 'unfollow';
    if (lower.includes('message') || lower.includes('dm')) return 'message';
    if (lower.includes('like') || lower.includes('heart')) return 'like';
    if (lower.includes('comment') || lower.includes('reply')) return 'comment';
    if (lower.includes('share') || lower.includes('retweet') || lower.includes('repost')) return 'share';
    if (lower.includes('view') || lower.includes('profile')) return 'viewProfile';

    return 'interact';
  }

  /**
   * Parse social media target
   */
  parseSocialTarget(input) {
    // Extract @mentions
    const mentionMatch = input.match(/@([\w]+)/);
    if (mentionMatch) {
      return { type: 'username', value: mentionMatch[1] };
    }

    // Extract URLs
    const urlMatch = input.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      return { type: 'url', value: urlMatch[0] };
    }

    // Default to current page/post
    return { type: 'current' };
  }

  /**
   * Extract quoted text from input
   */
  extractQuotedText(input) {
    const match = input.match(/['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }

  /**
   * Parse variable action
   */
  parseVariableAction(input) {
    const lower = input.toLowerCase();

    if (lower.includes('save') || lower.includes('store') || lower.includes('set') || lower.includes('remember')) {
      return 'set';
    }
    if (lower.includes('get') || lower.includes('use') || lower.includes('recall')) {
      return 'get';
    }
    if (lower.includes('clear') || lower.includes('delete') || lower.includes('forget')) {
      return 'delete';
    }

    return 'get';
  }

  /**
   * Parse tab action
   */
  parseTabAction(input) {
    const lower = input.toLowerCase();

    if (lower.includes('new') || lower.includes('open') || lower.includes('create')) return 'new';
    if (lower.includes('close') || lower.includes('kill')) return 'close';
    if (lower.includes('switch') || lower.includes('go to')) return 'switch';
    if (lower.includes('duplicate')) return 'duplicate';

    return 'new';
  }

  /**
   * Handle unknown intents
   */
  handleUnknownIntent(input) {
    // Try to make a best guess based on common words
    const lower = input.toLowerCase();

    // Likely wants to do something with elements
    if (lower.match(/\b(this|that|the|first|last|next)\b/)) {
      return {
        intent: 'CLICK',
        confidence: 0.4,
        raw: input,
        params: { target: input },
        suggestion: 'Did you want to click on something? Try "click the [element]"'
      };
    }

    // Likely wants data
    if (lower.match(/\b(all|list|show|give|what)\b/)) {
      return {
        intent: 'SCRAPE',
        confidence: 0.4,
        raw: input,
        params: { target: this.identifyScrapingTarget(input) },
        suggestion: 'Did you want to extract data? Try "scrape [what you want]"'
      };
    }

    return {
      intent: 'UNKNOWN',
      confidence: 0,
      raw: input,
      suggestion: this.getSuggestion(input),
      examples: [
        'scrape all emails',
        'click the submit button',
        'type "hello" into search box',
        'go to linkedin.com',
        'wait 5 seconds',
        'run my workflow'
      ]
    };
  }

  /**
   * Generate suggestions based on context
   */
  generateSuggestions(intent, params) {
    const suggestions = [];

    switch (intent) {
      case 'SCRAPE':
        if (params.target?.type === 'custom') {
          suggestions.push(`Try specific types like: emails, phone numbers, prices, names`);
        }
        break;

      case 'CLICK':
        if (!params.element?.tagName) {
          suggestions.push(`For better accuracy, specify the element type: "click the submit button"`);
        }
        break;

      case 'TYPE':
        if (!params.target) {
          suggestions.push(`Specify where to type: "type hello into search box"`);
        }
        break;
    }

    return suggestions;
  }

  /**
   * Get help suggestion for unknown input
   */
  getSuggestion(input) {
    const words = input.toLowerCase().split(/\s+/);

    // Find closest matching intent
    for (const [intent, config] of Object.entries(this.patterns)) {
      for (const keyword of config.keywords) {
        for (const word of words) {
          if (this.levenshteinDistance(word, keyword) <= 2) {
            return `Did you mean "${keyword}"? Try: "${keyword} [target]"`;
          }
        }
      }
    }

    return 'Try commands like: scrape, click, type, go to, wait, record';
  }

  /**
   * Levenshtein distance for fuzzy matching
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2[i - 1] === str1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Detect current platform from URL
   */
  detectPlatform() {
    if (typeof window === 'undefined') return 'GENERIC';

    const hostname = window.location.hostname.toLowerCase();

    if (hostname.includes('linkedin')) return 'LINKEDIN';
    if (hostname.includes('twitter') || hostname.includes('x.com')) return 'TWITTER';
    if (hostname.includes('instagram')) return 'INSTAGRAM';
    if (hostname.includes('facebook')) return 'FACEBOOK';
    if (hostname.includes('google')) return 'GOOGLE';
    if (hostname.includes('youtube')) return 'YOUTUBE';

    return 'GENERIC';
  }

  /**
   * Get command completions for autocomplete
   */
  getCompletions(partial) {
    if (!partial || partial.length < 2) return [];

    const lower = partial.toLowerCase();
    const completions = [];

    // Check intent keywords
    for (const [intent, config] of Object.entries(this.patterns)) {
      for (const keyword of config.keywords) {
        if (keyword.startsWith(lower) || keyword.includes(lower)) {
          completions.push({
            text: keyword,
            intent,
            score: keyword.startsWith(lower) ? 1 : 0.7
          });
        }
      }
    }

    // Check entity types
    for (const [type, config] of Object.entries(this.entityExtractors)) {
      if (config.aliases) {
        for (const alias of config.aliases) {
          if (alias.toLowerCase().includes(lower)) {
            completions.push({
              text: `scrape ${alias}`,
              intent: 'SCRAPE',
              score: 0.6
            });
          }
        }
      }
    }

    // Add from history
    for (const cmd of this.commandHistory.slice(-10)) {
      if (cmd.input.toLowerCase().includes(lower)) {
        completions.push({
          text: cmd.input,
          intent: cmd.result.intent,
          score: 0.5,
          fromHistory: true
        });
      }
    }

    return completions
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(c => c.text);
  }
}

// Create singleton
const intentParser = new IntentParser();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IntentParser, intentParser };
}

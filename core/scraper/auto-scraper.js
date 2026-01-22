/**
 * 10X.in AI Auto-Scraper
 * Intelligent One-Click Data Extraction
 */

class AutoScraper {
  constructor() {
    this.detectedStructures = [];
    this.extractionCache = new Map();
    this.patterns = this.initializePatterns();
  }

  /**
   * Initialize common data patterns
   */
  initializePatterns() {
    return {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      url: /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
      price: /[$€£¥]\s*[\d,]+(?:\.\d{2})?/g,
      date: /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})\b/gi,
      socialHandle: /@[\w]+/g,
      hashtag: /#[\w]+/g,
      percentage: /\d+(?:\.\d+)?%/g,
      rating: /(\d(?:\.\d)?)\s*(?:out\s+of\s+)?(?:\/\s*)?(\d|stars?|⭐)/gi
    };
  }

  /**
   * Main entry point - detect and extract all data from page
   * @returns {Object} Extracted data organized by type
   */
  async detectAndExtract() {
    // 1. Analyze page structure
    const structures = await this.detectStructures();

    // 2. Find repeating patterns
    const patterns = this.findPatterns(structures);

    // 3. Extract data from each pattern
    const extracted = {};

    for (const pattern of patterns) {
      const data = await this.extractPattern(pattern);
      if (data && data.length > 0) {
        extracted[pattern.type] = data;
      }
    }

    // 4. Extract special data types (emails, phones, etc.)
    const specialData = this.extractSpecialData();
    Object.assign(extracted, specialData);

    return extracted;
  }

  /**
   * Detect page structures
   */
  async detectStructures() {
    const structures = {
      tables: this.findTables(),
      lists: this.findLists(),
      cards: this.findCards(),
      profiles: this.findProfiles(),
      articles: this.findArticles(),
      products: this.findProducts(),
      searchResults: this.findSearchResults(),
      feeds: this.findFeeds()
    };

    this.detectedStructures = structures;
    return structures;
  }

  /**
   * Find all tables on the page
   */
  findTables() {
    const tables = [];
    const tableElements = document.querySelectorAll('table, [role="table"], [class*="table"]');

    for (const table of tableElements) {
      if (!this.isVisible(table)) continue;

      const headers = this.extractTableHeaders(table);
      const rowCount = this.countTableRows(table);

      if (headers.length > 0 || rowCount > 1) {
        tables.push({
          type: 'table',
          element: table,
          headers,
          rowCount,
          selector: this.generateSelector(table),
          confidence: headers.length > 0 ? 0.9 : 0.7
        });
      }
    }

    return tables;
  }

  /**
   * Extract table headers
   */
  extractTableHeaders(table) {
    const headers = [];

    // Try <th> elements
    const thElements = table.querySelectorAll('th');
    for (const th of thElements) {
      const text = th.textContent?.trim();
      if (text) headers.push(text);
    }

    // Try first row if no th found
    if (headers.length === 0) {
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        const cells = firstRow.querySelectorAll('td');
        for (const cell of cells) {
          const text = cell.textContent?.trim();
          if (text) headers.push(text);
        }
      }
    }

    // Try aria-label on columns
    if (headers.length === 0) {
      const labeledCols = table.querySelectorAll('[aria-label]');
      for (const col of labeledCols) {
        headers.push(col.getAttribute('aria-label'));
      }
    }

    return headers;
  }

  /**
   * Count table rows
   */
  countTableRows(table) {
    return table.querySelectorAll('tr, [role="row"]').length;
  }

  /**
   * Find all lists
   */
  findLists() {
    const lists = [];
    const listElements = document.querySelectorAll('ul, ol, [role="list"]');

    for (const list of listElements) {
      if (!this.isVisible(list)) continue;

      const items = list.querySelectorAll('li, [role="listitem"]');
      if (items.length > 2) {
        lists.push({
          type: 'list',
          element: list,
          itemCount: items.length,
          selector: this.generateSelector(list),
          confidence: 0.8
        });
      }
    }

    return lists;
  }

  /**
   * Find card-like structures (repeating patterns)
   */
  findCards() {
    const cards = [];
    const potentialCards = new Map();

    // Find elements with similar class patterns
    const allElements = document.querySelectorAll('[class*="card"], [class*="item"], [class*="tile"], [class*="result"], article');

    for (const el of allElements) {
      if (!this.isVisible(el)) continue;

      const signature = this.getElementSignature(el);
      if (!potentialCards.has(signature)) {
        potentialCards.set(signature, []);
      }
      potentialCards.get(signature).push(el);
    }

    // Keep groups with 3+ similar elements
    for (const [signature, elements] of potentialCards) {
      if (elements.length >= 3) {
        cards.push({
          type: 'cards',
          elements,
          count: elements.length,
          signature,
          selector: this.generateSelector(elements[0]),
          confidence: 0.85
        });
      }
    }

    return cards;
  }

  /**
   * Find profile-like structures
   */
  findProfiles() {
    const profiles = [];
    const profileIndicators = [
      '[class*="profile"]',
      '[class*="author"]',
      '[class*="user"]',
      '[class*="member"]',
      '[class*="person"]',
      '[itemtype*="Person"]'
    ];

    for (const selector of profileIndicators) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (!this.isVisible(el)) continue;

        const hasImage = el.querySelector('img, [class*="avatar"]');
        const hasName = el.querySelector('[class*="name"], h1, h2, h3');

        if (hasImage || hasName) {
          profiles.push({
            type: 'profile',
            element: el,
            selector: this.generateSelector(el),
            confidence: (hasImage && hasName) ? 0.95 : 0.7
          });
        }
      }
    }

    return profiles;
  }

  /**
   * Find article-like structures
   */
  findArticles() {
    const articles = [];
    const articleElements = document.querySelectorAll('article, [class*="article"], [class*="post"], [class*="entry"]');

    for (const el of articleElements) {
      if (!this.isVisible(el)) continue;

      const hasTitle = el.querySelector('h1, h2, h3, [class*="title"]');
      const hasContent = el.querySelector('p, [class*="content"], [class*="body"]');

      if (hasTitle && hasContent) {
        articles.push({
          type: 'article',
          element: el,
          selector: this.generateSelector(el),
          confidence: 0.9
        });
      }
    }

    return articles;
  }

  /**
   * Find product-like structures
   */
  findProducts() {
    const products = [];
    const productIndicators = [
      '[class*="product"]',
      '[itemtype*="Product"]',
      '[data-product]',
      '[class*="listing"]'
    ];

    for (const selector of productIndicators) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (!this.isVisible(el)) continue;

        const hasPrice = el.querySelector('[class*="price"]') || el.textContent?.match(/[$€£¥]\s*[\d,]+/);
        const hasTitle = el.querySelector('[class*="title"], [class*="name"], h1, h2, h3');

        if (hasPrice || hasTitle) {
          products.push({
            type: 'product',
            element: el,
            selector: this.generateSelector(el),
            confidence: (hasPrice && hasTitle) ? 0.95 : 0.75
          });
        }
      }
    }

    return products;
  }

  /**
   * Find search result structures
   */
  findSearchResults() {
    const results = [];
    const resultIndicators = [
      '[class*="search-result"]',
      '[class*="result-item"]',
      '#search .g', // Google
      '[data-testid*="result"]'
    ];

    for (const selector of resultIndicators) {
      const elements = document.querySelectorAll(selector);
      if (elements.length >= 3) {
        results.push({
          type: 'searchResults',
          elements: Array.from(elements),
          count: elements.length,
          selector,
          confidence: 0.9
        });
      }
    }

    return results;
  }

  /**
   * Find feed structures (social media posts, etc.)
   */
  findFeeds() {
    const feeds = [];
    const feedIndicators = [
      '[class*="feed"]',
      '[class*="timeline"]',
      '[class*="stream"]',
      '[data-testid*="tweet"]', // Twitter
      '.feed-shared-update-v2' // LinkedIn
    ];

    for (const selector of feedIndicators) {
      const container = document.querySelector(selector);
      if (container && this.isVisible(container)) {
        const posts = container.querySelectorAll('[class*="post"], [class*="update"], article');
        if (posts.length >= 2) {
          feeds.push({
            type: 'feed',
            container,
            posts: Array.from(posts),
            count: posts.length,
            selector,
            confidence: 0.85
          });
        }
      }
    }

    return feeds;
  }

  /**
   * Find patterns in detected structures
   */
  findPatterns(structures) {
    const patterns = [];

    // Add tables
    for (const table of structures.tables) {
      patterns.push({
        type: 'table',
        ...table,
        priority: 1
      });
    }

    // Add cards (high priority as they're usually the main content)
    for (const card of structures.cards) {
      patterns.push({
        type: 'card',
        ...card,
        priority: 2
      });
    }

    // Add products
    for (const product of structures.products) {
      patterns.push({
        type: 'product',
        ...product,
        priority: 2
      });
    }

    // Add search results
    for (const result of structures.searchResults) {
      patterns.push({
        type: 'searchResult',
        ...result,
        priority: 1
      });
    }

    // Add feeds
    for (const feed of structures.feeds) {
      patterns.push({
        type: 'feed',
        ...feed,
        priority: 3
      });
    }

    // Sort by confidence and priority
    return patterns.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Extract data from a specific pattern
   */
  async extractPattern(pattern) {
    switch (pattern.type) {
      case 'table':
        return this.extractTable(pattern);
      case 'card':
      case 'cards':
        return this.extractCards(pattern);
      case 'product':
        return this.extractProduct(pattern);
      case 'searchResult':
        return this.extractSearchResults(pattern);
      case 'feed':
        return this.extractFeed(pattern);
      case 'profile':
        return this.extractProfile(pattern);
      case 'article':
        return this.extractArticle(pattern);
      default:
        return this.extractGeneric(pattern);
    }
  }

  /**
   * Extract table data
   */
  extractTable(pattern) {
    const table = pattern.element;
    const data = [];
    const headers = pattern.headers;

    const rows = table.querySelectorAll('tr, [role="row"]');
    const startIndex = headers.length > 0 ? 1 : 0; // Skip header row if we have headers

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('td, [role="cell"], [role="gridcell"]');
      const rowData = {};

      cells.forEach((cell, index) => {
        const key = headers[index] || `column_${index}`;
        rowData[key] = this.extractCellValue(cell);
      });

      if (Object.keys(rowData).length > 0) {
        data.push(rowData);
      }
    }

    return data;
  }

  /**
   * Extract cell value (including links, images, etc.)
   */
  extractCellValue(cell) {
    // Check for link
    const link = cell.querySelector('a');
    if (link) {
      return {
        text: link.textContent?.trim(),
        href: link.href
      };
    }

    // Check for image
    const img = cell.querySelector('img');
    if (img) {
      return {
        type: 'image',
        src: img.src,
        alt: img.alt
      };
    }

    // Return text content
    return cell.textContent?.trim() || '';
  }

  /**
   * Extract card data
   */
  extractCards(pattern) {
    const elements = pattern.elements || [pattern.element];
    const data = [];

    for (const el of elements) {
      const cardData = {};

      // Extract title
      const title = el.querySelector('h1, h2, h3, h4, [class*="title"], [class*="name"]');
      if (title) cardData.title = title.textContent?.trim();

      // Extract description
      const desc = el.querySelector('p, [class*="description"], [class*="summary"], [class*="excerpt"]');
      if (desc) cardData.description = desc.textContent?.trim();

      // Extract image
      const img = el.querySelector('img');
      if (img) cardData.image = img.src;

      // Extract link
      const link = el.querySelector('a[href]');
      if (link) cardData.link = link.href;

      // Extract price (if product-like)
      const price = el.querySelector('[class*="price"]');
      if (price) cardData.price = price.textContent?.trim();

      // Extract date
      const date = el.querySelector('time, [class*="date"], [class*="time"]');
      if (date) cardData.date = date.textContent?.trim() || date.getAttribute('datetime');

      // Extract author
      const author = el.querySelector('[class*="author"], [class*="by"]');
      if (author) cardData.author = author.textContent?.trim();

      if (Object.keys(cardData).length > 0) {
        data.push(cardData);
      }
    }

    return data;
  }

  /**
   * Extract product data
   */
  extractProduct(pattern) {
    const el = pattern.element;
    const productData = {};

    // Title
    const title = el.querySelector('[class*="title"], [class*="name"], h1, h2');
    if (title) productData.title = title.textContent?.trim();

    // Price
    const price = el.querySelector('[class*="price"]');
    if (price) productData.price = price.textContent?.trim();

    // Original price (for discounts)
    const originalPrice = el.querySelector('[class*="original"], [class*="was"], [class*="strike"]');
    if (originalPrice) productData.originalPrice = originalPrice.textContent?.trim();

    // Rating
    const rating = el.querySelector('[class*="rating"], [class*="stars"]');
    if (rating) productData.rating = rating.textContent?.trim() || rating.getAttribute('aria-label');

    // Reviews count
    const reviews = el.querySelector('[class*="review"], [class*="count"]');
    if (reviews) productData.reviewCount = reviews.textContent?.trim();

    // Image
    const img = el.querySelector('img');
    if (img) productData.image = img.src;

    // Link
    const link = el.querySelector('a[href]');
    if (link) productData.link = link.href;

    // Availability
    const availability = el.querySelector('[class*="stock"], [class*="availability"]');
    if (availability) productData.availability = availability.textContent?.trim();

    return [productData];
  }

  /**
   * Extract search results
   */
  extractSearchResults(pattern) {
    const elements = pattern.elements || [];
    const data = [];

    for (const el of elements) {
      const resultData = {};

      // Title
      const title = el.querySelector('h3, h2, [class*="title"]');
      if (title) resultData.title = title.textContent?.trim();

      // Link
      const link = el.querySelector('a[href]');
      if (link) resultData.link = link.href;

      // URL display
      const cite = el.querySelector('cite, [class*="url"]');
      if (cite) resultData.displayUrl = cite.textContent?.trim();

      // Snippet/Description
      const snippet = el.querySelector('[class*="snippet"], [class*="description"], p');
      if (snippet) resultData.snippet = snippet.textContent?.trim();

      // Date
      const date = el.querySelector('[class*="date"], time');
      if (date) resultData.date = date.textContent?.trim();

      if (resultData.title || resultData.link) {
        data.push(resultData);
      }
    }

    return data;
  }

  /**
   * Extract feed data
   */
  extractFeed(pattern) {
    const posts = pattern.posts || [];
    const data = [];

    for (const post of posts) {
      const postData = {};

      // Author
      const author = post.querySelector('[class*="author"], [class*="name"], [class*="user"]');
      if (author) postData.author = author.textContent?.trim();

      // Content
      const content = post.querySelector('[class*="content"], [class*="text"], [class*="body"], p');
      if (content) postData.content = content.textContent?.trim();

      // Timestamp
      const time = post.querySelector('time, [class*="time"], [class*="date"]');
      if (time) postData.timestamp = time.textContent?.trim() || time.getAttribute('datetime');

      // Engagement metrics
      const likes = post.querySelector('[class*="like"] [class*="count"], [data-testid*="like"]');
      if (likes) postData.likes = likes.textContent?.trim();

      const comments = post.querySelector('[class*="comment"] [class*="count"]');
      if (comments) postData.comments = comments.textContent?.trim();

      const shares = post.querySelector('[class*="share"] [class*="count"], [class*="retweet"]');
      if (shares) postData.shares = shares.textContent?.trim();

      // Media
      const media = post.querySelectorAll('img:not([class*="avatar"]):not([class*="profile"])');
      if (media.length > 0) {
        postData.media = Array.from(media).map(m => m.src);
      }

      // Link
      const link = post.querySelector('a[href*="/status/"], a[href*="/p/"], a[href*="/posts/"]');
      if (link) postData.link = link.href;

      if (Object.keys(postData).length > 0) {
        data.push(postData);
      }
    }

    return data;
  }

  /**
   * Extract profile data
   */
  extractProfile(pattern) {
    const el = pattern.element;
    const profileData = {};

    // Name
    const name = el.querySelector('[class*="name"], h1, h2');
    if (name) profileData.name = name.textContent?.trim();

    // Title/Headline
    const title = el.querySelector('[class*="title"], [class*="headline"], [class*="bio"]');
    if (title) profileData.title = title.textContent?.trim();

    // Avatar
    const avatar = el.querySelector('img[class*="avatar"], img[class*="profile"]');
    if (avatar) profileData.avatar = avatar.src;

    // Location
    const location = el.querySelector('[class*="location"]');
    if (location) profileData.location = location.textContent?.trim();

    // Company
    const company = el.querySelector('[class*="company"], [class*="org"]');
    if (company) profileData.company = company.textContent?.trim();

    // Social links
    const socialLinks = el.querySelectorAll('a[href*="twitter"], a[href*="linkedin"], a[href*="github"]');
    if (socialLinks.length > 0) {
      profileData.socialLinks = Array.from(socialLinks).map(l => ({
        platform: this.detectSocialPlatform(l.href),
        url: l.href
      }));
    }

    // Followers/Connections count
    const followers = el.querySelector('[class*="follower"], [class*="connection"]');
    if (followers) profileData.followers = followers.textContent?.trim();

    return [profileData];
  }

  /**
   * Extract article data
   */
  extractArticle(pattern) {
    const el = pattern.element;
    const articleData = {};

    // Title
    const title = el.querySelector('h1, h2, [class*="title"]');
    if (title) articleData.title = title.textContent?.trim();

    // Author
    const author = el.querySelector('[class*="author"], [rel="author"]');
    if (author) articleData.author = author.textContent?.trim();

    // Date
    const date = el.querySelector('time, [class*="date"], [class*="published"]');
    if (date) articleData.date = date.textContent?.trim() || date.getAttribute('datetime');

    // Content
    const content = el.querySelector('[class*="content"], [class*="body"], article');
    if (content) {
      // Get text without scripts and styles
      const clone = content.cloneNode(true);
      clone.querySelectorAll('script, style').forEach(el => el.remove());
      articleData.content = clone.textContent?.trim();
    }

    // Reading time
    const readTime = el.querySelector('[class*="read-time"], [class*="reading"]');
    if (readTime) articleData.readingTime = readTime.textContent?.trim();

    // Tags/Categories
    const tags = el.querySelectorAll('[class*="tag"], [class*="category"]');
    if (tags.length > 0) {
      articleData.tags = Array.from(tags).map(t => t.textContent?.trim());
    }

    // Featured image
    const img = el.querySelector('img[class*="featured"], img[class*="hero"], picture img');
    if (img) articleData.featuredImage = img.src;

    return [articleData];
  }

  /**
   * Generic extraction for unknown patterns
   */
  extractGeneric(pattern) {
    const el = pattern.element || pattern.elements?.[0];
    if (!el) return [];

    // Try to extract all meaningful text and links
    const data = {
      text: el.textContent?.trim()?.substring(0, 500),
      links: Array.from(el.querySelectorAll('a[href]')).slice(0, 10).map(a => ({
        text: a.textContent?.trim(),
        href: a.href
      })),
      images: Array.from(el.querySelectorAll('img[src]')).slice(0, 5).map(img => img.src)
    };

    return [data];
  }

  /**
   * Extract special data types (emails, phones, etc.)
   */
  extractSpecialData() {
    const pageText = document.body.innerText || '';
    const extracted = {};

    // Extract each pattern type
    for (const [type, pattern] of Object.entries(this.patterns)) {
      const matches = [...new Set(pageText.match(pattern) || [])];
      if (matches.length > 0) {
        extracted[type] = matches;
      }
    }

    return extracted;
  }

  /**
   * Quick extract by type
   * @param {string} type - Type to extract (email, phone, etc.)
   */
  extractByType(type) {
    if (this.patterns[type]) {
      const pageText = document.body.innerText || '';
      return [...new Set(pageText.match(this.patterns[type]) || [])];
    }

    // Try to find by selector
    const selectors = {
      email: 'a[href^="mailto:"]',
      phone: 'a[href^="tel:"]',
      image: 'img[src]',
      link: 'a[href]',
      headline: 'h1, h2, h3',
      button: 'button, [role="button"]',
      input: 'input, textarea'
    };

    if (selectors[type]) {
      return Array.from(document.querySelectorAll(selectors[type])).map(el => ({
        element: el,
        value: el.href || el.src || el.textContent?.trim()
      }));
    }

    return [];
  }

  /**
   * Extract data matching a custom selector
   */
  extractBySelector(selector, options = {}) {
    const { limit = 100, includeHtml = false, includeAttributes = false } = options;
    const elements = document.querySelectorAll(selector);
    const data = [];

    for (let i = 0; i < Math.min(elements.length, limit); i++) {
      const el = elements[i];
      const item = {
        text: el.textContent?.trim()
      };

      if (includeHtml) {
        item.html = el.innerHTML;
      }

      if (includeAttributes) {
        item.attributes = {};
        for (const attr of el.attributes) {
          item.attributes[attr.name] = attr.value;
        }
      }

      // Common attributes
      if (el.href) item.href = el.href;
      if (el.src) item.src = el.src;

      data.push(item);
    }

    return data;
  }

  /**
   * Get a summary of detectable data on the page
   */
  async getSummary() {
    const structures = await this.detectStructures();
    const specialData = this.extractSpecialData();

    return {
      tables: structures.tables.length,
      lists: structures.lists.length,
      cards: structures.cards.reduce((sum, c) => sum + (c.count || 1), 0),
      profiles: structures.profiles.length,
      articles: structures.articles.length,
      products: structures.products.length,
      searchResults: structures.searchResults.reduce((sum, r) => sum + (r.count || 0), 0),
      feeds: structures.feeds.length,
      emails: specialData.email?.length || 0,
      phones: specialData.phone?.length || 0,
      urls: specialData.url?.length || 0,
      prices: specialData.price?.length || 0
    };
  }

  // ========== Helper Methods ==========

  /**
   * Check if element is visible
   */
  isVisible(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * Generate a CSS selector for an element
   */
  generateSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }

    const path = [];
    let current = element;

    while (current && current !== document.body && path.length < 5) {
      let selector = current.tagName.toLowerCase();

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/)
          .filter(c => c && !c.match(/^(active|hover|focus|selected)/i))
          .slice(0, 2);
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * Get element signature for grouping similar elements
   */
  getElementSignature(element) {
    const tag = element.tagName.toLowerCase();
    const classes = (element.className || '').toString()
      .split(/\s+/)
      .filter(c => c && !c.match(/^(active|hover|focus|selected|first|last|odd|even|\d)/i))
      .sort()
      .slice(0, 3)
      .join('.');

    return `${tag}.${classes}`;
  }

  /**
   * Detect social platform from URL
   */
  detectSocialPlatform(url) {
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('github.com')) return 'github';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com')) return 'youtube';
    return 'other';
  }

  /**
   * Normalize extracted data
   */
  normalizeData(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.normalizeItem(item));
    }
    return this.normalizeItem(data);
  }

  /**
   * Normalize a single data item
   */
  normalizeItem(item) {
    if (typeof item === 'string') {
      return item.trim();
    }

    if (typeof item === 'object' && item !== null) {
      const normalized = {};
      for (const [key, value] of Object.entries(item)) {
        if (value !== null && value !== undefined && value !== '') {
          if (typeof value === 'string') {
            normalized[key] = value.trim();
          } else if (Array.isArray(value)) {
            normalized[key] = value.map(v => this.normalizeItem(v)).filter(v => v);
          } else {
            normalized[key] = value;
          }
        }
      }
      return normalized;
    }

    return item;
  }
}

// Create singleton
const autoScraper = new AutoScraper();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AutoScraper, autoScraper };
}

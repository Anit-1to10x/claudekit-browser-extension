/**
 * 10X.in Self-Healing Selector Engine
 * 8-Strategy Element Finding with Automatic Fallback
 *
 * Strategies (in order of preference):
 * 1. exact - Direct CSS/XPath match
 * 2. css - Generate unique CSS path
 * 3. xpath - Generate unique XPath
 * 4. text - Find by text content
 * 5. aria - ARIA labels and roles
 * 6. dataAttr - data-* attributes
 * 7. visual - Position + visual properties
 * 8. fuzzy - AI-powered similarity matching
 */

class SelectorEngine {
  constructor() {
    this.strategies = [
      'exact',
      'css',
      'xpath',
      'text',
      'aria',
      'dataAttr',
      'visual',
      'fuzzy'
    ];

    this.cache = new Map();
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
    this.learningData = new Map(); // Track successful strategies per site
    this.confidenceThreshold = 0.7;
  }

  /**
   * Find an element using multiple fallback strategies
   * @param {Object} descriptor - Element descriptor
   * @param {Object} options - Search options
   * @returns {Element|null}
   */
  async find(descriptor, options = {}) {
    const {
      timeout = 5000,
      retries = 3,
      context = document,
      strict = false
    } = options;

    // Check cache first
    const cacheKey = this.getCacheKey(descriptor);
    const cached = this.getFromCache(cacheKey);
    if (cached && this.validateElement(cached.element, descriptor)) {
      return cached.element;
    }

    // Get optimized strategy order based on learning
    const orderedStrategies = this.getOptimizedStrategies(descriptor);

    for (let attempt = 0; attempt < retries; attempt++) {
      for (const strategy of orderedStrategies) {
        try {
          const element = await this.tryStrategy(strategy, descriptor, context, timeout);

          if (element) {
            const confidence = this.calculateConfidence(element, descriptor);

            if (confidence >= this.confidenceThreshold || !strict) {
              // Cache successful result
              this.cacheResult(cacheKey, element, strategy, confidence);

              // Learn from success
              this.recordSuccess(descriptor, strategy);

              return element;
            }
          }
        } catch (error) {
          console.debug(`[SelectorEngine] Strategy ${strategy} failed:`, error.message);
        }
      }

      // Wait before retry
      if (attempt < retries - 1) {
        await this.delay(500 * (attempt + 1));
      }
    }

    return null;
  }

  /**
   * Find all matching elements
   * @param {Object} descriptor - Element descriptor
   * @param {Object} options - Search options
   * @returns {Element[]}
   */
  async findAll(descriptor, options = {}) {
    const { context = document, limit = 100 } = options;
    const results = [];
    const seen = new Set();

    for (const strategy of this.strategies) {
      try {
        const elements = await this.tryStrategyAll(strategy, descriptor, context);

        for (const element of elements) {
          if (!seen.has(element) && results.length < limit) {
            const confidence = this.calculateConfidence(element, descriptor);
            if (confidence >= this.confidenceThreshold) {
              seen.add(element);
              results.push({ element, confidence, strategy });
            }
          }
        }
      } catch (error) {
        console.debug(`[SelectorEngine] Strategy ${strategy} failed for findAll:`, error.message);
      }
    }

    // Sort by confidence
    return results.sort((a, b) => b.confidence - a.confidence).map(r => r.element);
  }

  /**
   * Generate multiple selectors for an element (for recording)
   * @param {Element} element - The DOM element
   * @returns {Object} - Multiple selector options
   */
  generateSelectors(element) {
    return {
      css: this.generateCSSSelector(element),
      xpath: this.generateXPath(element),
      text: this.getTextDescriptor(element),
      aria: this.getAriaDescriptor(element),
      dataAttr: this.getDataAttrDescriptor(element),
      visual: this.getVisualDescriptor(element),
      combined: this.getCombinedDescriptor(element)
    };
  }

  // ========== Strategy Implementations ==========

  async tryStrategy(strategy, descriptor, context, timeout) {
    switch (strategy) {
      case 'exact':
        return this.findByExact(descriptor, context);
      case 'css':
        return this.findByCSS(descriptor, context);
      case 'xpath':
        return this.findByXPath(descriptor, context);
      case 'text':
        return this.findByText(descriptor, context);
      case 'aria':
        return this.findByAria(descriptor, context);
      case 'dataAttr':
        return this.findByDataAttr(descriptor, context);
      case 'visual':
        return this.findByVisual(descriptor, context);
      case 'fuzzy':
        return this.findByFuzzy(descriptor, context);
      default:
        return null;
    }
  }

  async tryStrategyAll(strategy, descriptor, context) {
    switch (strategy) {
      case 'exact':
        return this.findAllByExact(descriptor, context);
      case 'css':
        return this.findAllByCSS(descriptor, context);
      case 'xpath':
        return this.findAllByXPath(descriptor, context);
      case 'text':
        return this.findAllByText(descriptor, context);
      case 'aria':
        return this.findAllByAria(descriptor, context);
      case 'dataAttr':
        return this.findAllByDataAttr(descriptor, context);
      case 'visual':
        return this.findAllByVisual(descriptor, context);
      case 'fuzzy':
        return this.findAllByFuzzy(descriptor, context);
      default:
        return [];
    }
  }

  // Strategy 1: Exact Match
  findByExact(descriptor, context) {
    if (descriptor.selector) {
      return context.querySelector(descriptor.selector);
    }
    if (descriptor.xpath) {
      const result = document.evaluate(
        descriptor.xpath,
        context,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue;
    }
    return null;
  }

  findAllByExact(descriptor, context) {
    if (descriptor.selector) {
      return Array.from(context.querySelectorAll(descriptor.selector));
    }
    if (descriptor.xpath) {
      const result = document.evaluate(
        descriptor.xpath,
        context,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      const elements = [];
      for (let i = 0; i < result.snapshotLength; i++) {
        elements.push(result.snapshotItem(i));
      }
      return elements;
    }
    return [];
  }

  // Strategy 2: CSS Selector Generation
  findByCSS(descriptor, context) {
    const selectors = this.buildCSSSelectors(descriptor);
    for (const selector of selectors) {
      try {
        const element = context.querySelector(selector);
        if (element) return element;
      } catch (e) {
        // Invalid selector, skip
      }
    }
    return null;
  }

  findAllByCSS(descriptor, context) {
    const selectors = this.buildCSSSelectors(descriptor);
    const results = [];
    const seen = new Set();

    for (const selector of selectors) {
      try {
        const elements = context.querySelectorAll(selector);
        for (const el of elements) {
          if (!seen.has(el)) {
            seen.add(el);
            results.push(el);
          }
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }
    return results;
  }

  buildCSSSelectors(descriptor) {
    const selectors = [];

    // By ID
    if (descriptor.id) {
      selectors.push(`#${CSS.escape(descriptor.id)}`);
    }

    // By class combination
    if (descriptor.classes && descriptor.classes.length > 0) {
      selectors.push(descriptor.classes.map(c => `.${CSS.escape(c)}`).join(''));
    }

    // By tag + classes
    if (descriptor.tagName) {
      const tag = descriptor.tagName.toLowerCase();
      selectors.push(tag);

      if (descriptor.classes && descriptor.classes.length > 0) {
        selectors.push(`${tag}${descriptor.classes.map(c => `.${CSS.escape(c)}`).join('')}`);
      }
    }

    // By attributes
    if (descriptor.attributes) {
      for (const [key, value] of Object.entries(descriptor.attributes)) {
        if (value) {
          selectors.push(`[${key}="${CSS.escape(value)}"]`);
        } else {
          selectors.push(`[${key}]`);
        }
      }
    }

    // By placeholder
    if (descriptor.placeholder) {
      selectors.push(`[placeholder*="${CSS.escape(descriptor.placeholder)}"]`);
    }

    // By name
    if (descriptor.name) {
      selectors.push(`[name="${CSS.escape(descriptor.name)}"]`);
    }

    return selectors;
  }

  // Strategy 3: XPath
  findByXPath(descriptor, context) {
    const xpaths = this.buildXPaths(descriptor);
    for (const xpath of xpaths) {
      try {
        const result = document.evaluate(
          xpath,
          context,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        if (result.singleNodeValue) return result.singleNodeValue;
      } catch (e) {
        // Invalid XPath, skip
      }
    }
    return null;
  }

  findAllByXPath(descriptor, context) {
    const xpaths = this.buildXPaths(descriptor);
    const results = [];
    const seen = new Set();

    for (const xpath of xpaths) {
      try {
        const result = document.evaluate(
          xpath,
          context,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        for (let i = 0; i < result.snapshotLength; i++) {
          const el = result.snapshotItem(i);
          if (!seen.has(el)) {
            seen.add(el);
            results.push(el);
          }
        }
      } catch (e) {
        // Invalid XPath, skip
      }
    }
    return results;
  }

  buildXPaths(descriptor) {
    const xpaths = [];

    // By ID
    if (descriptor.id) {
      xpaths.push(`//*[@id="${descriptor.id}"]`);
    }

    // By text content
    if (descriptor.text) {
      const text = descriptor.text.trim();
      xpaths.push(`//*[normalize-space(text())="${text}"]`);
      xpaths.push(`//*[contains(normalize-space(text()), "${text}")]`);
      xpaths.push(`//*[contains(normalize-space(.), "${text}")]`);
    }

    // By tag + class
    if (descriptor.tagName) {
      const tag = descriptor.tagName.toLowerCase();
      xpaths.push(`//${tag}`);

      if (descriptor.classes && descriptor.classes.length > 0) {
        for (const cls of descriptor.classes) {
          xpaths.push(`//${tag}[contains(@class, "${cls}")]`);
        }
      }
    }

    // By attributes
    if (descriptor.attributes) {
      for (const [key, value] of Object.entries(descriptor.attributes)) {
        if (value) {
          xpaths.push(`//*[@${key}="${value}"]`);
          xpaths.push(`//*[contains(@${key}, "${value}")]`);
        } else {
          xpaths.push(`//*[@${key}]`);
        }
      }
    }

    return xpaths;
  }

  // Strategy 4: Text Content
  findByText(descriptor, context) {
    if (!descriptor.text) return null;

    const text = descriptor.text.trim().toLowerCase();
    const tagFilter = descriptor.tagName ? descriptor.tagName.toLowerCase() : '*';

    // Try exact match first
    const walker = document.createTreeWalker(
      context,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (tagFilter !== '*' && node.tagName.toLowerCase() !== tagFilter) {
            return NodeFilter.FILTER_SKIP;
          }
          const nodeText = node.textContent.trim().toLowerCase();
          if (nodeText === text || node.innerText?.trim().toLowerCase() === text) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let match = walker.nextNode();
    if (match) return match;

    // Try contains match
    const allElements = context.querySelectorAll(tagFilter);
    for (const el of allElements) {
      const elText = el.textContent.trim().toLowerCase();
      if (elText.includes(text) && this.isLeafElement(el)) {
        return el;
      }
    }

    return null;
  }

  findAllByText(descriptor, context) {
    if (!descriptor.text) return [];

    const text = descriptor.text.trim().toLowerCase();
    const results = [];
    const tagFilter = descriptor.tagName ? descriptor.tagName.toLowerCase() : '*';

    const allElements = context.querySelectorAll(tagFilter);
    for (const el of allElements) {
      const elText = (el.innerText || el.textContent || '').trim().toLowerCase();
      if (elText.includes(text)) {
        results.push(el);
      }
    }

    return results;
  }

  // Strategy 5: ARIA Labels and Roles
  findByAria(descriptor, context) {
    const selectors = [];

    if (descriptor.ariaLabel) {
      selectors.push(`[aria-label="${descriptor.ariaLabel}"]`);
      selectors.push(`[aria-label*="${descriptor.ariaLabel}"]`);
    }

    if (descriptor.role) {
      selectors.push(`[role="${descriptor.role}"]`);
    }

    if (descriptor.ariaDescribedBy) {
      selectors.push(`[aria-describedby="${descriptor.ariaDescribedBy}"]`);
    }

    if (descriptor.ariaLabelledBy) {
      selectors.push(`[aria-labelledby="${descriptor.ariaLabelledBy}"]`);
    }

    // By button/link text via aria
    if (descriptor.text) {
      selectors.push(`[aria-label*="${descriptor.text}"]`);
      selectors.push(`button:has-text("${descriptor.text}")`);
    }

    for (const selector of selectors) {
      try {
        const element = context.querySelector(selector);
        if (element) return element;
      } catch (e) {
        // Invalid selector (like :has-text), skip
      }
    }

    // Fallback: search all aria-labeled elements
    if (descriptor.text) {
      const ariaElements = context.querySelectorAll('[aria-label]');
      for (const el of ariaElements) {
        if (el.getAttribute('aria-label').toLowerCase().includes(descriptor.text.toLowerCase())) {
          return el;
        }
      }
    }

    return null;
  }

  findAllByAria(descriptor, context) {
    const results = [];
    const seen = new Set();

    const selectors = [];
    if (descriptor.ariaLabel) selectors.push(`[aria-label*="${descriptor.ariaLabel}"]`);
    if (descriptor.role) selectors.push(`[role="${descriptor.role}"]`);

    for (const selector of selectors) {
      try {
        const elements = context.querySelectorAll(selector);
        for (const el of elements) {
          if (!seen.has(el)) {
            seen.add(el);
            results.push(el);
          }
        }
      } catch (e) {}
    }

    return results;
  }

  // Strategy 6: Data Attributes
  findByDataAttr(descriptor, context) {
    if (!descriptor.dataAttributes) return null;

    for (const [key, value] of Object.entries(descriptor.dataAttributes)) {
      const selector = value
        ? `[data-${key}="${value}"]`
        : `[data-${key}]`;

      const element = context.querySelector(selector);
      if (element) return element;

      // Try contains match
      if (value) {
        const containsSelector = `[data-${key}*="${value}"]`;
        const containsElement = context.querySelector(containsSelector);
        if (containsElement) return containsElement;
      }
    }

    // Generic data-testid, data-cy, data-qa search
    const testIdAttrs = ['data-testid', 'data-test-id', 'data-cy', 'data-qa', 'data-automation'];
    if (descriptor.text) {
      for (const attr of testIdAttrs) {
        const elements = context.querySelectorAll(`[${attr}]`);
        for (const el of elements) {
          if (el.getAttribute(attr).toLowerCase().includes(descriptor.text.toLowerCase())) {
            return el;
          }
        }
      }
    }

    return null;
  }

  findAllByDataAttr(descriptor, context) {
    if (!descriptor.dataAttributes) return [];

    const results = [];
    const seen = new Set();

    for (const [key, value] of Object.entries(descriptor.dataAttributes)) {
      const selector = value ? `[data-${key}*="${value}"]` : `[data-${key}]`;
      try {
        const elements = context.querySelectorAll(selector);
        for (const el of elements) {
          if (!seen.has(el)) {
            seen.add(el);
            results.push(el);
          }
        }
      } catch (e) {}
    }

    return results;
  }

  // Strategy 7: Visual/Positional
  findByVisual(descriptor, context) {
    if (!descriptor.visual) return null;

    const { boundingBox, position, nearElement, direction } = descriptor.visual;

    // Find by position relative to another element
    if (nearElement && direction) {
      const anchor = this.find(nearElement, { context });
      if (anchor) {
        return this.findNearElement(anchor, direction, descriptor, context);
      }
    }

    // Find by approximate bounding box
    if (boundingBox) {
      return this.findByBoundingBox(boundingBox, descriptor, context);
    }

    // Find by relative position (e.g., "top-right corner")
    if (position) {
      return this.findByRelativePosition(position, descriptor, context);
    }

    return null;
  }

  findAllByVisual(descriptor, context) {
    // Visual strategy typically returns single best match
    const element = this.findByVisual(descriptor, context);
    return element ? [element] : [];
  }

  findNearElement(anchor, direction, descriptor, context) {
    const anchorRect = anchor.getBoundingClientRect();
    const candidates = context.querySelectorAll(descriptor.tagName || '*');

    let best = null;
    let bestScore = -Infinity;

    for (const el of candidates) {
      if (el === anchor) continue;

      const rect = el.getBoundingClientRect();
      const score = this.calculateDirectionalScore(anchorRect, rect, direction);

      if (score > bestScore && this.matchesDescriptor(el, descriptor)) {
        bestScore = score;
        best = el;
      }
    }

    return best;
  }

  calculateDirectionalScore(anchorRect, targetRect, direction) {
    const centerAnchor = {
      x: anchorRect.left + anchorRect.width / 2,
      y: anchorRect.top + anchorRect.height / 2
    };
    const centerTarget = {
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2
    };

    const dx = centerTarget.x - centerAnchor.x;
    const dy = centerTarget.y - centerAnchor.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let directionScore = 0;
    switch (direction) {
      case 'right': directionScore = dx > 0 ? 1 : -1; break;
      case 'left': directionScore = dx < 0 ? 1 : -1; break;
      case 'below': directionScore = dy > 0 ? 1 : -1; break;
      case 'above': directionScore = dy < 0 ? 1 : -1; break;
    }

    // Score: prefer correct direction, penalize distance
    return directionScore * 100 - distance;
  }

  findByBoundingBox(box, descriptor, context) {
    const tolerance = 50; // pixels
    const candidates = context.querySelectorAll(descriptor.tagName || '*');

    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      if (
        Math.abs(rect.left - box.left) < tolerance &&
        Math.abs(rect.top - box.top) < tolerance &&
        Math.abs(rect.width - box.width) < tolerance &&
        Math.abs(rect.height - box.height) < tolerance
      ) {
        return el;
      }
    }

    return null;
  }

  findByRelativePosition(position, descriptor, context) {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    const regions = {
      'top-left': { x: [0, 0.33], y: [0, 0.33] },
      'top': { x: [0.33, 0.66], y: [0, 0.33] },
      'top-right': { x: [0.66, 1], y: [0, 0.33] },
      'left': { x: [0, 0.33], y: [0.33, 0.66] },
      'center': { x: [0.33, 0.66], y: [0.33, 0.66] },
      'right': { x: [0.66, 1], y: [0.33, 0.66] },
      'bottom-left': { x: [0, 0.33], y: [0.66, 1] },
      'bottom': { x: [0.33, 0.66], y: [0.66, 1] },
      'bottom-right': { x: [0.66, 1], y: [0.66, 1] }
    };

    const region = regions[position];
    if (!region) return null;

    const candidates = context.querySelectorAll(descriptor.tagName || '*');

    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      const centerX = (rect.left + rect.width / 2) / viewport.width;
      const centerY = (rect.top + rect.height / 2) / viewport.height;

      if (
        centerX >= region.x[0] && centerX <= region.x[1] &&
        centerY >= region.y[0] && centerY <= region.y[1] &&
        this.matchesDescriptor(el, descriptor)
      ) {
        return el;
      }
    }

    return null;
  }

  // Strategy 8: Fuzzy/AI Matching
  findByFuzzy(descriptor, context) {
    const candidates = this.getCandidates(descriptor, context);

    let bestMatch = null;
    let bestScore = 0;

    for (const el of candidates) {
      const score = this.calculateFuzzyScore(el, descriptor);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = el;
      }
    }

    return bestScore >= this.confidenceThreshold ? bestMatch : null;
  }

  findAllByFuzzy(descriptor, context) {
    const candidates = this.getCandidates(descriptor, context);
    const results = [];

    for (const el of candidates) {
      const score = this.calculateFuzzyScore(el, descriptor);
      if (score >= this.confidenceThreshold) {
        results.push({ element: el, score });
      }
    }

    return results.sort((a, b) => b.score - a.score).map(r => r.element);
  }

  getCandidates(descriptor, context) {
    let selector = '*';

    if (descriptor.tagName) {
      selector = descriptor.tagName.toLowerCase();
    } else if (descriptor.role === 'button' || descriptor.text?.match(/^(click|submit|send|save|ok|cancel)/i)) {
      selector = 'button, [role="button"], input[type="button"], input[type="submit"], a';
    } else if (descriptor.role === 'link') {
      selector = 'a, [role="link"]';
    } else if (descriptor.role === 'textbox' || descriptor.type === 'input') {
      selector = 'input, textarea, [contenteditable="true"]';
    }

    return Array.from(context.querySelectorAll(selector)).filter(el => this.isVisible(el));
  }

  calculateFuzzyScore(element, descriptor) {
    let score = 0;
    let factors = 0;

    // Text similarity
    if (descriptor.text) {
      const elText = (element.innerText || element.textContent || '').toLowerCase();
      const targetText = descriptor.text.toLowerCase();
      const textSimilarity = this.stringSimilarity(elText, targetText);
      score += textSimilarity * 0.3;
      factors++;
    }

    // Attribute matches
    if (descriptor.attributes) {
      let attrMatches = 0;
      let attrTotal = 0;
      for (const [key, value] of Object.entries(descriptor.attributes)) {
        attrTotal++;
        const elValue = element.getAttribute(key);
        if (elValue) {
          if (elValue === value) attrMatches += 1;
          else if (elValue.includes(value) || value.includes(elValue)) attrMatches += 0.5;
        }
      }
      if (attrTotal > 0) {
        score += (attrMatches / attrTotal) * 0.2;
        factors++;
      }
    }

    // Class similarity
    if (descriptor.classes && descriptor.classes.length > 0) {
      const elClasses = Array.from(element.classList);
      let classMatches = 0;
      for (const cls of descriptor.classes) {
        if (elClasses.includes(cls)) classMatches++;
        else if (elClasses.some(ec => ec.includes(cls) || cls.includes(ec))) classMatches += 0.5;
      }
      score += (classMatches / descriptor.classes.length) * 0.2;
      factors++;
    }

    // Tag match
    if (descriptor.tagName) {
      if (element.tagName.toLowerCase() === descriptor.tagName.toLowerCase()) {
        score += 0.15;
      }
      factors++;
    }

    // ARIA match
    if (descriptor.ariaLabel) {
      const elAria = element.getAttribute('aria-label') || '';
      const ariaSimilarity = this.stringSimilarity(elAria.toLowerCase(), descriptor.ariaLabel.toLowerCase());
      score += ariaSimilarity * 0.15;
      factors++;
    }

    return factors > 0 ? score / factors * factors : 0; // Normalize
  }

  stringSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    // Contains check
    if (str1.includes(str2) || str2.includes(str1)) {
      return 0.8;
    }

    // Levenshtein-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

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

  // ========== Helper Methods ==========

  generateCSSSelector(element) {
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = `#${CSS.escape(current.id)}`;
        path.unshift(selector);
        break;
      }

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(c => c && !c.match(/^(active|hover|focus|selected|open|closed|visible|hidden)/i));
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).map(c => CSS.escape(c)).join('.');
        }
      }

      // Add nth-child if needed for uniqueness
      const siblings = current.parentElement?.children;
      if (siblings && siblings.length > 1) {
        const sameTagSiblings = Array.from(siblings).filter(s => s.tagName === current.tagName);
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  generateXPath(element) {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    const path = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;

      while (sibling) {
        if (sibling.tagName === current.tagName) index++;
        sibling = sibling.previousElementSibling;
      }

      const tagName = current.tagName.toLowerCase();
      path.unshift(`${tagName}[${index}]`);
      current = current.parentElement;
    }

    return '/' + path.join('/');
  }

  getTextDescriptor(element) {
    return {
      text: (element.innerText || element.textContent || '').trim().slice(0, 100),
      tagName: element.tagName.toLowerCase()
    };
  }

  getAriaDescriptor(element) {
    return {
      ariaLabel: element.getAttribute('aria-label'),
      role: element.getAttribute('role') || this.getImplicitRole(element),
      ariaDescribedBy: element.getAttribute('aria-describedby'),
      ariaLabelledBy: element.getAttribute('aria-labelledby')
    };
  }

  getImplicitRole(element) {
    const tag = element.tagName.toLowerCase();
    const type = element.getAttribute('type');

    const roleMap = {
      'button': 'button',
      'a': 'link',
      'input': type === 'submit' || type === 'button' ? 'button' : 'textbox',
      'textarea': 'textbox',
      'select': 'combobox',
      'img': 'img',
      'nav': 'navigation',
      'main': 'main',
      'header': 'banner',
      'footer': 'contentinfo',
      'article': 'article',
      'section': 'region'
    };

    return roleMap[tag] || null;
  }

  getDataAttrDescriptor(element) {
    const dataAttributes = {};
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-')) {
        dataAttributes[attr.name.replace('data-', '')] = attr.value;
      }
    }
    return { dataAttributes };
  }

  getVisualDescriptor(element) {
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);

    return {
      visual: {
        boundingBox: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        },
        styles: {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight
        }
      }
    };
  }

  getCombinedDescriptor(element) {
    return {
      selector: this.generateCSSSelector(element),
      xpath: this.generateXPath(element),
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: Array.from(element.classList),
      ...this.getTextDescriptor(element),
      ...this.getAriaDescriptor(element),
      ...this.getDataAttrDescriptor(element),
      ...this.getVisualDescriptor(element),
      attributes: {
        name: element.getAttribute('name'),
        type: element.getAttribute('type'),
        placeholder: element.getAttribute('placeholder'),
        href: element.getAttribute('href'),
        src: element.getAttribute('src')
      }
    };
  }

  // ========== Utility Methods ==========

  isVisible(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  isLeafElement(element) {
    // Check if element is a "leaf" (has mostly text, not many child elements)
    const childElements = element.querySelectorAll('*').length;
    const textLength = element.textContent?.length || 0;
    return childElements < 5 || textLength < 200;
  }

  matchesDescriptor(element, descriptor) {
    if (descriptor.tagName && element.tagName.toLowerCase() !== descriptor.tagName.toLowerCase()) {
      return false;
    }
    if (descriptor.id && element.id !== descriptor.id) {
      return false;
    }
    return true;
  }

  validateElement(element, descriptor) {
    if (!element || !element.isConnected) return false;
    if (!this.isVisible(element)) return false;
    return this.matchesDescriptor(element, descriptor);
  }

  calculateConfidence(element, descriptor) {
    return this.calculateFuzzyScore(element, descriptor);
  }

  // ========== Caching ==========

  getCacheKey(descriptor) {
    const url = window.location.hostname;
    const key = JSON.stringify({
      url,
      selector: descriptor.selector,
      text: descriptor.text,
      id: descriptor.id
    });
    return btoa(key).slice(0, 50);
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  cacheResult(key, element, strategy, confidence) {
    this.cache.set(key, {
      element,
      strategy,
      confidence,
      timestamp: Date.now()
    });

    // Persist to storage
    this.persistCache();
  }

  async persistCache() {
    try {
      const cacheData = {};
      for (const [key, value] of this.cache) {
        // Store descriptor info, not the actual element
        cacheData[key] = {
          strategy: value.strategy,
          confidence: value.confidence,
          timestamp: value.timestamp
        };
      }

      await chrome.storage.local.set({ selectorCache: cacheData });
    } catch (e) {
      console.debug('[SelectorEngine] Failed to persist cache:', e);
    }
  }

  async loadCache() {
    try {
      const { selectorCache } = await chrome.storage.local.get('selectorCache');
      if (selectorCache) {
        for (const [key, value] of Object.entries(selectorCache)) {
          if (Date.now() - value.timestamp < this.cacheTTL) {
            this.cache.set(key, value);
          }
        }
      }
    } catch (e) {
      console.debug('[SelectorEngine] Failed to load cache:', e);
    }
  }

  // ========== Learning ==========

  getOptimizedStrategies(descriptor) {
    const domain = window.location.hostname;
    const learned = this.learningData.get(domain) || {};

    // Sort strategies by success rate for this domain
    return [...this.strategies].sort((a, b) => {
      const scoreA = learned[a]?.successRate || 0.5;
      const scoreB = learned[b]?.successRate || 0.5;
      return scoreB - scoreA;
    });
  }

  recordSuccess(descriptor, strategy) {
    const domain = window.location.hostname;

    if (!this.learningData.has(domain)) {
      this.learningData.set(domain, {});
    }

    const domainData = this.learningData.get(domain);
    if (!domainData[strategy]) {
      domainData[strategy] = { successes: 0, attempts: 0 };
    }

    domainData[strategy].successes++;
    domainData[strategy].attempts++;
    domainData[strategy].successRate = domainData[strategy].successes / domainData[strategy].attempts;

    // Persist learning data
    this.persistLearning();
  }

  async persistLearning() {
    try {
      const learningObj = {};
      for (const [domain, data] of this.learningData) {
        learningObj[domain] = data;
      }
      await chrome.storage.local.set({ selectorLearning: learningObj });
    } catch (e) {
      console.debug('[SelectorEngine] Failed to persist learning:', e);
    }
  }

  async loadLearning() {
    try {
      const { selectorLearning } = await chrome.storage.local.get('selectorLearning');
      if (selectorLearning) {
        for (const [domain, data] of Object.entries(selectorLearning)) {
          this.learningData.set(domain, data);
        }
      }
    } catch (e) {
      console.debug('[SelectorEngine] Failed to load learning:', e);
    }
  }

  // ========== Initialization ==========

  async initialize() {
    await Promise.all([
      this.loadCache(),
      this.loadLearning()
    ]);
    console.log('[SelectorEngine] Initialized with 8-strategy self-healing');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const selectorEngine = new SelectorEngine();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SelectorEngine, selectorEngine };
}

// Initialize when loaded
selectorEngine.initialize();

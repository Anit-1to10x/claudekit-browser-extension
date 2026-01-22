/**
 * 10X.in Google Handler
 *
 * Developed by team 10X.in
 * Google Search automation actions with SERP extraction and knowledge panel parsing
 * Actions: search, scrape_results, click_result, extract_knowledge_panel
 */

// Google selectors (current UI as of 2025)
const SELECTORS = {
  // Search
  searchBox: 'textarea[name="q"], input[name="q"]',
  searchButton: 'input[type="submit"][value="Google Search"], button[aria-label="Google Search"]',

  // Results
  resultsContainer: '#search',
  resultItem: 'div.g, div[data-sokoban-container]',
  resultTitle: 'h3',
  resultUrl: 'cite, span.VuuXrf',
  resultSnippet: 'div.VwiC3b, span.aCOpRe, div[data-sncf]',
  resultLink: 'a[jsname]',

  // Knowledge panel
  knowledgePanel: 'div[data-attrid*="kc:"], div.kp-wholepage, div.osrp-blk',
  panelTitle: 'h2.qrShPb, div[data-attrid="title"]',
  panelSubtitle: 'div[data-attrid="subtitle"]',
  panelDescription: 'div[data-attrid="description"], span.kno-rdesc span',
  panelImage: 'g-img img, div[data-attrid="image"] img',
  panelFacts: 'div[data-attrid] span, div.kno-rdesc span',

  // Featured snippets
  featuredSnippet: 'div.ifM9O, div[data-attrid="FeaturedSnippet"]',
  snippetContent: 'div.hgKElc, span.hgKElc',

  // People also ask
  paaContainer: 'div[data-attrid="PeopleAlsoAsk"], div[jsname="Cpkphb"]',
  paaQuestion: 'div[role="button"] span',

  // Related searches
  relatedSearches: 'div.s75CSd, div[data-hveid] a',
  relatedSearchText: 'div.s75CSd span, div[data-hveid] span',

  // Stats
  statsBar: '#result-stats'
};

// Utility: Random delay between actions (humanize)
const randomDelay = (min = 1000, max = 3000) => {
  return new Promise(resolve => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    setTimeout(resolve, delay);
  });
};

// Utility: Execute script in active tab
const executeInTab = async (func, args = []) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    throw new Error('No active tab found');
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
 * Google Handler Class
 */
class GoogleHandler {
  constructor() {
    this.platform = 'google';
  }

  /**
   * Main execution method - routes to specific action handlers
   */
  async execute(action) {
    console.log(`[Google Handler] Executing action: ${action.type}`);

    try {
      let result;

      switch (action.type) {
        case 'search':
          result = await this.performSearch(action);
          break;

        case 'scrape_results':
          result = await this.scrapeResults(action);
          break;

        case 'click_result':
          result = await this.clickResult(action);
          break;

        case 'extract_knowledge_panel':
          result = await this.extractKnowledgePanel(action);
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
      console.error(`[Google Handler] Error executing ${action.type}:`, error);

      return {
        success: false,
        action: action.type,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Action: Perform Google Search
   */
  async performSearch(action) {
    const { query, autoScrape = true } = action;

    if (!query || query.trim().length === 0) {
      throw new Error('query is required');
    }

    // Navigate to Google if not already there
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || !tab.url.includes('google.com')) {
      await chrome.tabs.update(tab.id, { url: 'https://www.google.com' });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await randomDelay(500, 1000);

    // Type search query
    await executeInTab((searchQuery) => {
      const searchBox = document.querySelector('textarea[name="q"]') ||
                        document.querySelector('input[name="q"]');

      if (!searchBox) {
        throw new Error('Search box not found');
      }

      searchBox.focus();
      searchBox.value = searchQuery;

      // Trigger input events
      searchBox.dispatchEvent(new InputEvent('input', { bubbles: true, data: searchQuery }));
      searchBox.dispatchEvent(new Event('change', { bubbles: true }));

      return { typed: true };
    }, [query]);

    await randomDelay(500, 1000);

    // Submit search (press Enter)
    await executeInTab(() => {
      const searchBox = document.querySelector('textarea[name="q"]') ||
                        document.querySelector('input[name="q"]');

      if (!searchBox) {
        throw new Error('Search box not found');
      }

      // Press Enter
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      });

      searchBox.dispatchEvent(enterEvent);

      return { submitted: true };
    });

    // Wait for results to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Auto-scrape results if requested
    let results = null;
    if (autoScrape) {
      results = await this.scrapeResults({});
    }

    return {
      query,
      searchPerformed: true,
      results: results ? results.results : null,
      resultsCount: results ? results.totalResults : null
    };
  }

  /**
   * Action: Scrape Search Results
   */
  async scrapeResults(action) {
    const { maxResults = 10 } = action;

    // Extract SERP data
    const serpData = await executeInTab((max) => {
      // Extract search stats
      const statsBar = document.querySelector('#result-stats');
      const statsText = statsBar ? statsBar.textContent.trim() : null;

      // Extract total results count
      const totalResults = statsText ? statsText.match(/[\d,]+/)?.[0]?.replace(/,/g, '') : null;

      // Extract organic results
      const resultElements = Array.from(document.querySelectorAll('div.g'));
      const results = [];

      for (let i = 0; i < Math.min(resultElements.length, max); i++) {
        const resultEl = resultElements[i];

        try {
          const titleEl = resultEl.querySelector('h3');
          const linkEl = resultEl.querySelector('a');
          const snippetEl = resultEl.querySelector('div.VwiC3b, span.aCOpRe');
          const citeEl = resultEl.querySelector('cite, span.VuuXrf');

          if (!titleEl || !linkEl) continue;

          results.push({
            position: i + 1,
            title: titleEl.textContent.trim(),
            url: linkEl.href,
            displayUrl: citeEl ? citeEl.textContent.trim() : linkEl.href,
            snippet: snippetEl ? snippetEl.textContent.trim() : null,
            type: 'organic'
          });
        } catch (error) {
          console.error('Error extracting result:', error);
        }
      }

      // Extract featured snippet if present
      const featuredSnippet = document.querySelector('div.ifM9O, div[data-attrid="FeaturedSnippet"]');
      let featuredSnippetData = null;

      if (featuredSnippet) {
        const snippetContent = featuredSnippet.querySelector('div.hgKElc, span.hgKElc');
        const snippetLink = featuredSnippet.querySelector('a');
        const snippetTitle = featuredSnippet.querySelector('h3');

        featuredSnippetData = {
          type: 'featured_snippet',
          content: snippetContent ? snippetContent.textContent.trim() : null,
          title: snippetTitle ? snippetTitle.textContent.trim() : null,
          url: snippetLink ? snippetLink.href : null
        };
      }

      // Extract "People Also Ask"
      const paaContainer = document.querySelector('div[data-attrid="PeopleAlsoAsk"]');
      let paaQuestions = [];

      if (paaContainer) {
        const questionElements = paaContainer.querySelectorAll('div[role="button"]');
        paaQuestions = Array.from(questionElements).slice(0, 5).map(el => {
          const questionText = el.querySelector('span');
          return questionText ? questionText.textContent.trim() : null;
        }).filter(Boolean);
      }

      // Extract related searches
      const relatedSearchElements = document.querySelectorAll('div.s75CSd');
      const relatedSearches = Array.from(relatedSearchElements).slice(0, 8).map(el => {
        return el.textContent.trim();
      }).filter(Boolean);

      return {
        query: new URLSearchParams(window.location.search).get('q'),
        totalResults: totalResults ? parseInt(totalResults, 10) : null,
        statsText,
        results,
        featuredSnippet: featuredSnippetData,
        peopleAlsoAsk: paaQuestions,
        relatedSearches,
        url: window.location.href
      };
    }, [maxResults]);

    return serpData;
  }

  /**
   * Action: Click Search Result
   */
  async clickResult(action) {
    const { position } = action;

    if (!position || position < 1) {
      throw new Error('position must be >= 1');
    }

    await randomDelay(500, 1500);

    const clickedResult = await executeInTab((pos) => {
      const resultElements = Array.from(document.querySelectorAll('div.g'));

      if (pos > resultElements.length) {
        throw new Error(`Result position ${pos} not found. Only ${resultElements.length} results available.`);
      }

      const resultEl = resultElements[pos - 1];
      const linkEl = resultEl.querySelector('a');
      const titleEl = resultEl.querySelector('h3');

      if (!linkEl) {
        throw new Error(`No link found for result at position ${pos}`);
      }

      // Scroll into view
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Extract info before clicking
      const resultInfo = {
        position: pos,
        title: titleEl ? titleEl.textContent.trim() : null,
        url: linkEl.href
      };

      // Click the link
      setTimeout(() => {
        linkEl.click();
      }, 500);

      return resultInfo;
    }, [position]);

    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      clicked: true,
      ...clickedResult
    };
  }

  /**
   * Action: Extract Knowledge Panel
   */
  async extractKnowledgePanel(action) {
    await randomDelay(500, 1000);

    const panelData = await executeInTab(() => {
      // Try multiple selectors for knowledge panel
      const panel = document.querySelector('div.kp-wholepage') ||
                     document.querySelector('div[data-attrid*="kc:"]') ||
                     document.querySelector('div.osrp-blk');

      if (!panel) {
        return {
          found: false,
          message: 'No knowledge panel found on this page'
        };
      }

      // Extract title
      const titleEl = panel.querySelector('h2.qrShPb, div[data-attrid="title"] span');
      const title = titleEl ? titleEl.textContent.trim() : null;

      // Extract subtitle
      const subtitleEl = panel.querySelector('div[data-attrid="subtitle"] span');
      const subtitle = subtitleEl ? subtitleEl.textContent.trim() : null;

      // Extract description
      const descEl = panel.querySelector('div[data-attrid="description"] span, span.kno-rdesc span');
      const description = descEl ? descEl.textContent.trim() : null;

      // Extract image
      const imgEl = panel.querySelector('g-img img, div[data-attrid="image"] img');
      const image = imgEl ? imgEl.src : null;

      // Extract facts (key-value pairs)
      const facts = {};
      const factElements = panel.querySelectorAll('div[data-attrid]');

      factElements.forEach(factEl => {
        const attrid = factEl.getAttribute('data-attrid');

        // Skip common non-fact attributes
        if (['title', 'subtitle', 'description', 'image'].includes(attrid)) {
          return;
        }

        const spans = factEl.querySelectorAll('span');
        if (spans.length >= 2) {
          const label = spans[0].textContent.trim();
          const value = spans[1].textContent.trim();

          if (label && value) {
            facts[label] = value;
          }
        }
      });

      // Extract social links
      const socialLinks = {};
      const linkElements = panel.querySelectorAll('a[href*="twitter.com"], a[href*="facebook.com"], a[href*="instagram.com"], a[href*="linkedin.com"], a[href*="youtube.com"]');

      linkElements.forEach(linkEl => {
        const href = linkEl.href;

        if (href.includes('twitter.com')) {
          socialLinks.twitter = href;
        } else if (href.includes('facebook.com')) {
          socialLinks.facebook = href;
        } else if (href.includes('instagram.com')) {
          socialLinks.instagram = href;
        } else if (href.includes('linkedin.com')) {
          socialLinks.linkedin = href;
        } else if (href.includes('youtube.com')) {
          socialLinks.youtube = href;
        }
      });

      // Extract website
      const websiteEl = panel.querySelector('a[data-attrid="visit_official_site"], div[data-attrid="kc:/common/topic:official website"] a');
      const website = websiteEl ? websiteEl.href : null;

      return {
        found: true,
        title,
        subtitle,
        description,
        image,
        facts,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
        website,
        panelType: panel.getAttribute('data-attrid') || 'knowledge_panel'
      };
    });

    return panelData;
  }
}

export default GoogleHandler;

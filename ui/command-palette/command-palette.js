/**
 * 10X.in Command Palette
 * Keyboard-first power user interface
 * Triggered with Ctrl/Cmd + Shift + K
 */

class CommandPalette {
  constructor() {
    this.isOpen = false;
    this.element = null;
    this.inputElement = null;
    this.resultsElement = null;
    this.selectedIndex = 0;
    this.commands = [];
    this.recentCommands = [];
    this.maxRecentCommands = 10;

    // Dependencies (injected)
    this.intentParser = null;
    this.actionRecorder = null;
    this.workflowEngine = null;
    this.autoScraper = null;

    this.initializeCommands();
    this.loadRecentCommands();
  }

  /**
   * Initialize built-in commands
   */
  initializeCommands() {
    this.commands = [
      // Recording commands
      {
        id: 'record-start',
        name: 'Start Recording',
        description: 'Record your actions to create a workflow',
        icon: '⏺',
        shortcut: 'Ctrl+Shift+R',
        category: 'Recording',
        action: () => this.startRecording()
      },
      {
        id: 'record-stop',
        name: 'Stop Recording',
        description: 'Stop recording and save workflow',
        icon: '⏹',
        category: 'Recording',
        action: () => this.stopRecording(),
        condition: () => this.actionRecorder?.isRecording
      },

      // Scraping commands
      {
        id: 'scrape-page',
        name: 'Scrape This Page',
        description: 'Auto-detect and extract all data from this page',
        icon: '📋',
        shortcut: 'Ctrl+Shift+S',
        category: 'Scraping',
        action: () => this.scrapePage()
      },
      {
        id: 'scrape-emails',
        name: 'Extract Emails',
        description: 'Find all email addresses on this page',
        icon: '📧',
        category: 'Scraping',
        action: () => this.extractByType('email')
      },
      {
        id: 'scrape-phones',
        name: 'Extract Phone Numbers',
        description: 'Find all phone numbers on this page',
        icon: '📞',
        category: 'Scraping',
        action: () => this.extractByType('phone')
      },
      {
        id: 'scrape-links',
        name: 'Extract Links',
        description: 'Get all links from this page',
        icon: '🔗',
        category: 'Scraping',
        action: () => this.extractByType('url')
      },
      {
        id: 'scrape-images',
        name: 'Extract Images',
        description: 'Get all image URLs from this page',
        icon: '🖼️',
        category: 'Scraping',
        action: () => this.extractByType('image')
      },
      {
        id: 'scrape-tables',
        name: 'Extract Tables',
        description: 'Extract data from tables on this page',
        icon: '📊',
        category: 'Scraping',
        action: () => this.extractTables()
      },

      // Workflow commands
      {
        id: 'workflow-list',
        name: 'My Workflows',
        description: 'View and manage saved workflows',
        icon: '📂',
        shortcut: 'Ctrl+Shift+W',
        category: 'Workflows',
        action: () => this.showWorkflows()
      },
      {
        id: 'workflow-run-last',
        name: 'Run Last Workflow',
        description: 'Execute the most recently used workflow',
        icon: '▶️',
        shortcut: 'Ctrl+Shift+L',
        category: 'Workflows',
        action: () => this.runLastWorkflow()
      },
      {
        id: 'workflow-create',
        name: 'Create Workflow',
        description: 'Open the visual workflow builder',
        icon: '➕',
        category: 'Workflows',
        action: () => this.openWorkflowBuilder()
      },

      // Navigation commands
      {
        id: 'nav-linkedin',
        name: 'Go to LinkedIn',
        description: 'Navigate to LinkedIn',
        icon: '💼',
        category: 'Navigation',
        action: () => this.navigate('https://www.linkedin.com')
      },
      {
        id: 'nav-twitter',
        name: 'Go to Twitter/X',
        description: 'Navigate to Twitter',
        icon: '🐦',
        category: 'Navigation',
        action: () => this.navigate('https://twitter.com')
      },
      {
        id: 'nav-instagram',
        name: 'Go to Instagram',
        description: 'Navigate to Instagram',
        icon: '📷',
        category: 'Navigation',
        action: () => this.navigate('https://www.instagram.com')
      },

      // Utility commands
      {
        id: 'scroll-top',
        name: 'Scroll to Top',
        description: 'Scroll to the top of the page',
        icon: '⬆️',
        category: 'Utility',
        action: () => window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      {
        id: 'scroll-bottom',
        name: 'Scroll to Bottom',
        description: 'Scroll to the bottom of the page',
        icon: '⬇️',
        category: 'Utility',
        action: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
      },
      {
        id: 'screenshot',
        name: 'Take Screenshot',
        description: 'Capture a screenshot of this page',
        icon: '📸',
        category: 'Utility',
        action: () => this.takeScreenshot()
      },
      {
        id: 'copy-url',
        name: 'Copy Page URL',
        description: 'Copy the current page URL to clipboard',
        icon: '📎',
        category: 'Utility',
        action: () => this.copyToClipboard(window.location.href)
      },

      // Settings
      {
        id: 'settings',
        name: 'Settings',
        description: 'Open 10X.in settings',
        icon: '⚙️',
        category: 'Settings',
        action: () => this.openSettings()
      },
      {
        id: 'help',
        name: 'Help & Shortcuts',
        description: 'View keyboard shortcuts and help',
        icon: '❓',
        category: 'Settings',
        action: () => this.showHelp()
      }
    ];
  }

  /**
   * Initialize the command palette
   */
  initialize(dependencies = {}) {
    this.intentParser = dependencies.intentParser;
    this.actionRecorder = dependencies.actionRecorder;
    this.workflowEngine = dependencies.workflowEngine;
    this.autoScraper = dependencies.autoScraper;

    this.createPaletteElement();
    this.setupKeyboardShortcuts();

    console.log('[CommandPalette] Initialized');
  }

  /**
   * Create the palette DOM element
   */
  createPaletteElement() {
    this.element = document.createElement('div');
    this.element.id = 'tenx-command-palette';
    this.element.innerHTML = `
      <div class="palette-overlay"></div>
      <div class="palette-container">
        <div class="palette-header">
          <div class="palette-search">
            <span class="search-icon">🔍</span>
            <input type="text" class="palette-input" placeholder="Type a command or search...">
            <span class="shortcut-hint">⌘⇧K</span>
          </div>
        </div>
        <div class="palette-results"></div>
        <div class="palette-footer">
          <span class="hint">↑↓ Navigate</span>
          <span class="hint">↵ Select</span>
          <span class="hint">Esc Close</span>
        </div>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = this.getStyles();
    this.element.appendChild(styles);

    // Get references
    this.inputElement = this.element.querySelector('.palette-input');
    this.resultsElement = this.element.querySelector('.palette-results');

    // Setup event listeners
    this.setupEventListeners();

    // Append to body (hidden initially)
    document.body.appendChild(this.element);
  }

  /**
   * Get CSS styles
   */
  getStyles() {
    return `
      #tenx-command-palette {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
      }

      #tenx-command-palette.open {
        display: block;
      }

      .palette-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }

      .palette-container {
        position: absolute;
        top: 15%;
        left: 50%;
        transform: translateX(-50%);
        width: 600px;
        max-width: 90vw;
        background: #1a1a2e;
        border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        animation: slideDown 0.15s ease-out;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      .palette-header {
        padding: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .palette-search {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        padding: 8px 16px;
      }

      .search-icon {
        font-size: 18px;
        opacity: 0.7;
      }

      .palette-input {
        flex: 1;
        background: none;
        border: none;
        outline: none;
        color: white;
        font-size: 16px;
        padding: 8px 0;
      }

      .palette-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }

      .shortcut-hint {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.05);
        padding: 4px 8px;
        border-radius: 6px;
      }

      .palette-results {
        max-height: 400px;
        overflow-y: auto;
        padding: 8px;
      }

      .palette-results::-webkit-scrollbar {
        width: 6px;
      }

      .palette-results::-webkit-scrollbar-track {
        background: transparent;
      }

      .palette-results::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }

      .result-category {
        padding: 8px 12px;
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .result-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.1s;
      }

      .result-item:hover,
      .result-item.selected {
        background: rgba(255, 255, 255, 0.1);
      }

      .result-item.selected {
        background: rgba(99, 102, 241, 0.3);
      }

      .result-icon {
        font-size: 20px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
      }

      .result-content {
        flex: 1;
        min-width: 0;
      }

      .result-name {
        color: white;
        font-size: 14px;
        font-weight: 500;
      }

      .result-description {
        color: rgba(255, 255, 255, 0.5);
        font-size: 12px;
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .result-shortcut {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.05);
        padding: 4px 8px;
        border-radius: 4px;
      }

      .palette-footer {
        display: flex;
        gap: 16px;
        padding: 12px 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
      }

      .palette-footer .hint {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
      }

      .nlp-mode {
        padding: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .nlp-hint {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 8px;
      }

      .nlp-examples {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .nlp-example {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        background: rgba(255, 255, 255, 0.05);
        padding: 4px 10px;
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.1s;
      }

      .nlp-example:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .no-results {
        padding: 24px;
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
      }

      .no-results-icon {
        font-size: 32px;
        margin-bottom: 8px;
        opacity: 0.5;
      }

      .recent-section {
        margin-bottom: 8px;
      }

      .recent-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
      }

      .recent-title {
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .clear-recent {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.3);
        cursor: pointer;
      }

      .clear-recent:hover {
        color: rgba(255, 255, 255, 0.6);
      }
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close on overlay click
    this.element.querySelector('.palette-overlay').addEventListener('click', () => {
      this.close();
    });

    // Input handling
    this.inputElement.addEventListener('input', (e) => {
      this.handleInput(e.target.value);
    });

    // Keyboard navigation
    this.inputElement.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    // Result clicks
    this.resultsElement.addEventListener('click', (e) => {
      const item = e.target.closest('.result-item');
      if (item) {
        const index = parseInt(item.dataset.index);
        this.selectResult(index);
      }
    });
  }

  /**
   * Setup global keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + K to open
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        this.toggle();
      }

      // Escape to close
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.close();
      }
    });
  }

  /**
   * Open the command palette
   */
  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.element.classList.add('open');
    this.inputElement.value = '';
    this.selectedIndex = 0;
    this.renderResults('');
    this.inputElement.focus();
  }

  /**
   * Close the command palette
   */
  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.element.classList.remove('open');
  }

  /**
   * Toggle the command palette
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Handle input changes
   */
  handleInput(query) {
    this.selectedIndex = 0;
    this.renderResults(query);
  }

  /**
   * Handle keyboard navigation
   */
  handleKeydown(e) {
    const results = this.resultsElement.querySelectorAll('.result-item');

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, results.length - 1);
        this.updateSelection();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
        break;

      case 'Enter':
        e.preventDefault();
        this.selectResult(this.selectedIndex);
        break;

      case 'Tab':
        e.preventDefault();
        // Auto-complete from selected result
        const selected = results[this.selectedIndex];
        if (selected) {
          const name = selected.querySelector('.result-name')?.textContent;
          if (name) {
            this.inputElement.value = name;
          }
        }
        break;
    }
  }

  /**
   * Render search results
   */
  renderResults(query) {
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      // Show recent commands and quick actions
      this.renderDefaultView();
      return;
    }

    // Check if it looks like a natural language command
    if (this.isNaturalLanguage(normalizedQuery)) {
      this.renderNLPResults(query);
      return;
    }

    // Filter commands
    const filtered = this.commands
      .filter(cmd => {
        if (cmd.condition && !cmd.condition()) return false;
        return cmd.name.toLowerCase().includes(normalizedQuery) ||
               cmd.description.toLowerCase().includes(normalizedQuery) ||
               cmd.category.toLowerCase().includes(normalizedQuery);
      })
      .slice(0, 10);

    if (filtered.length === 0) {
      // Try NLP parsing
      this.renderNLPResults(query);
      return;
    }

    // Group by category
    const grouped = this.groupByCategory(filtered);
    this.renderGroupedResults(grouped);
  }

  /**
   * Render default view (recent + quick actions)
   */
  renderDefaultView() {
    let html = '';

    // Recent commands
    if (this.recentCommands.length > 0) {
      html += `
        <div class="recent-section">
          <div class="recent-header">
            <span class="recent-title">Recent</span>
            <span class="clear-recent" onclick="commandPalette.clearRecentCommands()">Clear</span>
          </div>
          ${this.recentCommands.slice(0, 5).map((cmd, i) => this.renderResultItem(cmd, i)).join('')}
        </div>
      `;
    }

    // Quick actions
    const quickActions = this.commands.filter(cmd =>
      ['record-start', 'scrape-page', 'workflow-list'].includes(cmd.id) &&
      (!cmd.condition || cmd.condition())
    );

    html += `
      <div class="result-category">Quick Actions</div>
      ${quickActions.map((cmd, i) => this.renderResultItem(cmd, i + this.recentCommands.length)).join('')}
    `;

    // NLP hint
    html += `
      <div class="nlp-mode">
        <div class="nlp-hint">💬 Or type naturally:</div>
        <div class="nlp-examples">
          <span class="nlp-example" onclick="commandPalette.setInput('scrape all emails')">scrape all emails</span>
          <span class="nlp-example" onclick="commandPalette.setInput('click the submit button')">click the submit button</span>
          <span class="nlp-example" onclick="commandPalette.setInput('fill form with my profile')">fill form with my profile</span>
        </div>
      </div>
    `;

    this.resultsElement.innerHTML = html;
  }

  /**
   * Render grouped results
   */
  renderGroupedResults(grouped) {
    let html = '';
    let index = 0;

    for (const [category, commands] of Object.entries(grouped)) {
      html += `<div class="result-category">${category}</div>`;
      for (const cmd of commands) {
        html += this.renderResultItem(cmd, index++);
      }
    }

    this.resultsElement.innerHTML = html;
    this.updateSelection();
  }

  /**
   * Render a single result item
   */
  renderResultItem(cmd, index) {
    const isSelected = index === this.selectedIndex;
    return `
      <div class="result-item ${isSelected ? 'selected' : ''}" data-index="${index}" data-command-id="${cmd.id}">
        <div class="result-icon">${cmd.icon || '▶'}</div>
        <div class="result-content">
          <div class="result-name">${cmd.name}</div>
          <div class="result-description">${cmd.description}</div>
        </div>
        ${cmd.shortcut ? `<div class="result-shortcut">${cmd.shortcut}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render NLP results
   */
  renderNLPResults(query) {
    if (!this.intentParser) {
      this.resultsElement.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🔍</div>
          <div>No matching commands found</div>
        </div>
      `;
      return;
    }

    const parsed = this.intentParser.parse(query);

    if (parsed.intent === 'UNKNOWN' || parsed.confidence < 0.5) {
      this.resultsElement.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🤔</div>
          <div>I didn't understand that command</div>
          <div style="margin-top: 8px; font-size: 12px;">
            ${parsed.suggestion || 'Try: scrape, click, type, go to, wait, record'}
          </div>
        </div>
      `;
      return;
    }

    // Create a dynamic command from the parsed intent
    const nlpCommand = {
      id: 'nlp-command',
      name: this.formatIntentName(parsed),
      description: `Confidence: ${Math.round(parsed.confidence * 100)}%`,
      icon: this.getIntentIcon(parsed.intent),
      action: () => this.executeNLPCommand(parsed)
    };

    this.resultsElement.innerHTML = `
      <div class="result-category">Interpreted Command</div>
      ${this.renderResultItem(nlpCommand, 0)}
      ${parsed.alternatives?.length > 0 ? `
        <div class="result-category">Also try</div>
        ${parsed.alternatives.map((alt, i) => `
          <div class="result-item" data-index="${i + 1}">
            <div class="result-icon">${this.getIntentIcon(alt.intent)}</div>
            <div class="result-content">
              <div class="result-name">${alt.intent}</div>
              <div class="result-description">Confidence: ${Math.round(alt.confidence * 100)}%</div>
            </div>
          </div>
        `).join('')}
      ` : ''}
    `;

    this.updateSelection();
  }

  /**
   * Check if input looks like natural language
   */
  isNaturalLanguage(query) {
    // Contains spaces and doesn't match a command name exactly
    if (!query.includes(' ')) return false;

    const exactMatch = this.commands.find(cmd =>
      cmd.name.toLowerCase() === query
    );

    return !exactMatch;
  }

  /**
   * Format intent name for display
   */
  formatIntentName(parsed) {
    const intent = parsed.intent;
    const params = parsed.params;

    switch (intent) {
      case 'SCRAPE':
        return `Scrape ${params.target?.original || 'data'}`;
      case 'CLICK':
        return `Click ${params.target || 'element'}`;
      case 'TYPE':
        return `Type "${params.text?.substring(0, 20)}${params.text?.length > 20 ? '...' : ''}"`;
      case 'NAVIGATE':
        return `Go to ${params.url}`;
      case 'WAIT':
        return params.duration ? `Wait ${params.duration}ms` : `Wait for ${params.condition}`;
      case 'WORKFLOW':
        return `${params.action} workflow${params.workflowName ? ': ' + params.workflowName : ''}`;
      default:
        return intent;
    }
  }

  /**
   * Get icon for intent
   */
  getIntentIcon(intent) {
    const icons = {
      SCRAPE: '📋',
      CLICK: '👆',
      TYPE: '⌨️',
      NAVIGATE: '🧭',
      WAIT: '⏱️',
      WORKFLOW: '🔄',
      SCROLL: '📜',
      FORM: '📝',
      SOCIAL: '👥',
      LOOP: '🔁',
      SCREENSHOT: '📸'
    };
    return icons[intent] || '▶';
  }

  /**
   * Update selection highlight
   */
  updateSelection() {
    const items = this.resultsElement.querySelectorAll('.result-item');
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === this.selectedIndex);
    });

    // Scroll into view
    const selected = items[this.selectedIndex];
    if (selected) {
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /**
   * Select a result
   */
  async selectResult(index) {
    const items = this.resultsElement.querySelectorAll('.result-item');
    const item = items[index];
    if (!item) return;

    const commandId = item.dataset.commandId;

    if (commandId === 'nlp-command') {
      // NLP command - already in parsed state
      const query = this.inputElement.value;
      const parsed = this.intentParser?.parse(query);
      if (parsed) {
        this.close();
        await this.executeNLPCommand(parsed);
      }
      return;
    }

    const command = this.commands.find(cmd => cmd.id === commandId);
    if (!command) return;

    // Add to recent
    this.addToRecent(command);

    // Close palette
    this.close();

    // Execute command
    try {
      await command.action();
    } catch (error) {
      console.error('[CommandPalette] Command failed:', error);
      this.showNotification(`Command failed: ${error.message}`, 'error');
    }
  }

  /**
   * Execute an NLP command
   */
  async executeNLPCommand(parsed) {
    // Send to background for execution
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_NLP_COMMAND',
        parsed
      });

      if (response?.error) {
        this.showNotification(response.error, 'error');
      } else {
        this.showNotification('Command executed successfully', 'success');
      }
    } catch (error) {
      console.error('[CommandPalette] NLP command failed:', error);
      this.showNotification(`Failed: ${error.message}`, 'error');
    }
  }

  /**
   * Group commands by category
   */
  groupByCategory(commands) {
    const grouped = {};
    for (const cmd of commands) {
      if (!grouped[cmd.category]) {
        grouped[cmd.category] = [];
      }
      grouped[cmd.category].push(cmd);
    }
    return grouped;
  }

  /**
   * Set input value (for NLP examples)
   */
  setInput(value) {
    this.inputElement.value = value;
    this.handleInput(value);
    this.inputElement.focus();
  }

  // ========== Command Actions ==========

  async startRecording() {
    if (this.actionRecorder) {
      await this.actionRecorder.startRecording();
      this.showNotification('Recording started', 'success');
    } else {
      // Notify background to start recording
      chrome.runtime.sendMessage({ type: 'START_RECORDING' });
    }
  }

  async stopRecording() {
    if (this.actionRecorder) {
      const result = await this.actionRecorder.stopRecording();
      if (result) {
        this.showNotification(`Recorded ${result.actions.length} actions`, 'success');
        // Open workflow builder with recorded actions
        this.openWorkflowBuilder(result);
      }
    } else {
      chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    }
  }

  async scrapePage() {
    if (this.autoScraper) {
      const data = await this.autoScraper.detectAndExtract();
      console.log('[CommandPalette] Scraped data:', data);
      this.showScrapedData(data);
    } else {
      chrome.runtime.sendMessage({ type: 'SCRAPE_PAGE' });
    }
  }

  async extractByType(type) {
    if (this.autoScraper) {
      const data = this.autoScraper.extractByType(type);
      this.showScrapedData({ [type]: data });
    } else {
      chrome.runtime.sendMessage({ type: 'EXTRACT_BY_TYPE', dataType: type });
    }
  }

  async extractTables() {
    if (this.autoScraper) {
      const structures = await this.autoScraper.detectStructures();
      const tables = [];
      for (const table of structures.tables) {
        tables.push(await this.autoScraper.extractPattern(table));
      }
      this.showScrapedData({ tables });
    }
  }

  showWorkflows() {
    chrome.runtime.sendMessage({ type: 'SHOW_WORKFLOWS' });
  }

  async runLastWorkflow() {
    chrome.runtime.sendMessage({ type: 'RUN_LAST_WORKFLOW' });
  }

  openWorkflowBuilder(data = null) {
    chrome.runtime.sendMessage({ type: 'OPEN_WORKFLOW_BUILDER', data });
  }

  navigate(url) {
    window.location.href = url;
  }

  takeScreenshot() {
    chrome.runtime.sendMessage({ type: 'TAKE_SCREENSHOT' });
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showNotification('Copied to clipboard', 'success');
    });
  }

  openSettings() {
    chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
  }

  showHelp() {
    // Show help modal or open help page
    chrome.runtime.sendMessage({ type: 'SHOW_HELP' });
  }

  showScrapedData(data) {
    // Show in a modal or copy to clipboard
    const json = JSON.stringify(data, null, 2);
    console.log('[10X.in] Scraped data:', data);

    // Copy to clipboard
    navigator.clipboard.writeText(json).then(() => {
      const count = Object.values(data).flat().length;
      this.showNotification(`Extracted ${count} items - copied to clipboard`, 'success');
    });
  }

  // ========== Recent Commands ==========

  addToRecent(command) {
    // Remove if already exists
    this.recentCommands = this.recentCommands.filter(c => c.id !== command.id);

    // Add to front
    this.recentCommands.unshift(command);

    // Trim
    if (this.recentCommands.length > this.maxRecentCommands) {
      this.recentCommands = this.recentCommands.slice(0, this.maxRecentCommands);
    }

    // Save
    this.saveRecentCommands();
  }

  clearRecentCommands() {
    this.recentCommands = [];
    this.saveRecentCommands();
    this.renderResults(this.inputElement.value);
  }

  saveRecentCommands() {
    const ids = this.recentCommands.map(c => c.id);
    localStorage.setItem('tenx_recent_commands', JSON.stringify(ids));
  }

  loadRecentCommands() {
    try {
      const ids = JSON.parse(localStorage.getItem('tenx_recent_commands') || '[]');
      this.recentCommands = ids
        .map(id => this.commands.find(c => c.id === id))
        .filter(Boolean);
    } catch (e) {
      this.recentCommands = [];
    }
  }

  // ========== Notifications ==========

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#6366f1'};
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      z-index: 99999999;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.2s ease-out;
    `;
    notification.textContent = message;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    notification.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideIn 0.2s ease-out reverse';
      setTimeout(() => notification.remove(), 200);
    }, 3000);
  }
}

// Create singleton
const commandPalette = new CommandPalette();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CommandPalette, commandPalette };
}

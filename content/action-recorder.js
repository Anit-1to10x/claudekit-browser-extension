/**
 * 10X.in Action Recorder
 * Record user actions and convert to replayable workflows
 */

class ActionRecorder {
  constructor() {
    this.isRecording = false;
    this.isPaused = false;
    this.actions = [];
    this.startTime = null;
    this.lastActionTime = null;

    // Debounce settings
    this.inputDebounceMs = 500;
    this.scrollDebounceMs = 200;

    // Pending states
    this.pendingInput = null;
    this.pendingInputTimeout = null;
    this.pendingScroll = null;
    this.pendingScrollTimeout = null;

    // Bound handlers for removal
    this.boundHandlers = {};

    // Recording UI element
    this.recordingUI = null;
  }

  /**
   * Start recording user actions
   */
  async startRecording() {
    if (this.isRecording) {
      console.warn('[ActionRecorder] Already recording');
      return;
    }

    this.isRecording = true;
    this.isPaused = false;
    this.actions = [];
    this.startTime = Date.now();
    this.lastActionTime = this.startTime;

    // Record initial state
    this.recordInitialState();

    // Add event listeners
    this.addEventListeners();

    // Show recording UI
    this.showRecordingUI();

    console.log('[ActionRecorder] Recording started');

    // Notify background
    this.notifyBackground('RECORDING_STARTED');
  }

  /**
   * Stop recording
   */
  async stopRecording() {
    if (!this.isRecording) return null;

    this.isRecording = false;
    this.isPaused = false;

    // Flush any pending actions
    this.flushPendingInput();
    this.flushPendingScroll();

    // Remove event listeners
    this.removeEventListeners();

    // Hide recording UI
    this.hideRecordingUI();

    // Optimize recorded actions
    const optimizedActions = this.optimizeActions(this.actions);

    console.log(`[ActionRecorder] Recording stopped. ${optimizedActions.length} actions captured.`);

    // Notify background
    this.notifyBackground('RECORDING_STOPPED', { actionCount: optimizedActions.length });

    return {
      actions: optimizedActions,
      duration: Date.now() - this.startTime,
      url: window.location.href,
      title: document.title
    };
  }

  /**
   * Pause recording
   */
  pauseRecording() {
    if (!this.isRecording) return;
    this.isPaused = true;
    this.updateRecordingUI();
    console.log('[ActionRecorder] Recording paused');
  }

  /**
   * Resume recording
   */
  resumeRecording() {
    if (!this.isRecording) return;
    this.isPaused = false;
    this.updateRecordingUI();
    console.log('[ActionRecorder] Recording resumed');
  }

  /**
   * Record initial page state
   */
  recordInitialState() {
    this.actions.push({
      type: 'NAVIGATE',
      url: window.location.href,
      title: document.title,
      timestamp: this.startTime,
      delay: 0
    });
  }

  /**
   * Add all event listeners
   */
  addEventListeners() {
    // Click events
    this.boundHandlers.click = this.handleClick.bind(this);
    document.addEventListener('click', this.boundHandlers.click, true);

    // Input events
    this.boundHandlers.input = this.handleInput.bind(this);
    document.addEventListener('input', this.boundHandlers.input, true);

    // Change events (for select, checkbox, radio)
    this.boundHandlers.change = this.handleChange.bind(this);
    document.addEventListener('change', this.boundHandlers.change, true);

    // Focus events
    this.boundHandlers.focus = this.handleFocus.bind(this);
    document.addEventListener('focus', this.boundHandlers.focus, true);

    // Submit events
    this.boundHandlers.submit = this.handleSubmit.bind(this);
    document.addEventListener('submit', this.boundHandlers.submit, true);

    // Scroll events
    this.boundHandlers.scroll = this.handleScroll.bind(this);
    window.addEventListener('scroll', this.boundHandlers.scroll, true);

    // Keyboard events (for special keys)
    this.boundHandlers.keydown = this.handleKeydown.bind(this);
    document.addEventListener('keydown', this.boundHandlers.keydown, true);

    // Navigation events
    this.boundHandlers.beforeUnload = this.handleBeforeUnload.bind(this);
    window.addEventListener('beforeunload', this.boundHandlers.beforeUnload);

    // Mutation observer for dynamic content
    this.setupMutationObserver();
  }

  /**
   * Remove all event listeners
   */
  removeEventListeners() {
    document.removeEventListener('click', this.boundHandlers.click, true);
    document.removeEventListener('input', this.boundHandlers.input, true);
    document.removeEventListener('change', this.boundHandlers.change, true);
    document.removeEventListener('focus', this.boundHandlers.focus, true);
    document.removeEventListener('submit', this.boundHandlers.submit, true);
    window.removeEventListener('scroll', this.boundHandlers.scroll, true);
    document.removeEventListener('keydown', this.boundHandlers.keydown, true);
    window.removeEventListener('beforeunload', this.boundHandlers.beforeUnload);

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
  }

  /**
   * Handle click events
   */
  handleClick(event) {
    if (this.isPaused || !this.isRecording) return;
    if (this.isRecordingUI(event.target)) return;

    const element = event.target;
    const action = {
      type: 'CLICK',
      timestamp: Date.now(),
      delay: this.calculateDelay(),
      element: this.describeElement(element),
      position: {
        x: event.clientX,
        y: event.clientY
      },
      button: event.button
    };

    // Flush any pending input before click
    this.flushPendingInput();

    this.recordAction(action);
  }

  /**
   * Handle input events (debounced)
   */
  handleInput(event) {
    if (this.isPaused || !this.isRecording) return;
    if (this.isRecordingUI(event.target)) return;

    const element = event.target;

    // Skip non-text inputs
    if (!this.isTextInput(element)) return;

    // Clear existing timeout
    if (this.pendingInputTimeout) {
      clearTimeout(this.pendingInputTimeout);
    }

    // Update pending input
    this.pendingInput = {
      type: 'TYPE',
      timestamp: this.pendingInput?.timestamp || Date.now(),
      delay: this.pendingInput?.delay || this.calculateDelay(),
      element: this.describeElement(element),
      value: element.value,
      inputType: element.type || 'text'
    };

    // Set debounce timeout
    this.pendingInputTimeout = setTimeout(() => {
      this.flushPendingInput();
    }, this.inputDebounceMs);
  }

  /**
   * Handle change events
   */
  handleChange(event) {
    if (this.isPaused || !this.isRecording) return;
    if (this.isRecordingUI(event.target)) return;

    const element = event.target;

    // Handle different input types
    if (element.type === 'checkbox' || element.type === 'radio') {
      this.recordAction({
        type: element.type === 'checkbox' ? 'CHECK' : 'SELECT_RADIO',
        timestamp: Date.now(),
        delay: this.calculateDelay(),
        element: this.describeElement(element),
        checked: element.checked,
        value: element.value
      });
    } else if (element.tagName === 'SELECT') {
      this.recordAction({
        type: 'SELECT',
        timestamp: Date.now(),
        delay: this.calculateDelay(),
        element: this.describeElement(element),
        value: element.value,
        selectedIndex: element.selectedIndex,
        selectedText: element.options[element.selectedIndex]?.text
      });
    }
  }

  /**
   * Handle focus events
   */
  handleFocus(event) {
    if (this.isPaused || !this.isRecording) return;
    if (this.isRecordingUI(event.target)) return;

    const element = event.target;

    // Only record focus on interactive elements
    if (this.isInteractive(element)) {
      this.recordAction({
        type: 'FOCUS',
        timestamp: Date.now(),
        delay: this.calculateDelay(),
        element: this.describeElement(element)
      });
    }
  }

  /**
   * Handle form submit events
   */
  handleSubmit(event) {
    if (this.isPaused || !this.isRecording) return;

    const form = event.target;

    // Flush pending input before submit
    this.flushPendingInput();

    this.recordAction({
      type: 'SUBMIT',
      timestamp: Date.now(),
      delay: this.calculateDelay(),
      element: this.describeElement(form),
      formData: this.extractFormData(form)
    });
  }

  /**
   * Handle scroll events (debounced)
   */
  handleScroll(event) {
    if (this.isPaused || !this.isRecording) return;

    if (this.pendingScrollTimeout) {
      clearTimeout(this.pendingScrollTimeout);
    }

    this.pendingScroll = {
      type: 'SCROLL',
      timestamp: this.pendingScroll?.timestamp || Date.now(),
      delay: this.pendingScroll?.delay || this.calculateDelay(),
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      target: event.target === document ? 'window' : this.describeElement(event.target)
    };

    this.pendingScrollTimeout = setTimeout(() => {
      this.flushPendingScroll();
    }, this.scrollDebounceMs);
  }

  /**
   * Handle keydown events (special keys only)
   */
  handleKeydown(event) {
    if (this.isPaused || !this.isRecording) return;
    if (this.isRecordingUI(event.target)) return;

    // Only record special keys
    const specialKeys = ['Enter', 'Tab', 'Escape', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

    if (specialKeys.includes(event.key) || event.ctrlKey || event.metaKey || event.altKey) {
      this.recordAction({
        type: 'KEYPRESS',
        timestamp: Date.now(),
        delay: this.calculateDelay(),
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        element: this.describeElement(event.target)
      });
    }
  }

  /**
   * Handle before unload (navigation)
   */
  handleBeforeUnload(event) {
    if (!this.isRecording) return;

    this.recordAction({
      type: 'NAVIGATE_AWAY',
      timestamp: Date.now(),
      delay: this.calculateDelay(),
      fromUrl: window.location.href
    });
  }

  /**
   * Setup mutation observer for dynamic content
   */
  setupMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      if (this.isPaused || !this.isRecording) return;

      // Track significant DOM changes
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check for modals, dialogs, overlays
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (this.isModal(node)) {
                this.recordAction({
                  type: 'MODAL_APPEARED',
                  timestamp: Date.now(),
                  delay: this.calculateDelay(),
                  element: this.describeElement(node)
                });
              }
            }
          }
        }
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Flush pending input action
   */
  flushPendingInput() {
    if (this.pendingInput) {
      this.recordAction(this.pendingInput);
      this.pendingInput = null;
    }
    if (this.pendingInputTimeout) {
      clearTimeout(this.pendingInputTimeout);
      this.pendingInputTimeout = null;
    }
  }

  /**
   * Flush pending scroll action
   */
  flushPendingScroll() {
    if (this.pendingScroll) {
      this.recordAction(this.pendingScroll);
      this.pendingScroll = null;
    }
    if (this.pendingScrollTimeout) {
      clearTimeout(this.pendingScrollTimeout);
      this.pendingScrollTimeout = null;
    }
  }

  /**
   * Record an action
   */
  recordAction(action) {
    this.actions.push(action);
    this.lastActionTime = action.timestamp;
    this.updateRecordingUI();

    console.log('[ActionRecorder] Recorded:', action.type);
  }

  /**
   * Calculate delay since last action
   */
  calculateDelay() {
    const now = Date.now();
    const delay = now - this.lastActionTime;
    return Math.min(delay, 10000); // Cap at 10 seconds
  }

  /**
   * Describe an element for replay
   */
  describeElement(element) {
    if (!element || !element.tagName) return null;

    const description = {
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: Array.from(element.classList).filter(c => !c.match(/^(active|hover|focus|selected)/i)),
      text: this.getElementText(element),
      attributes: {}
    };

    // Important attributes for finding elements
    const importantAttrs = ['name', 'type', 'placeholder', 'aria-label', 'data-testid', 'role', 'href', 'src'];
    for (const attr of importantAttrs) {
      const value = element.getAttribute(attr);
      if (value) description.attributes[attr] = value;
    }

    // Generate selectors
    description.selectors = this.generateSelectors(element);

    // Position info for visual fallback
    const rect = element.getBoundingClientRect();
    description.position = {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };

    // Parent context for better identification
    if (element.parentElement) {
      description.parentContext = {
        tagName: element.parentElement.tagName.toLowerCase(),
        id: element.parentElement.id || null,
        class: element.parentElement.className?.split(' ')[0] || null
      };
    }

    return description;
  }

  /**
   * Get meaningful text from element
   */
  getElementText(element) {
    // For inputs, get placeholder or label
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      const label = document.querySelector(`label[for="${element.id}"]`);
      return label?.textContent?.trim() || element.placeholder || null;
    }

    // For buttons and links, get text content
    const text = (element.innerText || element.textContent || '').trim();
    return text.length < 100 ? text : text.substring(0, 100);
  }

  /**
   * Generate multiple selectors for an element
   */
  generateSelectors(element) {
    const selectors = [];

    // By ID
    if (element.id) {
      selectors.push({ type: 'id', value: `#${CSS.escape(element.id)}`, priority: 1 });
    }

    // By data-testid
    const testId = element.getAttribute('data-testid');
    if (testId) {
      selectors.push({ type: 'testId', value: `[data-testid="${testId}"]`, priority: 2 });
    }

    // By aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      selectors.push({ type: 'aria', value: `[aria-label="${ariaLabel}"]`, priority: 3 });
    }

    // By name attribute
    const name = element.getAttribute('name');
    if (name) {
      selectors.push({ type: 'name', value: `[name="${name}"]`, priority: 3 });
    }

    // By class combination
    if (element.classList.length > 0) {
      const classes = Array.from(element.classList)
        .filter(c => !c.match(/^(active|hover|focus|selected|ng-|_)/i))
        .slice(0, 3);
      if (classes.length > 0) {
        selectors.push({
          type: 'class',
          value: classes.map(c => `.${CSS.escape(c)}`).join(''),
          priority: 4
        });
      }
    }

    // CSS path
    selectors.push({
      type: 'cssPath',
      value: this.generateCSSPath(element),
      priority: 5
    });

    // XPath
    selectors.push({
      type: 'xpath',
      value: this.generateXPath(element),
      priority: 6
    });

    return selectors.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate CSS path for element
   */
  generateCSSPath(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body && path.length < 5) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = `#${CSS.escape(current.id)}`;
        path.unshift(selector);
        break;
      }

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

  /**
   * Generate XPath for element
   */
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

  /**
   * Extract form data
   */
  extractFormData(form) {
    const formData = {};
    const elements = form.querySelectorAll('input, select, textarea');

    for (const el of elements) {
      const name = el.name || el.id;
      if (!name) continue;

      if (el.type === 'password') {
        formData[name] = '***'; // Don't record passwords
      } else if (el.type === 'checkbox') {
        formData[name] = el.checked;
      } else if (el.type === 'radio') {
        if (el.checked) formData[name] = el.value;
      } else {
        formData[name] = el.value;
      }
    }

    return formData;
  }

  /**
   * Optimize recorded actions
   */
  optimizeActions(actions) {
    const optimized = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const prevAction = optimized[optimized.length - 1];

      // Skip duplicate navigations
      if (action.type === 'NAVIGATE' && prevAction?.type === 'NAVIGATE' && action.url === prevAction.url) {
        continue;
      }

      // Merge consecutive scrolls
      if (action.type === 'SCROLL' && prevAction?.type === 'SCROLL' && action.delay < 500) {
        prevAction.scrollX = action.scrollX;
        prevAction.scrollY = action.scrollY;
        continue;
      }

      // Skip focus if immediately followed by click on same element
      if (action.type === 'FOCUS' && i + 1 < actions.length) {
        const nextAction = actions[i + 1];
        if (nextAction.type === 'CLICK' && this.isSameElement(action.element, nextAction.element)) {
          continue;
        }
      }

      // Skip very short delays in type actions
      if (action.type === 'TYPE' && action.delay < 100) {
        action.delay = 0;
      }

      optimized.push(action);
    }

    return optimized;
  }

  /**
   * Check if two element descriptions match
   */
  isSameElement(desc1, desc2) {
    if (!desc1 || !desc2) return false;

    // Check by ID
    if (desc1.id && desc1.id === desc2.id) return true;

    // Check by selectors
    if (desc1.selectors && desc2.selectors) {
      const sel1 = desc1.selectors[0]?.value;
      const sel2 = desc2.selectors[0]?.value;
      if (sel1 && sel1 === sel2) return true;
    }

    return false;
  }

  /**
   * Check if element is a text input
   */
  isTextInput(element) {
    if (element.tagName === 'TEXTAREA') return true;
    if (element.tagName === 'INPUT') {
      const type = element.type?.toLowerCase();
      return ['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(type);
    }
    if (element.contentEditable === 'true') return true;
    return false;
  }

  /**
   * Check if element is interactive
   */
  isInteractive(element) {
    const interactiveTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'];
    return interactiveTags.includes(element.tagName) ||
           element.getAttribute('role') === 'button' ||
           element.getAttribute('tabindex') !== null;
  }

  /**
   * Check if element is a modal/dialog
   */
  isModal(element) {
    const className = element.className?.toLowerCase() || '';
    const role = element.getAttribute('role');
    return className.includes('modal') ||
           className.includes('dialog') ||
           className.includes('overlay') ||
           className.includes('popup') ||
           role === 'dialog' ||
           role === 'alertdialog';
  }

  /**
   * Check if element is part of recording UI
   */
  isRecordingUI(element) {
    return element.closest('#tenx-recording-ui') !== null;
  }

  /**
   * Convert recorded actions to workflow format
   */
  convertToWorkflow(name = 'Recorded Workflow') {
    return {
      name,
      description: `Recorded on ${new Date().toLocaleString()} from ${window.location.hostname}`,
      steps: this.actions.map((action, index) => ({
        id: `step_${index}`,
        action: this.mapActionType(action.type),
        params: this.extractActionParams(action),
        delay: action.delay,
        optional: false
      })),
      variables: [],
      settings: {
        timeout: 300000,
        retryOnError: true,
        maxRetries: 3
      },
      metadata: {
        recordedFrom: window.location.href,
        recordedAt: this.startTime,
        duration: Date.now() - this.startTime,
        actionCount: this.actions.length
      }
    };
  }

  /**
   * Map recorded action type to workflow action type
   */
  mapActionType(type) {
    const mapping = {
      'CLICK': 'click',
      'TYPE': 'type',
      'SELECT': 'select',
      'CHECK': 'check',
      'SELECT_RADIO': 'selectRadio',
      'SUBMIT': 'submit',
      'SCROLL': 'scroll',
      'NAVIGATE': 'navigate',
      'KEYPRESS': 'keypress',
      'FOCUS': 'focus'
    };
    return mapping[type] || type.toLowerCase();
  }

  /**
   * Extract params from recorded action
   */
  extractActionParams(action) {
    const params = {};

    if (action.element) {
      params.selector = action.element.selectors?.[0]?.value;
      params.element = action.element;
    }

    switch (action.type) {
      case 'TYPE':
        params.text = action.value;
        break;
      case 'SELECT':
        params.value = action.value;
        break;
      case 'CHECK':
      case 'SELECT_RADIO':
        params.checked = action.checked;
        params.value = action.value;
        break;
      case 'SCROLL':
        params.x = action.scrollX;
        params.y = action.scrollY;
        break;
      case 'NAVIGATE':
        params.url = action.url;
        break;
      case 'KEYPRESS':
        params.key = action.key;
        params.modifiers = {
          ctrl: action.ctrlKey,
          meta: action.metaKey,
          alt: action.altKey,
          shift: action.shiftKey
        };
        break;
    }

    return params;
  }

  // ========== Recording UI ==========

  showRecordingUI() {
    if (this.recordingUI) return;

    this.recordingUI = document.createElement('div');
    this.recordingUI.id = 'tenx-recording-ui';
    this.recordingUI.innerHTML = `
      <style>
        #tenx-recording-ui {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #1a1a2e;
          color: white;
          padding: 12px 16px;
          border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 14px;
          z-index: 999999;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          gap: 12px;
          user-select: none;
          cursor: move;
        }
        #tenx-recording-ui .recording-dot {
          width: 12px;
          height: 12px;
          background: #ff4444;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }
        #tenx-recording-ui.paused .recording-dot {
          background: #ffa500;
          animation: none;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        #tenx-recording-ui .action-count {
          background: rgba(255,255,255,0.1);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
        }
        #tenx-recording-ui button {
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        }
        #tenx-recording-ui button:hover {
          background: rgba(255,255,255,0.2);
        }
        #tenx-recording-ui button.stop {
          background: #ff4444;
        }
        #tenx-recording-ui button.stop:hover {
          background: #ff6666;
        }
      </style>
      <div class="recording-dot"></div>
      <span class="status">Recording</span>
      <span class="action-count">0 actions</span>
      <button class="pause">Pause</button>
      <button class="stop">Stop</button>
    `;

    // Make draggable
    this.makeDraggable(this.recordingUI);

    // Add button handlers
    this.recordingUI.querySelector('.pause').addEventListener('click', () => {
      if (this.isPaused) {
        this.resumeRecording();
      } else {
        this.pauseRecording();
      }
    });

    this.recordingUI.querySelector('.stop').addEventListener('click', () => {
      this.stopRecording();
    });

    document.body.appendChild(this.recordingUI);
  }

  hideRecordingUI() {
    if (this.recordingUI) {
      this.recordingUI.remove();
      this.recordingUI = null;
    }
  }

  updateRecordingUI() {
    if (!this.recordingUI) return;

    const countEl = this.recordingUI.querySelector('.action-count');
    const statusEl = this.recordingUI.querySelector('.status');
    const pauseBtn = this.recordingUI.querySelector('.pause');

    countEl.textContent = `${this.actions.length} actions`;

    if (this.isPaused) {
      statusEl.textContent = 'Paused';
      pauseBtn.textContent = 'Resume';
      this.recordingUI.classList.add('paused');
    } else {
      statusEl.textContent = 'Recording';
      pauseBtn.textContent = 'Pause';
      this.recordingUI.classList.remove('paused');
    }
  }

  makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    element.onmousedown = (e) => {
      if (e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDrag;
      document.onmousemove = elementDrag;
    };

    const elementDrag = (e) => {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
      element.style.right = 'auto';
    };

    const closeDrag = () => {
      document.onmouseup = null;
      document.onmousemove = null;
    };
  }

  /**
   * Notify background script
   */
  notifyBackground(type, data = {}) {
    try {
      chrome.runtime.sendMessage({ type, ...data });
    } catch (e) {
      console.debug('[ActionRecorder] Failed to notify background:', e);
    }
  }

  /**
   * Get recording status
   */
  getStatus() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      actionCount: this.actions.length,
      duration: this.startTime ? Date.now() - this.startTime : 0
    };
  }
}

// Create singleton
const actionRecorder = new ActionRecorder();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ActionRecorder, actionRecorder };
}

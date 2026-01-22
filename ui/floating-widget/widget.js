/**
 * 10X.in Floating Widget
 * Always-visible minimal control
 */

class FloatingWidget {
  constructor() {
    this.isExpanded = false;
    this.isRecording = false;
    this.isDragging = false;
    this.element = null;
    this.position = { x: null, y: null };

    // Dependencies
    this.actionRecorder = null;
    this.commandPalette = null;
  }

  /**
   * Initialize the widget
   */
  initialize(dependencies = {}) {
    this.actionRecorder = dependencies.actionRecorder;
    this.commandPalette = dependencies.commandPalette;

    this.loadPosition();
    this.createWidget();
    this.setupEventListeners();
    this.startStatusCheck();

    console.log('[FloatingWidget] Initialized');
  }

  /**
   * Create the widget DOM element
   */
  createWidget() {
    this.element = document.createElement('div');
    this.element.id = 'tenx-floating-widget';
    this.element.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="widget-collapsed">
        <div class="widget-logo">10X</div>
      </div>
      <div class="widget-expanded">
        <div class="widget-header">
          <span class="widget-title">10X</span>
          <div class="widget-controls">
            <button class="widget-btn record-btn" title="Record">⏺</button>
            <button class="widget-btn play-btn" title="Run Workflow">▶</button>
            <button class="widget-btn scrape-btn" title="Scrape Page">⬇</button>
            <button class="widget-btn settings-btn" title="Settings">⚙</button>
            <button class="widget-btn collapse-btn" title="Collapse">✕</button>
          </div>
        </div>
        <div class="widget-body">
          <div class="widget-status">
            <span class="status-dot connected"></span>
            <span class="status-text">Ready</span>
          </div>
          <div class="widget-actions"></div>
        </div>
        <div class="widget-footer">
          <span class="keyboard-hint">⌘⇧K Command Palette</span>
        </div>
      </div>
    `;

    // Set position
    if (this.position.x !== null && this.position.y !== null) {
      this.element.style.left = `${this.position.x}px`;
      this.element.style.top = `${this.position.y}px`;
      this.element.style.right = 'auto';
    }

    document.body.appendChild(this.element);
  }

  /**
   * Get CSS styles
   */
  getStyles() {
    return `
      #tenx-floating-widget {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999998;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        user-select: none;
      }

      #tenx-floating-widget .widget-collapsed {
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      #tenx-floating-widget .widget-collapsed:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 25px rgba(99, 102, 241, 0.5);
      }

      #tenx-floating-widget .widget-logo {
        color: white;
        font-weight: 700;
        font-size: 12px;
        letter-spacing: -0.5px;
      }

      #tenx-floating-widget .widget-expanded {
        display: none;
        width: 280px;
        background: #1a1a2e;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        overflow: hidden;
      }

      #tenx-floating-widget.expanded .widget-collapsed {
        display: none;
      }

      #tenx-floating-widget.expanded .widget-expanded {
        display: block;
        animation: expandIn 0.2s ease-out;
      }

      @keyframes expandIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      #tenx-floating-widget .widget-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        cursor: move;
      }

      #tenx-floating-widget .widget-title {
        font-weight: 700;
        color: white;
        font-size: 14px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      #tenx-floating-widget .widget-controls {
        display: flex;
        gap: 4px;
      }

      #tenx-floating-widget .widget-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: white;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.1s;
      }

      #tenx-floating-widget .widget-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      #tenx-floating-widget .widget-btn.active {
        background: rgba(239, 68, 68, 0.3);
        color: #ef4444;
      }

      #tenx-floating-widget .record-btn.recording {
        background: rgba(239, 68, 68, 0.3);
        color: #ef4444;
        animation: pulse 1s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      #tenx-floating-widget .widget-body {
        padding: 12px 16px;
      }

      #tenx-floating-widget .widget-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        margin-bottom: 12px;
      }

      #tenx-floating-widget .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #6b7280;
      }

      #tenx-floating-widget .status-dot.connected {
        background: #10b981;
      }

      #tenx-floating-widget .status-dot.recording {
        background: #ef4444;
        animation: pulse 1s infinite;
      }

      #tenx-floating-widget .status-dot.error {
        background: #ef4444;
      }

      #tenx-floating-widget .status-text {
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
      }

      #tenx-floating-widget .widget-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      #tenx-floating-widget .action-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.1s;
      }

      #tenx-floating-widget .action-item:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      #tenx-floating-widget .action-icon {
        font-size: 16px;
      }

      #tenx-floating-widget .action-text {
        flex: 1;
        color: white;
        font-size: 13px;
      }

      #tenx-floating-widget .action-badge {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 8px;
        border-radius: 10px;
      }

      #tenx-floating-widget .widget-footer {
        padding: 10px 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
      }

      #tenx-floating-widget .keyboard-hint {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
      }

      #tenx-floating-widget .recording-indicator {
        display: none;
        padding: 12px 16px;
        background: rgba(239, 68, 68, 0.1);
        border-top: 1px solid rgba(239, 68, 68, 0.2);
      }

      #tenx-floating-widget.recording .recording-indicator {
        display: block;
      }

      #tenx-floating-widget .recording-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      #tenx-floating-widget .recording-label {
        color: #ef4444;
        font-size: 12px;
        font-weight: 500;
      }

      #tenx-floating-widget .recording-count {
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
      }

      #tenx-floating-widget .recording-actions {
        display: flex;
        gap: 8px;
      }

      #tenx-floating-widget .recording-actions button {
        flex: 1;
        padding: 6px 12px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: opacity 0.1s;
      }

      #tenx-floating-widget .recording-actions button:hover {
        opacity: 0.9;
      }

      #tenx-floating-widget .btn-stop {
        background: #ef4444;
        color: white;
      }

      #tenx-floating-widget .btn-pause {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      /* Mini mode for recording */
      #tenx-floating-widget.mini .widget-expanded {
        width: auto;
      }

      #tenx-floating-widget.mini .widget-body,
      #tenx-floating-widget.mini .widget-footer {
        display: none;
      }
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Collapsed state - expand on click
    const collapsed = this.element.querySelector('.widget-collapsed');
    collapsed.addEventListener('click', () => this.expand());

    // Header drag
    const header = this.element.querySelector('.widget-header');
    this.setupDrag(header);

    // Collapsed state drag
    this.setupDrag(collapsed);

    // Control buttons
    this.element.querySelector('.collapse-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.collapse();
    });

    this.element.querySelector('.record-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleRecording();
    });

    this.element.querySelector('.play-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.runLastWorkflow();
    });

    this.element.querySelector('.scrape-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.scrapePage();
    });

    this.element.querySelector('.settings-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openSettings();
    });

    // Keyboard hint click
    this.element.querySelector('.keyboard-hint').addEventListener('click', () => {
      if (this.commandPalette) {
        this.commandPalette.open();
      }
    });
  }

  /**
   * Setup drag functionality
   */
  setupDrag(handle) {
    let startX, startY, startLeft, startTop;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;

      this.isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.element.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    const onMouseMove = (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;

      // Keep within viewport
      const rect = this.element.getBoundingClientRect();
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - rect.width));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - rect.height));

      this.element.style.left = `${newLeft}px`;
      this.element.style.top = `${newTop}px`;
      this.element.style.right = 'auto';

      this.position = { x: newLeft, y: newTop };
    };

    const onMouseUp = () => {
      this.isDragging = false;
      this.savePosition();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  /**
   * Expand the widget
   */
  expand() {
    this.isExpanded = true;
    this.element.classList.add('expanded');
    this.updateStatus();
    this.updateActions();
  }

  /**
   * Collapse the widget
   */
  collapse() {
    this.isExpanded = false;
    this.element.classList.remove('expanded');
  }

  /**
   * Toggle recording
   */
  async toggleRecording() {
    if (this.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  /**
   * Start recording
   */
  async startRecording() {
    this.isRecording = true;
    this.element.classList.add('recording');
    this.element.querySelector('.record-btn').classList.add('recording');

    if (this.actionRecorder) {
      await this.actionRecorder.startRecording();
    } else {
      chrome.runtime.sendMessage({ type: 'START_RECORDING' });
    }

    this.updateStatus('Recording...', 'recording');
    this.showRecordingUI();
  }

  /**
   * Stop recording
   */
  async stopRecording() {
    this.isRecording = false;
    this.element.classList.remove('recording');
    this.element.querySelector('.record-btn').classList.remove('recording');

    let result = null;
    if (this.actionRecorder) {
      result = await this.actionRecorder.stopRecording();
    } else {
      chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    }

    this.updateStatus('Ready', 'connected');
    this.hideRecordingUI();

    if (result) {
      this.showNotification(`Recorded ${result.actions.length} actions`);
    }
  }

  /**
   * Show recording UI in widget
   */
  showRecordingUI() {
    // Add recording indicator to body
    let indicator = this.element.querySelector('.recording-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'recording-indicator';
      indicator.innerHTML = `
        <div class="recording-info">
          <span class="recording-label">⏺ Recording</span>
          <span class="recording-count">0 actions</span>
        </div>
        <div class="recording-actions">
          <button class="btn-pause">Pause</button>
          <button class="btn-stop">Stop</button>
        </div>
      `;

      indicator.querySelector('.btn-stop').addEventListener('click', () => this.stopRecording());
      indicator.querySelector('.btn-pause').addEventListener('click', () => this.togglePauseRecording());

      this.element.querySelector('.widget-expanded').appendChild(indicator);
    }

    // Start updating count
    this.recordingUpdateInterval = setInterval(() => {
      if (this.actionRecorder) {
        const count = this.actionRecorder.actions?.length || 0;
        const countEl = this.element.querySelector('.recording-count');
        if (countEl) countEl.textContent = `${count} actions`;
      }
    }, 500);
  }

  /**
   * Hide recording UI
   */
  hideRecordingUI() {
    if (this.recordingUpdateInterval) {
      clearInterval(this.recordingUpdateInterval);
    }

    const indicator = this.element.querySelector('.recording-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Toggle pause recording
   */
  togglePauseRecording() {
    if (this.actionRecorder) {
      if (this.actionRecorder.isPaused) {
        this.actionRecorder.resumeRecording();
        this.element.querySelector('.btn-pause').textContent = 'Pause';
      } else {
        this.actionRecorder.pauseRecording();
        this.element.querySelector('.btn-pause').textContent = 'Resume';
      }
    }
  }

  /**
   * Run last workflow
   */
  runLastWorkflow() {
    chrome.runtime.sendMessage({ type: 'RUN_LAST_WORKFLOW' });
    this.showNotification('Running workflow...');
  }

  /**
   * Scrape page
   */
  async scrapePage() {
    chrome.runtime.sendMessage({ type: 'SCRAPE_PAGE' }, (response) => {
      if (response?.data) {
        const count = Object.values(response.data).flat().length;
        this.showNotification(`Extracted ${count} items`);
      }
    });
  }

  /**
   * Open settings
   */
  openSettings() {
    chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
  }

  /**
   * Update status display
   */
  updateStatus(text = 'Ready', state = 'connected') {
    const statusDot = this.element.querySelector('.status-dot');
    const statusText = this.element.querySelector('.status-text');

    statusDot.className = `status-dot ${state}`;
    statusText.textContent = text;
  }

  /**
   * Update quick actions
   */
  updateActions() {
    const container = this.element.querySelector('.widget-actions');

    // Get recent workflows or suggestions
    chrome.runtime.sendMessage({ type: 'GET_RECENT_WORKFLOWS' }, (response) => {
      const workflows = response?.workflows || [];

      if (workflows.length === 0) {
        container.innerHTML = `
          <div class="action-item" onclick="floatingWidget.openCommandPalette()">
            <span class="action-icon">🚀</span>
            <span class="action-text">Get Started</span>
          </div>
        `;
        return;
      }

      container.innerHTML = workflows.slice(0, 3).map(wf => `
        <div class="action-item" data-workflow-id="${wf.id}">
          <span class="action-icon">▶</span>
          <span class="action-text">${wf.name}</span>
          <span class="action-badge">${wf.statistics?.runCount || 0} runs</span>
        </div>
      `).join('');

      // Add click handlers
      container.querySelectorAll('.action-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.workflowId;
          chrome.runtime.sendMessage({ type: 'RUN_WORKFLOW', workflowId: id });
          this.showNotification('Running workflow...');
        });
      });
    });
  }

  /**
   * Open command palette
   */
  openCommandPalette() {
    if (this.commandPalette) {
      this.commandPalette.open();
    }
  }

  /**
   * Start periodic status check
   */
  startStatusCheck() {
    setInterval(() => {
      chrome.runtime.sendMessage({ type: 'GET_CONNECTION_STATUS' }, (response) => {
        if (chrome.runtime.lastError) {
          this.updateStatus('Disconnected', 'error');
          return;
        }

        if (this.isRecording) {
          // Don't override recording status
          return;
        }

        if (response?.connected) {
          this.updateStatus('Connected', 'connected');
        } else {
          this.updateStatus('Disconnected', 'error');
        }
      });
    }, 5000);
  }

  /**
   * Show notification
   */
  showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: #1a1a2e;
      color: white;
      padding: 10px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      z-index: 9999999;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.2s ease-out;
    `;
    notification.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
      ${message}
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideIn 0.2s ease-out reverse';
      setTimeout(() => notification.remove(), 200);
    }, 2000);
  }

  /**
   * Save position to storage
   */
  savePosition() {
    localStorage.setItem('tenx_widget_position', JSON.stringify(this.position));
  }

  /**
   * Load position from storage
   */
  loadPosition() {
    try {
      const saved = localStorage.getItem('tenx_widget_position');
      if (saved) {
        this.position = JSON.parse(saved);
      }
    } catch (e) {
      this.position = { x: null, y: null };
    }
  }

  /**
   * Destroy the widget
   */
  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

// Create singleton
const floatingWidget = new FloatingWidget();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FloatingWidget, floatingWidget };
}

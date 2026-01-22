/**
 * 10X.in Element Highlighter
 * Visual element selection and highlighting
 */

class ElementHighlighter {
  constructor() {
    this.isActive = false;
    this.selectedElement = null;
    this.hoveredElement = null;
    this.overlay = null;
    this.tooltip = null;
    this.selectionCallback = null;

    // Bound handlers for removal
    this.boundHandlers = {};
  }

  /**
   * Start element selection mode
   * @param {Function} callback - Called when element is selected
   */
  startSelection(callback) {
    if (this.isActive) return;

    this.isActive = true;
    this.selectionCallback = callback;

    this.createOverlay();
    this.createTooltip();
    this.addEventListeners();

    console.log('[ElementHighlighter] Selection mode started');
  }

  /**
   * Stop element selection mode
   */
  stopSelection() {
    if (!this.isActive) return;

    this.isActive = false;
    this.selectionCallback = null;

    this.removeEventListeners();
    this.removeOverlay();
    this.removeTooltip();
    this.clearHighlight();

    console.log('[ElementHighlighter] Selection mode stopped');
  }

  /**
   * Create the highlight overlay
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'tenx-highlight-overlay';
    this.overlay.innerHTML = `
      <style>
        #tenx-highlight-overlay {
          position: fixed;
          pointer-events: none;
          z-index: 9999990;
          border: 2px solid #6366f1;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 4px;
          transition: all 0.1s ease-out;
          display: none;
        }

        #tenx-highlight-overlay.active {
          display: block;
        }

        #tenx-highlight-overlay::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          border: 2px solid rgba(99, 102, 241, 0.5);
          border-radius: 6px;
          animation: pulse-border 1s infinite;
        }

        @keyframes pulse-border {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .tenx-highlight-corners {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #6366f1;
          border-radius: 2px;
        }

        .tenx-highlight-corners.top-left { top: -4px; left: -4px; }
        .tenx-highlight-corners.top-right { top: -4px; right: -4px; }
        .tenx-highlight-corners.bottom-left { bottom: -4px; left: -4px; }
        .tenx-highlight-corners.bottom-right { bottom: -4px; right: -4px; }
      </style>
      <div class="tenx-highlight-corners top-left"></div>
      <div class="tenx-highlight-corners top-right"></div>
      <div class="tenx-highlight-corners bottom-left"></div>
      <div class="tenx-highlight-corners bottom-right"></div>
    `;

    document.body.appendChild(this.overlay);
  }

  /**
   * Remove the overlay
   */
  removeOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  /**
   * Create the tooltip
   */
  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'tenx-element-tooltip';
    this.tooltip.innerHTML = `
      <style>
        #tenx-element-tooltip {
          position: fixed;
          z-index: 9999991;
          background: #1a1a2e;
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          pointer-events: none;
          display: none;
          max-width: 300px;
        }

        #tenx-element-tooltip.visible {
          display: block;
        }

        #tenx-element-tooltip .tooltip-tag {
          color: #a78bfa;
          font-weight: 600;
        }

        #tenx-element-tooltip .tooltip-id {
          color: #f472b6;
        }

        #tenx-element-tooltip .tooltip-class {
          color: #34d399;
        }

        #tenx-element-tooltip .tooltip-text {
          color: rgba(255, 255, 255, 0.7);
          font-style: italic;
          margin-top: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        #tenx-element-tooltip .tooltip-hint {
          color: rgba(255, 255, 255, 0.4);
          margin-top: 6px;
          font-size: 11px;
        }
      </style>
      <div class="tooltip-content"></div>
    `;

    document.body.appendChild(this.tooltip);
  }

  /**
   * Remove the tooltip
   */
  removeTooltip() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }

  /**
   * Add event listeners
   */
  addEventListeners() {
    this.boundHandlers.mousemove = this.handleMouseMove.bind(this);
    this.boundHandlers.click = this.handleClick.bind(this);
    this.boundHandlers.keydown = this.handleKeydown.bind(this);
    this.boundHandlers.scroll = this.handleScroll.bind(this);

    document.addEventListener('mousemove', this.boundHandlers.mousemove, true);
    document.addEventListener('click', this.boundHandlers.click, true);
    document.addEventListener('keydown', this.boundHandlers.keydown, true);
    window.addEventListener('scroll', this.boundHandlers.scroll, true);
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    document.removeEventListener('mousemove', this.boundHandlers.mousemove, true);
    document.removeEventListener('click', this.boundHandlers.click, true);
    document.removeEventListener('keydown', this.boundHandlers.keydown, true);
    window.removeEventListener('scroll', this.boundHandlers.scroll, true);
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(e) {
    if (!this.isActive) return;

    const element = document.elementFromPoint(e.clientX, e.clientY);

    // Ignore our own elements
    if (this.isOwnElement(element)) return;

    if (element !== this.hoveredElement) {
      this.hoveredElement = element;
      this.highlightElement(element);
      this.updateTooltip(element, e.clientX, e.clientY);
    }
  }

  /**
   * Handle click
   */
  handleClick(e) {
    if (!this.isActive) return;

    const element = document.elementFromPoint(e.clientX, e.clientY);

    // Ignore our own elements
    if (this.isOwnElement(element)) return;

    e.preventDefault();
    e.stopPropagation();

    this.selectedElement = element;

    if (this.selectionCallback) {
      this.selectionCallback(element, this.getElementInfo(element));
    }

    // Optionally stop selection after click
    // this.stopSelection();
  }

  /**
   * Handle keydown
   */
  handleKeydown(e) {
    if (!this.isActive) return;

    if (e.key === 'Escape') {
      this.stopSelection();
    }

    // Arrow keys to move selection
    if (this.hoveredElement && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();

      let newElement = null;

      switch (e.key) {
        case 'ArrowUp':
          newElement = this.hoveredElement.parentElement;
          break;
        case 'ArrowDown':
          newElement = this.hoveredElement.firstElementChild;
          break;
        case 'ArrowLeft':
          newElement = this.hoveredElement.previousElementSibling;
          break;
        case 'ArrowRight':
          newElement = this.hoveredElement.nextElementSibling;
          break;
      }

      if (newElement && !this.isOwnElement(newElement)) {
        this.hoveredElement = newElement;
        this.highlightElement(newElement);
        this.updateTooltipPosition(newElement);
      }
    }

    // Enter to select
    if (e.key === 'Enter' && this.hoveredElement) {
      this.selectedElement = this.hoveredElement;
      if (this.selectionCallback) {
        this.selectionCallback(this.hoveredElement, this.getElementInfo(this.hoveredElement));
      }
    }
  }

  /**
   * Handle scroll
   */
  handleScroll() {
    if (this.hoveredElement) {
      this.highlightElement(this.hoveredElement);
    }
  }

  /**
   * Highlight an element
   */
  highlightElement(element) {
    if (!element || !this.overlay) return;

    const rect = element.getBoundingClientRect();

    this.overlay.style.left = `${rect.left}px`;
    this.overlay.style.top = `${rect.top}px`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;
    this.overlay.classList.add('active');
  }

  /**
   * Clear highlight
   */
  clearHighlight() {
    if (this.overlay) {
      this.overlay.classList.remove('active');
    }
    this.hoveredElement = null;
  }

  /**
   * Update tooltip content and position
   */
  updateTooltip(element, x, y) {
    if (!element || !this.tooltip) return;

    const content = this.tooltip.querySelector('.tooltip-content');
    const info = this.getElementInfo(element);

    let html = `<span class="tooltip-tag">&lt;${info.tagName}&gt;</span>`;

    if (info.id) {
      html += `<span class="tooltip-id">#${info.id}</span>`;
    }

    if (info.classes.length > 0) {
      html += `<span class="tooltip-class">.${info.classes.slice(0, 3).join('.')}</span>`;
    }

    if (info.text) {
      html += `<div class="tooltip-text">"${info.text}"</div>`;
    }

    html += `<div class="tooltip-hint">Click to select • Esc to cancel • ↑↓ navigate</div>`;

    content.innerHTML = html;

    // Position tooltip
    this.positionTooltip(x, y);
    this.tooltip.classList.add('visible');
  }

  /**
   * Update tooltip position
   */
  updateTooltipPosition(element) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    this.positionTooltip(rect.right + 10, rect.top);
  }

  /**
   * Position tooltip avoiding edges
   */
  positionTooltip(x, y) {
    if (!this.tooltip) return;

    const tooltipRect = this.tooltip.getBoundingClientRect();
    const padding = 10;

    let left = x + padding;
    let top = y + padding;

    // Avoid right edge
    if (left + 300 > window.innerWidth) {
      left = x - 300 - padding;
    }

    // Avoid bottom edge
    if (top + tooltipRect.height > window.innerHeight) {
      top = window.innerHeight - tooltipRect.height - padding;
    }

    // Avoid top edge
    if (top < 0) {
      top = padding;
    }

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  /**
   * Get element information
   */
  getElementInfo(element) {
    if (!element) return null;

    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: Array.from(element.classList),
      text: this.getElementText(element),
      attributes: this.getImportantAttributes(element),
      rect: element.getBoundingClientRect(),
      selector: this.generateSelector(element),
      xpath: this.generateXPath(element)
    };
  }

  /**
   * Get element text (truncated)
   */
  getElementText(element) {
    const text = (element.innerText || element.textContent || '').trim();
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  }

  /**
   * Get important attributes
   */
  getImportantAttributes(element) {
    const attrs = {};
    const important = ['name', 'type', 'placeholder', 'aria-label', 'data-testid', 'role', 'href', 'src'];

    for (const attr of important) {
      const value = element.getAttribute(attr);
      if (value) attrs[attr] = value;
    }

    return attrs;
  }

  /**
   * Generate CSS selector
   */
  generateSelector(element) {
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    const path = [];
    let current = element;

    while (current && current !== document.body && path.length < 4) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = `#${CSS.escape(current.id)}`;
        path.unshift(selector);
        break;
      }

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/)
          .filter(c => c && !c.match(/^(active|hover|focus|selected)/i))
          .slice(0, 2);
        if (classes.length > 0) {
          selector += '.' + classes.map(c => CSS.escape(c)).join('.');
        }
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
   * Generate XPath
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

      path.unshift(`${current.tagName.toLowerCase()}[${index}]`);
      current = current.parentElement;
    }

    return '/' + path.join('/');
  }

  /**
   * Check if element is our own UI
   */
  isOwnElement(element) {
    if (!element) return true;
    return element.closest('#tenx-highlight-overlay') ||
           element.closest('#tenx-element-tooltip') ||
           element.closest('#tenx-command-palette') ||
           element.closest('#tenx-floating-widget') ||
           element.closest('#tenx-recording-ui');
  }

  /**
   * Highlight multiple elements
   */
  highlightMultiple(elements) {
    // Remove existing multi-highlights
    document.querySelectorAll('.tenx-multi-highlight').forEach(el => el.remove());

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const highlight = document.createElement('div');
      highlight.className = 'tenx-multi-highlight';
      highlight.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 2px solid #10b981;
        background: rgba(16, 185, 129, 0.1);
        pointer-events: none;
        z-index: 9999989;
        border-radius: 4px;
      `;
      document.body.appendChild(highlight);
    }
  }

  /**
   * Clear multiple highlights
   */
  clearMultiHighlights() {
    document.querySelectorAll('.tenx-multi-highlight').forEach(el => el.remove());
  }

  /**
   * Flash an element (for confirmation)
   */
  flashElement(element, color = '#10b981') {
    const rect = element.getBoundingClientRect();
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background: ${color};
      pointer-events: none;
      z-index: 9999999;
      animation: flash-out 0.5s ease-out forwards;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes flash-out {
        0% { opacity: 0.5; }
        100% { opacity: 0; }
      }
    `;
    flash.appendChild(style);

    document.body.appendChild(flash);

    setTimeout(() => flash.remove(), 500);
  }
}

// Create singleton
const elementHighlighter = new ElementHighlighter();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ElementHighlighter, elementHighlighter };
}

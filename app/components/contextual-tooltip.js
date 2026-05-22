/**
 * Contextual Tooltip System
 * Minimal, sleek, glassmorphism tooltips for manual editing
 */

class ContextualTooltip {
  constructor() {
    this.element = document.getElementById('contextual-tooltip');
    this.titleEl = document.getElementById('tooltip-title');
    this.actionsEl = document.getElementById('tooltip-actions');
    this.closeBtn = document.getElementById('tooltip-close');

    this.currentTarget = null;
    this.isVisible = false;

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hide());
    }

    // Hide on click outside
    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.element.contains(e.target)) {
        this.hide();
      }
    });
  }

  /**
   * Show tooltip for element
   */
  show(targetElement, config) {
    if (!this.element || !config) return;

    this.currentTarget = targetElement;
    this.titleEl.textContent = config.title || 'Element';

    // Build actions
    this.actionsEl.innerHTML = '';
    if (config.actions) {
      config.actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'tooltip-action';
        btn.innerHTML = `
          <span class="tooltip-action-icon">${action.icon || '•'}</span>
          <span>${action.label}</span>
        `;
        btn.addEventListener('click', () => {
          if (action.onClick) action.onClick();
        });
        this.actionsEl.appendChild(btn);
      });
    }

    // Position
    this.position(targetElement);

    this.element.classList.remove('hidden');
    this.isVisible = true;
  }

  /**
   * Hide tooltip
   */
  hide() {
    if (this.element) {
      this.element.classList.add('hidden');
    }
    this.isVisible = false;
    this.currentTarget = null;
  }

  /**
   * Position tooltip near target
   */
  position(targetElement) {
    if (!targetElement || !this.element) return;

    const rect = targetElement.getBoundingRect ? 
      targetElement.getBoundingRect() : 
      targetElement.getBoundingClientRect();

    // Get canvas position
    const canvasEl = document.getElementById('main-canvas');
    const canvasRect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 };

    let left = canvasRect.left + rect.left + rect.width + 16;
    let top = canvasRect.top + rect.top;

    // Keep in viewport
    const tooltipWidth = 200;
    const tooltipHeight = 150;

    if (left + tooltipWidth > window.innerWidth - 20) {
      left = canvasRect.left + rect.left - tooltipWidth - 16;
    }
    if (top + tooltipHeight > window.innerHeight - 20) {
      top = window.innerHeight - tooltipHeight - 20;
    }
    if (top < 20) top = 20;

    this.element.style.left = left + 'px';
    this.element.style.top = top + 'px';
  }

  /**
   * Update position during drag
   */
  updatePosition() {
    if (this.isVisible && this.currentTarget) {
      this.position(this.currentTarget);
    }
  }
}

// Make available globally
window.ContextualTooltip = ContextualTooltip;

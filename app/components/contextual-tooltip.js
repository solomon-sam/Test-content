/**
 * Contextual Tooltip — Phase 3B
 * Glassmorphism tooltip system for manual editing mode.
 * Provides element-specific actions with premium dark UI.
 */

class ContextualTooltip {
  constructor() {
    this.element = null;
    this.currentTarget = null;
    this.isVisible = false;
    this.hideTimeout = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Close on outside click
    document.addEventListener('click', (e) => {
      const tooltip = document.getElementById('contextual-tooltip');
      if (tooltip && !tooltip.contains(e.target) && !e.target.closest('.canvas-container')) {
        this.hide();
      }
    });

    // Close button
    document.addEventListener('click', (e) => {
      if (e.target.closest('#tooltip-close')) {
        this.hide();
      }
    });

    // Keyboard: Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    });
  }

  /**
   * Show tooltip for a specific element
   */
  show(targetElement, config, position) {
    this.currentTarget = targetElement;
    this.isVisible = true;

    const tooltip = document.getElementById('contextual-tooltip');
    if (!tooltip) return;

    // Update title
    const titleEl = document.getElementById('tooltip-title');
    if (titleEl) titleEl.textContent = config.title || 'Element';

    // Build actions
    const actionsEl = document.getElementById('tooltip-actions');
    if (actionsEl) {
      actionsEl.innerHTML = '';
      (config.actions || []).forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'tooltip-action';
        btn.setAttribute('data-action', action.id);
        btn.innerHTML = `
          <span class="tooltip-action-icon">${action.icon}</span>
          <span class="tooltip-action-label">${action.label}</span>
        `;
        btn.addEventListener('click', () => {
          this.onActionClick(action.id, targetElement);
        });
        actionsEl.appendChild(btn);
      });
    }

    // Position
    tooltip.style.left = position.x + 'px';
    tooltip.style.top = position.y + 'px';

    tooltip.classList.remove('hidden');
    tooltip.classList.add('visible');

    // Clear hide timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  /**
   * Hide tooltip
   */
  hide() {
    this.isVisible = false;
    this.currentTarget = null;

    const tooltip = document.getElementById('contextual-tooltip');
    if (tooltip) {
      tooltip.classList.remove('visible');
      tooltip.classList.add('hidden');
    }
  }

  /**
   * Auto-hide after delay
   */
  autoHide(delay = 5000) {
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => this.hide(), delay);
  }

  /**
   * Handle action click
   */
  onActionClick(actionId, targetElement) {
    // Dispatch custom event for EditModeController to handle
    const event = new CustomEvent('tooltip-action', {
      detail: { actionId, targetElement }
    });
    document.dispatchEvent(event);
  }

  /**
   * Calculate optimal position near element
   */
  calculatePosition(element, canvasRect, tooltipWidth = 200, tooltipHeight = 180) {
    const objRect = element.getBoundingRect ? element.getBoundingRect() : {
      left: element.left || 0,
      top: element.top || 0,
      width: (element.width || 0) * (element.scaleX || 1),
      height: (element.height || 0) * (element.scaleY || 1)
    };

    const padding = 16;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Default: right side
    let x = canvasRect.left + objRect.left + objRect.width + padding;
    let y = canvasRect.top + objRect.top;

    // Check right overflow
    if (x + tooltipWidth > viewportW - 20) {
      x = canvasRect.left + objRect.left - tooltipWidth - padding;
    }

    // Check bottom overflow
    if (y + tooltipHeight > viewportH - 20) {
      y = viewportH - tooltipHeight - 20;
    }

    // Check top overflow
    if (y < 20) y = 20;

    return { x, y };
  }

  /**
   * Update position during drag
   */
  updatePosition(element, canvasRect) {
    if (!this.isVisible || !this.currentTarget) return;
    if (this.currentTarget !== element) return;

    const pos = this.calculatePosition(element, canvasRect);
    const tooltip = document.getElementById('contextual-tooltip');
    if (tooltip) {
      tooltip.style.left = pos.x + 'px';
      tooltip.style.top = pos.y + 'px';
    }
  }
}

// Make available globally
window.ContextualTooltip = ContextualTooltip;

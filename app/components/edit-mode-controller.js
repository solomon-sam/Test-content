/**
 * Edit Mode Controller
 * Constrained intelligent art-direction layer
 * Toggle between auto and manual editing modes
 */

class EditModeController {
  constructor(canvasManager, stateManager, interactionManager) {
    this.canvasManager = canvasManager;
    this.stateManager = stateManager;
    this.interactionManager = interactionManager;
    this.canvas = canvasManager.canvas;

    this.mode = 'auto'; // 'auto' | 'manual'
    this.selectedElement = null;
    this.tooltip = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Canvas object selection
    this.canvas.on('selection:created', (opt) => {
      if (this.mode === 'manual' && opt.selected && opt.selected[0]) {
        this.selectElement(opt.selected[0]);
      }
    });

    this.canvas.on('selection:updated', (opt) => {
      if (this.mode === 'manual' && opt.selected && opt.selected[0]) {
        this.selectElement(opt.selected[0]);
      }
    });

    this.canvas.on('selection:cleared', () => {
      this.deselectElement();
    });

    // Object modified (after drag/resize)
    this.canvas.on('object:modified', (opt) => {
      if (opt.target && this.mode === 'manual') {
        this.onElementModified(opt.target);
      }
    });
  }

  /**
   * Toggle edit mode
   */
  toggleEditMode() {
    this.mode = this.mode === 'auto' ? 'manual' : 'auto';
    this.stateManager.set('editMode', this.mode);

    // Update canvas behavior
    if (this.mode === 'manual') {
      // Enable selection for editable elements
      this.canvas.getObjects().forEach(obj => {
        if (this.isEditable(obj)) {
          obj.set('selectable', true);
          obj.set('evented', true);
        }
      });
    } else {
      // Disable selection, only background pan
      this.canvas.getObjects().forEach(obj => {
        if (obj.name !== 'background') {
          obj.set('selectable', false);
          obj.set('evented', false);
        }
      });
      this.deselectElement();
    }

    this.canvas.renderAll();
    return this.mode;
  }

  /**
   * Select element
   */
  selectElement(element) {
    if (!element || !element.name) return;

    this.selectedElement = element;
    this.stateManager.set('selectedElement', element.name);

    // Show contextual tooltip
    this.showTooltip(element);

    // Highlight selection
    element.set('borderColor', '#00338D');
    element.set('cornerColor', '#00338D');
    element.set('cornerStrokeColor', '#FFFFFF');
    element.set('cornerSize', 10);

    this.canvas.renderAll();
  }

  /**
   * Deselect element
   */
  deselectElement() {
    if (this.selectedElement) {
      // Reset styling
      this.selectedElement.set('borderColor', '#4f8fff');
      this.selectedElement.set('cornerColor', '#4f8fff');
      this.selectedElement.set('cornerSize', 8);
    }

    this.selectedElement = null;
    this.stateManager.set('selectedElement', null);
    this.hideTooltip();
    this.canvas.renderAll();
  }

  /**
   * Show contextual tooltip
   */
  showTooltip(element) {
    const tooltipEl = document.getElementById('contextual-tooltip');
    const titleEl = document.getElementById('tooltip-title');
    const actionsEl = document.getElementById('tooltip-actions');

    if (!tooltipEl || !titleEl || !actionsEl) return;

    const config = this.getTooltipConfig(element.name);
    titleEl.textContent = config.title;

    // Build actions
    actionsEl.innerHTML = '';
    config.actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'tooltip-action';
      btn.innerHTML = `
        <span class="tooltip-action-icon">${action.icon}</span>
        <span>${action.label}</span>
      `;
      btn.addEventListener('click', () => {
        this.executeAction(action.id, element);
      });
      actionsEl.appendChild(btn);
    });

    // Position tooltip near element
    const canvasRect = this.canvas.upperCanvasEl.getBoundingClientRect();
    const objRect = element.getBoundingRect();

    let left = canvasRect.left + objRect.left + objRect.width + 16;
    let top = canvasRect.top + objRect.top;

    // Keep in viewport
    if (left + 200 > window.innerWidth) {
      left = canvasRect.left + objRect.left - 200;
    }
    if (top + 150 > window.innerHeight) {
      top = window.innerHeight - 150;
    }

    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
    tooltipEl.classList.remove('hidden');

    this.tooltip = tooltipEl;
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    const tooltipEl = document.getElementById('contextual-tooltip');
    if (tooltipEl) {
      tooltipEl.classList.add('hidden');
    }
    this.tooltip = null;
  }

  /**
   * Get tooltip configuration for element type
   */
  getTooltipConfig(elementName) {
    const configs = {
      motif: {
        title: 'Motif Window',
        actions: [
          { id: 'portrait', label: 'Portrait', icon: '⬍' },
          { id: 'landscape', label: 'Landscape', icon: '⬌' },
          { id: 'bigger', label: 'Bigger', icon: '⊕' },
          { id: 'smaller', label: 'Smaller', icon: '⊖' }
        ]
      },
      headline: {
        title: 'Headline',
        actions: [
          { id: 'fontUp', label: 'Size +', icon: 'A+' },
          { id: 'fontDown', label: 'Size −', icon: 'A−' },
          { id: 'alignLeft', label: 'Align Left', icon: '◀' },
          { id: 'alignRight', label: 'Align Right', icon: '▶' }
        ]
      },
      subheading: {
        title: 'Subheading',
        actions: [
          { id: 'fontUp', label: 'Size +', icon: 'A+' },
          { id: 'fontDown', label: 'Size −', icon: 'A−' }
        ]
      },
      background: {
        title: 'Background',
        actions: [
          { id: 'scaleUp', label: 'Scale Up', icon: '⊕' },
          { id: 'scaleDown', label: 'Scale Down', icon: '⊖' },
          { id: 'changeColor', label: 'Overlay Color', icon: '🎨' }
        ]
      },
      swoosh: {
        title: 'Swoosh',
        actions: [
          { id: 'moveLeft', label: 'Move Left', icon: '←' },
          { id: 'moveRight', label: 'Move Right', icon: '→' },
          { id: 'fadeIn', label: 'Fade In', icon: '◐' },
          { id: 'fadeOut', label: 'Fade Out', icon: '◑' }
        ]
      }
    };

    return configs[elementName] || { title: 'Element', actions: [] };
  }

  /**
   * Execute tooltip action
   */
  executeAction(actionId, element) {
    const grid = this.canvasManager.gridSystem;

    switch (actionId) {
      case 'portrait':
        if (element.name === 'motif') {
          // Change to portrait ratio (7:10)
          const currentWidth = element.width * element.scaleX;
          const newHeight = currentWidth * (10/7);
          element.set('height', newHeight / element.scaleY);
          element.setCoords();
        }
        break;

      case 'landscape':
        if (element.name === 'motif') {
          // Change to landscape ratio (10:7)
          const currentHeight = element.height * element.scaleY;
          const newWidth = currentHeight * (10/7);
          element.set('width', newWidth / element.scaleX);
          element.setCoords();
        }
        break;

      case 'bigger':
        if (element.name === 'motif') {
          const scale = 1.2;
          element.set('scaleX', element.scaleX * scale);
          element.set('scaleY', element.scaleY * scale);
          element.setCoords();
        }
        break;

      case 'smaller':
        if (element.name === 'motif') {
          const scale = 0.8;
          element.set('scaleX', element.scaleX * scale);
          element.set('scaleY', element.scaleY * scale);
          element.setCoords();
        }
        break;

      case 'fontUp':
        if (element.type === 'text') {
          element.set('fontSize', Math.min(72, element.fontSize * 1.15));
          element.setCoords();
        }
        break;

      case 'fontDown':
        if (element.type === 'text') {
          element.set('fontSize', Math.max(10, element.fontSize * 0.85));
          element.setCoords();
        }
        break;

      case 'scaleUp':
        if (element.name === 'background') {
          element.set('scaleX', element.scaleX * 1.1);
          element.set('scaleY', element.scaleY * 1.1);
          element.setCoords();
        }
        break;

      case 'scaleDown':
        if (element.name === 'background') {
          element.set('scaleX', element.scaleX * 0.9);
          element.set('scaleY', element.scaleY * 0.9);
          element.setCoords();
        }
        break;

      case 'changeColor':
        // Show color picker
        const picker = document.getElementById('color-picker-popup');
        if (picker) {
          picker.classList.remove('hidden');
          // Position near element
          const rect = this.canvas.upperCanvasEl.getBoundingClientRect();
          picker.style.left = (rect.left + 100) + 'px';
          picker.style.top = (rect.top + 100) + 'px';
        }
        break;

      case 'moveLeft':
      case 'moveRight':
        if (element.name === 'swoosh') {
          const dir = actionId === 'moveLeft' ? -1 : 1;
          element.set('left', element.left + dir * grid.cellWidth);
          element.setCoords();
        }
        break;
    }

    this.canvas.renderAll();

    // Trigger validation
    this.stateManager.set('composition.lastModified', Date.now());
  }

  /**
   * On element modified (after drag/resize)
   */
  onElementModified(element) {
    // Apply snap if needed
    if (this.canvasManager.snapToGrid && this.canvasManager.gridSystem) {
      this.canvasManager.snapObjectToGrid(element);
    }

    // Update state
    this.stateManager.set('composition.lastModified', Date.now());

    // Update tooltip position
    if (this.selectedElement === element) {
      this.showTooltip(element);
    }
  }

  /**
   * Check if element is editable
   */
  isEditable(obj) {
    if (!obj || !obj.name) return false;
    const editable = ['motif', 'headline', 'subheading', 'swoosh', 'background'];
    return editable.includes(obj.name);
  }

  /**
   * Set mode directly
   */
  setMode(mode) {
    if (this.mode !== mode) {
      this.toggleEditMode();
    }
  }
}

// Make available globally
window.EditModeController = EditModeController;

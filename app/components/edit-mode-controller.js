/**
 * Edit Mode Controller — Phase 3B Enhanced
 * Constrained intelligent art-direction layer with:
 * - Soft constraint engine integration
 * - Live validation at 60fps during drag
 * - Live composition scoring
 * - Contextual tooltip system
 * - Elastic snapping and magnetic feel
 */

class EditModeController {
  constructor(canvasManager, stateManager, interactionManager, complianceEngine, constraintEngine) {
    this.canvasManager = canvasManager;
    this.stateManager = stateManager;
    this.interactionManager = interactionManager;
    this.complianceEngine = complianceEngine;
    this.constraintEngine = constraintEngine;
    this.canvas = canvasManager.canvas;

    this.mode = 'auto'; // 'auto' | 'manual'
    this.selectedElement = null;
    this.tooltip = null;

    // Drag state for live validation
    this.dragState = {
      isDragging: false,
      startX: 0,
      startY: 0,
      elementStartX: 0,
      elementStartY: 0,
      elementStartW: 0,
      elementStartH: 0,
      element: null,
      rafId: null,
      lastValidationTime: 0
    };

    // Live scoring
    this.liveScore = 0;
    this.scoreRafId = null;

    this.setupEventListeners();
    this.setupCanvasEvents();
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

    // Drag start
    this.canvas.on('object:moving', (opt) => {
      if (opt.target && this.mode === 'manual') {
        this.onDragMove(opt.target);
      }
    });

    // Mouse down for drag tracking
    this.canvas.on('mouse:down', (opt) => {
      if (opt.target && this.mode === 'manual' && this.isEditable(opt.target)) {
        this.dragState.isDragging = true;
        this.dragState.element = opt.target;
        this.dragState.startX = opt.e.clientX;
        this.dragState.startY = opt.e.clientY;
        this.dragState.elementStartX = opt.target.left;
        this.dragState.elementStartY = opt.target.top;
        this.dragState.elementStartW = opt.target.width * opt.target.scaleX;
        this.dragState.elementStartH = opt.target.height * opt.target.scaleY;

        // Start live validation loop
        this.startLiveValidation();
        this.startLiveScoring();
      }
    });

    // Mouse up
    this.canvas.on('mouse:up', () => {
      if (this.dragState.isDragging) {
        this.dragState.isDragging = false;
        this.dragState.element = null;
        this.stopLiveValidation();
        this.stopLiveScoring();

        // Final validation after drag ends
        this.runFinalValidation();
      }
    });
  }

  setupCanvasEvents() {
    // Pointer events for multi-touch support
    const canvasEl = this.canvas.upperCanvasEl;
    if (canvasEl) {
      canvasEl.addEventListener('pointerdown', (e) => {
        if (this.mode === 'manual') {
          this.interactionManager.onPointerDown(e);
        }
      });

      canvasEl.addEventListener('pointermove', (e) => {
        if (this.mode === 'manual' && this.dragState.isDragging) {
          this.interactionManager.onPointerMove(e);
        }
      });

      canvasEl.addEventListener('pointerup', (e) => {
        if (this.mode === 'manual') {
          this.interactionManager.onPointerUp(e);
        }
      });
    }
  }

  /**
   * Toggle edit mode between auto and manual
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
          obj.set('lockRotation', true);
          obj.set('lockScalingFlip', true);

          // Element-specific constraints
          if (obj.name === 'motif') {
            obj.set('lockUniScaling', true); // Keep aspect ratio
          }
        } else {
          obj.set('selectable', false);
          obj.set('evented', false);
        }
      });

      // Show constraint visuals
      this.showConstraintVisuals();
    } else {
      // Disable selection, only background pan
      this.canvas.getObjects().forEach(obj => {
        if (obj.name !== 'background') {
          obj.set('selectable', false);
          obj.set('evented', false);
        }
      });
      this.deselectElement();
      this.hideConstraintVisuals();
    }

    this.canvas.renderAll();
    return this.mode;
  }

  /**
   * Select element and show contextual tooltip
   */
  selectElement(element) {
    if (!element || !element.name) return;

    this.selectedElement = element;
    this.stateManager.set('selectedElement', element.name);

    // Show contextual tooltip
    this.showTooltip(element);

    // Highlight selection with brand blue
    element.set({
      borderColor: '#00338D',
      cornerColor: '#00338D',
      cornerStrokeColor: '#FFFFFF',
      cornerSize: 10,
      transparentCorners: false
    });

    // Add subtle glow effect
    element.set('shadow', new fabric.Shadow({
      color: 'rgba(0, 51, 141, 0.2)',
      blur: 10,
      offsetX: 0,
      offsetY: 0
    }));

    this.canvas.renderAll();
  }

  /**
   * Deselect element and hide tooltip
   */
  deselectElement() {
    if (this.selectedElement) {
      // Reset styling
      this.selectedElement.set({
        borderColor: '#4f8fff',
        cornerColor: '#4f8fff',
        cornerSize: 8,
        shadow: null
      });
    }

    this.selectedElement = null;
    this.stateManager.set('selectedElement', null);
    this.hideTooltip();
    this.canvas.renderAll();
  }

  /**
   * Show contextual tooltip near selected element
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
    this.positionTooltip(tooltipEl, element);

    tooltipEl.classList.remove('hidden');
    this.tooltip = tooltipEl;
  }

  /**
   * Position tooltip intelligently to avoid canvas overlap
   */
  positionTooltip(tooltipEl, element) {
    const canvasRect = this.canvas.upperCanvasEl.getBoundingClientRect();
    const objRect = element.getBoundingRect();

    const tooltipWidth = 200;
    const tooltipHeight = 180;
    const padding = 16;

    // Default: right side of element
    let left = canvasRect.left + objRect.left + objRect.width + padding;
    let top = canvasRect.top + objRect.top;

    // If overflows right, place on left
    if (left + tooltipWidth > window.innerWidth - 20) {
      left = canvasRect.left + objRect.left - tooltipWidth - padding;
    }

    // If overflows bottom, align to bottom of viewport
    if (top + tooltipHeight > window.innerHeight - 20) {
      top = window.innerHeight - tooltipHeight - 20;
    }

    // If overflows top, align to top
    if (top < 20) top = 20;

    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
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
          { id: 'portrait', label: 'Portrait (7:10)', icon: '⬍' },
          { id: 'landscape', label: 'Landscape (10:7)', icon: '⬌' },
          { id: 'bigger', label: 'Scale Up', icon: '⊕' },
          { id: 'smaller', label: 'Scale Down', icon: '⊖' }
        ]
      },
      headline: {
        title: 'Headline Typography',
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
          { id: 'fontDown', label: 'Size −', icon: 'A−' },
          { id: 'alignLeft', label: 'Align Left', icon: '◀' },
          { id: 'alignCenter', label: 'Align Center', icon: '◆' }
        ]
      },
      background: {
        title: 'Background Image',
        actions: [
          { id: 'scaleUp', label: 'Scale Up', icon: '⊕' },
          { id: 'scaleDown', label: 'Scale Down', icon: '⊖' },
          { id: 'changeColor', label: 'Overlay Color', icon: '🎨' },
          { id: 'resetPosition', label: 'Reset Position', icon: '↺' }
        ]
      },
      swoosh: {
        title: 'Swoosh Effect',
        actions: [
          { id: 'moveLeft', label: 'Move Left', icon: '←' },
          { id: 'moveRight', label: 'Move Right', icon: '→' },
          { id: 'fadeIn', label: 'Increase Opacity', icon: '◐' },
          { id: 'fadeOut', label: 'Decrease Opacity', icon: '◑' }
        ]
      }
    };

    return configs[elementName] || { title: 'Element', actions: [] };
  }

  /**
   * Execute tooltip action with validation
   */
  executeAction(actionId, element) {
    const grid = this.canvasManager.gridSystem;
    const constraint = this.constraintEngine;

    switch (actionId) {
      case 'portrait':
        if (element.name === 'motif') {
          const currentWidth = element.width * element.scaleX;
          const newHeight = currentWidth * (10/7);
          element.set('height', newHeight / element.scaleY);
          element.setCoords();
        }
        break;

      case 'landscape':
        if (element.name === 'motif') {
          const currentHeight = element.height * element.scaleY;
          const newWidth = currentHeight * (10/7);
          element.set('width', newWidth / element.scaleX);
          element.setCoords();
        }
        break;

      case 'bigger':
        if (element.name === 'motif') {
          const scale = 1.15;
          element.set('scaleX', element.scaleX * scale);
          element.set('scaleY', element.scaleY * scale);
          element.setCoords();
        }
        break;

      case 'smaller':
        if (element.name === 'motif') {
          const scale = 0.85;
          element.set('scaleX', element.scaleX * scale);
          element.set('scaleY', element.scaleY * scale);
          element.setCoords();
        }
        break;

      case 'fontUp':
        if (element.type === 'text') {
          const newSize = Math.min(72, element.fontSize * 1.12);
          element.set('fontSize', newSize);
          element.setCoords();
        }
        break;

      case 'fontDown':
        if (element.type === 'text') {
          const newSize = Math.max(10, element.fontSize * 0.88);
          element.set('fontSize', newSize);
          element.setCoords();
        }
        break;

      case 'alignLeft':
        if (element.type === 'text') {
          element.set('textAlign', 'left');
        }
        break;

      case 'alignRight':
        if (element.type === 'text') {
          element.set('textAlign', 'right');
        }
        break;

      case 'alignCenter':
        if (element.type === 'text') {
          element.set('textAlign', 'center');
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

      case 'resetPosition':
        if (element.name === 'background') {
          const scaleX = this.canvas.width / element.width;
          const scaleY = this.canvas.height / element.height;
          const scale = Math.max(scaleX, scaleY);
          element.set({
            scaleX: scale,
            scaleY: scale,
            left: (this.canvas.width - element.width * scale) / 2,
            top: (this.canvas.height - element.height * scale) / 2
          });
          element.setCoords();
        }
        break;

      case 'changeColor':
        // Show color picker
        const picker = document.getElementById('color-picker-popup');
        if (picker) {
          picker.classList.remove('hidden');
          const rect = this.canvas.upperCanvasEl.getBoundingClientRect();
          picker.style.left = (rect.left + 100) + 'px';
          picker.style.top = (rect.top + 100) + 'px';
        }
        break;

      case 'moveLeft':
      case 'moveRight':
        if (element.name === 'swoosh') {
          const dir = actionId === 'moveLeft' ? -1 : 1;
          element.set('left', element.left + dir * (grid ? grid.cellWidth : 50));
          element.setCoords();
        }
        break;

      case 'fadeIn':
        if (element.name === 'swoosh') {
          element.set('opacity', Math.min(1, (element.opacity || 0.5) + 0.15));
        }
        break;

      case 'fadeOut':
        if (element.name === 'swoosh') {
          element.set('opacity', Math.max(0.1, (element.opacity || 0.5) - 0.15));
        }
        break;
    }

    this.canvas.renderAll();

    // Trigger validation
    this.stateManager.set('composition.lastModified', Date.now());

    // Update tooltip position
    if (this.selectedElement === element) {
      this.showTooltip(element);
    }
  }

  /**
   * Live validation during drag (60fps)
   */
  startLiveValidation() {
    const loop = () => {
      if (!this.dragState.isDragging || !this.dragState.element) {
        return;
      }

      const now = performance.now();
      // Throttle validation to every 50ms (20fps for validation, smooth for UI)
      if (now - this.dragState.lastValidationTime > 50) {
        this.dragState.lastValidationTime = now;
        this.validateDragPosition();
      }

      this.dragState.rafId = requestAnimationFrame(loop);
    };

    this.dragState.rafId = requestAnimationFrame(loop);
  }

  stopLiveValidation() {
    if (this.dragState.rafId) {
      cancelAnimationFrame(this.dragState.rafId);
      this.dragState.rafId = null;
    }

    // Clear any visual feedback
    this.clearDragFeedback();
  }

  /**
   * Validate current drag position and apply soft constraints
   */
  validateDragPosition() {
    const element = this.dragState.element;
    if (!element || !this.constraintEngine) return;

    const w = element.width * element.scaleX;
    const h = element.height * element.scaleY;

    // Get context for validation
    const context = {
      motif: this.canvasManager.objects.motif,
      logo: this.canvasManager.objects.logo
    };

    // Check violations
    const violations = this.constraintEngine.validatePosition(
      element.name, element.left, element.top, w, h, context
    );

    // Apply visual feedback
    if (violations.length > 0) {
      const hasHard = violations.some(v => v.severity === 'hard');
      element.set('borderColor', hasHard ? '#ef4444' : '#f59e0b');

      // Soft resistance for hard violations
      if (hasHard && this.canvasManager.snapToGrid) {
        const constrained = this.applySoftConstraints(element);
        element.set({ left: constrained.x, top: constrained.y });
      }
    } else {
      element.set('borderColor', '#00338D');
    }

    element.setCoords();
    this.canvas.renderAll();
  }

  /**
   * Apply soft constraints during drag
   */
  applySoftConstraints(element) {
    const grid = this.canvasManager.gridSystem;
    const constraint = this.constraintEngine;
    if (!grid || !constraint) return { x: element.left, y: element.top };

    const w = element.width * element.scaleX;
    const h = element.height * element.scaleY;

    let constrained = { x: element.left, y: element.top };

    switch (element.name) {
      case 'motif':
        constrained = constraint.constrainMotif(element.left, element.top, w, h, grid.getLogoZone());
        break;
      case 'headline':
      case 'subheading':
        const motif = this.canvasManager.objects.motif;
        constrained = constraint.constrainTypography(
          element.left, element.top, w, h,
          motif ? { x: motif.left, y: motif.top, width: motif.width * motif.scaleX, height: motif.height * motif.scaleY } : null,
          grid.getLogoZone()
        );
        break;
      default:
        constrained = constraint.constrainToMargins(element.left, element.top, w, h);
    }

    return constrained;
  }

  /**
   * Clear drag visual feedback
   */
  clearDragFeedback() {
    if (this.selectedElement) {
      this.selectedElement.set('borderColor', '#00338D');
      this.canvas.renderAll();
    }
  }

  /**
   * Live composition scoring during editing (60fps)
   */
  startLiveScoring() {
    const loop = () => {
      if (!this.dragState.isDragging) return;

      // Calculate live score
      this.calculateLiveScore();
      this.scoreRafId = requestAnimationFrame(loop);
    };
    this.scoreRafId = requestAnimationFrame(loop);
  }

  stopLiveScoring() {
    if (this.scoreRafId) {
      cancelAnimationFrame(this.scoreRafId);
      this.scoreRafId = null;
    }
  }

  /**
   * Calculate live composition score during editing
   */
  calculateLiveScore() {
    if (!this.complianceEngine) return;

    const report = this.complianceEngine.getReport();
    if (report) {
      this.liveScore = report.score;
      // Update score display in real-time
      const scoreEl = document.getElementById('live-score-value');
      if (scoreEl) {
        scoreEl.textContent = this.liveScore;
      }
    }
  }

  /**
   * Run final validation after drag ends
   */
  runFinalValidation() {
    // Snap to grid if enabled
    if (this.canvasManager.snapToGrid) {
      const element = this.selectedElement;
      if (element && this.isEditable(element)) {
        this.canvasManager.snapObjectToGrid(element);
      }
    }

    // Run compliance validation
    if (this.complianceEngine) {
      this.complianceEngine.validateAll();
    }

    // Update brand score
    const report = this.complianceEngine ? this.complianceEngine.getReport() : null;
    if (report) {
      this.stateManager.set('brandScore', report.score);
    }

    // Show correction toast if issues found
    const issues = this.complianceEngine ? this.complianceEngine.getAllIssues() : [];
    if (issues.length > 0) {
      this.showCorrectionToast(issues);
    }
  }

  /**
   * Show auto-correction toast notification
   */
  showCorrectionToast(issues) {
    const container = document.getElementById('correction-toast-container');
    if (!container) return;

    // Clear existing
    container.innerHTML = '';

    const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'hard');
    const warningIssues = issues.filter(i => i.severity === 'warning' || i.severity === 'soft');

    if (criticalIssues.length > 0) {
      const toast = document.createElement('div');
      toast.className = 'correction-toast';
      toast.innerHTML = `
        <div class="correction-toast-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#ef4444" stroke-width="2"/><path d="M8 4v5M8 11h.01" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/></svg>
          ${criticalIssues.length} critical issue${criticalIssues.length > 1 ? 's' : ''} found
        </div>
        <div class="correction-toast-text">${criticalIssues[0].message}</div>
        <div class="correction-toast-actions">
          <button class="btn btn-primary btn-sm" onclick="window.app.editModeController.autoCorrect()">Auto-fix</button>
          <button class="btn btn-secondary btn-sm" onclick="this.closest('.correction-toast').remove()">Dismiss</button>
        </div>
      `;
      container.appendChild(toast);

      // Auto-remove after 8 seconds
      setTimeout(() => toast.remove(), 8000);
    } else if (warningIssues.length > 0) {
      const toast = document.createElement('div');
      toast.className = 'correction-toast';
      toast.style.borderLeftColor = '#f59e0b';
      toast.innerHTML = `
        <div class="correction-toast-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#f59e0b" stroke-width="2"/><path d="M8 4v5M8 11h.01" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/></svg>
          ${warningIssues.length} suggestion${warningIssues.length > 1 ? 's' : ''}
        </div>
        <div class="correction-toast-text">${warningIssues[0].message}</div>
        <div class="correction-toast-actions">
          <button class="btn btn-secondary btn-sm" onclick="this.closest('.correction-toast').remove()">Dismiss</button>
        </div>
      `;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 6000);
    }
  }

  /**
   * Auto-correct composition issues
   */
  autoCorrect() {
    if (!this.complianceEngine) return;

    const issues = this.complianceEngine.getAllIssues();
    const grid = this.canvasManager.gridSystem;

    issues.forEach(issue => {
      if (issue.element && this.canvasManager.objects[issue.element]) {
        const obj = this.canvasManager.objects[issue.element];

        switch (issue.type) {
          case 'margin':
            // Snap back to margins
            if (grid) {
              const safe = grid.getSafeZone();
              obj.set({
                left: Math.max(safe.x, Math.min(obj.left, safe.x + safe.width - obj.width * obj.scaleX)),
                top: Math.max(safe.y, Math.min(obj.top, safe.y + safe.height - obj.height * obj.scaleY))
              });
            }
            break;

          case 'logo':
            // Move away from logo zone
            if (grid) {
              const logoSafe = grid.getLogoZone();
              const newX = logoSafe.x + logoSafe.width + grid.cellWidth * 2;
              obj.set('left', Math.max(obj.left, newX));
            }
            break;

          case 'grid':
            // Snap to grid
            this.canvasManager.snapObjectToGrid(obj);
            break;
        }

        obj.setCoords();
      }
    });

    this.canvas.renderAll();

    // Re-validate after corrections
    this.complianceEngine.validateAll();

    // Remove toast
    const container = document.getElementById('correction-toast-container');
    if (container) container.innerHTML = '';
  }

  /**
   * Show constraint visualization overlays
   */
  showConstraintVisuals() {
    // This would draw margin lines, logo safe zones, etc.
    // Implementation depends on canvas overlay system
  }

  hideConstraintVisuals() {
    // Remove constraint overlays
  }

  /**
   * On element modified (drag/resize complete)
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
   * During drag movement — apply constraints in real-time
   */
  onDragMove(element) {
    if (!this.constraintEngine || !this.canvasManager.gridSystem) return;

    const w = element.width * element.scaleX;
    const h = element.height * element.scaleY;

    // Apply constraints based on element type
    let constrained = { x: element.left, y: element.top };

    switch (element.name) {
      case 'motif':
        constrained = this.constraintEngine.constrainMotif(
          element.left, element.top, w, h,
          this.canvasManager.gridSystem.getLogoZone()
        );
        break;
      case 'headline':
      case 'subheading':
        const motif = this.canvasManager.objects.motif;
        constrained = this.constraintEngine.constrainTypography(
          element.left, element.top, w, h,
          motif ? {
            x: motif.left, y: motif.top,
            width: motif.width * motif.scaleX,
            height: motif.height * motif.scaleY
          } : null,
          this.canvasManager.gridSystem.getLogoZone()
        );
        break;
      default:
        constrained = this.constraintEngine.constrainToMargins(element.left, element.top, w, h);
    }

    // Apply elastic resistance if position changed significantly
    if (Math.abs(constrained.x - element.left) > 1 || Math.abs(constrained.y - element.top) > 1) {
      element.set({ left: constrained.x, top: constrained.y });
      element.setCoords();
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

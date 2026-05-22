/**
 * Interaction Manager
 * Pointer Events API integration for mouse, touch, and pen
 * Cursor state machine, gesture detection, multi-touch support
 */

class InteractionManager {
  constructor(canvasManager, stateManager) {
    this.canvasManager = canvasManager;
    this.stateManager = stateManager;
    this.canvas = canvasManager.canvas;

    // Cursor states: default | pointer | grab | grabbing
    this.cursorState = 'default';

    // Gesture tracking
    this.gestures = {
      pinch: { active: false, startDist: 0, startZoom: 1 },
      pan: { active: false, startX: 0, startY: 0 },
      drag: { active: false, element: null, startX: 0, startY: 0 }
    };

    // Touch tracking for multi-touch
    this.activePointers = new Map();

    this.setupEventListeners();
  }

  setupEventListeners() {
    const canvasEl = this.canvas.upperCanvasEl;

    // Pointer events
    canvasEl.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvasEl.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvasEl.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvasEl.addEventListener('pointercancel', this.onPointerUp.bind(this));
    canvasEl.addEventListener('pointerleave', this.onPointerUp.bind(this));

    // Wheel for zoom
    canvasEl.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    // Context menu prevention
    canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

    // Set touch-action for better touch behavior
    canvasEl.style.touchAction = 'none';
  }

  onPointerDown(e) {
    e.preventDefault();
    this.canvasEl = this.canvas.upperCanvasEl;
    this.canvasEl.setPointerCapture(e.pointerId);

    this.activePointers.set(e.pointerId, {
      x: e.offsetX,
      y: e.offsetY,
      pressure: e.pressure || 1,
      type: e.pointerType
    });

    const hoverObj = this.canvas.findTarget(e);

    // Multi-touch: pinch detection
    if (this.activePointers.size === 2) {
      const pointers = Array.from(this.activePointers.values());
      this.gestures.pinch.active = true;
      this.gestures.pinch.startDist = this.getDistance(pointers[0], pointers[1]);
      this.gestures.pinch.startZoom = this.canvasManager.zoom;
      this.setCursor('grabbing');
      return;
    }

    // Single pointer
    if (hoverObj && this.isEditable(hoverObj)) {
      // Start drag on editable element
      this.gestures.drag.active = true;
      this.gestures.drag.element = hoverObj;
      this.gestures.drag.startX = e.offsetX;
      this.gestures.drag.startY = e.offsetY;
      this.gestures.drag.elementStartX = hoverObj.left;
      this.gestures.drag.elementStartY = hoverObj.top;
      this.setCursor('grabbing');

      // Notify state
      this.stateManager.set('selectedElement', hoverObj.name);
      this.stateManager.set('dragState', {
        isDragging: true,
        element: hoverObj.name,
        startX: e.offsetX,
        startY: e.offsetY
      });
    } else if (this.stateManager.get('editMode') === 'manual' || e.altKey) {
      // Pan mode
      this.gestures.pan.active = true;
      this.gestures.pan.startX = e.clientX;
      this.gestures.pan.startY = e.clientY;
      this.gestures.pan.startVpt = [...this.canvas.viewportTransform];
      this.setCursor('grabbing');
    }
  }

  onPointerMove(e) {
    if (!this.activePointers.has(e.pointerId)) return;

    // Update pointer position
    this.activePointers.set(e.pointerId, {
      x: e.offsetX,
      y: e.offsetY,
      pressure: e.pressure || 1,
      type: e.pointerType
    });

    // Pinch gesture
    if (this.gestures.pinch.active && this.activePointers.size === 2) {
      const pointers = Array.from(this.activePointers.values());
      const currentDist = this.getDistance(pointers[0], pointers[1]);
      const scale = currentDist / this.gestures.pinch.startDist;
      const newZoom = Math.max(0.1, Math.min(5, this.gestures.pinch.startZoom * scale));

      this.canvasManager.setZoom(newZoom);
      return;
    }

    // Drag gesture
    if (this.gestures.drag.active && this.gestures.drag.element) {
      const dx = e.offsetX - this.gestures.drag.startX;
      const dy = e.offsetY - this.gestures.drag.startY;

      const newX = this.gestures.drag.elementStartX + dx / this.canvasManager.zoom;
      const newY = this.gestures.drag.elementStartY + dy / this.canvasManager.zoom;

      // Apply constraints if in manual mode
      if (this.stateManager.get('editMode') === 'manual') {
        const constrained = this.applyConstraints(
          this.gestures.drag.element,
          newX,
          newY
        );
        this.gestures.drag.element.set({ left: constrained.x, top: constrained.y });
      } else {
        this.gestures.drag.element.set({ left: newX, top: newY });
      }

      this.gestures.drag.element.setCoords();
      this.canvas.requestRenderAll();
      return;
    }

    // Pan gesture
    if (this.gestures.pan.active) {
      const dx = e.clientX - this.gestures.pan.startX;
      const dy = e.clientY - this.gestures.pan.startY;

      const vpt = this.canvas.viewportTransform;
      vpt[4] = this.gestures.pan.startVpt[4] + dx;
      vpt[5] = this.gestures.pan.startVpt[5] + dy;
      this.canvas.requestRenderAll();
      return;
    }

    // Hover detection for cursor state
    if (!this.gestures.drag.active && !this.gestures.pan.active && !this.gestures.pinch.active) {
      const hoverObj = this.canvas.findTarget(e);
      if (hoverObj && this.isEditable(hoverObj)) {
        this.setCursor('grab');
      } else if (this.stateManager.get('editMode') === 'manual' || e.altKey) {
        this.setCursor('pointer');
      } else {
        this.setCursor('default');
      }
    }
  }

  onPointerUp(e) {
    this.activePointers.delete(e.pointerId);
    this.canvasEl?.releasePointerCapture(e.pointerId);

    // End gestures
    if (this.gestures.pinch.active && this.activePointers.size < 2) {
      this.gestures.pinch.active = false;
    }

    if (this.gestures.drag.active) {
      this.gestures.drag.active = false;

      // Snap to grid if enabled
      if (this.canvasManager.snapToGrid && this.canvasManager.gridSystem) {
        this.canvasManager.snapObjectToGrid(this.gestures.drag.element);
      }

      // Update state
      this.stateManager.set('dragState', {
        isDragging: false,
        element: null,
        startX: 0,
        startY: 0
      });

      this.gestures.drag.element = null;
    }

    if (this.gestures.pan.active) {
      this.gestures.pan.active = false;
    }

    // Reset cursor
    if (this.activePointers.size === 0) {
      this.setCursor('default');
    }
  }

  onWheel(e) {
    e.preventDefault();

    const delta = e.deltaY;
    let zoom = this.canvas.getZoom();
    zoom *= 0.999 ** delta;
    zoom = Math.max(0.1, Math.min(5, zoom));

    this.canvas.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
    this.canvasManager.zoom = zoom;
    this.canvasManager.updateZoomDisplay();
  }

  /**
   * Apply soft constraints during drag
   */
  applyConstraints(element, x, y) {
    const grid = this.canvasManager.gridSystem;
    if (!grid) return { x, y };

    let constrainedX = x;
    let constrainedY = y;

    // Snap to grid with easing
    constrainedX = grid.getColumnSnap(x);
    constrainedY = grid.getRowSnap(y);

    // Keep in safe margins
    const w = element.width * element.scaleX;
    const h = element.height * element.scaleY;

    constrainedX = Math.max(grid.margin, Math.min(constrainedX, this.canvas.width - grid.margin - w));
    constrainedY = Math.max(grid.margin, Math.min(constrainedY, this.canvas.height - grid.margin - h));

    // Element-specific constraints
    if (element.name === 'motif') {
      // Motif must maintain 7:10 or 10:7 ratio
      // Must be at least 20% of canvas
      // Must not overlap logo zone
    }

    if (element.name === 'headline' || element.name === 'subheading') {
      // Typography must be in safe text regions
      // Snap to baseline
      constrainedY = grid.snapToBaseline(constrainedY);
    }

    return { x: constrainedX, y: constrainedY };
  }

  /**
   * Check if object is editable
   */
  isEditable(obj) {
    if (!obj || !obj.name) return false;

    const lockedElements = ['logo', 'tagline', 'metadata'];
    const editableElements = ['motif', 'headline', 'subheading', 'swoosh', 'background'];

    // In auto mode, only background is editable
    if (this.stateManager.get('editMode') === 'auto') {
      return obj.name === 'background';
    }

    // In manual mode, editable elements can be moved
    return editableElements.includes(obj.name);
  }

  /**
   * Set cursor state
   */
  setCursor(state) {
    if (this.cursorState === state) return;
    this.cursorState = state;

    const canvasEl = this.canvas.upperCanvasEl;
    const cursors = {
      default: 'default',
      pointer: 'pointer',
      grab: 'grab',
      grabbing: 'grabbing'
    };

    canvasEl.style.cursor = cursors[state] || 'default';
  }

  /**
   * Get distance between two points
   */
  getDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Destroy
   */
  destroy() {
    const canvasEl = this.canvas.upperCanvasEl;
    canvasEl.removeEventListener('pointerdown', this.onPointerDown);
    canvasEl.removeEventListener('pointermove', this.onPointerMove);
    canvasEl.removeEventListener('pointerup', this.onPointerUp);
    canvasEl.removeEventListener('wheel', this.onWheel);
  }
}

// Make available globally
window.InteractionManager = InteractionManager;

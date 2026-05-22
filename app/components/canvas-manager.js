/**
 * Canvas Manager
 * Enhanced Fabric.js canvas with rAF rendering, custom objects, KPMG brand elements
 */

class CanvasManager {
  constructor(canvasId, width, height) {
    this.canvasId = canvasId;
    this.originalWidth = width;
    this.originalHeight = height;

    // Initialize Fabric.js canvas
    this.canvas = new fabric.Canvas(canvasId, {
      width: width,
      height: height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
      uniScaleTransform: false
    });

    // State
    this.zoom = 1;
    this.minZoom = 0.1;
    this.maxZoom = 5;
    this.isPanning = false;
    this.lastPosX = 0;
    this.lastPosY = 0;
    this.gridSystem = null;
    this.showGrid = true;
    this.showMargins = true;
    this.snapToGrid = false;
    this.showHeatmap = false;
    this.showNegative = false;
    this.showZones = false;

    // rAF rendering
    this.renderLoopId = null;
    this.needsRender = false;

    // Layer management
    this.layers = {
      background: { visible: true, locked: false, zIndex: 0 },
      logo: { visible: true, locked: true, zIndex: 10 },
      tagline: { visible: true, locked: true, zIndex: 20 },
      metadata: { visible: true, locked: true, zIndex: 30 },
      motif: { visible: true, locked: false, zIndex: 5 },
      swoosh: { visible: true, locked: false, zIndex: 6 },
      headline: { visible: true, locked: false, zIndex: 25 },
      subheading: { visible: true, locked: false, zIndex: 24 },
      treatment: { visible: true, locked: true, zIndex: 2 },
      grid: { visible: true, locked: true, zIndex: 100 },
      aiOverlay: { visible: true, locked: true, zIndex: 90 }
    };

    // Objects registry
    this.objects = {
      background: null,
      logo: null,
      tagline: null,
      metadata: null,
      motif: null,
      swoosh: null,
      headline: null,
      subheading: null,
      treatment: null,
      gridLines: [],
      marginRect: null,
      heatmap: null,
      negativeSpace: null,
      zones: []
    };

    this.setupCanvasBehavior();
    this.startRenderLoop();
  }

  /**
   * Start rAF rendering loop
   */
  startRenderLoop() {
    const loop = () => {
      if (this.needsRender) {
        this.canvas.renderAll();
        this.needsRender = false;
      }
      this.renderLoopId = requestAnimationFrame(loop);
    };
    this.renderLoopId = requestAnimationFrame(loop);
  }

  /**
   * Request render (debounced via rAF)
   */
  requestRender() {
    this.needsRender = true;
  }

  /**
   * Set grid system
   */
  setGridSystem(gridSystem) {
    this.gridSystem = gridSystem;
    this.drawGrid();
  }

  /**
   * Setup canvas behavior defaults
   */
  setupCanvasBehavior() {
    fabric.Object.prototype.set({
      borderColor: '#4f8fff',
      cornerColor: '#4f8fff',
      cornerStrokeColor: '#ffffff',
      cornerSize: 8,
      transparentCorners: false,
      cornerStyle: 'circle',
      selectionBackgroundColor: 'rgba(79, 143, 255, 0.1)'
    });

    fabric.Text.prototype.set({
      lockRotation: true
    });
  }

  /**
   * Draw grid overlay
   */
  drawGrid() {
    if (!this.gridSystem) return;

    // Remove existing grid
    this.objects.gridLines.forEach(line => this.canvas.remove(line));
    this.objects.gridLines = [];

    if (this.objects.marginRect) {
      this.canvas.remove(this.objects.marginRect);
    }

    if (!this.showGrid && !this.showMargins) return;

    const lines = this.gridSystem.generateGridLines();
    const marginRect = this.gridSystem.generateMarginRect();

    // Draw margin rectangle
    if (this.showMargins) {
      const rect = new fabric.Rect({
        left: marginRect.left,
        top: marginRect.top,
        width: marginRect.width,
        height: marginRect.height,
        fill: 'transparent',
        stroke: 'rgba(0, 51, 141, 0.15)',
        strokeWidth: 1,
        strokeDashArray: [4, 4],
        selectable: false,
        evented: false,
        name: 'margin'
      });
      this.canvas.add(rect);
      this.objects.marginRect = rect;
    }

    // Draw grid lines
    if (this.showGrid) {
      lines.forEach(line => {
        const fabricLine = new fabric.Line(
          [line.x1, line.y1, line.x2, line.y2],
          {
            stroke: line.major ? 'rgba(0, 51, 141, 0.12)' : 'rgba(0, 51, 141, 0.06)',
            strokeWidth: 1,
            selectable: false,
            evented: false,
            name: 'grid'
          }
        );
        this.canvas.add(fabricLine);
        this.objects.gridLines.push(fabricLine);
      });
    }

    this.requestRender();
  }

  /**
   * Add background image
   */
  async addBackgroundImage(imageElement) {
    if (this.objects.background) {
      this.canvas.remove(this.objects.background);
    }

    return new Promise((resolve) => {
      const img = new fabric.Image(imageElement, {
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        name: 'background'
      });

      const scaleX = this.canvas.width / img.width;
      const scaleY = this.canvas.height / img.height;
      const scale = Math.max(scaleX, scaleY);

      img.scale(scale);
      img.set({
        left: (this.canvas.width - img.width * scale) / 2,
        top: (this.canvas.height - img.height * scale) / 2
      });

      this.canvas.add(img);
      this.objects.background = img;
      this.canvas.sendToBack(img);

      resolve(img);
    });
  }

  /**
   * Add KPMG logo (LOCKED - top-left)
   */
  async addLogo(imageElement, placement) {
    if (this.objects.logo) {
      this.canvas.remove(this.objects.logo);
    }

    return new Promise((resolve) => {
      const img = new fabric.Image(imageElement, {
        left: placement.x,
        top: placement.y,
        scaleX: placement.scale,
        scaleY: placement.scale,
        selectable: false,
        evented: false,
        name: 'logo',
        lockRotation: true,
        lockScalingFlip: true
      });

      this.canvas.add(img);
      this.objects.logo = img;
      this.canvas.bringToFront(img);

      resolve(img);
    });
  }

  /**
   * Add tagline (LOCKED - bottom-left)
   */
  addTagline(text, placement) {
    if (this.objects.tagline) {
      this.canvas.remove(this.objects.tagline);
    }

    const textObj = new fabric.Text(text, {
      left: placement.x,
      top: placement.y,
      fontSize: placement.fontSize || 16,
      fontFamily: "'Univers', 'Helvetica Neue', Arial, sans-serif",
      fill: '#00338D',
      fontWeight: '500',
      selectable: false,
      evented: false,
      name: 'tagline',
      lockRotation: true
    });

    this.canvas.add(textObj);
    this.objects.tagline = textObj;
    this.canvas.bringToFront(textObj);

    return textObj;
  }

  /**
   * Add metadata (LOCKED - bottom-right)
   */
  addMetadata(text, placement) {
    if (this.objects.metadata) {
      this.canvas.remove(this.objects.metadata);
    }

    const textObj = new fabric.Text(text, {
      left: placement.x,
      top: placement.y,
      fontSize: placement.fontSize || 11,
      fontFamily: "'Univers', 'Helvetica Neue', Arial, sans-serif",
      fill: '#5A6B8A',
      textAlign: placement.align || 'right',
      selectable: false,
      evented: false,
      name: 'metadata',
      lockRotation: true
    });

    this.canvas.add(textObj);
    this.objects.metadata = textObj;
    this.canvas.bringToFront(textObj);

    return textObj;
  }

  /**
   * Add headline text (EDITABLE)
   */
  addHeadline(text, placement) {
    if (this.objects.headline) {
      this.canvas.remove(this.objects.headline);
    }

    const textObj = new fabric.Text(text, {
      left: placement.x,
      top: placement.y,
      fontSize: placement.fontSize || 36,
      fontFamily: "'KPMG Bold', 'Arial Black', 'Helvetica Neue', Arial, sans-serif",
      fill: '#1A2B4A',
      fontWeight: 'bold',
      selectable: true,
      evented: true,
      name: 'headline',
      lockRotation: true
    });

    this.canvas.add(textObj);
    this.objects.headline = textObj;
    this.canvas.bringToFront(textObj);

    return textObj;
  }

  /**
   * Add subheading text (EDITABLE)
   */
  addSubheading(text, placement) {
    if (this.objects.subheading) {
      this.canvas.remove(this.objects.subheading);
    }

    const textObj = new fabric.Text(text, {
      left: placement.x,
      top: placement.y,
      fontSize: placement.fontSize || 18,
      fontFamily: "'Univers', 'Helvetica Neue', Arial, sans-serif",
      fill: '#5A6B8A',
      selectable: true,
      evented: true,
      name: 'subheading',
      lockRotation: true
    });

    this.canvas.add(textObj);
    this.objects.subheading = textObj;
    this.canvas.bringToFront(textObj);

    return textObj;
  }

  /**
   * Add motif window (EDITABLE)
   */
  addMotif(motif) {
    if (this.objects.motif) {
      this.canvas.remove(this.objects.motif);
    }

    const rect = new fabric.Rect({
      left: motif.x,
      top: motif.y,
      width: motif.width,
      height: motif.height,
      fill: 'transparent',
      stroke: 'rgba(0, 51, 141, 0.3)',
      strokeWidth: 2,
      strokeDashArray: [6, 4],
      selectable: true,
      evented: true,
      name: 'motif',
      lockRotation: true
    });

    this.canvas.add(rect);
    this.objects.motif = rect;

    return rect;
  }

  /**
   * Add swoosh element (EDITABLE)
   */
  addSwoosh(swoosh) {
    if (this.objects.swoosh) {
      this.canvas.remove(this.objects.swoosh);
    }

    // Horizontal motion blur effect
    const blurRect = new fabric.Rect({
      left: swoosh.x,
      top: swoosh.y,
      width: swoosh.width,
      height: swoosh.height,
      fill: 'rgba(95, 215, 255, 0.15)',
      selectable: true,
      evented: true,
      name: 'swoosh',
      lockRotation: true
    });

    this.canvas.add(blurRect);
    this.objects.swoosh = blurRect;

    return blurRect;
  }

  /**
   * Apply color treatment
   */
  applyColorTreatment(treatment) {
    // Remove existing
    if (this.objects.treatment) {
      this.canvas.remove(this.objects.treatment);
    }

    const overlay = new fabric.Rect({
      left: 0,
      top: 0,
      width: this.canvas.width,
      height: this.canvas.height,
      fill: treatment.color || '#1E49E2',
      opacity: treatment.opacity || 0.85,
      selectable: false,
      evented: false,
      name: 'color-treatment'
    });

    // Set blend mode
    const blendModes = {
      'multiply': 'multiply',
      'hard-light': 'hard-light',
      'linear-light': 'hard-light',
      'color': 'color',
      'overlay': 'overlay'
    };
    overlay.globalCompositeOperation = blendModes[treatment.blendMode] || 'multiply';

    // Handle gradient
    if (treatment.lightTone) {
      const gradient = new fabric.Gradient({
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: this.canvas.height },
        colorStops: [
          { offset: 0, color: treatment.lightTone },
          { offset: 1, color: treatment.darkTone || treatment.color }
        ]
      });
      overlay.set('fill', gradient);
      overlay.globalCompositeOperation = 'color';
    }

    this.canvas.add(overlay);
    this.objects.treatment = overlay;
    overlay.moveTo(1); // Just above background

    this.requestRender();
  }

  /**
   * Snap object to grid
   */
  snapObjectToGrid(obj) {
    if (!this.gridSystem) return;

    const snapped = this.gridSystem.snapToGrid(
      obj.left,
      obj.top,
      obj.width * obj.scaleX,
      obj.height * obj.scaleY
    );

    obj.set({
      left: snapped.x,
      top: snapped.y
    });

    obj.setCoords();
    this.requestRender();
  }

  /**
   * Zoom controls
   */
  zoomIn() {
    const newZoom = Math.min(this.maxZoom, this.zoom * 1.2);
    this.setZoom(newZoom);
  }

  zoomOut() {
    const newZoom = Math.max(this.minZoom, this.zoom / 1.2);
    this.setZoom(newZoom);
  }

  setZoom(zoom) {
    this.zoom = zoom;
    this.canvas.setZoom(zoom);
    this.requestRender();
    this.updateZoomDisplay();
  }

  fitToScreen() {
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;

    const wrapperWidth = wrapper.clientWidth - 40;
    const wrapperHeight = wrapper.clientHeight - 40;

    const scaleX = wrapperWidth / this.canvas.width;
    const scaleY = wrapperHeight / this.canvas.height;
    const scale = Math.min(scaleX, scaleY, 1);

    this.setZoom(scale);

    const vpt = this.canvas.viewportTransform;
    vpt[4] = (wrapperWidth - this.canvas.width * scale) / 2;
    vpt[5] = (wrapperHeight - this.canvas.height * scale) / 2;
    this.canvas.requestRenderAll();
  }

  updateZoomDisplay() {
    const display = document.getElementById('zoom-level');
    if (display) {
      display.textContent = Math.round(this.zoom * 100) + '%';
    }
  }

  togglePanMode(enabled) {
    this.isPanning = enabled;
    this.canvas.selection = !enabled;
  }

  /**
   * Toggle layer
   */
  toggleLayer(layerName) {
    if (this.layers[layerName]) {
      this.layers[layerName].visible = !this.layers[layerName].visible;
      const obj = this.objects[layerName];
      if (obj) {
        if (Array.isArray(obj)) {
          obj.forEach(o => o.set('visible', this.layers[layerName].visible));
        } else {
          obj.set('visible', this.layers[layerName].visible);
        }
      }
      this.requestRender();
    }
  }

  /**
   * Clear canvas
   */
  clear() {
    this.canvas.clear();
    this.canvas.backgroundColor = '#ffffff';
    this.objects = {
      background: null,
      logo: null,
      tagline: null,
      metadata: null,
      motif: null,
      swoosh: null,
      headline: null,
      subheading: null,
      treatment: null,
      gridLines: [],
      marginRect: null,
      heatmap: null,
      negativeSpace: null,
      zones: []
    };
  }

  /**
   * Resize canvas
   */
  resize(width, height) {
    this.canvas.setWidth(width);
    this.canvas.setHeight(height);
    this.originalWidth = width;
    this.originalHeight = height;
    this.requestRender();
  }

  /**
   * Get canvas data URL
   */
  toDataURL(options = {}) {
    return this.canvas.toDataURL(options);
  }

  /**
   * Destroy
   */
  destroy() {
    if (this.renderLoopId) {
      cancelAnimationFrame(this.renderLoopId);
    }
    this.canvas.dispose();
  }

  /**
   * Draw accessibility heatmap overlay
   */
  drawHeatmap(heatmap) {
    // Remove existing heatmap
    if (this.objects.heatmap) {
      this.canvas.remove(this.objects.heatmap);
      this.objects.heatmap = null;
    }

    if (!heatmap || !this.showHeatmap) return;

    // Create heatmap overlay using rectangles
    const group = new fabric.Group([], {
      selectable: false,
      evented: false,
      name: 'heatmap'
    });

    heatmap.forEach(cell => {
      const rect = new fabric.Rect({
        left: cell.x,
        top: cell.y,
        width: cell.width,
        height: cell.height,
        fill: cell.color,
        selectable: false,
        evented: false
      });
      group.addWithUpdate(rect);
    });

    this.canvas.add(group);
    this.objects.heatmap = group;
    group.moveTo(95); // Just below AI overlay

    this.requestRender();
  }

  /**
   * Toggle heatmap visibility
   */
  toggleHeatmap(show) {
    this.showHeatmap = show;
    if (this.objects.heatmap) {
      this.objects.heatmap.set('visible', show);
      this.requestRender();
    }
  }

  /**
   * Draw unsafe regions highlight
   */
  drawUnsafeRegions(regions) {
    // Remove existing
    if (this.objects.unsafeRegions) {
      this.objects.unsafeRegions.forEach(r => this.canvas.remove(r));
    }
    this.objects.unsafeRegions = [];

    if (!regions) return;

    regions.forEach(region => {
      const rect = new fabric.Rect({
        left: region.x,
        top: region.y,
        width: region.width,
        height: region.height,
        fill: 'rgba(239, 68, 68, 0.15)',
        stroke: 'rgba(239, 68, 68, 0.5)',
        strokeWidth: 1,
        strokeDashArray: [4, 4],
        selectable: false,
        evented: false,
        name: 'unsafe-region'
      });

      this.canvas.add(rect);
      this.objects.unsafeRegions.push(rect);
      rect.moveTo(96);
    });

    this.requestRender();
  }
}

// Make available globally
window.CanvasManager = CanvasManager;

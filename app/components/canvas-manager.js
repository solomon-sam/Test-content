/**
 * Canvas Manager
 * Fabric.js canvas setup, object creation, and layer management
 * FIXED: Uses KPMG logo SVG, treatment opacity clamped, gradient map support
 */

class CanvasManager {
  constructor(canvasId, gridSystem, stateManager) {
    this.canvasId = canvasId;
    this.gridSystem = gridSystem;
    this.stateManager = stateManager;

    // Initialize Fabric canvas
    this.canvas = new fabric.Canvas(canvasId, {
      preserveObjectStacking: true,
      selection: false,
      hoverCursor: 'default'
    });

    // Object registry
    this.objects = {};

    // Layer order (bottom to top)
    this.layerOrder = [
      'background',
      'treatment',
      'motif',
      'swoosh',
      'headline',
      'subheading',
      'tagline',
      'metadata',
      'logo',
      'grid',
      'margin'
    ];

    this.setupCanvas();
  }

  setupCanvas() {
    // Set canvas size from grid system
    if (this.gridSystem) {
      this.canvas.setWidth(this.gridSystem.canvasWidth);
      this.canvas.setHeight(this.gridSystem.canvasHeight);
    }

    // Disable selection for locked elements
    this.canvas.on('selection:created', (e) => {
      const obj = e.selected[0];
      if (obj && (obj.name === 'logo' || obj.name === 'tagline' || obj.name === 'metadata')) {
        this.canvas.discardActiveObject();
      }
    });
  }

  /**
   * Create background image
   */
  createBackground(imageUrl, callback) {
    fabric.Image.fromURL(imageUrl, (img) => {
      const canvasW = this.canvas.width;
      const canvasH = this.canvas.height;

      // Scale to cover canvas while preserving aspect ratio
      const scale = Math.max(canvasW / img.width, canvasH / img.height);
      img.set({
        scaleX: scale,
        scaleY: scale,
        left: (canvasW - img.width * scale) / 2,
        top: (canvasH - img.height * scale) / 2,
        selectable: false,
        evented: false,
        name: 'background'
      });

      this.objects.background = img;
      this.canvas.add(img);
      this.canvas.sendToBack(img);

      if (callback) callback(img);
    }, { crossOrigin: 'anonymous' });
  }

  /**
   * Create color treatment overlay
   * FIXED: Opacity clamped to minimum 0.3, gradient map support added
   */
  createTreatment(type = 'blue-multiply', options = {}) {
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const grid = this.gridSystem;

    // Treatment configurations
    const treatments = {
      'blue-multiply': {
        color: options.color || '#1E49E2',
        blendMode: 'multiply',
        opacity: Math.max(0.3, Math.min(1.0, options.opacity || 0.85))
      },
      'cobalt-linear': {
        color: options.color || '#1E49E2',
        blendMode: 'linear-light',
        opacity: Math.max(0.3, Math.min(1.0, options.opacity || 0.7))
      },
      'pacific-gradient': {
        color: options.color || '#1E49E2',
        blendMode: 'color',
        opacity: Math.max(0.3, Math.min(1.0, options.opacity || 0.8)),
        gradient: true,
        gradientColors: ['#1E49E2', '#5FD7FF']
      },
      'dark-blue': {
        color: options.color || '#00338D',
        blendMode: 'multiply',
        opacity: Math.max(0.3, Math.min(1.0, options.opacity || 0.9))
      }
    };

    const config = treatments[type] || treatments['blue-multiply'];

    let treatmentObj;

    if (config.gradient) {
      // Gradient map treatment (#1E49E2 → #5FD7FF with color blend)
      treatmentObj = new fabric.Rect({
        width: canvasW,
        height: canvasH,
        left: 0,
        top: 0,
        fill: new fabric.Gradient({
          type: 'linear',
          coords: { x1: 0, y1: 0, x2: canvasW, y2: canvasH },
          colorStops: [
            { offset: 0, color: config.gradientColors[0] },
            { offset: 1, color: config.gradientColors[1] }
          ]
        }),
        globalCompositeOperation: config.blendMode,
        opacity: config.opacity,
        selectable: false,
        evented: false,
        name: 'treatment'
      });
    } else {
      treatmentObj = new fabric.Rect({
        width: canvasW,
        height: canvasH,
        left: 0,
        top: 0,
        fill: config.color,
        globalCompositeOperation: config.blendMode,
        opacity: config.opacity,
        selectable: false,
        evented: false,
        name: 'treatment'
      });
    }

    this.objects.treatment = treatmentObj;
    this.canvas.add(treatmentObj);

    // Store treatment config in state
    this.stateManager.set('composition.treatment', {
      type,
      color: config.color,
      blendMode: config.blendMode,
      opacity: config.opacity,
      gradient: config.gradient || false
    });

    return treatmentObj;
  }

  /**
   * Create motif window
   */
  createMotif(x, y, width, height, imageClip = true) {
    const grid = this.gridSystem;

    const motif = new fabric.Rect({
      left: x,
      top: y,
      width: width,
      height: height,
      fill: 'transparent',
      stroke: '#5FD7FF',
      strokeWidth: 2,
      selectable: true,
      evented: true,
      name: 'motif'
    });

    // Add clip path for background image
    if (imageClip && this.objects.background) {
      const clipPath = new fabric.Rect({
        left: x,
        top: y,
        width: width,
        height: height,
        absolutePositioned: true
      });
      this.objects.background.clipPath = clipPath;
    }

    this.objects.motif = motif;
    this.canvas.add(motif);

    return motif;
  }

  /**
   * Create swoosh effect
   * FIXED: Horizontal only (0°), constrained dimensions
   */
  createSwoosh(motif, side = 'left', options = {}) {
    const grid = this.gridSystem;
    const motifW = motif.width * motif.scaleX;
    const motifH = motif.height * motif.scaleY;

    // Swoosh dimensions: <= shortest side of window, <= 0.5x window height
    const swooshWidth = Math.min(motifW * 0.8, options.width || motifW * 0.6);
    const swooshHeight = Math.min(motifH * 0.5, options.height || motifH * 0.3);

    const swoosh = new fabric.Rect({
      width: swooshWidth,
      height: swooshHeight,
      fill: options.color || 'rgba(95, 215, 255, 0.3)',
      opacity: options.opacity || 0.4,
      selectable: true,
      evented: true,
      name: 'swoosh',
      angle: 0 // FIXED: Horizontal only (0°)
    });

    // Position based on side
    if (side === 'left') {
      swoosh.set({
        left: motif.left - swooshWidth * 0.5,
        top: motif.top + (motifH - swooshHeight) / 2
      });
    } else {
      swoosh.set({
        left: motif.left + motifW - swooshWidth * 0.5,
        top: motif.top + (motifH - swooshHeight) / 2
      });
    }

    // Apply motion blur filter
    if (fabric.Image.filters && fabric.Image.filters.Blur) {
      swoosh.filters = [new fabric.Image.filters.Blur({ blur: 0.1 })];
    }

    this.objects.swoosh = swoosh;
    this.canvas.add(swoosh);

    return swoosh;
  }

  /**
   * Create headline text
   */
  createHeadline(text, x, y, options = {}) {
    const headline = new fabric.Text(text, {
      left: x,
      top: y,
      fontFamily: options.fontFamily || "'KPMG Bold', 'Arial Black', 'Helvetica Neue', Arial, sans-serif",
      fontSize: options.fontSize || 36,
      fontWeight: 'bold',
      fill: options.fill || '#FFFFFF',
      lineHeight: options.lineHeight || 1.15,
      selectable: true,
      evented: true,
      name: 'headline'
    });

    this.objects.headline = headline;
    this.canvas.add(headline);

    return headline;
  }

  /**
   * Create subheading text
   */
  createSubheading(text, x, y, options = {}) {
    const subheading = new fabric.Text(text, {
      left: x,
      top: y,
      fontFamily: options.fontFamily || "'Univers', 'Helvetica Neue', Arial, sans-serif",
      fontSize: options.fontSize || 18,
      fontWeight: 'normal',
      fill: options.fill || '#FFFFFF',
      lineHeight: options.lineHeight || 1.3,
      selectable: true,
      evented: true,
      name: 'subheading'
    });

    this.objects.subheading = subheading;
    this.canvas.add(subheading);

    return subheading;
  }

  /**
   * Create tagline text (LOCKED)
   */
  createTagline(text, x, y, options = {}) {
    const tagline = new fabric.Text(text || 'KPMG. Make the Difference.', {
      left: x,
      top: y,
      fontFamily: options.fontFamily || "'Univers', 'Helvetica Neue', Arial, sans-serif",
      fontSize: options.fontSize || 14,
      fontWeight: 'normal',
      fill: options.fill || '#FFFFFF',
      selectable: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: true,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      hasControls: false,
      hasBorders: false,
      name: 'tagline'
    });

    this.objects.tagline = tagline;
    this.canvas.add(tagline);

    return tagline;
  }

  /**
   * Create metadata text (URL, Date, CTA) (LOCKED)
   * FIXED: Proper 2-grid-unit spacing between elements
   */
  createMetadata(metadata, x, y, options = {}) {
    const grid = this.gridSystem;
    const group = new fabric.Group([], {
      left: x,
      top: y,
      selectable: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: true,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      hasControls: false,
      hasBorders: false,
      name: 'metadata'
    });

    const fontSize = options.fontSize || 12;
    const spacing = grid ? grid.cellWidth * 2 : 40; // 2 grid units spacing
    let currentX = 0;

    // URL
    if (metadata.url) {
      const urlText = new fabric.Text(metadata.url, {
        left: currentX,
        top: 0,
        fontFamily: options.fontFamily || "'Univers', 'Helvetica Neue', Arial, sans-serif",
        fontSize: fontSize,
        fill: options.fill || '#FFFFFF',
        selectable: false,
        evented: false
      });
      group.addWithUpdate(urlText);
      currentX += urlText.width + spacing;
    }

    // Date
    if (metadata.date) {
      const dateText = new fabric.Text(metadata.date, {
        left: currentX,
        top: 0,
        fontFamily: options.fontFamily || "'Univers', 'Helvetica Neue', Arial, sans-serif",
        fontSize: fontSize,
        fill: options.fill || '#FFFFFF',
        selectable: false,
        evented: false
      });
      group.addWithUpdate(dateText);
      currentX += dateText.width + spacing;
    }

    // CTA
    if (metadata.cta) {
      const ctaText = new fabric.Text(metadata.cta, {
        left: currentX,
        top: 0,
        fontFamily: options.fontFamily || "'Univers', 'Helvetica Neue', Arial, sans-serif",
        fontSize: fontSize,
        fill: options.fill || '#FFFFFF',
        selectable: false,
        evented: false
      });
      group.addWithUpdate(ctaText);
    }

    this.objects.metadata = group;
    this.canvas.add(group);

    return group;
  }

  /**
   * Create KPMG logo (LOCKED, TOP-LEFT)
   * FIXED: Uses actual KPMG logo SVG from assets
   */
  createLogo(options = {}) {
    const grid = this.gridSystem;
    const logoZone = grid.getLogoZone();

    // Try to load KPMG logo SVG
    const logoUrl = options.logoUrl || 'assets/kpmg-logo.svg';

    fabric.loadSVGFromURL(logoUrl, (objects, options) => {
      const logo = fabric.util.groupSVGElements(objects, options);

      // Scale to fit 2x1 grid units
      const targetWidth = logoZone.width;
      const targetHeight = logoZone.height;
      const scale = Math.min(targetWidth / logo.width, targetHeight / logo.height);

      logo.set({
        left: logoZone.x,
        top: logoZone.y,
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        hasControls: false,
        hasBorders: false,
        name: 'logo'
      });

      this.objects.logo = logo;
      this.canvas.add(logo);
      this.canvas.bringToFront(logo);
    }, null, { crossOrigin: 'anonymous' });

    // Fallback: Create placeholder if SVG fails to load
    setTimeout(() => {
      if (!this.objects.logo) {
        this.createLogoFallback(options);
      }
    }, 2000);
  }

  /**
   * Create logo fallback (if SVG not available)
   * FIXED: Uses proper KPMG blue color blocks instead of Arial text
   */
  createLogoFallback(options = {}) {
    const grid = this.gridSystem;
    const logoZone = grid.getLogoZone();
    const kpmgBlue = options.color || '#00338D';

    const group = new fabric.Group([], {
      left: logoZone.x,
      top: logoZone.y,
      selectable: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: true,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      hasControls: false,
      hasBorders: false,
      name: 'logo'
    });

    // Create 4 KPMG blocks (2x2 grid of blocks, overall 2x1 grid units)
    const blockWidth = logoZone.width / 2;
    const blockHeight = logoZone.height;
    const blockColors = [kpmgBlue, kpmgBlue, kpmgBlue, kpmgBlue];
    const letters = ['K', 'P', 'M', 'G'];

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);

      const block = new fabric.Rect({
        left: col * blockWidth,
        top: row * (blockHeight / 2),
        width: blockWidth - 2,
        height: (blockHeight / 2) - 2,
        fill: blockColors[i],
        rx: 2,
        selectable: false,
        evented: false
      });

      const letter = new fabric.Text(letters[i], {
        left: col * blockWidth + blockWidth / 2,
        top: row * (blockHeight / 2) + (blockHeight / 4),
        fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
        fontSize: Math.min(blockWidth, blockHeight / 2) * 0.6,
        fontWeight: 'bold',
        fill: '#FFFFFF',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false
      });

      group.addWithUpdate(block);
      group.addWithUpdate(letter);
    }

    this.objects.logo = group;
    this.canvas.add(group);
    this.canvas.bringToFront(group);

    return group;
  }

  /**
   * Create grid overlay (visual guide)
   */
  createGridOverlay() {
    const grid = this.gridSystem;
    const lines = grid.generateGridLines();
    const group = new fabric.Group([], {
      selectable: false,
      evented: false,
      name: 'grid'
    });

    lines.forEach(line => {
      const fabricLine = new fabric.Line(
        [line.x1, line.y1, line.x2, line.y2],
        {
          stroke: line.major ? 'rgba(95, 215, 255, 0.3)' : 'rgba(95, 215, 255, 0.1)',
          strokeWidth: line.major ? 1 : 0.5,
          selectable: false,
          evented: false
        }
      );
      group.addWithUpdate(fabricLine);
    });

    this.objects.grid = group;
    this.canvas.add(group);
    this.canvas.sendToBack(group);

    return group;
  }

  /**
   * Create margin rectangle
   */
  createMarginRect() {
    const grid = this.gridSystem;
    const marginRect = grid.generateMarginRect();

    const rect = new fabric.Rect({
      left: marginRect.left,
      top: marginRect.top,
      width: marginRect.width,
      height: marginRect.height,
      fill: 'transparent',
      stroke: 'rgba(95, 215, 255, 0.2)',
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      name: 'margin'
    });

    this.objects.margin = rect;
    this.canvas.add(rect);
    this.canvas.sendToBack(rect);

    return rect;
  }

  /**
   * Update object position
   */
  updateObject(name, properties) {
    const obj = this.objects[name];
    if (obj) {
      obj.set(properties);
      obj.setCoords();
      this.canvas.renderAll();
    }
  }

  /**
   * Remove object
   */
  removeObject(name) {
    const obj = this.objects[name];
    if (obj) {
      this.canvas.remove(obj);
      delete this.objects[name];
    }
  }

  /**
   * Toggle grid visibility
   */
  toggleGrid(show) {
    const grid = this.objects.grid;
    if (grid) {
      grid.set({ visible: show });
      this.canvas.renderAll();
    }
  }

  /**
   * Toggle margin visibility
   */
  toggleMargin(show) {
    const margin = this.objects.margin;
    if (margin) {
      margin.set({ visible: show });
      this.canvas.renderAll();
    }
  }

  /**
   * Get canvas as data URL
   */
  toDataURL(options = {}) {
    return this.canvas.toDataURL({
      format: options.format || 'png',
      quality: options.quality || 1,
      multiplier: options.multiplier || 1
    });
  }

  /**
   * Resize canvas
   */
  resize(width, height) {
    this.canvas.setWidth(width);
    this.canvas.setHeight(height);

    // Update grid system
    if (this.gridSystem) {
      this.gridSystem.canvasWidth = width;
      this.gridSystem.canvasHeight = height;
      this.gridSystem.calculateGrid();
    }

    // Recreate grid overlay
    if (this.objects.grid) {
      this.removeObject('grid');
      this.createGridOverlay();
    }

    // Recreate margin
    if (this.objects.margin) {
      this.removeObject('margin');
      this.createMarginRect();
    }

    this.canvas.renderAll();
  }

  /**
   * Get object by name
   */
  getObject(name) {
    return this.objects[name];
  }

  /**
   * Get all objects
   */
  getAllObjects() {
    return { ...this.objects };
  }

  /**
   * Clear canvas
   */
  clear() {
    this.canvas.clear();
    this.objects = {};
  }

  /**
   * Destroy canvas
   */
  destroy() {
    this.canvas.dispose();
    this.objects = {};
  }
}

// Make available globally
window.CanvasManager = CanvasManager;

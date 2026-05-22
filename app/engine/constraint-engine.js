/**
 * Constraint Engine — Phase 3C
 * Soft constraints, elastic snap, and magnetic feel for brand-compliant editing
 * FIXED: Logo completely removed from editable elements (locked top-left)
 */

class ConstraintEngine {
  constructor(canvas, gridSystem, stateManager) {
    this.canvas = canvas;
    this.gridSystem = gridSystem;
    this.stateManager = stateManager;

    // Constraint parameters
    this.snapRadius = 30;
    this.elasticStrength = 0.3;
    this.magneticThreshold = 50;
    this.baselineSnapStrength = 0.5;

    // Track which elements are being dragged
    this.draggingElement = null;
    this.dragStartPos = null;
    this.lastValidPos = null;

    // Constraint zones
    this.zones = this.buildConstraintZones();

    this.setupEventListeners();
  }

  /**
   * Build constraint zones from grid system
   */
  buildConstraintZones() {
    const grid = this.gridSystem;
    if (!grid) return {};

    // Logo zone (TOP-LEFT, LOCKED - not in editable zones)
    const logoZone = grid.getLogoZone();

    // Motif safe zone (must not overlap logo + 2 grid units safety)
    const motifSafeZone = {
      x: logoZone.x + logoZone.width + grid.cellWidth * 2,
      y: logoZone.y + logoZone.height + grid.cellHeight * 2,
      width: grid.canvasWidth - (logoZone.x + logoZone.width + grid.cellWidth * 2) - grid.margin,
      height: grid.canvasHeight - (logoZone.y + logoZone.height + grid.cellHeight * 2) - grid.margin
    };

    // Typography safe zones
    const textZones = grid.getSafeTextRegions();

    // Swoosh attachment zones (left/right of motif)
    const swooshZones = {
      left: { x: 0, y: 0, width: grid.cellWidth * 2, height: 0 },
      right: { x: 0, y: 0, width: grid.cellWidth * 2, height: 0 }
    };

    return {
      logo: logoZone,
      motifSafe: motifSafeZone,
      text: textZones,
      swoosh: swooshZones,
      margin: grid.margin,
      safeZone: grid.getSafeZone()
    };
  }

  /**
   * Setup canvas event listeners
   */
  setupEventListeners() {
    this.canvas.on('object:moving', (e) => this.onObjectMoving(e));
    this.canvas.on('object:modified', (e) => this.onObjectModified(e));
    this.canvas.on('object:moved', (e) => this.onObjectMoved(e));
    this.canvas.on('object:scaling', (e) => this.onObjectScaling(e));
    this.canvas.on('object:rotating', (e) => this.onObjectRotating(e));
  }

  /**
   * Handle object moving
   */
  onObjectMoving(e) {
    const obj = e.target;
    if (!obj) return;

    // FIXED: Logo is completely locked - no movement allowed
    if (obj.name === 'logo') {
      // Immediately reset to locked position
      const logoZone = this.gridSystem.getLogoZone();
      obj.set({
        left: logoZone.x,
        top: logoZone.y,
        selectable: false,
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        hasControls: false,
        hasBorders: false
      });
      obj.setCoords();
      this.canvas.renderAll();
      return;
    }

    // Tagline and metadata are also locked
    if (obj.name === 'tagline' || obj.name === 'metadata') {
      const zone = obj.name === 'tagline' ? 
        this.gridSystem.getTaglineZone() : 
        this.gridSystem.getMetadataZone();
      obj.set({
        left: zone.x,
        top: zone.y,
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        hasControls: false,
        hasBorders: false
      });
      obj.setCoords();
      this.canvas.renderAll();
      return;
    }

    this.draggingElement = obj.name;
    if (!this.dragStartPos) {
      this.dragStartPos = { x: obj.left, y: obj.top };
    }

    // Apply constraints
    this.applyConstraints(obj);

    // Update state
    this.stateManager.set('composition.lastModified', Date.now());
  }

  /**
   * Handle object modified (drag end)
   */
  onObjectModified(e) {
    const obj = e.target;
    if (!obj || obj.name === 'logo' || obj.name === 'tagline' || obj.name === 'metadata') return;

    // Snap to final position
    this.finalSnap(obj);

    // Update state
    this.stateManager.set('composition.lastModified', Date.now());
    this.stateManager.set(`composition.${obj.name}`, {
      x: obj.left,
      y: obj.top,
      width: obj.width * obj.scaleX,
      height: obj.height * obj.scaleY,
      angle: obj.angle
    });

    // Reset drag tracking
    this.draggingElement = null;
    this.dragStartPos = null;
  }

  onObjectMoved(e) {
    // Alias for modified
    this.onObjectModified(e);
  }

  /**
   * Handle object scaling
   */
  onObjectScaling(e) {
    const obj = e.target;
    if (!obj || obj.name === 'logo' || obj.name === 'tagline' || obj.name === 'metadata') return;

    // Constrain scaling to maintain aspect ratio for motif
    if (obj.name === 'motif') {
      const ratio = obj.width / obj.height;
      // Ensure ratio stays close to 7:10 or 10:7
      const targetRatios = [7/10, 10/7];
      const currentRatio = (obj.width * obj.scaleX) / (obj.height * obj.scaleY);

      const closestRatio = targetRatios.reduce((closest, r) =>
        Math.abs(r - currentRatio) < Math.abs(closest - currentRatio) ? r : closest
      );

      if (Math.abs(currentRatio - closestRatio) > 0.1) {
        // Snap ratio
        const newHeight = (obj.width * obj.scaleX) / closestRatio;
        obj.set({ scaleY: newHeight / obj.height });
      }
    }

    // Prevent scaling beyond safe zone
    const safeZone = this.zones.safeZone;
    const newWidth = obj.width * obj.scaleX;
    const newHeight = obj.height * obj.scaleY;

    if (obj.left + newWidth > safeZone.x + safeZone.width) {
      obj.set({ scaleX: (safeZone.x + safeZone.width - obj.left) / obj.width });
    }
    if (obj.top + newHeight > safeZone.y + safeZone.height) {
      obj.set({ scaleY: (safeZone.y + safeZone.height - obj.top) / obj.height });
    }

    obj.setCoords();
  }

  /**
   * Handle object rotation
   */
  onObjectRotating(e) {
    const obj = e.target;
    if (!obj || obj.name === 'logo' || obj.name === 'tagline' || obj.name === 'metadata') return;

    // Constrain rotation for swoosh (horizontal only = 0°)
    if (obj.name === 'swoosh') {
      const angle = obj.angle % 360;
      // Snap to 0° or 180° (horizontal)
      const snapAngles = [0, 180, 360];
      const closestAngle = snapAngles.reduce((closest, a) =>
        Math.abs(a - angle) < Math.abs(closest - angle) ? a : closest
      );

      if (Math.abs(angle - closestAngle) < 15) {
        obj.set({ angle: closestAngle });
      }
    }

    // Prevent rotation for other elements
    if (obj.name === 'motif' || obj.name === 'headline' || obj.name === 'subheading') {
      obj.set({ angle: 0 });
    }

    obj.setCoords();
  }

  /**
   * Apply all constraints during drag
   */
  applyConstraints(obj) {
    const grid = this.gridSystem;

    // 1. Safe zone constraint
    this.constrainToSafeZone(obj);

    // 2. Grid snap with elastic feel
    this.applyGridSnap(obj);

    // 3. Baseline snap for text
    if (obj.name === 'headline' || obj.name === 'subheading') {
      this.applyBaselineSnap(obj);
    }

    // 4. Logo safe zone (motif must not overlap)
    if (obj.name === 'motif') {
      this.constrainMotifFromLogo(obj);
    }

    // 5. Motif attachment for swoosh
    if (obj.name === 'swoosh') {
      this.constrainSwooshToMotif(obj);
    }

    // 6. Typography safe zones
    if (obj.name === 'headline' || obj.name === 'subheading') {
      this.constrainTextToSafeZones(obj);
    }

    obj.setCoords();
  }

  /**
   * Constrain object to safe zone
   */
  constrainToSafeZone(obj) {
    const safeZone = this.zones.safeZone;
    const margin = this.zones.margin;

    // Left boundary
    if (obj.left < safeZone.x) {
      obj.set({ left: safeZone.x });
    }

    // Top boundary
    if (obj.top < safeZone.y) {
      obj.set({ top: safeZone.y });
    }

    // Right boundary
    const rightEdge = obj.left + obj.width * obj.scaleX;
    if (rightEdge > safeZone.x + safeZone.width) {
      obj.set({ left: safeZone.x + safeZone.width - obj.width * obj.scaleX });
    }

    // Bottom boundary
    const bottomEdge = obj.top + obj.height * obj.scaleY;
    if (bottomEdge > safeZone.y + safeZone.height) {
      obj.set({ top: safeZone.y + safeZone.height - obj.height * obj.scaleY });
    }
  }

  /**
   * Apply grid snap with elastic feel
   */
  applyGridSnap(obj) {
    const grid = this.gridSystem;
    const snapX = grid.getColumnSnap(obj.left, this.snapRadius);
    const snapY = grid.getRowSnap(obj.top, this.snapRadius);

    // Elastic interpolation
    const elasticX = obj.left + (snapX - obj.left) * this.elasticStrength;
    const elasticY = obj.top + (snapY - obj.top) * this.elasticStrength;

    obj.set({ left: elasticX, top: elasticY });
  }

  /**
   * Apply baseline snap for text elements
   */
  applyBaselineSnap(obj) {
    const grid = this.gridSystem;
    const snapY = grid.snapToBaseline(obj.top);
    const dist = Math.abs(obj.top - snapY);

    if (dist < this.snapRadius * 0.5) {
      const elasticY = obj.top + (snapY - obj.top) * this.baselineSnapStrength;
      obj.set({ top: elasticY });
    }
  }

  /**
   * Constrain motif from logo safe zone
   */
  constrainMotifFromLogo(obj) {
    const logoZone = this.zones.logo;
    const logoSafeX = logoZone.x + logoZone.width + this.gridSystem.cellWidth * 2;
    const logoSafeY = logoZone.y + logoZone.height + this.gridSystem.cellHeight * 2;

    // If motif overlaps logo safe zone, push it away
    const motifRight = obj.left + obj.width * obj.scaleX;
    const motifBottom = obj.top + obj.height * obj.scaleY;

    if (obj.left < logoSafeX && obj.top < logoSafeY) {
      // Motif is in logo danger zone - push right or down
      const pushRight = logoSafeX - obj.left;
      const pushDown = logoSafeY - obj.top;

      if (pushRight < pushDown) {
        obj.set({ left: logoSafeX });
      } else {
        obj.set({ top: logoSafeY });
      }
    }
  }

  /**
   * Constrain swoosh to attach to motif
   */
  constrainSwooshToMotif(obj) {
    const motif = this.canvas.getObjects().find(o => o.name === 'motif');
    if (!motif || !motif.visible) return;

    const motifLeft = motif.left;
    const motifRight = motif.left + motif.width * motif.scaleX;
    const motifCenterY = motif.top + motif.height * motif.scaleY / 2;

    const swooshCenterX = obj.left + obj.width * obj.scaleX / 2;
    const distToLeft = Math.abs(swooshCenterX - motifLeft);
    const distToRight = Math.abs(swooshCenterX - motifRight);

    // Magnetic snap to motif sides
    if (distToLeft < this.magneticThreshold || distToRight < this.magneticThreshold) {
      const snapX = distToLeft < distToRight ? motifLeft : motifRight;
      const elasticX = obj.left + (snapX - obj.left) * this.elasticStrength;
      obj.set({ left: elasticX });

      // Align Y to motif center
      const targetY = motifCenterY - obj.height * obj.scaleY / 2;
      const elasticY = obj.top + (targetY - obj.top) * this.elasticStrength;
      obj.set({ top: elasticY });
    }

    // Constrain swoosh to horizontal (0°)
    if (obj.angle !== 0 && obj.angle !== 180) {
      obj.set({ angle: 0 });
    }
  }

  /**
   * Constrain text to safe zones
   */
  constrainTextToSafeZones(obj) {
    const textZones = this.zones.text;
    if (!textZones || textZones.length === 0) return;

    const objCenter = {
      x: obj.left + obj.width * obj.scaleX / 2,
      y: obj.top + obj.height * obj.scaleY / 2
    };

    // Check if in any safe zone
    let inSafeZone = false;
    for (const zone of textZones) {
      if (objCenter.x >= zone.x && objCenter.x <= zone.x + zone.width &&
          objCenter.y >= zone.y && objCenter.y <= zone.y + zone.height) {
        inSafeZone = true;
        break;
      }
    }

    if (!inSafeZone) {
      // Push towards nearest safe zone
      const nearestZone = textZones.reduce((nearest, zone) => {
        const zoneCenter = {
          x: zone.x + zone.width / 2,
          y: zone.y + zone.height / 2
        };
        const dist = Math.hypot(objCenter.x - zoneCenter.x, objCenter.y - zoneCenter.y);
        return dist < nearest.dist ? { zone, dist } : nearest;
      }, { zone: textZones[0], dist: Infinity });

      const targetX = nearestZone.zone.x + nearestZone.zone.width / 2 - obj.width * obj.scaleX / 2;
      const targetY = nearestZone.zone.y + nearestZone.zone.height / 2 - obj.height * obj.scaleY / 2;

      obj.set({
        left: obj.left + (targetX - obj.left) * 0.1,
        top: obj.top + (targetY - obj.top) * 0.1
      });
    }
  }

  /**
   * Final snap when drag ends
   */
  finalSnap(obj) {
    const grid = this.gridSystem;

    // Hard snap to grid
    const snapped = grid.snapToGrid(obj.left, obj.top, obj.width * obj.scaleX, obj.height * obj.scaleY);
    obj.set({ left: snapped.x, top: snapped.y });

    // Snap to baseline for text
    if (obj.name === 'headline' || obj.name === 'subheading') {
      const baselineY = grid.snapToBaseline(obj.top);
      obj.set({ top: baselineY });
    }

    // Ensure swoosh is horizontal
    if (obj.name === 'swoosh') {
      obj.set({ angle: 0 });
    }

    obj.setCoords();
  }

  /**
   * Update constraint zones when grid changes
   */
  updateZones() {
    this.zones = this.buildConstraintZones();
  }

  /**
   * Get constraint info for debugging
   */
  getInfo() {
    return {
      snapRadius: this.snapRadius,
      elasticStrength: this.elasticStrength,
      magneticThreshold: this.magneticThreshold,
      zones: this.zones,
      dragging: this.draggingElement
    };
  }
}

// Make available globally
window.ConstraintEngine = ConstraintEngine;

/**
 * Constraint Engine — Phase 3B
 * Soft constraint system with elastic snapping, magnetic feel,
 * and soft boundaries for manual editing mode.
 */

class ConstraintEngine {
  constructor(gridSystem) {
    this.gridSystem = gridSystem;
    this.stiffness = 0.6; // Elastic resistance stiffness (0-1)
    this.magneticRadius = 0.3; // Grid cell fraction for magnetic snap
  }

  /**
   * Snap to grid with easing (soft magnetic feel)
   */
  snapToGrid(x, y, elementType = 'generic') {
    if (!this.gridSystem) return { x, y };

    const grid = this.gridSystem;
    const col = (x - grid.margin) / (grid.cellWidth + grid.gutter);
    const row = (y - grid.margin) / (grid.cellHeight + grid.gutter);

    const nearestCol = Math.round(col);
    const nearestRow = Math.round(row);

    const snapX = grid.margin + nearestCol * (grid.cellWidth + grid.gutter);
    const snapY = grid.margin + nearestRow * (grid.cellHeight + grid.gutter);

    const distX = Math.abs(x - snapX);
    const distY = Math.abs(y - snapY);

    const radiusX = grid.cellWidth * this.magneticRadius;
    const radiusY = grid.cellHeight * this.magneticRadius;

    let resultX = x;
    let resultY = y;

    // Magnetic snap with smoothstep easing
    if (distX < radiusX) {
      const t = distX / radiusX;
      const eased = t * t * (3 - 2 * t); // smoothstep
      resultX = snapX + (x - snapX) * eased;
    }

    if (distY < radiusY) {
      const t = distY / radiusY;
      const eased = t * t * (3 - 2 * t);
      resultY = snapY + (y - snapY) * eased;
    }

    return { x: resultX, y: resultY };
  }

  /**
   * Snap Y coordinate to baseline grid
   */
  snapToBaseline(y) {
    if (!this.gridSystem) return y;
    return this.gridSystem.snapToBaseline(y);
  }

  /**
   * Constrain position to safe margins with elastic resistance
   */
  constrainToMargins(x, y, w, h) {
    if (!this.gridSystem) return { x, y };

    const grid = this.gridSystem;
    const margin = grid.margin;
    const maxX = grid.canvasWidth - margin - w;
    const maxY = grid.canvasHeight - margin - h;

    return {
      x: this.applyElasticResistance(x, margin, maxX, this.stiffness),
      y: this.applyElasticResistance(y, margin, maxY, this.stiffness)
    };
  }

  /**
   * Constrain motif to respect logo zone and other brand elements
   */
  constrainMotif(x, y, w, h, logoZone) {
    if (!this.gridSystem) return { x, y };

    const grid = this.gridSystem;
    let result = { x, y };

    // Must not overlap logo zone (2 grid unit safety)
    if (logoZone) {
      const safeLogoX = logoZone.x + logoZone.width + grid.cellWidth * 2;
      const safeLogoY = logoZone.y + logoZone.height + grid.cellHeight * 2;

      if (x < safeLogoX && y < safeLogoY) {
        // Push away from logo zone
        const pushX = safeLogoX - x;
        const pushY = safeLogoY - y;
        if (pushX < pushY) {
          result.x = this.applyElasticResistance(x, safeLogoX, grid.canvasWidth - grid.margin - w, this.stiffness);
        } else {
          result.y = this.applyElasticResistance(y, safeLogoY, grid.canvasHeight - grid.margin - h, this.stiffness);
        }
      }
    }

    // Must respect margins
    result = this.constrainToMargins(result.x, result.y, w, h);

    return result;
  }

  /**
   * Constrain typography to safe text regions
   */
  constrainTypography(x, y, w, h, motif, logoZone) {
    if (!this.gridSystem) return { x, y };

    const grid = this.gridSystem;
    let result = { x, y };

    // Must not overlap motif window (1 grid unit safety)
    if (motif) {
      const safeMotifX = motif.x - grid.cellWidth;
      const safeMotifRight = motif.x + motif.width + grid.cellWidth;
      const safeMotifY = motif.y - grid.cellHeight;
      const safeMotifBottom = motif.y + motif.height + grid.cellHeight;

      // Check overlap
      const overlapX = !(x + w < safeMotifX || x > safeMotifRight);
      const overlapY = !(y + h < safeMotifY || y > safeMotifBottom);

      if (overlapX && overlapY) {
        // Determine which direction to push
        const leftDist = Math.abs(x + w - safeMotifX);
        const rightDist = Math.abs(x - safeMotifRight);
        const topDist = Math.abs(y + h - safeMotifY);
        const bottomDist = Math.abs(y - safeMotifBottom);

        const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);

        if (minDist === leftDist) {
          result.x = safeMotifX - w - grid.cellWidth * 0.5;
        } else if (minDist === rightDist) {
          result.x = safeMotifRight + grid.cellWidth * 0.5;
        } else if (minDist === topDist) {
          result.y = safeMotifY - h - grid.cellHeight * 0.5;
        } else {
          result.y = safeMotifBottom + grid.cellHeight * 0.5;
        }
      }
    }

    // Must not overlap logo zone (2 grid units)
    if (logoZone) {
      const safeLogoRight = logoZone.x + logoZone.width + grid.cellWidth * 2;
      const safeLogoBottom = logoZone.y + logoZone.height + grid.cellHeight * 2;

      if (x < safeLogoRight && y < safeLogoBottom) {
        if (safeLogoRight - x < safeLogoBottom - y) {
          result.x = Math.max(result.x, safeLogoRight);
        } else {
          result.y = Math.max(result.y, safeLogoBottom);
        }
      }
    }

    // Baseline snap for text
    result.y = this.snapToBaseline(result.y);

    // Margin constraints
    result = this.constrainToMargins(result.x, result.y, w, h);

    return result;
  }

  /**
   * Apply elastic resistance (soft push-back beyond boundaries)
   */
  applyElasticResistance(value, min, max, stiffness) {
    if (value >= min && value <= max) return value;

    const boundary = value < min ? min : max;
    const overflow = value < min ? min - value : value - max;

    // Elastic formula: resistance increases with distance
    const resistance = 1 - Math.exp(-overflow * stiffness * 0.1);
    const elasticOverflow = overflow * resistance;

    return value < min ? boundary - elasticOverflow : boundary + elasticOverflow;
  }

  /**
   * Calculate magnetic snap feel for multiple snap points
   */
  calculateMagneticSnap(value, snapPoints, radius) {
    let closestDist = Infinity;
    let closestPoint = value;

    for (const point of snapPoints) {
      const dist = Math.abs(value - point);
      if (dist < radius && dist < closestDist) {
        closestDist = dist;
        closestPoint = point;
      }
    }

    if (closestDist < radius) {
      const t = closestDist / radius;
      const eased = t * t * (3 - 2 * t);
      return closestPoint + (value - closestPoint) * eased;
    }

    return value;
  }

  /**
   * Get constraint visualization data (for UI feedback)
   */
  getConstraintVisuals(elementName, x, y, w, h) {
    const visuals = [];
    const grid = this.gridSystem;
    if (!grid) return visuals;

    // Margin boundaries
    visuals.push({
      type: 'boundary',
      x: grid.margin,
      y: grid.margin,
      width: grid.canvasWidth - grid.margin * 2,
      height: grid.canvasHeight - grid.margin * 2,
      color: 'rgba(0, 51, 141, 0.08)',
      label: 'Safe margin'
    });

    // Logo safe zone
    const logoZone = grid.getLogoZone();
    visuals.push({
      type: 'exclusion',
      x: logoZone.x,
      y: logoZone.y,
      width: logoZone.width + grid.cellWidth * 2,
      height: logoZone.height + grid.cellHeight * 2,
      color: 'rgba(239, 68, 68, 0.06)',
      label: 'Logo safe zone'
    });

    return visuals;
  }

  /**
   * Check if proposed position violates any hard constraints
   */
  validatePosition(elementName, x, y, w, h, context = {}) {
    const violations = [];
    const grid = this.gridSystem;
    if (!grid) return violations;

    // Margin violation
    if (x < grid.margin || y < grid.margin ||
        x + w > grid.canvasWidth - grid.margin ||
        y + h > grid.canvasHeight - grid.margin) {
      violations.push({ type: 'margin', severity: 'hard', message: 'Element exceeds safe margins' });
    }

    // Logo overlap (hard constraint)
    const logoZone = grid.getLogoZone();
    const logoSafe = {
      x: logoZone.x,
      y: logoZone.y,
      width: logoZone.width + grid.cellWidth * 2,
      height: logoZone.height + grid.cellHeight * 2
    };

    const overlapLogo = !(x + w < logoSafe.x || x > logoSafe.x + logoSafe.width ||
                         y + h < logoSafe.y || y > logoSafe.y + logoSafe.height);

    if (overlapLogo && elementName !== 'logo') {
      violations.push({ type: 'logo', severity: 'hard', message: 'Element overlaps logo safe zone' });
    }

    // Motif-typography overlap (soft constraint for editable elements)
    if (context.motif && (elementName === 'headline' || elementName === 'subheading')) {
      const motifSafe = {
        x: context.motif.x - grid.cellWidth,
        y: context.motif.y - grid.cellHeight,
        width: context.motif.width + grid.cellWidth * 2,
        height: context.motif.height + grid.cellHeight * 2
      };

      const overlapMotif = !(x + w < motifSafe.x || x > motifSafe.x + motifSafe.width ||
                             y + h < motifSafe.y || y > motifSafe.y + motifSafe.height);

      if (overlapMotif) {
        violations.push({ type: 'motif', severity: 'soft', message: 'Typography too close to motif window' });
      }
    }

    return violations;
  }

  /**
   * Update grid system reference (called on canvas resize)
   */
  setGridSystem(gridSystem) {
    this.gridSystem = gridSystem;
  }
}

// Make available globally
window.ConstraintEngine = ConstraintEngine;

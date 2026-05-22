/**
 * Composition Engine
 * Auto-composition of brand elements with KPMG brand rules
 * FIXED: Logo now strictly locked to top-left per brand guidelines
 */

class CompositionEngine {
  constructor(canvas, gridSystem) {
    this.canvas = canvas;
    this.gridSystem = gridSystem;
  }

  async autoCompose(logoImage, brandSettings) {
    const placements = {};
    const grid = this.gridSystem;

    // Logo placement (TOP-LEFT, LOCKED per KPMG rules)
    // BRAND RULE: Logo is always at top-left, never moves based on saliency
    const logoZone = grid.getLogoZone();
    placements.logo = {
      x: logoZone.x,
      y: logoZone.y,
      width: logoZone.width,
      height: logoZone.height,
      scale: logoImage ? logoZone.width / 200 : 1,
      locked: true,
      name: 'logo'
    };

    // Tagline placement (BOTTOM-LEFT, LOCKED)
    const taglineZone = grid.getTaglineZone();
    placements.tagline = {
      x: taglineZone.x,
      y: taglineZone.y,
      fontSize: Math.max(12, Math.min(18, grid.canvasWidth / 80)),
      locked: true,
      name: 'tagline'
    };

    // Metadata placement (BOTTOM-RIGHT, LOCKED)
    const metadataZone = grid.getMetadataZone();
    placements.metadata = {
      x: metadataZone.x,
      y: metadataZone.y,
      fontSize: Math.max(10, Math.min(14, grid.canvasWidth / 100)),
      align: 'right',
      locked: true,
      name: 'metadata'
    };

    return placements;
  }

  /**
   * REMOVED: calculateOptimalLogoPosition
   * KPMG brand rule: Logo is ALWAYS top-left, locked, never moves.
   * No saliency-based positioning allowed.
   */

  /**
   * Calculate optimal text position based on negative space analysis
   */
  calculateOptimalTextPosition(analysis, logoPosition) {
    const zones = this.gridSystem.getTextZones();

    if (!analysis || !analysis.negativeSpace) {
      return zones[0]; // Default bottom
    }

    const regions = analysis.negativeSpace.regions;
    if (regions.length === 0) {
      return zones[0];
    }

    // Find region with best score that doesn't overlap with logo
    // BRAND RULE: Logo safe zone is 2 grid units
    const logoSafe = {
      x: logoPosition.x,
      y: logoPosition.y,
      width: logoPosition.width + this.gridSystem.cellWidth * 2,
      height: logoPosition.height + this.gridSystem.cellHeight * 2
    };

    let bestRegion = regions[0];
    let bestScore = 0;

    regions.forEach(region => {
      const overlap = this.calculateOverlap(region, logoSafe);
      const score = region.score * (1 - overlap);

      if (score > bestScore) {
        bestScore = score;
        bestRegion = region;
      }
    });

    return {
      x: bestRegion.x,
      y: bestRegion.y,
      width: bestRegion.w,
      height: bestRegion.h
    };
  }

  /**
   * Calculate optimal motif position
   * Respects logo safe zone (2 grid units) and maintains 7:10 or 10:7 ratio
   */
  calculateOptimalMotifPosition(analysis, logoPosition, textPosition) {
    if (!analysis || !analysis.saliency) {
      const grid = this.gridSystem;
      return {
        x: grid.margin + grid.cellWidth * 3,
        y: grid.margin + grid.cellHeight * 2,
        width: grid.cellWidth * 6,
        height: grid.cellHeight * 5
      };
    }

    const focal = analysis.saliency.focalPoint;
    const grid = this.gridSystem;

    // Motif should be near focal point but respecting safe zones
    // BRAND RULE: Motif must NOT overlap logo zone (2 grid unit safety)
    const motifWidth = grid.cellWidth * 6;
    const motifHeight = motifWidth * (7/10); // Portrait ratio default

    let x = focal.x - motifWidth / 2;
    let y = focal.y - motifHeight / 2;

    // Keep in safe margins (1 grid unit from edge per brand rules)
    x = Math.max(grid.margin + grid.cellWidth,
      Math.min(x, grid.canvasWidth - grid.margin - motifWidth - grid.cellWidth));
    y = Math.max(grid.margin + grid.cellHeight * 2,
      Math.min(y, grid.canvasHeight - grid.margin - motifHeight - grid.cellHeight * 3));

    // Ensure no overlap with logo safe zone (2 grid units)
    const logoSafeRight = grid.margin + grid.cellWidth * 2 + grid.cellWidth * 2; // logo width + 2 grid safety
    const logoSafeBottom = grid.margin + grid.cellHeight + grid.cellHeight * 2; // logo height + 2 grid safety

    if (x < logoSafeRight && y < logoSafeBottom) {
      // Push motif to the right of logo safe zone
      x = logoSafeRight + grid.cellWidth;
    }

    return { x, y, width: motifWidth, height: motifHeight };
  }

  calculateOverlap(rect1, rect2) {
    const xOverlap = Math.max(0, Math.min(rect1.x + rect1.w, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
    const yOverlap = Math.max(0, Math.min(rect1.y + rect1.h, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
    const overlapArea = xOverlap * yOverlap;
    const rect1Area = rect1.w * rect1.h;
    return rect1Area > 0 ? overlapArea / rect1Area : 0;
  }
}

// Make available globally
window.CompositionEngine = CompositionEngine;

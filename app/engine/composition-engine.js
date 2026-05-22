/**
 * Composition Engine
 * Auto-composition of brand elements with KPMG brand rules
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

  calculateOptimalLogoPosition(analysis) {
    const zones = this.gridSystem.getLogoZones();

    if (!analysis || !analysis.saliency) {
      return zones[0]; // Default top-left
    }

    const focal = analysis.saliency.focalPoint;
    let bestZone = zones[0];
    let maxDistance = 0;

    zones.forEach(zone => {
      const zoneCenter = {
        x: zone.x + zone.width / 2,
        y: zone.y + zone.height / 2
      };
      const distance = Math.sqrt(
        (zoneCenter.x - focal.x) ** 2 +
        (zoneCenter.y - focal.y) ** 2
      );

      if (distance > maxDistance) {
        maxDistance = distance;
        bestZone = zone;
      }
    });

    return bestZone;
  }

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
    const logoRect = {
      x: logoPosition.x,
      y: logoPosition.y,
      width: logoPosition.width * 3,
      height: logoPosition.height * 3
    };

    let bestRegion = regions[0];
    let bestScore = 0;

    regions.forEach(region => {
      const overlap = this.calculateOverlap(region, logoRect);
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
    const motifWidth = grid.cellWidth * 5;
    const motifHeight = motifWidth * (7/10); // Portrait ratio

    let x = focal.x - motifWidth / 2;
    let y = focal.y - motifHeight / 2;

    // Keep in safe margins
    x = Math.max(grid.margin + grid.cellWidth, 
        Math.min(x, grid.canvasWidth - grid.margin - motifWidth - grid.cellWidth));
    y = Math.max(grid.margin + grid.cellHeight * 2,
        Math.min(y, grid.canvasHeight - grid.margin - motifHeight - grid.cellHeight * 3));

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

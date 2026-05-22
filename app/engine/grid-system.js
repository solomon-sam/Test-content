/**
 * Adaptive Grid System
 * Mathematical grid generation with KPMG brand rules
 * Enhanced with baseline grid, safe zones, typography regions
 * FIXED: Removed multi-corner logo zones, added metadata spacing, motif edge margin
 */

class GridSystem {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.columns = 12;
    this.rows = 12;
    this.margin = 0;
    this.gutter = 0;
    this.cellWidth = 0;
    this.cellHeight = 0;
    this.usableWidth = 0;
    this.usableHeight = 0;
    this.gridType = 'square';

    // KPMG brand: baseline unit = cellHeight / 4
    this.baselineUnit = 0;

    // KPMG brand: module ratio 7:10 or 10:7
    this.moduleRatio = { portrait: 7/10, landscape: 10/7 };

    this.calculateGrid();
  }

  /**
   * Determine grid type based on aspect ratio
   */
  determineGridType() {
    const ratio = this.canvasWidth / this.canvasHeight;

    if (ratio >= 2.5) {
      this.gridType = 'ultra-wide';
      this.columns = 16;
      this.rows = 6;
    } else if (ratio >= 1.5) {
      this.gridType = 'landscape';
      this.columns = 14;
      this.rows = 8;
    } else if (ratio >= 0.8 && ratio <= 1.2) {
      this.gridType = 'square';
      this.columns = 12;
      this.rows = 12;
    } else if (ratio <= 0.6) {
      this.gridType = 'portrait';
      this.columns = 8;
      this.rows = 14;
    } else {
      this.gridType = 'landscape';
      this.columns = 12;
      this.rows = 10;
    }
  }

  /**
   * Calculate grid dimensions
   */
  calculateGrid() {
    this.determineGridType();

    // KPMG brand: Safe margin = 5% of smallest dimension
    this.margin = Math.min(this.canvasWidth, this.canvasHeight) * 0.05;

    // KPMG brand: Gutter = 1.5% of smallest dimension
    this.gutter = Math.min(this.canvasWidth, this.canvasHeight) * 0.015;

    // Usable area
    this.usableWidth = this.canvasWidth - (this.margin * 2);
    this.usableHeight = this.canvasHeight - (this.margin * 2);

    // Cell dimensions (accounting for gutters)
    const totalGutterWidth = this.gutter * (this.columns - 1);
    const totalGutterHeight = this.gutter * (this.rows - 1);

    this.cellWidth = (this.usableWidth - totalGutterWidth) / this.columns;
    this.cellHeight = (this.usableHeight - totalGutterHeight) / this.rows;

    // KPMG brand: baseline unit
    this.baselineUnit = this.cellHeight / 4;
  }

  /**
   * Convert grid coordinates to pixel coordinates
   */
  gridToPixel(col, row, colSpan = 1, rowSpan = 1) {
    const x = this.margin + col * (this.cellWidth + this.gutter);
    const y = this.margin + row * (this.cellHeight + this.gutter);
    const w = colSpan * this.cellWidth + (colSpan - 1) * this.gutter;
    const h = rowSpan * this.cellHeight + (rowSpan - 1) * this.gutter;

    return { x, y, width: w, height: h };
  }

  /**
   * Convert pixel coordinates to nearest grid cell
   */
  pixelToGrid(x, y) {
    const col = Math.round((x - this.margin) / (this.cellWidth + this.gutter));
    const row = Math.round((y - this.margin) / (this.cellHeight + this.gutter));

    return {
      col: Math.max(0, Math.min(col, this.columns - 1)),
      row: Math.max(0, Math.min(row, this.rows - 1))
    };
  }

  /**
   * Snap coordinates to grid
   */
  snapToGrid(x, y, width, height) {
    const gridPos = this.pixelToGrid(x, y);
    const gridEnd = this.pixelToGrid(x + width, y + height);

    const colSpan = Math.max(1, gridEnd.col - gridPos.col + 1);
    const rowSpan = Math.max(1, gridEnd.row - gridPos.row + 1);

    return this.gridToPixel(gridPos.col, gridPos.row, colSpan, rowSpan);
  }

  /**
   * Snap Y coordinate to baseline grid
   */
  snapToBaseline(y) {
    const relativeY = y - this.margin;
    const baselineIndex = Math.round(relativeY / this.baselineUnit);
    return this.margin + baselineIndex * this.baselineUnit;
  }

  /**
   * Get safe zone rectangle
   */
  getSafeZone() {
    return {
      x: this.margin,
      y: this.margin,
      width: this.usableWidth,
      height: this.usableHeight
    };
  }

  /**
   * Get logo zone (TOP-LEFT, LOCKED per KPMG brand rule)
   * Logo: 2 grid units wide, 1 grid unit tall
   */
  getLogoZone() {
    return this.gridToPixel(0, 0, 2, 1);
  }

  /**
   * Get tagline zone (BOTTOM-LEFT, LOCKED)
   */
  getTaglineZone() {
    // Position at bottom-left, in margin
    const taglineHeight = this.cellHeight / 3; // 1/3 of logo height
    return {
      x: this.margin,
      y: this.canvasHeight - this.margin - taglineHeight - this.baselineUnit,
      width: this.usableWidth * 0.6,
      height: taglineHeight
    };
  }

  /**
   * Get metadata zone (BOTTOM-RIGHT, LOCKED)
   * FIXED: Now returns array of elements with proper 2-grid-unit spacing
   */
  getMetadataZone() {
    const metaHeight = this.cellHeight / 3;
    const spacing = this.cellWidth * 2; // 2 grid units between elements
    const elementWidth = this.cellWidth * 3;

    // Calculate starting x position for right-aligned metadata block
    const totalBlockWidth = elementWidth * 3 + spacing * 2; // 3 elements + 2 gaps
    const startX = this.canvasWidth - this.margin - totalBlockWidth;
    const y = this.canvasHeight - this.margin - metaHeight;

    return {
      x: startX,
      y: y,
      width: totalBlockWidth,
      height: metaHeight,
      align: 'right',
      spacing: spacing,
      elements: [
        { name: 'url', x: startX, width: elementWidth },
        { name: 'date', x: startX + elementWidth + spacing, width: elementWidth },
        { name: 'cta', x: startX + (elementWidth + spacing) * 2, width: elementWidth }
      ]
    };
  }

  /**
   * Get typography-safe zones
   */
  getSafeTextRegions() {
    const logoZone = this.getLogoZone();
    const marginRect = this.getSafeZone();

    // Typography must avoid logo zone + 2 grid units safety
    const logoSafeX = logoZone.x + logoZone.width + this.cellWidth * 2;
    const logoSafeY = logoZone.y + logoZone.height + this.cellHeight * 2;

    return [
      {
        name: 'left-column',
        x: marginRect.x,
        y: logoSafeY,
        width: this.columns >= 10 ? this.cellWidth * 4 : this.cellWidth * 3,
        height: marginRect.height - (logoSafeY - marginRect.y) - this.cellHeight
      },
      {
        name: 'right-column',
        x: this.canvasWidth - this.margin - this.cellWidth * 4,
        y: marginRect.y,
        width: this.cellWidth * 4,
        height: marginRect.height - this.cellHeight * 2
      },
      {
        name: 'bottom-area',
        x: marginRect.x + this.cellWidth,
        y: this.canvasHeight - this.margin - this.cellHeight * 3,
        width: marginRect.width - this.cellWidth * 2,
        height: this.cellHeight * 2
      }
    ];
  }

  /**
   * Check if position is in typography-safe zone
   */
  isInTypographySafeZone(x, y, w, h) {
    const regions = this.getSafeTextRegions();
    for (const region of regions) {
      if (x >= region.x && y >= region.y &&
          x + w <= region.x + region.width &&
          y + h <= region.y + region.height) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get column snap with easing
   */
  getColumnSnap(x, radius = this.cellWidth * 0.3) {
    const col = (x - this.margin) / (this.cellWidth + this.gutter);
    const nearestCol = Math.round(col);
    const snapX = this.margin + nearestCol * (this.cellWidth + this.gutter);
    const dist = Math.abs(x - snapX);

    if (dist < radius) {
      const t = dist / radius;
      const eased = t * t * (3 - 2 * t); // smoothstep
      return snapX + (x - snapX) * eased;
    }
    return x;
  }

  /**
   * Get row snap with easing
   */
  getRowSnap(y, radius = this.cellHeight * 0.3) {
    const row = (y - this.margin) / (this.cellHeight + this.gutter);
    const nearestRow = Math.round(row);
    const snapY = this.margin + nearestRow * (this.cellHeight + this.gutter);
    const dist = Math.abs(y - snapY);

    if (dist < radius) {
      const t = dist / radius;
      const eased = t * t * (3 - 2 * t);
      return snapY + (y - snapY) * eased;
    }
    return y;
  }

  /**
   * REMOVED: getLogoZones()
   * KPMG brand rule: Logo is ALWAYS top-left, locked.
   * No alternative logo positions exist.
   */

  /**
   * Get baseline zones for text placement
   */
  getTextZones() {
    return [
      { name: 'bottom', ...this.gridToPixel(1, this.rows - 3, this.columns - 2, 2) },
      { name: 'top', ...this.gridToPixel(1, 1, this.columns - 2, 2) },
      { name: 'left', ...this.gridToPixel(1, 3, 3, this.rows - 6) },
      { name: 'right', ...this.gridToPixel(this.columns - 4, 3, 3, this.rows - 6) }
    ];
  }

  /**
   * Generate grid lines for Fabric.js
   */
  generateGridLines() {
    const lines = [];

    for (let i = 0; i <= this.columns; i++) {
      const x = this.margin + i * (this.cellWidth + this.gutter) - (i > 0 ? this.gutter / 2 : 0);
      lines.push({
        x1: x, y1: this.margin,
        x2: x, y2: this.canvasHeight - this.margin,
        major: i % 4 === 0
      });
    }

    for (let i = 0; i <= this.rows; i++) {
      const y = this.margin + i * (this.cellHeight + this.gutter) - (i > 0 ? this.gutter / 2 : 0);
      lines.push({
        x1: this.margin, y1: y,
        x2: this.canvasWidth - this.margin, y2: y,
        major: i % 4 === 0
      });
    }

    return lines;
  }

  /**
   * Generate margin rectangle
   */
  generateMarginRect() {
    return {
      left: this.margin,
      top: this.margin,
      width: this.usableWidth,
      height: this.usableHeight
    };
  }

  /**
   * Check if a point is in the safe zone
   */
  isInSafeZone(x, y, width = 0, height = 0) {
    return (
      x >= this.margin &&
      y >= this.margin &&
      (x + width) <= (this.canvasWidth - this.margin) &&
      (y + height) <= (this.canvasHeight - this.margin)
    );
  }

  /**
   * Check if motif respects 1-grid-unit margin from canvas edge
   * NEW: Added per brand guidelines Section 8.3
   */
  isMotifEdgeSafe(x, y, width, height) {
    const safeMargin = this.margin + this.cellWidth; // 1 grid unit from edge
    return (
      x >= safeMargin &&
      y >= safeMargin &&
      (x + width) <= (this.canvasWidth - safeMargin) &&
      (y + height) <= (this.canvasHeight - safeMargin)
    );
  }

  /**
   * Get grid info for display
   */
  getInfo() {
    return {
      type: this.gridType,
      columns: this.columns,
      rows: this.rows,
      cellWidth: Math.round(this.cellWidth),
      cellHeight: Math.round(this.cellHeight),
      margin: Math.round(this.margin),
      gutter: Math.round(this.gutter),
      baselineUnit: Math.round(this.baselineUnit)
    };
  }
}

// Make available globally
window.GridSystem = GridSystem;

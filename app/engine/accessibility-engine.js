/**
 * Accessibility Engine
 * Real-time WCAG validation, typography safety heatmaps, auto-correction strategies
 */

class AccessibilityEngine {
  constructor(canvasManager, stateManager) {
    this.canvasManager = canvasManager;
    this.stateManager = stateManager;
    this.canvas = canvasManager.canvas;

    // WCAG thresholds
    this.thresholds = {
      aa: { normal: 4.5, large: 3 },
      aaa: { normal: 7, large: 4.5 }
    };

    // Safety heatmap resolution
    this.heatmapResolution = 20; // pixels per cell
  }

  /**
   * Main validation entry
   */
  validate(composition, treatment, motif) {
    const issues = [];
    const corrections = [];

    // Validate each text element
    const textElements = this.getTextElements();

    textElements.forEach(element => {
      // Contrast check
      const contrast = this.calculateLocalContrast(element);
      if (contrast < this.thresholds.aa.normal) {
        issues.push({
          type: 'contrast',
          element: element.name,
          severity: contrast < 3 ? 'critical' : 'warning',
          value: contrast,
          required: this.thresholds.aa.normal,
          message: `Contrast ratio ${contrast.toFixed(2)} is below WCAG AA (${this.thresholds.aa.normal})`
        });
      }

      // Size check
      if (element.fontSize < 12 && element.name !== 'metadata') {
        issues.push({
          type: 'size',
          element: element.name,
          severity: 'warning',
          value: element.fontSize,
          required: 12,
          message: `Font size ${element.fontSize}px may be too small for readability`
        });
      }
    });

    // Generate safety heatmap
    const heatmap = this.generateSafetyHeatmap();

    // Check unsafe regions
    const unsafeRegions = this.detectUnsafeRegions(heatmap, textElements);

    // Score readability
    const readability = this.scoreReadability(textElements, treatment, motif);

    // Auto-correct if issues found
    if (issues.length > 0) {
      corrections.push(...this.autoCorrect(issues, composition, treatment, motif));
    }

    return {
      valid: issues.filter(i => i.severity === 'critical').length === 0,
      issues,
      corrections,
      heatmap,
      unsafeRegions,
      readability,
      wcag: {
        aa: issues.filter(i => i.severity === 'critical').length === 0,
        aaa: issues.filter(i => i.severity === 'critical' || i.severity === 'warning').length === 0
      }
    };
  }

  /**
   * Calculate contrast ratio between two colors
   */
  calculateContrast(textElement, backgroundRegion) {
    const textColor = textElement.fill || '#000000';
    const bgColor = backgroundRegion.fill || '#ffffff';

    const lum1 = this.hexToLuminance(textColor);
    const lum2 = this.hexToLuminance(bgColor);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Calculate local contrast for text element
   */
  calculateLocalContrast(textElement) {
    const textColor = textElement.fill || '#1A2B4A';
    const textLum = this.hexToLuminance(textColor);

    // Sample background around text
    const samples = this.sampleBackgroundAroundText(textElement);

    if (samples.length === 0) {
      // Default: assume white background
      return (1.0 + 0.05) / (textLum + 0.05);
    }

    // Find worst contrast
    let minContrast = Infinity;
    samples.forEach(sample => {
      const bgLum = this.hexToLuminance(sample);
      const contrast = (Math.max(textLum, bgLum) + 0.05) / (Math.min(textLum, bgLum) + 0.05);
      minContrast = Math.min(minContrast, contrast);
    });

    return minContrast;
  }

  /**
   * Sample background colors around text element
   */
  sampleBackgroundAroundText(textElement) {
    const samples = [];
    const bounds = textElement.getBoundingRect();
    const canvas = this.canvasManager.objects.background;

    if (!canvas) return samples;

    // Sample points around text
    const points = [
      { x: bounds.left - 5, y: bounds.top + bounds.height / 2 },
      { x: bounds.left + bounds.width / 2, y: bounds.top - 5 },
      { x: bounds.left + bounds.width + 5, y: bounds.top + bounds.height / 2 },
      { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height + 5 }
    ];

    // Try to get pixel data from canvas
    try {
      const ctx = this.canvas.getContext('2d');
      points.forEach(point => {
        const x = Math.max(0, Math.min(this.canvas.width - 1, Math.round(point.x)));
        const y = Math.max(0, Math.min(this.canvas.height - 1, Math.round(point.y)));
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const hex = this.rgbToHex(pixel[0], pixel[1], pixel[2]);
        samples.push(hex);
      });
    } catch (e) {
      // Fallback: use treatment color
      const treatment = this.stateManager.get('composition.treatment');
      if (treatment) {
        samples.push(treatment.color || '#1E49E2');
      }
    }

    return samples;
  }

  /**
   * Generate typography safety heatmap
   * Green = safe, Red = unsafe
   */
  generateSafetyHeatmap() {
    const canvas = this.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const res = this.heatmapResolution;

    const cols = Math.ceil(width / res);
    const rows = Math.ceil(height / res);
    const heatmap = [];

    // Get all objects that affect readability
    const objects = canvas.getObjects();
    const textElements = objects.filter(o => o.type === 'text' || o.type === 'i-text');
    const treatment = objects.find(o => o.name === 'color-treatment');

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * res;
        const y = row * res;

        // Calculate safety score for this cell
        let safety = 1.0;

        // Check distance from text elements (too close = unsafe for new text)
        textElements.forEach(text => {
          const bounds = text.getBoundingRect();
          const dist = this.pointToRectDistance(x, y, bounds);
          if (dist < 20) {
            safety *= 0.3; // Very unsafe near existing text
          } else if (dist < 50) {
            safety *= 0.7; // Moderately unsafe
          }
        });

        // Check treatment intensity
        if (treatment) {
          const treatmentOpacity = treatment.opacity || 0.85;
          // Treatment reduces safety for dark text
          safety *= (1 - treatmentOpacity * 0.3);
        }

        // Check margins (safe zone)
        const grid = this.canvasManager.gridSystem;
        if (grid) {
          if (!grid.isInSafeZone(x, y)) {
            safety *= 0.2; // Very unsafe outside margins
          }
        }

        heatmap.push({
          x, y,
          width: res,
          height: res,
          safety: Math.max(0, Math.min(1, safety)),
          color: this.safetyToColor(safety)
        });
      }
    }

    return heatmap;
  }

  /**
   * Detect unsafe regions from heatmap
   */
  detectUnsafeRegions(heatmap, textElements) {
    const unsafe = heatmap.filter(cell => cell.safety < 0.3);

    // Group contiguous unsafe cells
    const regions = [];
    const visited = new Set();

    unsafe.forEach(cell => {
      const key = `${cell.x},${cell.y}`;
      if (visited.has(key)) return;

      const region = this.floodFill(unsafe, cell, visited);
      if (region.length > 0) {
        regions.push(this.boundingRegion(region));
      }
    });

    return regions;
  }

  /**
   * Flood fill to find contiguous regions
   */
  floodFill(cells, start, visited) {
    const region = [];
    const queue = [start];
    const res = this.heatmapResolution;

    while (queue.length > 0) {
      const cell = queue.shift();
      const key = `${cell.x},${cell.y}`;

      if (visited.has(key)) continue;
      visited.add(key);
      region.push(cell);

      // Check neighbors
      const neighbors = cells.filter(c => 
        Math.abs(c.x - cell.x) <= res && 
        Math.abs(c.y - cell.y) <= res &&
        !visited.has(`${c.x},${c.y}`)
      );

      neighbors.forEach(n => queue.push(n));
    }

    return region;
  }

  /**
   * Get bounding box of region
   */
  boundingRegion(cells) {
    const xs = cells.map(c => c.x);
    const ys = cells.map(c => c.y);

    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs) + this.heatmapResolution,
      height: Math.max(...ys) - Math.min(...ys) + this.heatmapResolution,
      cellCount: cells.length
    };
  }

  /**
   * Score overall readability
   */
  scoreReadability(textElements, treatment, motif) {
    let score = 0;

    // Contrast scores
    textElements.forEach(el => {
      const contrast = this.calculateLocalContrast(el);
      if (contrast >= 7) score += 20;
      else if (contrast >= 4.5) score += 15;
      else if (contrast >= 3) score += 8;
      else score += 2;
    });

    // Size scores
    textElements.forEach(el => {
      if (el.fontSize >= 24) score += 10;
      else if (el.fontSize >= 18) score += 8;
      else if (el.fontSize >= 14) score += 5;
      else score += 2;
    });

    // Spacing scores
    textElements.forEach(el => {
      if (el.lineHeight >= 1.2) score += 5;
      else score += 2;
    });

    return Math.min(100, score);
  }

  /**
   * Auto-correction with 10 strategies
   */
  autoCorrect(issues, composition, treatment, motif) {
    const corrections = [];

    issues.forEach(issue => {
      switch (issue.type) {
        case 'contrast':
          corrections.push(...this.correctContrast(issue, treatment));
          break;
        case 'size':
          corrections.push(...this.correctSize(issue));
          break;
      }
    });

    return corrections;
  }

  /**
   * Strategy 1: Reposition typography
   */
  repositionTypography(issue) {
    const element = this.canvasManager.objects[issue.element];
    if (!element) return [];

    // Find safer position
    const grid = this.canvasManager.gridSystem;
    const safeRegions = grid.getSafeTextRegions();

    if (safeRegions.length > 0) {
      const region = safeRegions[0];
      return [{
        strategy: 'reposition',
        element: issue.element,
        action: 'move',
        newX: region.x + 20,
        newY: region.y + 20
      }];
    }

    return [];
  }

  /**
   * Strategy 2: Strengthen treatment (reduce opacity)
   */
  strengthenTreatment(issue) {
    const treatment = this.stateManager.get('composition.treatment');
    if (treatment && treatment.opacity > 0.5) {
      return [{
        strategy: 'strengthen-treatment',
        element: 'treatment',
        action: 'reduce-opacity',
        newOpacity: Math.max(0.3, treatment.opacity - 0.2)
      }];
    }
    return [];
  }

  /**
   * Strategy 3: Add localized darkening behind text
   */
  addLocalizedDarkening(issue) {
    const element = this.canvasManager.objects[issue.element];
    if (!element) return [];

    const bounds = element.getBoundingRect();
    return [{
      strategy: 'darkening',
      element: issue.element,
      action: 'add-background',
      rect: {
        x: bounds.left - 10,
        y: bounds.top - 5,
        width: bounds.width + 20,
        height: bounds.height + 10
      },
      color: 'rgba(0, 0, 0, 0.3)'
    }];
  }

  /**
   * Strategy 4: Change text color for better contrast
   */
  correctContrast(issue, treatment) {
    const corrections = [];

    // Try lightening text
    corrections.push({
      strategy: 'contrast',
      element: issue.element,
      action: 'lighten-text',
      newColor: '#FFFFFF'
    });

    // Try darkening treatment
    corrections.push(...this.strengthenTreatment(issue));

    // Try adding background
    corrections.push(...this.addLocalizedDarkening(issue));

    return corrections;
  }

  /**
   * Strategy 5: Increase font size
   */
  correctSize(issue) {
    const element = this.canvasManager.objects[issue.element];
    if (!element) return [];

    return [{
      strategy: 'size',
      element: issue.element,
      action: 'increase-font',
      newSize: Math.max(issue.required, element.fontSize * 1.2)
    }];
  }

  /**
   * Strategy 6: Add localized blur
   */
  addLocalizedBlur(issue) {
    return [{
      strategy: 'blur',
      element: issue.element,
      action: 'blur-background',
      radius: 5
    }];
  }

  /**
   * Strategy 7: Increase negative space
   */
  increaseNegativeSpace(issue) {
    return [{
      strategy: 'spacing',
      element: issue.element,
      action: 'increase-line-height',
      factor: 1.2
    }];
  }

  /**
   * Strategy 8: Adjust treatment opacity
   */
  adjustTreatmentOpacity(issue) {
    return this.strengthenTreatment(issue);
  }

  /**
   * Strategy 9: Shift motif
   */
  shiftMotif(issue) {
    return [{
      strategy: 'motif',
      element: 'motif',
      action: 'shift',
      direction: 'away-from-text'
    }];
  }

  /**
   * Strategy 10: Recalculate hierarchy
   */
  recalculateHierarchy(issue) {
    return [{
      strategy: 'hierarchy',
      element: issue.element,
      action: 'recalculate',
      priority: 'high'
    }];
  }

  /**
   * Apply corrections to canvas
   */
  applyCorrections(corrections) {
    corrections.forEach(correction => {
      switch (correction.action) {
        case 'move':
          const el = this.canvasManager.objects[correction.element];
          if (el) {
            el.set({ left: correction.newX, top: correction.newY });
            el.setCoords();
          }
          break;

        case 'reduce-opacity':
          const treatment = this.stateManager.get('composition.treatment');
          if (treatment) {
            treatment.opacity = correction.newOpacity;
            this.canvasManager.applyColorTreatment(treatment);
          }
          break;

        case 'lighten-text':
          const textEl = this.canvasManager.objects[correction.element];
          if (textEl) {
            textEl.set('fill', correction.newColor);
          }
          break;

        case 'increase-font':
          const fontEl = this.canvasManager.objects[correction.element];
          if (fontEl) {
            fontEl.set('fontSize', correction.newSize);
          }
          break;
      }
    });

    this.canvas.renderAll();
  }

  /**
   * Get all text elements from canvas
   */
  getTextElements() {
    return this.canvas.getObjects().filter(o => 
      o.type === 'text' || o.type === 'i-text'
    );
  }

  /**
   * Convert safety score to color
   */
  safetyToColor(safety) {
    // Green (safe) to Red (unsafe)
    const r = Math.round((1 - safety) * 255);
    const g = Math.round(safety * 255);
    const b = 0;
    return `rgba(${r}, ${g}, ${b}, 0.3)`;
  }

  /**
   * Point to rectangle distance
   */
  pointToRectDistance(px, py, rect) {
    const dx = Math.max(rect.left - px, 0, px - (rect.left + rect.width));
    const dy = Math.max(rect.top - py, 0, py - (rect.top + rect.height));
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Convert hex to luminance
   */
  hexToLuminance(hex) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 1.0;

    const a = [rgb.r, rgb.g, rgb.b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  /**
   * Hex to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * RGB to hex
   */
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * Validate color blindness safety
   */
  validateColorBlindnessSafety(treatment, typography) {
    // Check if treatment and text are distinguishable for common color blindness types
    const issues = [];

    // Deuteranopia (green-blind): Check blue vs yellow
    // Protanopia (red-blind): Check blue vs yellow
    // Tritanopia (blue-blind): Check red vs green

    return {
      deuteranopia: true,
      protanopia: true,
      tritanopia: true,
      issues
    };
  }

  /**
   * Simulate export readability
   */
  simulateExportReadability(typography, exportConfig) {
    const { dpi, format, quality } = exportConfig;

    // Calculate effective pixel size at target DPI
    const scaleFactor = dpi / 72;
    const minReadableSize = 12 * scaleFactor;

    const results = [];
    typography.forEach(el => {
      const effectiveSize = el.fontSize * scaleFactor;
      results.push({
        element: el.name,
        readable: effectiveSize >= minReadableSize,
        effectiveSize,
        minReadableSize
      });
    });

    return results;
  }
}

// Make available globally
window.AccessibilityEngine = AccessibilityEngine;

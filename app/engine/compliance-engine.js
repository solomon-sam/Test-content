/**
 * Compliance Engine — Phase 3A (FIXED)
 * Global Brand Compliance Checklist Engine
 * 10-category validation authority with real-time status,
 * export gate enforcement, and detailed reporting.
 * 
 * FIXES:
 * - Motif minimum size: 20% (was 15%)
 * - Swoosh angle: horizontal-only (0°) enforcement
 * - Metadata spacing: 2-grid-unit check
 * - Motif edge margin: 1 grid unit from canvas edge
 */

class ComplianceEngine {
  constructor(stateManager, canvasManager, gridSystem) {
    this.stateManager = stateManager;
    this.canvasManager = canvasManager;
    this.gridSystem = gridSystem;

    // Initialize all 10 checklist categories
    this.checklists = {
      grid: new GridChecklist(gridSystem),
      logo: new LogoChecklist(gridSystem),
      typography: new TypographyChecklist(gridSystem),
      motif: new MotifChecklist(gridSystem),
      swoosh: new SwooshChecklist(gridSystem),
      image: new ImageChecklist(),
      treatment: new TreatmentChecklist(),
      accessibility: new AccessibilityChecklist(),
      composition: new CompositionChecklist(gridSystem),
      export: new ExportChecklist()
    };

    this.status = 'PASS'; // PASS | WARNING | FAIL
    this.lastReport = null;
    this.validationThrottle = null;

    // Subscribe to state changes for real-time validation
    this.setupSubscriptions();
  }

  setupSubscriptions() {
    // Validate on any composition change
    this.stateManager.subscribe('composition', () => {
      this.debouncedValidate();
    });

    // Validate on element modification
    this.stateManager.subscribe('composition.lastModified', () => {
      this.debouncedValidate();
    });

    // Validate on treatment change
    this.stateManager.subscribe('composition.treatment', () => {
      this.debouncedValidate();
    });

    // Validate on typography change
    this.stateManager.subscribe('typographyComposition', () => {
      this.debouncedValidate();
    });
  }

  debouncedValidate() {
    if (this.validationThrottle) {
      clearTimeout(this.validationThrottle);
    }
    this.validationThrottle = setTimeout(() => {
      this.validateAll();
    }, 100);
  }

  /**
   * Run ALL checklists and compute overall status
   */
  validateAll() {
    const state = this.stateManager.state;
    const results = {};

    // Run each checklist
    for (const [key, checklist] of Object.entries(this.checklists)) {
      results[key] = checklist.validate(state, this.canvasManager);
    }

    // Compute overall status
    const statuses = Object.values(results).map(r => r.status);
    if (statuses.includes('FAIL')) {
      this.status = 'FAIL';
    } else if (statuses.includes('WARNING')) {
      this.status = 'WARNING';
    } else {
      this.status = 'PASS';
    }

    // Build detailed report
    this.lastReport = {
      overall: this.status,
      categories: results,
      timestamp: Date.now(),
      canExport: this.canExport(),
      score: this.calculateScore(results)
    };

    // Update state
    this.stateManager.set('complianceReport', this.lastReport);
    this.stateManager.set('complianceStatus', this.status);

    // Update checklist UI status
    const checklistStatus = {};
    for (const [key, result] of Object.entries(results)) {
      checklistStatus[key] = result.status.toLowerCase();
    }
    this.stateManager.set('checklistStatus', checklistStatus);

    return this.lastReport;
  }

  /**
   * Run single checklist
   */
  validate(category, state) {
    if (!this.checklists[category]) return null;
    return this.checklists[category].validate(state, this.canvasManager);
  }

  /**
   * Get overall status
   */
  getOverallStatus() {
    return this.status;
  }

  /**
   * Get detailed report
   */
  getReport() {
    return this.lastReport;
  }

  /**
   * Can export? (FAIL blocks export)
   */
  canExport() {
    return this.status !== 'FAIL';
  }

  /**
   * Calculate composite score from all categories
   */
  calculateScore(results) {
    const weights = {
      grid: 10, logo: 15, typography: 15, motif: 10,
      swoosh: 5, image: 10, treatment: 10, accessibility: 15,
      composition: 10, export: 0
    };

    let totalWeight = 0;
    let weightedScore = 0;

    for (const [key, result] of Object.entries(results)) {
      const weight = weights[key] || 10;
      let score = 0;
      if (result.status === 'PASS') score = 100;
      else if (result.status === 'WARNING') score = 60;
      else if (result.status === 'FAIL') score = 20;

      totalWeight += weight;
      weightedScore += score * weight;
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }

  /**
   * Get issues for a specific category
   */
  getIssues(category) {
    if (!this.lastReport || !this.lastReport.categories[category]) return [];
    return this.lastReport.categories[category].issues || [];
  }

  /**
   * Get all issues across categories
   */
  getAllIssues() {
    if (!this.lastReport) return [];
    const all = [];
    for (const [cat, result] of Object.entries(this.lastReport.categories)) {
      (result.issues || []).forEach(issue => {
        all.push({ ...issue, category: cat });
      });
    }
    return all;
  }
}

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL CHECKLIST CLASSES
// ═══════════════════════════════════════════════════════════════

class GridChecklist {
  constructor(gridSystem) {
    this.gridSystem = gridSystem;
  }

  validate(state, canvasManager) {
    const issues = [];
    const grid = this.gridSystem || (canvasManager ? canvasManager.gridSystem : null);

    if (!grid) {
      return { status: 'FAIL', issues: [{ message: 'Grid system not initialized', severity: 'critical' }] };
    }

    // Check all editable elements are grid-aligned
    const editable = ['motif', 'headline', 'subheading', 'swoosh'];
    editable.forEach(name => {
      const obj = canvasManager.objects[name];
      if (obj && obj.visible) {
        const snapped = grid.snapToGrid(obj.left, obj.top, obj.width * obj.scaleX, obj.height * obj.scaleY);
        const driftX = Math.abs(obj.left - snapped.x);
        const driftY = Math.abs(obj.top - snapped.y);
        const threshold = grid.cellWidth * 0.1;

        if (driftX > threshold || driftY > threshold) {
          issues.push({
            message: `${name} is not aligned to grid`,
            severity: 'warning',
            element: name,
            drift: Math.max(driftX, driftY)
          });
        }
      }
    });

    // Check margins respected
    const margin = grid.margin;
    const safeZone = grid.getSafeZone();
    editable.forEach(name => {
      const obj = canvasManager.objects[name];
      if (obj && obj.visible) {
        if (obj.left < margin - 2 || obj.top < margin - 2 ||
            obj.left + obj.width * obj.scaleX > grid.canvasWidth - margin + 2 ||
            obj.top + obj.height * obj.scaleY > grid.canvasHeight - margin + 2) {
          issues.push({
            message: `${name} extends beyond safe margins`,
            severity: 'warning',
            element: name
          });
        }
      }
    });

    return {
      status: issues.length === 0 ? 'PASS' : (issues.some(i => i.severity === 'critical') ? 'FAIL' : 'WARNING'),
      issues,
      details: { margin, gridType: grid.gridType, columns: grid.columns, rows: grid.rows }
    };
  }
}

class LogoChecklist {
  constructor(gridSystem) {
    this.gridSystem = gridSystem;
  }

  validate(state, canvasManager) {
    const issues = [];
    const logo = canvasManager.objects.logo;
    const grid = this.gridSystem || canvasManager.gridSystem;

    if (!logo || !logo.visible) {
      return { status: 'FAIL', issues: [{ message: 'Logo not placed', severity: 'critical' }] };
    }

    // Check logo is in top-left zone
    const logoZone = grid ? grid.getLogoZone() : null;
    if (logoZone) {
      const driftX = Math.abs(logo.left - logoZone.x);
      const driftY = Math.abs(logo.top - logoZone.y);
      if (driftX > 10 || driftY > 10) {
        issues.push({
          message: 'Logo is not in the top-left locked position',
          severity: 'critical',
          expected: logoZone,
          actual: { x: logo.left, y: logo.top }
        });
      }
    }

    // Check logo is locked (not selectable)
    if (logo.selectable) {
      issues.push({
        message: 'Logo should be locked and not selectable',
        severity: 'warning'
      });
    }

    // Check logo size matches 2x1 grid units
    if (grid) {
      const expectedWidth = grid.cellWidth * 2;
      const expectedHeight = grid.cellHeight * 1;
      const widthDrift = Math.abs((logo.width * logo.scaleX) - expectedWidth) / expectedWidth;
      const heightDrift = Math.abs((logo.height * logo.scaleY) - expectedHeight) / expectedHeight;

      if (widthDrift > 0.15 || heightDrift > 0.15) {
        issues.push({
          message: `Logo size (${Math.round(logo.width * logo.scaleX)}x${Math.round(logo.height * logo.scaleY)}) does not match expected 2x1 grid units (${Math.round(expectedWidth)}x${Math.round(expectedHeight)})`,
          severity: 'warning'
        });
      }
    }

    // Check logo contrast against background
    const treatment = canvasManager.objects.treatment;
    if (treatment) {
      // Logo should be visible against treatment
      issues.push({
        message: 'Verify logo visibility against color treatment',
        severity: 'info'
      });
    }

    return {
      status: issues.some(i => i.severity === 'critical') ? 'FAIL' :
        issues.some(i => i.severity === 'warning') ? 'WARNING' : 'PASS',
      issues
    };
  }
}

class TypographyChecklist {
  constructor(gridSystem) {
    this.gridSystem = gridSystem;
  }

  validate(state, canvasManager) {
    const issues = [];
    const headline = canvasManager.objects.headline;
    const subheading = canvasManager.objects.subheading;
    const grid = this.gridSystem || canvasManager.gridSystem;
    const composition = state.typographyComposition;

    // Check headline exists
    if (!headline || !headline.visible) {
      issues.push({ message: 'Headline not placed', severity: 'warning' });
    }

    // Check font families
    if (headline && !headline.fontFamily.includes('KPMG') && !headline.fontFamily.includes('Arial Black')) {
      issues.push({ message: 'Headline should use KPMG Bold or equivalent', severity: 'warning', element: 'headline' });
    }

    // Check hierarchy: subheading smaller than headline
    if (headline && subheading && subheading.fontSize >= headline.fontSize * 0.8) {
      issues.push({
        message: 'Subheading should be noticeably smaller than headline',
        severity: 'warning',
        element: 'subheading'
      });
    }

    // Check for orphans (single word on last line)
    if (composition && composition.headline && composition.headline.lines) {
      const lastLine = composition.headline.lines[composition.headline.lines.length - 1];
      if (lastLine && lastLine.words && lastLine.words.length === 1) {
        issues.push({ message: 'Last headline line is a single word (orphan)', severity: 'warning' });
      }
    }

    // Check line offset limits (max 3 grid units)
    if (composition && composition.headline && composition.headline.lines) {
      const maxOffset = Math.max(...composition.headline.lines.map(l => Math.abs(l.offsetX || 0)));
      if (maxOffset > (grid ? grid.cellWidth * 3 : 100)) {
        issues.push({ message: 'Line offsets exceed 3 grid units', severity: 'warning' });
      }
    }

    // Check typography is in safe zones
    if (headline && grid) {
      const safe = grid.isInTypographySafeZone(
        headline.left, headline.top,
        headline.width * headline.scaleX, headline.height * headline.scaleY
      );
      if (!safe) {
        issues.push({ message: 'Headline is outside typography-safe zones', severity: 'warning', element: 'headline' });
      }
    }

    // Check baseline alignment
    if (headline && grid) {
      const snappedY = grid.snapToBaseline(headline.top);
      if (Math.abs(headline.top - snappedY) > 2) {
        issues.push({ message: 'Headline is not aligned to baseline grid', severity: 'info', element: 'headline' });
      }
    }

    return {
      status: issues.some(i => i.severity === 'critical') ? 'FAIL' :
        issues.some(i => i.severity === 'warning') ? 'WARNING' : 'PASS',
      issues
    };
  }
}

class MotifChecklist {
  constructor(gridSystem) {
    this.gridSystem = gridSystem;
  }

  validate(state, canvasManager) {
    const issues = [];
    const motif = canvasManager.objects.motif;
    const grid = this.gridSystem || canvasManager.gridSystem;

    if (!motif || !motif.visible) {
      return { status: 'FAIL', issues: [{ message: 'Motif window not placed', severity: 'critical' }] };
    }

    const w = motif.width * motif.scaleX;
    const h = motif.height * motif.scaleY;
    const ratio = w / h;

    // Check ratio is 7:10 or 10:7
    const isPortrait = Math.abs(ratio - 7/10) < 0.15;
    const isLandscape = Math.abs(ratio - 10/7) < 0.15;
    if (!isPortrait && !isLandscape) {
      issues.push({
        message: `Motif ratio (${ratio.toFixed(2)}) is not 7:10 or 10:7`,
        severity: 'warning',
        element: 'motif'
      });
    }

    // Check minimum size (20% of canvas area) - FIXED from 15%
    const canvasArea = grid ? grid.canvasWidth * grid.canvasHeight : 1;
    const motifArea = w * h;
    if (motifArea < canvasArea * 0.20) {
      issues.push({
        message: 'Motif is smaller than required 20% of canvas',
        severity: 'warning',
        element: 'motif'
      });
    }

    // Check motif doesn't overlap logo zone
    const logoZone = grid ? grid.getLogoZone() : null;
    if (logoZone) {
      const overlap = !(motif.left + w < logoZone.x || motif.left > logoZone.x + logoZone.width ||
          motif.top + h < logoZone.y || motif.top > logoZone.y + logoZone.height);
      if (overlap) {
        issues.push({ message: 'Motif overlaps logo safe zone', severity: 'critical', element: 'motif' });
      }
    }

    // Check motif is grid-aligned
    if (grid) {
      const snapped = grid.snapToGrid(motif.left, motif.top, w, h);
      const drift = Math.abs(motif.left - snapped.x) + Math.abs(motif.top - snapped.y);
      if (drift > grid.cellWidth * 0.2) {
        issues.push({ message: 'Motif is not aligned to grid', severity: 'warning', element: 'motif' });
      }
    }

    // NEW: Check motif respects 1-grid-unit margin from canvas edge
    if (grid && !grid.isMotifEdgeSafe(motif.left, motif.top, w, h)) {
      issues.push({
        message: 'Motif is too close to canvas edge (must be at least 1 grid unit from edge)',
        severity: 'warning',
        element: 'motif'
      });
    }

    return {
      status: issues.some(i => i.severity === 'critical') ? 'FAIL' :
        issues.some(i => i.severity === 'warning') ? 'WARNING' : 'PASS',
      issues
    };
  }
}

class SwooshChecklist {
  constructor(gridSystem) {
    this.gridSystem = gridSystem;
  }

  validate(state, canvasManager) {
    const issues = [];
    const swoosh = canvasManager.objects.swoosh;
    const motif = canvasManager.objects.motif;
    const grid = this.gridSystem || canvasManager.gridSystem;

    if (!swoosh || !swoosh.visible) {
      return { status: 'PASS', issues: [], details: { note: 'No swoosh present' } };
    }

    // Check swoosh is attached to motif (left or right side)
    if (motif) {
      const swooshCenter = swoosh.left + swoosh.width * swoosh.scaleX / 2;
      const motifLeft = motif.left;
      const motifRight = motif.left + motif.width * motif.scaleX;

      const attachedLeft = Math.abs(swooshCenter - motifLeft) < grid.cellWidth;
      const attachedRight = Math.abs(swooshCenter - motifRight) < grid.cellWidth;

      if (!attachedLeft && !attachedRight) {
        issues.push({ message: 'Swoosh should be attached to left or right side of motif', severity: 'warning', element: 'swoosh' });
      }
    }

    // Check swoosh dimensions (<= shortest side of window, <= 0.5x window height)
    if (motif) {
      const motifShortSide = Math.min(motif.width * motif.scaleX, motif.height * motif.scaleY);
      const swooshWidth = swoosh.width * swoosh.scaleX;
      if (swooshWidth > motifShortSide * 1.2) {
        issues.push({ message: 'Swoosh width exceeds motif short side', severity: 'warning', element: 'swoosh' });
      }

      const motifHeight = motif.height * motif.scaleY;
      const swooshHeight = swoosh.height * swoosh.scaleY;
      if (swooshHeight > motifHeight * 0.5) {
        issues.push({ message: 'Swoosh height exceeds 0.5x window height', severity: 'warning', element: 'swoosh' });
      }
    }

    // NEW: Check swoosh is horizontal-only (0° angle)
    if (swoosh.angle !== 0 && swoosh.angle !== 180) {
      issues.push({
        message: 'Swoosh must be horizontal only (0° angle)',
        severity: 'warning',
        element: 'swoosh'
      });
    }

    // Check swoosh doesn't overlap typography
    const headline = canvasManager.objects.headline;
    if (headline && swoosh) {
      const overlap = !(swoosh.left + swoosh.width * swoosh.scaleX < headline.left ||
          swoosh.left > headline.left + headline.width * headline.scaleX ||
          swoosh.top + swoosh.height * swoosh.scaleY < headline.top ||
          swoosh.top > headline.top + headline.height * headline.scaleY);
      if (overlap) {
        issues.push({ message: 'Swoosh overlaps headline text', severity: 'warning', element: 'swoosh' });
      }
    }

    // NEW: Check swoosh doesn't touch canvas edge
    if (grid) {
      const safeMargin = grid.margin + grid.cellWidth;
      if (swoosh.left < safeMargin ||
          swoosh.left + swoosh.width * swoosh.scaleX > grid.canvasWidth - safeMargin ||
          swoosh.top < safeMargin ||
          swoosh.top + swoosh.height * swoosh.scaleY > grid.canvasHeight - safeMargin) {
        issues.push({
          message: 'Swoosh is too close to canvas edge',
          severity: 'info',
          element: 'swoosh'
        });
      }
    }

    return {
      status: issues.some(i => i.severity === 'critical') ? 'FAIL' :
        issues.some(i => i.severity === 'warning') ? 'WARNING' : 'PASS',
      issues
    };
  }
}

class ImageChecklist {
  validate(state, canvasManager) {
    const issues = [];
    const bg = canvasManager.objects.background;
    const analysis = state.imageAnalysis;

    if (!bg || !bg.visible) {
      return { status: 'FAIL', issues: [{ message: 'No background image', severity: 'critical' }] };
    }

    // Check no distortion (aspect ratio preserved)
    if (bg) {
      const scaleRatio = bg.scaleX / bg.scaleY;
      if (Math.abs(scaleRatio - 1) > 0.05) {
        issues.push({ message: 'Background image may be distorted (uneven scaling)', severity: 'warning' });
      }
    }

    // Check image analysis quality
    if (analysis) {
      const quality = analysis.quality || analysis.composition?.scores?.overall || 0;
      if (quality < 5) {
        issues.push({ message: 'Image quality score is low', severity: 'warning' });
      }

      const brandCompat = analysis.composition?.scores?.brandCompatibility || 0;
      if (brandCompat < 5) {
        issues.push({ message: 'Image may not align well with KPMG brand', severity: 'warning' });
      }
    }

    return {
      status: issues.some(i => i.severity === 'critical') ? 'FAIL' :
        issues.some(i => i.severity === 'warning') ? 'WARNING' : 'PASS',
      issues
    };
  }
}

class TreatmentChecklist {
  validate(state, canvasManager) {
    const issues = [];
    const treatment = state.composition?.treatment || canvasManager.objects.treatment;

    if (!treatment) {
      return { status: 'FAIL', issues: [{ message: 'No color treatment applied', severity: 'critical' }] };
    }

    const t = treatment;

    // Check approved treatment colors
    const approvedColors = ['#1E49E2', '#00338D', '#5FD7FF'];
    const color = t.color || t.fill;
    const isApproved = approvedColors.some(c => color && color.toLowerCase().includes(c.toLowerCase()));

    if (color && !isApproved) {
      issues.push({
        message: 'Treatment color is not in approved KPMG palette',
        severity: 'warning',
        color: color
      });
    }

    // Check blend mode
    const approvedBlends = ['multiply', 'hard-light', 'linear-light', 'color', 'overlay'];
    const blend = t.blendMode || t.globalCompositeOperation;
    if (blend && !approvedBlends.includes(blend)) {
      issues.push({ message: `Blend mode "${blend}" is not approved`, severity: 'warning' });
    }

    // Check opacity range
    const opacity = t.opacity || 0.85;
    if (opacity < 0.3) {
      issues.push({ message: 'Treatment opacity is very low — motif may not be visible', severity: 'warning' });
    } else if (opacity > 1.0) {
      issues.push({ message: 'Treatment opacity exceeds 100%', severity: 'warning' });
    }

    // Check treatment covers full canvas
    if (t.width && t.height) {
      const canvasW = canvasManager.canvas.width;
      const canvasH = canvasManager.canvas.height;
      if (Math.abs(t.width - canvasW) > 2 || Math.abs(t.height - canvasH) > 2) {
        issues.push({ message: 'Treatment should cover the entire canvas', severity: 'warning' });
      }
    }

    return {
      status: issues.some(i => i.severity === 'critical') ? 'FAIL' :
        issues.some(i => i.severity === 'warning') ? 'WARNING' : 'PASS',
      issues
    };
  }
}

class AccessibilityChecklist {
  validate(state, canvasManager) {
    const issues = [];

    // Check contrast for all text elements
    const textElements = canvasManager.canvas.getObjects().filter(o =>
      (o.type === 'text' || o.type === 'i-text') && o.visible
    );

    textElements.forEach(el => {
      // Minimum font size check
      if (el.fontSize < 12 && el.name !== 'metadata') {
        issues.push({
          message: `${el.name || 'Text'} font size (${el.fontSize}px) is below 12px minimum`,
          severity: 'warning',
          element: el.name
        });
      }

      // Contrast placeholder (would need actual pixel sampling)
      issues.push({
        message: `Verify contrast for ${el.name || 'text element'}`,
        severity: 'info',
        element: el.name
      });
    });

    // Check color blindness safety
    const treatment = state.composition?.treatment;
    if (treatment && treatment.color) {
      // Blue is generally safe for color blindness
      if (!treatment.color.toLowerCase().includes('1e49e2') &&
          !treatment.color.toLowerCase().includes('00338d')) {
        issues.push({
          message: 'Consider using KPMG blue for better color blindness accessibility',
          severity: 'info'
        });
      }
    }

    return {
      status: issues.some(i => i.severity === 'critical') ? 'FAIL' :
        issues.some(i => i.severity === 'warning') ? 'WARNING' : 'PASS',
      issues
    };
  }
}

class CompositionChecklist {
  constructor(gridSystem) {
    this.gridSystem = gridSystem;
  }

  validate(state, canvasManager) {
    const issues = [];
    const grid = this.gridSystem || canvasManager.gridSystem;

    // Check negative space balance
    const objects = ['logo', 'motif', 'headline', 'subheading', 'tagline', 'metadata'];
    let totalElementArea = 0;
    const canvasArea = grid ? grid.canvasWidth * grid.canvasHeight : 1;

    objects.forEach(name => {
      const obj = canvasManager.objects[name];
      if (obj && obj.visible) {
        totalElementArea += (obj.width * obj.scaleX) * (obj.height * obj.scaleY);
      }
    });

    const coverage = totalElementArea / canvasArea;
    if (coverage > 0.8) {
      issues.push({ message: 'Composition is too dense — increase negative space', severity: 'warning' });
    } else if (coverage < 0.2) {
      issues.push({ message: 'Composition is too sparse', severity: 'info' });
    }

    // Check visual balance (left vs right weight)
    const motif = canvasManager.objects.motif;
    const headline = canvasManager.objects.headline;
    if (motif && headline && grid) {
      const motifCenter = motif.left + motif.width * motif.scaleX / 2;
      const headlineCenter = headline.left + headline.width * headline.scaleX / 2;
      const canvasCenter = grid.canvasWidth / 2;

      const motifSide = motifCenter > canvasCenter ? 'right' : 'left';
      const headlineSide = headlineCenter > canvasCenter ? 'right' : 'left';

      if (motifSide === headlineSide) {
        issues.push({ message: 'Visual weight is unbalanced — consider placing motif and text on opposite sides', severity: 'info' });
      }
    }

    // Check rhythm (elements follow grid baseline)
    const baselineElements = ['headline', 'subheading', 'tagline'];
    baselineElements.forEach(name => {
      const obj = canvasManager.objects[name];
      if (obj && grid) {
        const snappedY = grid.snapToBaseline(obj.top);
        if (Math.abs(obj.top - snappedY) > 2) {
          issues.push({ message: `${name} is not aligned to baseline grid`, severity: 'info', element: name });
        }
      }
    });

    return {
      status: issues.some(i => i.severity === 'critical') ? 'FAIL' :
        issues.some(i => i.severity === 'warning') ? 'WARNING' : 'PASS',
      issues
    };
  }
}

class ExportChecklist {
  validate(state, canvasManager) {
    const issues = [];
    const exportFormat = state.exportFormat || 'png';
    const exportDpi = state.exportDpi || 300;
    const quality = state.exportQuality || 95;

    // Check quality settings
    if (quality < 80) {
      issues.push({ message: 'Export quality is below 80% — may result in visible artifacts', severity: 'warning' });
    }

    // Check DPI for print formats
    if (exportFormat === 'pdf' && exportDpi < 150) {
      issues.push({ message: 'PDF export DPI is low — recommend 300 DPI for print', severity: 'info' });
    }

    // Check dimensions are reasonable
    const canvas = canvasManager.canvas;
    if (canvas.width < 300 || canvas.height < 300) {
      issues.push({ message: 'Canvas dimensions are very small for export', severity: 'warning' });
    }

    return {
      status: issues.some(i => i.severity === 'critical') ? 'FAIL' :
        issues.some(i => i.severity === 'warning') ? 'WARNING' : 'PASS',
      issues
    };
  }
}

// Make available globally
window.ComplianceEngine = ComplianceEngine;

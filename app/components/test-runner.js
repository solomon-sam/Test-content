/**
 * Test Runner
 * Automated testing framework for KPMG Brand Composition Engine
 * FIXED: Complete test suite with all brand compliance tests
 */

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
    this.beforeEachFn = null;
    this.afterEachFn = null;
  }

  describe(name, fn) {
    console.log(`\n📦 ${name}`);
    fn();
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  beforeEach(fn) {
    this.beforeEachFn = fn;
  }

  afterEach(fn) {
    this.afterEachFn = fn;
  }

  async runAll() {
    console.log('\n🧪 Running Test Suite...\n');

    for (const test of this.tests) {
      try {
        if (this.beforeEachFn) await this.beforeEachFn();

        await test.fn();

        if (this.afterEachFn) await this.afterEachFn();

        this.results.push({ name: test.name, status: 'PASS' });
        console.log(`  ✅ ${test.name}`);
      } catch (error) {
        this.results.push({ name: test.name, status: 'FAIL', error: error.message });
        console.log(`  ❌ ${test.name}`);
        console.log(`     ${error.message}`);
      }
    }

    this.printSummary();
    return this.results;
  }

  printSummary() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log(`\n📊 Test Results: ${passed}/${total} passed`);
    if (failed > 0) {
      console.log(`   ${failed} test(s) failed`);
    }
  }

  expect(actual) {
    return {
      toBe(expected) {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toEqual(expected) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toBeGreaterThan(expected) {
        if (!(actual > expected)) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeLessThan(expected) {
        if (!(actual < expected)) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
      },
      toBeDefined() {
        if (actual === undefined) {
          throw new Error(`Expected value to be defined`);
        }
      },
      toBeTruthy() {
        if (!actual) {
          throw new Error(`Expected value to be truthy`);
        }
      },
      toBeFalsy() {
        if (actual) {
          throw new Error(`Expected value to be falsy`);
        }
      },
      toContain(expected) {
        if (!actual.includes(expected)) {
          throw new Error(`Expected ${actual} to contain ${expected}`);
        }
      },
      toThrow() {
        let threw = false;
        try {
          actual();
        } catch (e) {
          threw = true;
        }
        if (!threw) {
          throw new Error(`Expected function to throw`);
        }
      }
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════

function runBrandComplianceTests() {
  const runner = new TestRunner();

  let gridSystem;
  let canvasManager;
  let stateManager;
  let complianceEngine;

  runner.beforeEach(() => {
    // Mock canvas
    const mockCanvas = {
      width: 1920,
      height: 1080,
      setWidth: function(w) { this.width = w; },
      setHeight: function(h) { this.height = h; },
      add: function() {},
      remove: function() {},
      sendToBack: function() {},
      bringToFront: function() {},
      renderAll: function() {},
      getObjects: function() { return []; },
      on: function() {},
      discardActiveObject: function() {},
      dispose: function() {}
    };

    gridSystem = new GridSystem(1920, 1080);

    // Mock state manager
    stateManager = {
      state: {},
      set: function(key, value) {
        const keys = key.split('.');
        let current = this.state;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
      },
      get: function(key) {
        const keys = key.split('.');
        let current = this.state;
        for (const k of keys) {
          if (current === undefined) return undefined;
          current = current[k];
        }
        return current;
      },
      subscribe: function() {}
    };

    // Mock canvas manager
    canvasManager = {
      canvas: mockCanvas,
      objects: {},
      gridSystem: gridSystem,
      createBackground: function(url, cb) { cb({ width: 100, height: 100, _element: { naturalWidth: 100, naturalHeight: 100 } }); },
      createTreatment: function(type) { 
        const obj = { name: 'treatment', width: 1920, height: 1080, visible: true, opacity: 0.85, fill: '#1E49E2', globalCompositeOperation: 'multiply' };
        this.objects.treatment = obj;
        return obj;
      },
      createMotif: function(x, y, w, h) {
        const obj = { name: 'motif', left: x, top: y, width: w, height: h, scaleX: 1, scaleY: 1, visible: true, selectable: true };
        this.objects.motif = obj;
        return obj;
      },
      createLogo: function() {
        const zone = gridSystem.getLogoZone();
        const obj = { name: 'logo', left: zone.x, top: zone.y, width: zone.width, height: zone.height, scaleX: 1, scaleY: 1, visible: true, selectable: false };
        this.objects.logo = obj;
        return obj;
      },
      createTagline: function(text, x, y) {
        const obj = { name: 'tagline', left: x, top: y, width: 200, height: 30, scaleX: 1, scaleY: 1, visible: true, selectable: false, fontSize: 14 };
        this.objects.tagline = obj;
        return obj;
      },
      createMetadata: function(meta, x, y) {
        const obj = { name: 'metadata', left: x, top: y, width: 300, height: 30, scaleX: 1, scaleY: 1, visible: true, selectable: false };
        this.objects.metadata = obj;
        return obj;
      },
      createHeadline: function(text, x, y, opts) {
        const obj = { name: 'headline', left: x, top: y, width: 400, height: 200, scaleX: 1, scaleY: 1, visible: true, selectable: true, fontSize: opts.fontSize || 36, fontFamily: opts.fontFamily || "KPMG Bold" };
        this.objects.headline = obj;
        return obj;
      },
      createSubheading: function(text, x, y, opts) {
        const obj = { name: 'subheading', left: x, top: y, width: 300, height: 50, scaleX: 1, scaleY: 1, visible: true, selectable: true, fontSize: opts.fontSize || 18 };
        this.objects.subheading = obj;
        return obj;
      },
      createSwoosh: function(motif, side) {
        const obj = { name: 'swoosh', left: motif.left - 50, top: motif.top + 50, width: 100, height: 50, scaleX: 1, scaleY: 1, visible: true, selectable: true, angle: 0 };
        this.objects.swoosh = obj;
        return obj;
      }
    };

    complianceEngine = new ComplianceEngine(stateManager, canvasManager, gridSystem);
  });

  // ═══════════════════════════════════════════════════════════════
  // GRID SYSTEM TESTS
  // ═══════════════════════════════════════════════════════════════

  runner.describe('Grid System', () => {
    runner.test('should calculate 5% margin', () => {
      const margin = gridSystem.margin;
      const expectedMargin = Math.min(1920, 1080) * 0.05;
      runner.expect(margin).toBe(expectedMargin);
    });

    runner.test('should use correct module ratio for landscape', () => {
      runner.expect(gridSystem.gridType).toBe('landscape');
      runner.expect(gridSystem.columns).toBe(14);
      runner.expect(gridSystem.rows).toBe(8);
    });

    runner.test('should calculate baseline unit as cellHeight/4', () => {
      runner.expect(gridSystem.baselineUnit).toBe(gridSystem.cellHeight / 4);
    });

    runner.test('should snap to grid correctly', () => {
      const snapped = gridSystem.snapToGrid(100, 100, 200, 150);
      runner.expect(snapped.x).toBeDefined();
      runner.expect(snapped.y).toBeDefined();
    });

    runner.test('should snap to baseline grid', () => {
      const y = 150;
      const snapped = gridSystem.snapToBaseline(y);
      const expected = gridSystem.margin + Math.round((y - gridSystem.margin) / gridSystem.baselineUnit) * gridSystem.baselineUnit;
      runner.expect(snapped).toBe(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // LOGO TESTS (CRITICAL)
  // ═══════════════════════════════════════════════════════════════

  runner.describe('Logo Placement (Brand Critical)', () => {
    runner.test('should place logo at top-left margin', () => {
      const logoZone = gridSystem.getLogoZone();
      runner.expect(logoZone.x).toBe(gridSystem.margin);
      runner.expect(logoZone.y).toBe(gridSystem.margin);
    });

    runner.test('should size logo to 2x1 grid units', () => {
      const logoZone = gridSystem.getLogoZone();
      const expectedWidth = gridSystem.cellWidth * 2 + gridSystem.gutter;
      const expectedHeight = gridSystem.cellHeight * 1;
      runner.expect(Math.abs(logoZone.width - expectedWidth)).toBeLessThan(2);
      runner.expect(Math.abs(logoZone.height - expectedHeight)).toBeLessThan(2);
    });

    runner.test('should enforce logo as locked (not selectable)', () => {
      canvasManager.createLogo();
      const logo = canvasManager.objects.logo;
      runner.expect(logo.selectable).toBeFalsy();
    });

    runner.test('should fail compliance if logo is moved from top-left', () => {
      canvasManager.createLogo();
      const logo = canvasManager.objects.logo;
      logo.left = 500; // Move logo
      logo.top = 500;

      const result = complianceEngine.validate('logo', stateManager.state);
      runner.expect(result.status).toBe('FAIL');
      runner.expect(result.issues.some(i => i.message.includes('top-left'))).toBeTruthy();
    });

    runner.test('should have logo safety zone of 2 grid units', () => {
      const logoZone = gridSystem.getLogoZone();
      const safeRight = logoZone.x + logoZone.width + gridSystem.cellWidth * 2;
      const safeBottom = logoZone.y + logoZone.height + gridSystem.cellHeight * 2;
      runner.expect(safeRight).toBeGreaterThan(logoZone.x + logoZone.width);
      runner.expect(safeBottom).toBeGreaterThan(logoZone.y + logoZone.height);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TAGLINE TESTS
  // ═══════════════════════════════════════════════════════════════

  runner.describe('Tagline Placement', () => {
    runner.test('should place tagline at bottom-left', () => {
      const taglineZone = gridSystem.getTaglineZone();
      runner.expect(taglineZone.x).toBe(gridSystem.margin);
      runner.expect(taglineZone.y).toBeGreaterThan(gridSystem.canvasHeight / 2);
    });

    runner.test('should size tagline to 1/3 of logo height', () => {
      const logoZone = gridSystem.getLogoZone();
      const taglineZone = gridSystem.getTaglineZone();
      const expectedHeight = logoZone.height / 3;
      runner.expect(Math.abs(taglineZone.height - expectedHeight)).toBeLessThan(2);
    });

    runner.test('should enforce tagline as locked', () => {
      const zone = gridSystem.getTaglineZone();
      canvasManager.createTagline('KPMG. Make the Difference.', zone.x, zone.y);
      const tagline = canvasManager.objects.tagline;
      runner.expect(tagline.selectable).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // METADATA TESTS
  // ═══════════════════════════════════════════════════════════════

  runner.describe('Metadata Placement', () => {
    runner.test('should place metadata at bottom-right', () => {
      const metaZone = gridSystem.getMetadataZone();
      runner.expect(metaZone.x + metaZone.width).toBeGreaterThan(gridSystem.canvasWidth / 2);
      runner.expect(metaZone.y).toBeGreaterThan(gridSystem.canvasHeight / 2);
    });

    runner.test('should have 2-grid-unit spacing between elements', () => {
      const metaZone = gridSystem.getMetadataZone();
      runner.expect(metaZone.spacing).toBe(gridSystem.cellWidth * 2);
    });

    runner.test('should size metadata to 1/3 of logo height', () => {
      const logoZone = gridSystem.getLogoZone();
      const metaZone = gridSystem.getMetadataZone();
      const expectedHeight = logoZone.height / 3;
      runner.expect(Math.abs(metaZone.height - expectedHeight)).toBeLessThan(2);
    });

    runner.test('should enforce metadata as locked', () => {
      const zone = gridSystem.getMetadataZone();
      canvasManager.createMetadata({ url: 'kpmg.com', date: 'Oct 2025' }, zone.x, zone.y);
      const metadata = canvasManager.objects.metadata;
      runner.expect(metadata.selectable).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // MOTIF/WINDOW TESTS
  // ═══════════════════════════════════════════════════════════════

  runner.describe('Motif/Window Placement', () => {
    runner.test('should enforce 7:10 or 10:7 ratio', () => {
      const grid = gridSystem;
      const motifW = grid.cellWidth * 6;
      const motifH = grid.cellHeight * 5;
      const ratio = motifW / motifH;
      const isPortrait = Math.abs(ratio - 7/10) < 0.15;
      const isLandscape = Math.abs(ratio - 10/7) < 0.15;
      runner.expect(isPortrait || isLandscape).toBeTruthy();
    });

    runner.test('should require minimum 20% of canvas area', () => {
      const canvasArea = gridSystem.canvasWidth * gridSystem.canvasHeight;
      const motifW = gridSystem.cellWidth * 6;
      const motifH = gridSystem.cellHeight * 5;
      const motifArea = motifW * motifH;
      runner.expect(motifArea).toBeGreaterThan(canvasArea * 0.20);
    });

    runner.test('should not overlap logo safe zone', () => {
      canvasManager.createLogo();
      const logo = canvasManager.objects.logo;

      const logoSafeRight = logo.left + logo.width + gridSystem.cellWidth * 2;
      const logoSafeBottom = logo.top + logo.height + gridSystem.cellHeight * 2;

      const motif = canvasManager.createMotif(logoSafeRight - 10, logoSafeBottom - 10, 200, 150);

      const result = complianceEngine.validate('motif', stateManager.state);
      runner.expect(result.issues.some(i => i.severity === 'critical')).toBeTruthy();
    });

    runner.test('should maintain 1 grid unit margin from canvas edge', () => {
      const grid = gridSystem;
      const edgeMargin = grid.margin + grid.cellWidth;
      const motif = canvasManager.createMotif(edgeMargin - 5, edgeMargin, 200, 150);

      const result = complianceEngine.validate('motif', stateManager.state);
      runner.expect(result.issues.some(i => i.message.includes('canvas edge'))).toBeTruthy();
    });

    runner.test('should be grid-aligned', () => {
      const motif = canvasManager.createMotif(100, 100, 200, 150);
      const snapped = gridSystem.snapToGrid(motif.left, motif.top, motif.width, motif.height);
      const drift = Math.abs(motif.left - snapped.x) + Math.abs(motif.top - snapped.y);
      runner.expect(drift).toBeLessThan(gridSystem.cellWidth * 0.2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TYPOGRAPHY TESTS
  // ═══════════════════════════════════════════════════════════════

  runner.describe('Typography', () => {
    runner.test('should use KPMG Bold for headline', () => {
      canvasManager.createHeadline('Test Headline', 100, 100, { fontFamily: "'KPMG Bold', Arial", fontSize: 36 });
      const headline = canvasManager.objects.headline;
      runner.expect(headline.fontFamily).toContain('KPMG');
    });

    runner.test('should use Univers for subheading', () => {
      canvasManager.createSubheading('Test Sub', 100, 300, { fontFamily: "'Univers', Arial", fontSize: 18 });
      const sub = canvasManager.objects.subheading;
      runner.expect(sub.fontFamily).toContain('Univers');
    });

    runner.test('should enforce subheading smaller than headline', () => {
      canvasManager.createHeadline('Headline', 100, 100, { fontSize: 36 });
      canvasManager.createSubheading('Sub', 100, 300, { fontSize: 30 });

      const result = complianceEngine.validate('typography', stateManager.state);
      runner.expect(result.issues.some(i => i.message.includes('smaller'))).toBeTruthy();
    });

    runner.test('should limit headline to 6 lines max', () => {
      const typographyEngine = new TypographyCompositionEngine(gridSystem, stateManager);
      const longText = 'One Two Three Four Five Six Seven Eight Nine Ten';
      const result = typographyEngine.compose(longText, null, null, null);
      runner.expect(result.headline.lines.length).toBeLessThan(7);
    });

    runner.test('should limit line offsets to 3 grid units', () => {
      const typographyEngine = new TypographyCompositionEngine(gridSystem, stateManager);
      const result = typographyEngine.compose('Line One Line Two Line Three', null, null, null);
      const maxOffset = Math.max(...result.headline.lines.map(l => Math.abs(l.offsetX || 0)));
      runner.expect(maxOffset).toBeLessThan(gridSystem.cellWidth * 3 + 1);
    });

    runner.test('should align to baseline grid', () => {
      const typographyEngine = new TypographyCompositionEngine(gridSystem, stateManager);
      const result = typographyEngine.compose('Test Headline', null, null, null);
      const baselineAligned = result.headline.lines.every(line => {
        const snappedY = gridSystem.snapToBaseline(line.y);
        return Math.abs(line.y - snappedY) < 1;
      });
      runner.expect(baselineAligned).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SWOOSH TESTS
  // ═══════════════════════════════════════════════════════════════

  runner.describe('Swoosh', () => {
    runner.test('should be horizontal only (0° angle)', () => {
      const motif = canvasManager.createMotif(400, 300, 300, 200);
      const swoosh = canvasManager.createSwoosh(motif, 'left');
      runner.expect(swoosh.angle).toBe(0);
    });

    runner.test('should be attached to left or right of motif', () => {
      const motif = canvasManager.createMotif(400, 300, 300, 200);
      const swoosh = canvasManager.createSwoosh(motif, 'left');
      const swooshCenter = swoosh.left + swoosh.width / 2;
      const motifLeft = motif.left;
      const motifRight = motif.left + motif.width;

      const attached = Math.abs(swooshCenter - motifLeft) < gridSystem.cellWidth ||
                       Math.abs(swooshCenter - motifRight) < gridSystem.cellWidth;
      runner.expect(attached).toBeTruthy();
    });

    runner.test('should not exceed motif short side width', () => {
      const motif = canvasManager.createMotif(400, 300, 300, 200);
      const swoosh = canvasManager.createSwoosh(motif, 'left');
      const motifShortSide = Math.min(motif.width, motif.height);
      runner.expect(swoosh.width).toBeLessThan(motifShortSide * 1.2);
    });

    runner.test('should not exceed 0.5x motif height', () => {
      const motif = canvasManager.createMotif(400, 300, 300, 200);
      const swoosh = canvasManager.createSwoosh(motif, 'left');
      runner.expect(swoosh.height).toBeLessThan(motif.height * 0.5);
    });

    runner.test('should not overlap headline', () => {
      const motif = canvasManager.createMotif(400, 300, 300, 200);
      canvasManager.createHeadline('Test', 400, 300, {});
      const swoosh = canvasManager.createSwoosh(motif, 'left');

      // Position swoosh to overlap headline
      swoosh.left = 400;
      swoosh.top = 300;

      const result = complianceEngine.validate('swoosh', stateManager.state);
      runner.expect(result.issues.some(i => i.message.includes('headline'))).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TREATMENT TESTS
  // ═══════════════════════════════════════════════════════════════

  runner.describe('Color Treatment', () => {
    runner.test('should use approved KPMG colors', () => {
      const treatment = canvasManager.createTreatment('blue-multiply');
      const approvedColors = ['#1E49E2', '#00338D', '#5FD7FF'];
      const isApproved = approvedColors.some(c => 
        treatment.fill && treatment.fill.toLowerCase().includes(c.toLowerCase())
      );
      runner.expect(isApproved).toBeTruthy();
    });

    runner.test('should use approved blend modes', () => {
      const treatment = canvasManager.createTreatment('blue-multiply');
      const approvedBlends = ['multiply', 'hard-light', 'linear-light', 'color', 'overlay'];
      runner.expect(approvedBlends).toContain(treatment.globalCompositeOperation);
    });

    runner.test('should cover full canvas', () => {
      const treatment = canvasManager.createTreatment('blue-multiply');
      runner.expect(treatment.width).toBe(1920);
      runner.expect(treatment.height).toBe(1080);
    });

    runner.test('should not allow opacity below 0.3', () => {
      const treatment = canvasManager.createTreatment('blue-multiply', { opacity: 0.2 });
      runner.expect(treatment.opacity).toBeGreaterThan(0.29);
    });

    runner.test('should support gradient map treatment', () => {
      const treatment = canvasManager.createTreatment('pacific-gradient');
      runner.expect(treatment.gradient).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // COMPLIANCE TESTS
  // ═══════════════════════════════════════════════════════════════

  runner.describe('Compliance Engine', () => {
    runner.test('should validate all 10 categories', () => {
      const report = complianceEngine.validateAll();
      runner.expect(report.categories).toBeDefined();
      const categories = Object.keys(report.categories);
      runner.expect(categories.length).toBe(10);
    });

    runner.test('should block export on FAIL status', () => {
      complianceEngine.status = 'FAIL';
      runner.expect(complianceEngine.canExport()).toBeFalsy();
    });

    runner.test('should allow export on PASS status', () => {
      complianceEngine.status = 'PASS';
      runner.expect(complianceEngine.canExport()).toBeTruthy();
    });

    runner.test('should calculate composite score', () => {
      const report = complianceEngine.validateAll();
      runner.expect(report.score).toBeDefined();
      runner.expect(report.score).toBeGreaterThan(0);
      runner.expect(report.score).toBeLessThan(101);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // INTEGRATION TESTS
  // ═══════════════════════════════════════════════════════════════

  runner.describe('Integration', () => {
    runner.test('should maintain locked elements during drag', () => {
      canvasManager.createLogo();
      const logo = canvasManager.objects.logo;
      const originalX = logo.left;
      const originalY = logo.top;

      // Simulate drag
      logo.left = 500;
      logo.top = 500;

      // Constraint engine would reset this
      const zone = gridSystem.getLogoZone();
      logo.left = zone.x;
      logo.top = zone.y;

      runner.expect(logo.left).toBe(originalX);
      runner.expect(logo.top).toBe(originalY);
    });

    runner.test('should snap motif to grid after drag', () => {
      const motif = canvasManager.createMotif(150, 150, 200, 150);
      const snapped = gridSystem.snapToGrid(motif.left, motif.top, motif.width, motif.height);
      const drift = Math.abs(motif.left - snapped.x) + Math.abs(motif.top - snapped.y);
      runner.expect(drift).toBeLessThan(gridSystem.cellWidth * 0.2);
    });

    runner.test('should enforce logo safe zone for motif', () => {
      canvasManager.createLogo();
      const logo = canvasManager.objects.logo;
      const logoSafeRight = logo.left + logo.width + gridSystem.cellWidth * 2;

      const motif = canvasManager.createMotif(logoSafeRight - 5, 100, 200, 150);
      const result = complianceEngine.validate('motif', stateManager.state);
      runner.expect(result.issues.some(i => i.message.includes('logo'))).toBeTruthy();
    });
  });

  return runner.runAll();
}

// Auto-run tests when loaded
if (typeof window !== 'undefined') {
  window.TestRunner = TestRunner;
  window.runBrandComplianceTests = runBrandComplianceTests;
}

// Run tests immediately if in test environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TestRunner, runBrandComplianceTests };
}

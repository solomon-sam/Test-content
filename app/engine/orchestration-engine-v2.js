/**
 * Orchestration Engine v2.0 — Phase 4
 * Unified pipeline merging auto-composition and manual editing modes
 * State machine: IDLE → AUTO_COMPOSING → MANUAL_EDITING → VALIDATING → EXPORTING
 * Seamless mode transitions with state preservation
 */

class OrchestrationEngineV2 {
  constructor(canvasManager, gridSystem, stateManager) {
    this.canvasManager = canvasManager;
    this.gridSystem = gridSystem;
    this.stateManager = stateManager;

    // State machine
    this.state = 'idle'; // idle | auto_composing | manual_editing | validating | exporting | error
    this.previousState = null;
    this.stateHistory = [];

    // Pipeline stages
    this.stages = [
      'idle',
      'image_analysis',
      'grid_calculation',
      'element_placement',
      'typography_generation',
      'treatment_application',
      'swoosh_generation',
      'accessibility_validation',
      'compliance_validation',
      'manual_adjustment',
      'final_validation',
      'export_preparation',
      'complete'
    ];

    this.currentStageIndex = 0;
    this.pipelineResults = {};
    this.isRunning = false;
    this.abortController = null;

    // Performance tracking
    this.stageTimings = new Map();
    this.totalPipelineTime = 0;

    // Sub-engines (injected)
    this.aiEngine = null;
    this.compositionEngine = null;
    this.typographyEngine = null;
    this.accessibilityEngine = null;
    this.complianceEngine = null;
    this.constraintEngine = null;
    this.exportSystem = null;

    // Event callbacks
    this.onStageChange = null;
    this.onStateChange = null;
    this.onError = null;
    this.onComplete = null;

    // Bind methods
    this.transitionTo = this.transitionTo.bind(this);
    this.runAutoPipeline = this.runAutoPipeline.bind(this);
    this.runManualPipeline = this.runManualPipeline.bind(this);
    this.runExportPipeline = this.runExportPipeline.bind(this);
  }

  /**
   * Inject sub-engines
   */
  setEngines(engines) {
    this.aiEngine = engines.aiEngine || null;
    this.compositionEngine = engines.compositionEngine || null;
    this.typographyEngine = engines.typographyEngine || null;
    this.accessibilityEngine = engines.accessibilityEngine || null;
    this.complianceEngine = engines.complianceEngine || null;
    this.constraintEngine = engines.constraintEngine || null;
    this.exportSystem = engines.exportSystem || null;
  }

  /**
   * State machine transition
   */
  transitionTo(newState, context = {}) {
    const validTransitions = {
      'idle': ['auto_composing', 'manual_editing', 'validating', 'exporting'],
      'auto_composing': ['manual_editing', 'validating', 'idle', 'error'],
      'manual_editing': ['validating', 'auto_composing', 'idle', 'error'],
      'validating': ['auto_composing', 'manual_editing', 'exporting', 'idle', 'error'],
      'exporting': ['idle', 'error'],
      'error': ['idle', 'auto_composing', 'manual_editing']
    };

    const allowed = validTransitions[this.state] || [];
    if (!allowed.includes(newState)) {
      console.warn(`Invalid state transition: ${this.state} → ${newState}`);
      return false;
    }

    this.previousState = this.state;
    this.stateHistory.push({
      from: this.state,
      to: newState,
      timestamp: Date.now(),
      context
    });

    this.state = newState;

    // Notify subscribers
    if (this.stateManager) {
      this.stateManager.set('orchestration.state', newState);
      this.stateManager.set('orchestration.previousState', this.previousState);
    }

    if (this.onStateChange) {
      this.onStateChange(newState, this.previousState, context);
    }

    return true;
  }

  /**
   * Run the full auto-composition pipeline (17 stages)
   */
  async runAutoPipeline(imageElement, logoImage, brandSettings, options = {}) {
    if (this.isRunning) {
      console.warn('Pipeline already running. Abort previous first.');
      return null;
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      this.transitionTo('auto_composing');
      this.currentStageIndex = 0;
      this.pipelineResults = {};
      this.stageTimings.clear();

      const pipelineStart = performance.now();

      // Stage 1: Image Analysis
      await this.runStage('image_analysis', async () => {
        if (!this.aiEngine) throw new Error('AI Engine not available');
        const preset = options.preset || this.stateManager?.get('selectedPreset');
        const dims = AssetPresets.getCanvasDimensions(preset);
        const analysis = await this.aiEngine.analyzeImage(imageElement, dims.width, dims.height);
        this.pipelineResults.analysis = analysis;
        if (this.stateManager) this.stateManager.set('imageAnalysis', analysis);
        return analysis;
      }, signal);

      // Stage 2: Grid Calculation
      await this.runStage('grid_calculation', async () => {
        if (!this.gridSystem) throw new Error('Grid System not available');
        // Grid already calculated in constructor, but refresh for current preset
        const preset = options.preset || this.stateManager?.get('selectedPreset');
        const dims = AssetPresets.getCanvasDimensions(preset);
        this.gridSystem = new GridSystem(dims.width, dims.height);
        this.canvasManager.setGridSystem(this.gridSystem);
        this.canvasManager.drawGrid();
        return this.gridSystem.getInfo();
      }, signal);

      // Stage 3: Element Placement (Logo, Tagline, Metadata)
      await this.runStage('element_placement', async () => {
        if (!this.compositionEngine) throw new Error('Composition Engine not available');
        const placements = await this.compositionEngine.autoCompose(logoImage, brandSettings);
        this.pipelineResults.placements = placements;
        if (this.stateManager) this.stateManager.set('placements', placements);
        return placements;
      }, signal);

      // Stage 4: Typography Generation
      await this.runStage('typography_generation', async () => {
        if (!this.typographyEngine) throw new Error('Typography Engine not available');
        const headline = this.stateManager?.get('headline') || '';
        const subheading = this.stateManager?.get('subheading') || '';
        if (!headline.trim()) return null;

        const motif = this.pipelineResults.motif || this.canvasManager.objects.motif;
        const motifData = motif ? {
          x: motif.left,
          y: motif.top,
          width: motif.width * motif.scaleX,
          height: motif.height * motif.scaleY
        } : null;

        const composition = this.typographyEngine.compose(
          headline,
          subheading,
          motifData,
          this.pipelineResults.analysis
        );
        this.pipelineResults.typography = composition;
        return composition;
      }, signal);

      // Stage 5: Treatment Application
      await this.runStage('treatment_application', async () => {
        const treatment = this.stateManager?.get('composition.treatment') || {
          id: 'blue-multiply',
          color: '#1E49E2',
          blendMode: 'multiply',
          opacity: 0.85
        };
        this.canvasManager.applyColorTreatment(treatment);
        this.pipelineResults.treatment = treatment;
        return treatment;
      }, signal);

      // Stage 6: Swoosh Generation
      await this.runStage('swoosh_generation', async () => {
        const motif = this.canvasManager.objects.motif;
        if (motif) {
          const swoosh = this.generateSwoosh(motif);
          this.canvasManager.addSwoosh(swoosh);
          this.pipelineResults.swoosh = swoosh;
          return swoosh;
        }
        return null;
      }, signal);

      // Stage 7: Accessibility Validation
      await this.runStage('accessibility_validation', async () => {
        if (!this.accessibilityEngine) return { skipped: true };
        const result = this.accessibilityEngine.validate(
          this.pipelineResults.typography,
          this.pipelineResults.treatment,
          this.canvasManager.objects.motif
        );
        this.pipelineResults.accessibility = result;
        return result;
      }, signal);

      // Stage 8: Compliance Validation
      await this.runStage('compliance_validation', async () => {
        if (!this.complianceEngine) return { skipped: true };
        const report = this.complianceEngine.validateAll();
        this.pipelineResults.compliance = report;
        return report;
      }, signal);

      // Stage 9: Place all elements on canvas
      await this.runStage('element_rendering', async () => {
        this.placeAllElements(logoImage, brandSettings);
        return { placed: true };
      }, signal);

      // Stage 10: Calculate brand score
      await this.runStage('scoring', async () => {
        const score = this.calculateBrandScore();
        if (this.stateManager) this.stateManager.set('brandScore', score);
        return { score };
      }, signal);

      this.totalPipelineTime = performance.now() - pipelineStart;
      this.pipelineResults.totalTime = this.totalPipelineTime;
      this.pipelineResults.stageTimings = Object.fromEntries(this.stageTimings);

      this.transitionTo('idle', { result: this.pipelineResults });
      this.isRunning = false;

      if (this.onComplete) {
        this.onComplete(this.pipelineResults);
      }

      return this.pipelineResults;

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Pipeline aborted');
        this.transitionTo('idle', { aborted: true });
      } else {
        console.error('Pipeline error:', error);
        this.transitionTo('error', { error: error.message });
        if (this.onError) this.onError(error);
      }
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Run manual editing pipeline (lightweight, preserves auto results)
   */
  async runManualPipeline(options = {}) {
    if (this.isRunning) return null;

    this.transitionTo('manual_editing');
    this.isRunning = true;

    try {
      // In manual mode, we preserve the auto-composition results
      // and only re-validate when user makes changes

      // Enable edit mode
      if (this.canvasManager) {
        // Make editable elements selectable
        const editable = ['motif', 'headline', 'subheading', 'swoosh', 'background'];
        editable.forEach(name => {
          const obj = this.canvasManager.objects[name];
          if (obj) {
            obj.set('selectable', true);
            obj.set('evented', true);
          }
        });
        this.canvasManager.requestRender();
      }

      // Start live validation loop
      this.startLiveValidation();

      this.isRunning = false;
      return { mode: 'manual', editable: true };

    } catch (error) {
      this.transitionTo('error', { error: error.message });
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Run export pipeline with pre-export validation
   */
  async runExportPipeline(exportOptions = {}) {
    if (this.isRunning) return null;

    this.transitionTo('exporting');
    this.isRunning = true;

    try {
      // Pre-export validation
      const validationResult = await this.runPreExportValidation();
      if (!validationResult.canExport) {
        this.transitionTo('validating', { 
          reason: 'Export blocked by compliance failures',
          issues: validationResult.issues 
        });
        this.isRunning = false;
        return validationResult;
      }

      // Perform export
      if (!this.exportSystem) {
        throw new Error('Export System not available');
      }

      const format = exportOptions.format || this.stateManager?.get('exportFormat') || 'png';
      const dpi = exportOptions.dpi || this.stateManager?.get('exportDpi') || 300;
      const quality = (exportOptions.quality || this.stateManager?.get('exportQuality') || 95) / 100;

      let result;
      if (format === 'pdf') {
        result = await this.exportSystem.exportPDF({ dpi, quality });
      } else {
        result = await this.exportSystem.export({ format, dpi, quality });
      }

      // Post-export validation
      const postValidation = await this.runPostExportValidation(result);

      this.pipelineResults.export = {
        ...result,
        preValidation: validationResult,
        postValidation
      };

      this.transitionTo('idle', { exported: true });
      this.isRunning = false;

      return this.pipelineResults.export;

    } catch (error) {
      this.transitionTo('error', { error: error.message });
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Run a single pipeline stage with timing and abort support
   */
  async runStage(stageName, stageFn, signal) {
    if (signal?.aborted) {
      throw new Error('AbortError');
    }

    const startTime = performance.now();
    this.currentStageIndex = this.stages.indexOf(stageName);

    if (this.onStageChange) {
      this.onStageChange(stageName, this.currentStageIndex, this.stages.length);
    }

    if (this.stateManager) {
      this.stateManager.set('orchestration.currentStage', stageName);
      this.stateManager.set('orchestration.stageIndex', this.currentStageIndex);
      this.stateManager.set('orchestration.totalStages', this.stages.length);
    }

    try {
      const result = await stageFn();
      const duration = performance.now() - startTime;
      this.stageTimings.set(stageName, duration);
      return result;
    } catch (error) {
      if (signal?.aborted) {
        throw new Error('AbortError');
      }
      throw error;
    }
  }

  /**
   * Pre-export validation — comprehensive check before allowing export
   */
  async runPreExportValidation() {
    const issues = [];
    let canExport = true;

    // 1. Compliance check
    if (this.complianceEngine) {
      const report = this.complianceEngine.getReport();
      if (report && report.overall === 'FAIL') {
        canExport = false;
        issues.push(...this.complianceEngine.getAllIssues().filter(i => i.severity === 'critical' || i.severity === 'hard'));
      }
    }

    // 2. Canvas integrity check
    if (this.canvasManager) {
      const canvas = this.canvasManager.canvas;
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        canExport = false;
        issues.push({ category: 'canvas', message: 'Canvas has invalid dimensions', severity: 'critical' });
      }

      // Check all required elements are present
      const required = ['background', 'logo', 'tagline', 'treatment'];
      for (const name of required) {
        const obj = this.canvasManager.objects[name];
        if (!obj || !obj.visible) {
          issues.push({ category: 'elements', message: `Required element "${name}" is missing`, severity: 'warning' });
        }
      }
    }

    // 3. Typography check
    const headline = this.stateManager?.get('headline');
    if (!headline || headline.trim().length === 0) {
      canExport = false;
      issues.push({ category: 'typography', message: 'Headline is required for export', severity: 'critical' });
    }

    // 4. Image check
    const bgImage = this.stateManager?.get('backgroundImage');
    if (!bgImage) {
      canExport = false;
      issues.push({ category: 'image', message: 'Background image is required for export', severity: 'critical' });
    }

    return { canExport, issues, timestamp: Date.now() };
  }

  /**
   * Post-export validation — verify exported file integrity
   */
  async runPostExportValidation(exportResult) {
    const issues = [];

    // Check file size is reasonable
    if (exportResult.fileSize === 0) {
      issues.push({ category: 'export', message: 'Exported file has zero size', severity: 'critical' });
    }

    // Check dimensions match canvas
    const canvasW = this.canvasManager?.canvas?.width || 0;
    const canvasH = this.canvasManager?.canvas?.height || 0;
    if (exportResult.dimensions) {
      const expectedW = Math.round(canvasW * (exportResult.dpi / 72));
      const expectedH = Math.round(canvasH * (exportResult.dpi / 72));
      if (Math.abs(exportResult.dimensions.width - expectedW) > 2 ||
          Math.abs(exportResult.dimensions.height - expectedH) > 2) {
        issues.push({ category: 'export', message: 'Export dimensions do not match canvas', severity: 'warning' });
      }
    }

    return { valid: issues.length === 0, issues, timestamp: Date.now() };
  }

  /**
   * Start live validation loop during manual editing
   */
  startLiveValidation() {
    if (this._liveValidationInterval) {
      clearInterval(this._liveValidationInterval);
    }

    let lastValidationTime = 0;
    const VALIDATION_INTERVAL = 100; // ms

    this._liveValidationInterval = setInterval(() => {
      const now = performance.now();
      if (now - lastValidationTime < VALIDATION_INTERVAL) return;
      lastValidationTime = now;

      // Quick validation (not full compliance)
      if (this.complianceEngine && this.stateManager) {
        const selectedElement = this.stateManager.get('selectedElement');
        if (selectedElement) {
          const result = this.complianceEngine.validate(selectedElement, this.stateManager.state);
          if (result && result.status === 'FAIL') {
            // Emit event for UI to show constraint feedback
            if (this.stateManager) {
              this.stateManager.set('validation.constraintViolation', {
                element: selectedElement,
                issues: result.issues,
                timestamp: now
              });
            }
          }
        }
      }
    }, 50); // Check every 50ms, validate every 100ms
  }

  /**
   * Stop live validation
   */
  stopLiveValidation() {
    if (this._liveValidationInterval) {
      clearInterval(this._liveValidationInterval);
      this._liveValidationInterval = null;
    }
  }

  /**
   * Abort current pipeline
   */
  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isRunning = false;
    this.stopLiveValidation();
  }

  /**
   * Place all brand elements on canvas
   */
  placeAllElements(logoImage, brandSettings) {
    const grid = this.gridSystem;
    const placements = this.pipelineResults.placements;

    // Background image
    const bgImage = this.stateManager?.get('backgroundImage');
    if (bgImage) {
      this.canvasManager.addBackgroundImage(bgImage);
    }

    // Logo
    if (logoImage && placements?.logo) {
      this.canvasManager.addLogo(logoImage, placements.logo);
    } else {
      this.generateDemoLogo();
    }

    // Tagline
    const taglineText = brandSettings?.tagline || 'KPMG. Make the Difference.';
    const taglineZone = grid.getTaglineZone();
    this.canvasManager.addTagline(taglineText, {
      x: taglineZone.x,
      y: taglineZone.y,
      fontSize: Math.max(12, Math.min(20, grid.canvasWidth / 60))
    });

    // Metadata
    const metadataText = this.buildMetadataText(brandSettings);
    const metadataZone = grid.getMetadataZone();
    this.canvasManager.addMetadata(metadataText, metadataZone);

    // Motif
    const motif = this.calculateMotifPlacement();
    this.canvasManager.addMotif(motif);

    // Typography
    if (this.pipelineResults.typography) {
      // Typography is rendered by the typography renderer
      // This is handled separately
    }

    this.canvasManager.requestRender();
  }

  /**
   * Calculate motif placement based on image analysis
   */
  calculateMotifPlacement() {
    const grid = this.gridSystem;
    const analysis = this.pipelineResults.analysis;

    let x = grid.margin + grid.cellWidth * 4;
    let y = grid.margin + grid.cellHeight * 2;
    let w = grid.cellWidth * 6;
    let h = w * (7/10);

    // Use saliency focal point if available
    if (analysis && analysis.saliency && analysis.saliency.focalPoint) {
      const focal = analysis.saliency.focalPoint;
      x = Math.max(
        grid.margin + grid.cellWidth * 2,
        Math.min(focal.x - w/2, grid.canvasWidth - grid.margin - w - grid.cellWidth * 2)
      );
      y = Math.max(
        grid.margin + grid.cellHeight * 2,
        Math.min(focal.y - h/2, grid.canvasHeight - grid.margin - h - grid.cellHeight * 3)
      );
    }

    // Snap to grid
    const snapped = grid.snapToGrid(x, y, w, h);
    return snapped;
  }

  /**
   * Generate demo KPMG logo
   */
  generateDemoLogo() {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');

    const blockWidth = 40;
    const blockHeight = 40;
    const gap = 4;
    const letters = ['K', 'P', 'M', 'G'];

    letters.forEach((letter, i) => {
      const x = i * (blockWidth + gap);
      ctx.fillStyle = '#00338D';
      ctx.fillRect(x, 0, blockWidth, blockHeight);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, x + blockWidth/2, blockHeight/2);
    });

    const img = new Image();
    img.onload = () => {
      const zone = this.gridSystem.getLogoZone();
      this.canvasManager.addLogo(img, {
        x: zone.x,
        y: zone.y,
        scale: zone.width / img.width
      });
      this.canvasManager.requestRender();
    };
    img.src = canvas.toDataURL();
  }

  /**
   * Build metadata text string
   */
  buildMetadataText(brandSettings) {
    const parts = [];
    if (brandSettings?.url) parts.push(brandSettings.url);
    if (brandSettings?.date) parts.push(brandSettings.date);
    if (brandSettings?.cta) parts.push(brandSettings.cta);
    return parts.join(' | ');
  }

  /**
   * Generate swoosh element
   */
  generateSwoosh(motif) {
    const grid = this.gridSystem;
    const motifW = motif.width * motif.scaleX;
    const motifH = motif.height * motif.scaleY;
    const swooshWidth = Math.min(motifW * 0.5, grid.cellWidth * 3);
    const swooshHeight = Math.min(motifH * 0.3, grid.cellHeight * 2);

    return {
      x: motif.left - swooshWidth - grid.cellWidth * 0.5,
      y: motif.top + motifH * 0.3,
      width: swooshWidth,
      height: swooshHeight
    };
  }

  /**
   * Calculate brand score
   */
  calculateBrandScore() {
    if (this.complianceEngine) {
      const report = this.complianceEngine.getReport();
      if (report && report.score !== undefined) {
        return report.score;
      }
    }

    // Fallback calculation
    let score = 0;
    const weights = {
      logo: 20,
      colors: 20,
      typography: 20,
      imagery: 20,
      layout: 20
    };

    const checklist = this.stateManager?.get('checklistStatus') || {};
    for (const [key, weight] of Object.entries(weights)) {
      const status = checklist[key];
      if (status === 'pass') score += weight;
      else if (status === 'warning') score += weight * 0.5;
    }

    return score;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      previousState: this.previousState,
      isRunning: this.isRunning,
      currentStage: this.stages[this.currentStageIndex],
      stageIndex: this.currentStageIndex,
      totalStages: this.stages.length,
      pipelineResults: this.pipelineResults,
      stageTimings: Object.fromEntries(this.stageTimings),
      totalTime: this.totalPipelineTime
    };
  }

  /**
   * Get state history
   */
  getStateHistory() {
    return this.stateHistory;
  }

  /**
   * Reset to idle
   */
  reset() {
    this.abort();
    this.state = 'idle';
    this.previousState = null;
    this.stateHistory = [];
    this.currentStageIndex = 0;
    this.pipelineResults = {};
    this.stageTimings.clear();
    this.totalPipelineTime = 0;

    if (this.stateManager) {
      this.stateManager.set('orchestration.state', 'idle');
    }
  }

  /**
   * Destroy
   */
  destroy() {
    this.abort();
    this.stopLiveValidation();
    this.canvasManager = null;
    this.gridSystem = null;
    this.stateManager = null;
    this.aiEngine = null;
    this.compositionEngine = null;
    this.typographyEngine = null;
    this.accessibilityEngine = null;
    this.complianceEngine = null;
    this.constraintEngine = null;
    this.exportSystem = null;
  }
}

// Make available globally
window.OrchestrationEngineV2 = OrchestrationEngineV2;

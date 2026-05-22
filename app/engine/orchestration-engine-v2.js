/**
 * Orchestration Engine v2.0
 * 12-stage composition pipeline with state machine
 * FIXED: Logo strictly top-left, no saliency-based positioning
 */

class OrchestrationEngine {
  constructor(canvasManager, gridSystem, stateManager, 
              compositionEngine, typographyEngine, complianceEngine,
              constraintEngine, aiAnalysisEngine, exportSystem) {
    this.canvasManager = canvasManager;
    this.gridSystem = gridSystem;
    this.stateManager = stateManager;
    this.compositionEngine = compositionEngine;
    this.typographyEngine = typographyEngine;
    this.complianceEngine = complianceEngine;
    this.constraintEngine = constraintEngine;
    this.aiAnalysisEngine = aiAnalysisEngine;
    this.exportSystem = exportSystem;

    // State machine
    this.state = 'IDLE';
    this.pipelineStage = 0;
    this.totalStages = 12;
    this.abortController = null;
    this.stageTimings = [];

    // Event callbacks
    this.callbacks = {
      onStageChange: null,
      onComplete: null,
      onError: null,
      onProgress: null
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // STATE MACHINE
  // ═══════════════════════════════════════════════════════════════

  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.stateManager.set('orchestration.state', newState);

    if (this.callbacks.onStageChange) {
      this.callbacks.onStageChange(newState, oldState, this.pipelineStage, this.totalStages);
    }
  }

  getState() {
    return this.state;
  }

  isRunning() {
    return this.state === 'AUTO_COMPOSING' || this.state === 'MANUAL_EDITING';
  }

  canAbort() {
    return this.state === 'AUTO_COMPOSING';
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE STAGES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Stage 1: Initialize
   */
  async stageInitialize() {
    this.setState('AUTO_COMPOSING');
    this.pipelineStage = 1;
    this.stageTimings = [];

    // Reset composition state
    this.stateManager.set('composition', {
      logo: null,
      tagline: null,
      metadata: null,
      motif: null,
      headline: null,
      subheading: null,
      swoosh: null,
      treatment: null,
      background: null
    });

    this.stateManager.set('imageAnalysis', null);
    this.stateManager.set('typographyComposition', null);
    this.stateManager.set('complianceReport', null);
    this.stateManager.set('complianceStatus', 'PASS');

    return { status: 'complete', message: 'Initialization complete' };
  }

  /**
   * Stage 2: Load Background Image
   */
  async stageLoadBackground(imageUrl) {
    this.pipelineStage = 2;

    return new Promise((resolve, reject) => {
      this.canvasManager.createBackground(imageUrl, (img) => {
        if (img) {
          this.stateManager.set('composition.background', {
            url: imageUrl,
            width: img.width,
            height: img.height
          });
          resolve({ status: 'complete', message: 'Background loaded' });
        } else {
          reject(new Error('Failed to load background image'));
        }
      });
    });
  }

  /**
   * Stage 3: AI Image Analysis
   */
  async stageAnalyzeImage() {
    this.pipelineStage = 3;

    const bg = this.canvasManager.objects.background;
    if (!bg || !bg._element) {
      return { status: 'skipped', message: 'No background to analyze' };
    }

    try {
      const analysis = await this.aiAnalysisEngine.analyze(
        bg._element,
        this.gridSystem.canvasWidth,
        this.gridSystem.canvasHeight
      );

      this.stateManager.set('imageAnalysis', analysis);

      return { 
        status: 'complete', 
        message: 'Image analysis complete',
        data: { focalPoint: analysis.saliency.focalPoint, score: analysis.quality.score }
      };
    } catch (error) {
      console.warn('AI analysis failed, using fallback:', error);
      const fallback = this.aiAnalysisEngine.getFallbackAnalysis(
        this.gridSystem.canvasWidth,
        this.gridSystem.canvasHeight
      );
      this.stateManager.set('imageAnalysis', fallback);

      return { 
        status: 'warning', 
        message: 'Using fallback analysis',
        data: { focalPoint: fallback.saliency.focalPoint }
      };
    }
  }

  /**
   * Stage 4: Apply Color Treatment
   */
  async stageApplyTreatment(treatmentType = 'blue-multiply') {
    this.pipelineStage = 4;

    const treatment = this.canvasManager.createTreatment(treatmentType);

    return { 
      status: 'complete', 
      message: `Treatment applied: ${treatmentType}` 
    };
  }

  /**
   * Stage 5: Place Logo (TOP-LEFT, LOCKED)
   * FIXED: Logo is ALWAYS top-left, never based on saliency
   */
  async stagePlaceLogo(logoUrl) {
    this.pipelineStage = 5;

    const logoZone = this.gridSystem.getLogoZone();

    // FIXED: Logo is always placed at top-left, locked
    // No saliency-based positioning allowed per KPMG brand guidelines
    this.canvasManager.createLogo({ logoUrl });

    this.stateManager.set('composition.logo', {
      x: logoZone.x,
      y: logoZone.y,
      width: logoZone.width,
      height: logoZone.height,
      locked: true
    });

    return { 
      status: 'complete', 
      message: 'Logo placed at top-left (locked)' 
    };
  }

  /**
   * Stage 6: Place Tagline (BOTTOM-LEFT, LOCKED)
   */
  async stagePlaceTagline(text) {
    this.pipelineStage = 6;

    const taglineZone = this.gridSystem.getTaglineZone();
    const tagline = this.canvasManager.createTagline(text, taglineZone.x, taglineZone.y);

    this.stateManager.set('composition.tagline', {
      x: taglineZone.x,
      y: taglineZone.y,
      text: text || 'KPMG. Make the Difference.',
      locked: true
    });

    return { status: 'complete', message: 'Tagline placed' };
  }

  /**
   * Stage 7: Place Metadata (BOTTOM-RIGHT, LOCKED)
     */
  async stagePlaceMetadata(metadata) {
    this.pipelineStage = 7;

    const metadataZone = this.gridSystem.getMetadataZone();
    const metaData = metadata || {
      url: 'kpmg.com',
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      cta: ''
    };

    this.canvasManager.createMetadata(metaData, metadataZone.x, metadataZone.y);

    this.stateManager.set('composition.metadata', {
      ...metaData,
      x: metadataZone.x,
      y: metadataZone.y,
      locked: true
    });

    return { status: 'complete', message: 'Metadata placed' };
  }

  /**
   * Stage 8: Place Motif Window
   */
  async stagePlaceMotif(motifPosition) {
    this.pipelineStage = 8;

    const analysis = this.stateManager.state.imageAnalysis;
    const logoPosition = this.stateManager.state.composition.logo;

    let position;

    if (motifPosition) {
      // Use provided position
      position = motifPosition;
    } else if (analysis && analysis.saliency) {
      // Use focal point from analysis, but ensure logo safety
      const focal = analysis.saliency.focalPoint;
      const grid = this.gridSystem;

      // Ensure motif doesn't overlap logo safe zone
      const logoSafeRight = grid.margin + grid.cellWidth * 4; // logo width + 2 grid safety
      const logoSafeBottom = grid.margin + grid.cellHeight * 3; // logo height + 2 grid safety

      let motifX = focal.x - grid.cellWidth * 3;
      let motifY = focal.y - grid.cellHeight * 2.5;

      // Push away from logo if needed
      if (motifX < logoSafeRight && motifY < logoSafeBottom) {
        motifX = logoSafeRight + grid.cellWidth;
      }

      // Ensure 1 grid unit margin from edge
      const edgeMargin = grid.margin + grid.cellWidth;
      motifX = Math.max(edgeMargin, Math.min(motifX, grid.canvasWidth - edgeMargin - grid.cellWidth * 6));
      motifY = Math.max(edgeMargin, Math.min(motifY, grid.canvasHeight - edgeMargin - grid.cellHeight * 5));

      position = {
        x: motifX,
        y: motifY,
        width: grid.cellWidth * 6,
        height: grid.cellHeight * 5
      };
    } else {
      // Default position
      const grid = this.gridSystem;
      position = {
        x: grid.margin + grid.cellWidth * 4,
        y: grid.margin + grid.cellHeight * 3,
        width: grid.cellWidth * 6,
        height: grid.cellHeight * 5
      };
    }

    // Snap to grid
    const snapped = this.gridSystem.snapToGrid(position.x, position.y, position.width, position.height);

    const motif = this.canvasManager.createMotif(snapped.x, snapped.y, snapped.width, snapped.height);

    this.stateManager.set('composition.motif', {
      x: snapped.x,
      y: snapped.y,
      width: snapped.width,
      height: snapped.height,
      ratio: snapped.width / snapped.height
    });

    return { 
      status: 'complete', 
      message: 'Motif placed',
      data: { position: snapped }
    };
  }

  /**
   * Stage 9: Compose Typography
   */
  async stageComposeTypography(headlineText, subheadingText) {
    this.pipelineStage = 9;

    const motif = this.canvasManager.objects.motif;
    const analysis = this.stateManager.state.imageAnalysis;

    const typography = this.typographyEngine.compose(
      headlineText,
      subheadingText,
      motif ? { x: motif.left, y: motif.top, width: motif.width * motif.scaleX, height: motif.height * motif.scaleY } : null,
      analysis
    );

    if (!typography) {
      return { status: 'warning', message: 'No typography to compose' };
    }

    this.stateManager.set('typographyComposition', typography);

    // Create headline text objects
    const headline = typography.headline;
    const textZones = this.gridSystem.getTextZones();
    const textZone = textZones[0]; // Default bottom

    // Position headline in safe zone, avoiding logo
    const logoZone = this.gridSystem.getLogoZone();
    const safeX = Math.max(textZone.x, logoZone.x + logoZone.width + this.gridSystem.cellWidth * 2);
    const safeY = Math.max(textZone.y, logoZone.y + logoZone.height + this.gridSystem.cellHeight * 2);

    const headlineObj = this.canvasManager.createHeadline(
      headline.lines.map(l => l.text).join('\n'),
      safeX + (headline.lines[0]?.offsetX || 0),
      safeY,
      {
        fontSize: headline.fontSize,
        fontFamily: headline.fontFamily
      }
    );

    // Create subheading if present
    if (typography.subheading) {
      const subY = safeY + headline.totalHeight + this.gridSystem.baselineUnit;
      this.canvasManager.createSubheading(
        typography.subheading.lines.map(l => l.text).join('\n'),
        safeX,
        subY,
        { fontSize: typography.subheading.fontSize }
      );
    }

    return { 
      status: 'complete', 
      message: 'Typography composed',
      data: { score: typography.score }
    };
  }

  /**
   * Stage 10: Place Swoosh
   */
  async stagePlaceSwoosh(side = 'left') {
    this.pipelineStage = 10;

    const motif = this.canvasManager.objects.motif;
    if (!motif) {
      return { status: 'skipped', message: 'No motif to attach swoosh to' };
    }

    const swoosh = this.canvasManager.createSwoosh(motif, side);

    this.stateManager.set('composition.swoosh', {
      side,
      x: swoosh.left,
      y: swoosh.top,
      width: swoosh.width * swoosh.scaleX,
      height: swoosh.height * swoosh.scaleY,
      angle: 0 // Horizontal only
    });

    return { status: 'complete', message: `Swoosh placed on ${side}` };
  }

  /**
   * Stage 11: Validate Composition
   */
  async stageValidate() {
    this.pipelineStage = 11;

    const report = this.complianceEngine.validateAll();

    return { 
      status: report.overall === 'PASS' ? 'complete' : 'warning',
      message: `Validation: ${report.overall}`,
      data: { score: report.score, status: report.overall }
    };
  }

  /**
   * Stage 12: Finalize
   */
  async stageFinalize() {
    this.pipelineStage = 12;

    // Bring locked elements to front
    const lockedElements = ['logo', 'tagline', 'metadata'];
    lockedElements.forEach(name => {
      const obj = this.canvasManager.objects[name];
      if (obj) {
        this.canvasManager.canvas.bringToFront(obj);
      }
    });

    // Ensure logo is at very top
    const logo = this.canvasManager.objects.logo;
    if (logo) {
      this.canvasManager.canvas.bringToFront(logo);
    }

    this.setState('MANUAL_EDITING');

    // Start live validation
    this.startLiveValidation();

    return { 
      status: 'complete', 
      message: 'Composition finalized. Ready for manual editing.' 
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // FULL PIPELINE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Run full auto-composition pipeline
   */
  async runAutoPipeline(options = {}) {
    const startTime = performance.now();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // Stage 1: Initialize
      await this.runStage(() => this.stageInitialize(), signal);

      // Stage 2: Load Background
      if (options.imageUrl) {
        await this.runStage(() => this.stageLoadBackground(options.imageUrl), signal);
      }

      // Stage 3: Analyze Image
      await this.runStage(() => this.stageAnalyzeImage(), signal);

      // Stage 4: Apply Treatment
      await this.runStage(() => this.stageApplyTreatment(options.treatmentType), signal);

      // Stage 5: Place Logo (TOP-LEFT, LOCKED)
      await this.runStage(() => this.stagePlaceLogo(options.logoUrl), signal);

      // Stage 6: Place Tagline
      await this.runStage(() => this.stagePlaceTagline(options.tagline), signal);

      // Stage 7: Place Metadata
      await this.runStage(() => this.stagePlaceMetadata(options.metadata), signal);

      // Stage 8: Place Motif
      await this.runStage(() => this.stagePlaceMotif(options.motifPosition), signal);

      // Stage 9: Compose Typography
      await this.runStage(() => this.stageComposeTypography(options.headline, options.subheading), signal);

      // Stage 10: Place Swoosh
      await this.runStage(() => this.stagePlaceSwoosh(options.swooshSide), signal);

      // Stage 11: Validate
      await this.runStage(() => this.stageValidate(), signal);

      // Stage 12: Finalize
      await this.runStage(() => this.stageFinalize(), signal);

      const totalTime = performance.now() - startTime;

      if (this.callbacks.onComplete) {
        this.callbacks.onComplete({
          status: 'success',
          totalTime,
          stages: this.stageTimings,
          finalState: this.stateManager.state
        });
      }

      return {
        status: 'success',
        totalTime,
        stages: this.stageTimings
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        this.setState('IDLE');
        return { status: 'aborted', message: 'Pipeline aborted by user' };
      }

      this.setState('ERROR');

      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }

      throw error;
    }
  }

  /**
   * Run individual stage with timing and abort support
   */
  async runStage(stageFn, signal) {
    if (signal.aborted) {
      throw new Error('AbortError');
    }

    const stageStart = performance.now();

    try {
      const result = await stageFn();

      const stageTime = performance.now() - stageStart;
      this.stageTimings.push({
        stage: this.pipelineStage,
        time: stageTime,
        status: result.status
      });

      if (this.callbacks.onProgress) {
        this.callbacks.onProgress({
          stage: this.pipelineStage,
          totalStages: this.totalStages,
          status: result.status,
          message: result.message,
          time: stageTime
        });
      }

      return result;
    } catch (error) {
      const stageTime = performance.now() - stageStart;
      this.stageTimings.push({
        stage: this.pipelineStage,
        time: stageTime,
        status: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Abort running pipeline
   */
  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MANUAL EDITING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start live validation during manual editing
   */
  startLiveValidation() {
    // Validation is triggered by constraint engine events
    // Compliance engine validates on state changes
  }

  /**
   * Validate before export
   */
  async validateBeforeExport() {
    this.setState('VALIDATING');

    const report = this.complianceEngine.validateAll();

    if (!this.complianceEngine.canExport()) {
      this.setState('MANUAL_EDITING');
      return {
        canExport: false,
        report,
        message: 'Cannot export: compliance check failed'
      };
    }

    this.setState('MANUAL_EDITING');
    return {
      canExport: true,
      report,
      message: 'Ready for export'
    };
  }

  /**
   * Export composition
   */
  async export(format, options) {
    const validation = await this.validateBeforeExport();

    if (!validation.canExport) {
      throw new Error('Export blocked: ' + validation.message);
    }

    this.setState('EXPORTING');

    try {
      const result = await this.exportSystem.export(format, options);

      this.setState('MANUAL_EDITING');
      return result;
    } catch (error) {
      this.setState('MANUAL_EDITING');
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT HANDLING
  // ═══════════════════════════════════════════════════════════════

  on(event, callback) {
    if (this.callbacks.hasOwnProperty('on' + event.charAt(0).toUpperCase() + event.slice(1))) {
      this.callbacks['on' + event.charAt(0).toUpperCase() + event.slice(1)] = callback;
    }
  }

  off(event) {
    const key = 'on' + event.charAt(0).toUpperCase() + event.slice(1);
    if (this.callbacks.hasOwnProperty(key)) {
      this.callbacks[key] = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════════════════════

  getProgress() {
    return {
      stage: this.pipelineStage,
      totalStages: this.totalStages,
      state: this.state,
      percent: Math.round((this.pipelineStage / this.totalStages) * 100)
    };
  }

  getStageTimings() {
    return [...this.stageTimings];
  }

  reset() {
    this.state = 'IDLE';
    this.pipelineStage = 0;
    this.stageTimings = [];
    this.abortController = null;
  }
}

// Make available globally
window.OrchestrationEngine = OrchestrationEngine;

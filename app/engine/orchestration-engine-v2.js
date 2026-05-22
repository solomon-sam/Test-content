/**
 * Orchestration Engine v2.0
 * 12-stage composition pipeline with state machine
 * FIXED: Class name matches app.js (OrchestrationEngineV2)
 * FIXED: Constructor accepts 3 args, engines injected via setEngines()
 * FIXED: Callbacks are direct properties (onStageChange, onComplete, onError)
 * FIXED: runAutoPipeline accepts (imageElement, logoElement, brandSettings, options)
 * ADDED: runPreExportValidation(), runExportPipeline(), calculateBrandScore(), destroy()
 */

class OrchestrationEngineV2 {
  constructor(canvasManager, gridSystem, stateManager) {
    this.canvasManager = canvasManager;
    this.gridSystem = gridSystem;
    this.stateManager = stateManager;

    // Injected engines (via setEngines)
    this.aiEngine = null;
    this.compositionEngine = null;
    this.typographyEngine = null;
    this.accessibilityEngine = null;
    this.complianceEngine = null;
    this.constraintEngine = null;
    this.exportSystem = null;

    // State machine
    this.state = 'IDLE';
    this.pipelineStage = 0;
    this.totalStages = 12;
    this.abortController = null;
    this.stageTimings = [];

    // Event callbacks (direct properties, not callback map)
    this.onStageChange = null;
    this.onComplete = null;
    this.onError = null;
  }

  /**
   * Inject all sub-engines (called by app.js initEngines)
   */
  setEngines({ aiEngine, compositionEngine, typographyEngine, 
               accessibilityEngine, complianceEngine, 
               constraintEngine, exportSystem }) {
    this.aiEngine = aiEngine;
    this.compositionEngine = compositionEngine;
    this.typographyEngine = typographyEngine;
    this.accessibilityEngine = accessibilityEngine;
    this.complianceEngine = complianceEngine;
    this.constraintEngine = constraintEngine;
    this.exportSystem = exportSystem;
  }

  // ═══════════════════════════════════════════════════════════════
  // STATE MACHINE
  // ═══════════════════════════════════════════════════════════════

  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.stateManager.set('orchestration.state', newState);
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

  async stageInitialize() {
    this.setState('AUTO_COMPOSING');
    this.pipelineStage = 1;
    this.stageTimings = [];

    this.stateManager.set('composition', {
      logo: null, tagline: null, metadata: null,
      motif: null, headline: null, subheading: null,
      swoosh: null, treatment: null, background: null,
      lastModified: null
    });
    this.stateManager.set('imageAnalysis', null);
    this.stateManager.set('typographyComposition', null);
    this.stateManager.set('complianceReport', null);
    this.stateManager.set('complianceStatus', 'PASS');

    return { status: 'complete', message: 'Initialization complete' };
  }

  async stageLoadBackground(imageElement) {
    this.pipelineStage = 2;

    return new Promise((resolve, reject) => {
      // imageElement is an HTMLImageElement, not a URL string
      const url = imageElement.src;
      this.canvasManager.createBackground(url, (img) => {
        if (img) {
          this.stateManager.set('composition.background', {
            url: url,
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

  async stageAnalyzeImage(imageElement) {
    this.pipelineStage = 3;

    if (!imageElement) {
      return { status: 'skipped', message: 'No background to analyze' };
    }

    try {
      const analysis = await this.aiEngine.analyze(
        imageElement,
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
      const fallback = this.aiEngine.getFallbackAnalysis(
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

  async stageApplyTreatment(treatmentType = 'blue-multiply') {
    this.pipelineStage = 4;

    const treatment = this.canvasManager.createTreatment(treatmentType);

    return { 
      status: 'complete', 
      message: `Treatment applied: ${treatmentType}` 
    };
  }

  async stagePlaceLogo(logoImage) {
    this.pipelineStage = 5;

    const logoZone = this.gridSystem.getLogoZone();

    // If logoImage provided, use its URL; otherwise use default
    const logoUrl = logoImage ? logoImage.src : 'assets/kpmg-logo.svg';
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

  async stagePlaceTagline(brandSettings) {
    this.pipelineStage = 6;

    const taglineZone = this.gridSystem.getTaglineZone();
    const text = brandSettings?.tagline || 'KPMG. Make the Difference.';
    const tagline = this.canvasManager.createTagline(text, taglineZone.x, taglineZone.y);

    this.stateManager.set('composition.tagline', {
      x: taglineZone.x,
      y: taglineZone.y,
      text: text,
      locked: true
    });

    return { status: 'complete', message: 'Tagline placed' };
  }

  async stagePlaceMetadata(brandSettings) {
    this.pipelineStage = 7;

    const metadataZone = this.gridSystem.getMetadataZone();
    const metaData = {
      url: brandSettings?.url || 'kpmg.com',
      date: brandSettings?.date || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      cta: brandSettings?.cta || ''
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

  async stagePlaceMotif(motifPosition) {
    this.pipelineStage = 8;

    const analysis = this.stateManager.state.imageAnalysis;
    const logoPosition = this.stateManager.state.composition.logo;

    let position;

    if (motifPosition) {
      position = motifPosition;
    } else if (analysis && analysis.saliency) {
      const focal = analysis.saliency.focalPoint;
      const grid = this.gridSystem;

      const logoSafeRight = grid.margin + grid.cellWidth * 4;
      const logoSafeBottom = grid.margin + grid.cellHeight * 3;

      let motifX = focal.x - grid.cellWidth * 3;
      let motifY = focal.y - grid.cellHeight * 2.5;

      if (motifX < logoSafeRight && motifY < logoSafeBottom) {
        motifX = logoSafeRight + grid.cellWidth;
      }

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
      const grid = this.gridSystem;
      position = {
        x: grid.margin + grid.cellWidth * 4,
        y: grid.margin + grid.cellHeight * 3,
        width: grid.cellWidth * 6,
        height: grid.cellHeight * 5
      };
    }

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

    const headline = typography.headline;
    const textZones = this.gridSystem.getTextZones();
    const textZone = textZones[0];

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
      angle: 0
    });

    return { status: 'complete', message: `Swoosh placed on ${side}` };
  }

  async stageValidate() {
    this.pipelineStage = 11;

    const report = this.complianceEngine.validateAll();

    return { 
      status: report.overall === 'PASS' ? 'complete' : 'warning',
      message: `Validation: ${report.overall}`,
      data: { score: report.score, status: report.overall }
    };
  }

  async stageFinalize() {
    this.pipelineStage = 12;

    const lockedElements = ['logo', 'tagline', 'metadata'];
    lockedElements.forEach(name => {
      const obj = this.canvasManager.objects[name];
      if (obj) {
        this.canvasManager.canvas.bringToFront(obj);
      }
    });

    const logo = this.canvasManager.objects.logo;
    if (logo) {
      this.canvasManager.canvas.bringToFront(logo);
    }

    this.setState('MANUAL_EDITING');

    return { 
      status: 'complete', 
      message: 'Composition finalized. Ready for manual editing.' 
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // FULL PIPELINE (matches app.js signature)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Run full auto-composition pipeline
   * app.js calls: runAutoPipeline(backgroundImage, logoImage, brandSettings, { preset })
   */
  async runAutoPipeline(backgroundImage, logoImage, brandSettings, options = {}) {
    const startTime = performance.now();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const headlineText = this.stateManager.get('headline') || '';
    const subheadingText = this.stateManager.get('subheading') || '';

    try {
      await this.runStage(() => this.stageInitialize(), signal);

      if (backgroundImage) {
        await this.runStage(() => this.stageLoadBackground(backgroundImage), signal);
      }

      await this.runStage(() => this.stageAnalyzeImage(backgroundImage), signal);
      await this.runStage(() => this.stageApplyTreatment('blue-multiply'), signal);
      await this.runStage(() => this.stagePlaceLogo(logoImage), signal);
      await this.runStage(() => this.stagePlaceTagline(brandSettings), signal);
      await this.runStage(() => this.stagePlaceMetadata(brandSettings), signal);
      await this.runStage(() => this.stagePlaceMotif(null), signal);
      await this.runStage(() => this.stageComposeTypography(headlineText, subheadingText), signal);
      await this.runStage(() => this.stagePlaceSwoosh('left'), signal);
      await this.runStage(() => this.stageValidate(), signal);
      await this.runStage(() => this.stageFinalize(), signal);

      const totalTime = performance.now() - startTime;

      const results = {
        status: 'success',
        totalTime,
        stages: this.stageTimings,
        analysis: this.stateManager.get('imageAnalysis'),
        placements: this.stateManager.get('composition'),
        typography: this.stateManager.get('typographyComposition')
      };

      if (this.onComplete) {
        this.onComplete(results);
      }

      return results;

    } catch (error) {
      if (error.name === 'AbortError') {
        this.setState('IDLE');
        return { status: 'aborted', message: 'Pipeline aborted by user' };
      }

      this.setState('ERROR');

      if (this.onError) {
        this.onError(error);
      }

      throw error;
    }
  }

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

      if (this.onStageChange) {
        this.onStageChange(result.message || `Stage ${this.pipelineStage}`, this.pipelineStage, this.totalStages);
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

  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPORT METHODS (called by app.js)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Run pre-export validation
   * app.js calls: await orchestrationEngine.runPreExportValidation()
   */
  async runPreExportValidation() {
    const report = this.complianceEngine.validateAll();

    const allIssues = [];
    for (const [cat, result] of Object.entries(report.categories || {})) {
      (result.issues || []).forEach(issue => {
        allIssues.push({
          ...issue,
          category: cat
        });
      });
    }

    return {
      canExport: report.overall !== 'FAIL',
      issues: allIssues
    };
  }

  /**
   * Run export pipeline
   * app.js calls: await orchestrationEngine.runExportPipeline({ format, dpi, quality })
   */
  async runExportPipeline({ format, dpi, quality }) {
    return this.exportSystem.export(format, { dpi, quality });
  }

  /**
   * Calculate brand score
   * app.js calls: orchestrationEngine.calculateBrandScore()
   */
  calculateBrandScore() {
    const report = this.complianceEngine.getReport();
    return report ? report.score : 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════

  destroy() {
    this.abort();
    this.reset();
  }

  reset() {
    this.state = 'IDLE';
    this.pipelineStage = 0;
    this.stageTimings = [];
    this.abortController = null;
  }

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
}

// Make available globally
window.OrchestrationEngineV2 = OrchestrationEngineV2;

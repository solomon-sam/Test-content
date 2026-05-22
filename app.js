/**
 * KPMG Brand Composition Engine
 * Main Application Controller — Phase 3 (Complete)
 * 4-step wizard with Compliance Checklist & Manual Editing
 */

class BrandCompositionApp {
  constructor() {
    this.stateManager = new StateManager();
    this.canvasManager = null;
    this.gridSystem = null;
    this.aiEngine = null;
    this.compositionEngine = null;
    this.validationRules = null;
    this.exportSystem = null;
    this.orchestrationEngine = null;
    this.typographyEngine = null;
    this.accessibilityEngine = null;
    this.typographyRenderer = null;
    this.interactionManager = null;
    this.editModeController = null;
    this.colorPicker = null;
    this.uiControls = null;
    this.layersPanel = null;
    this.contextualTooltip = null;

    // Phase 3: NEW engines
    this.complianceEngine = null;
    this.constraintEngine = null;

    // State
    this.currentPreset = null;
    this.analysis = null;
    this.placements = null;
    this.typographyComposition = null;
    this.logoImage = null;
    this.backgroundImage = null;

    // Brand settings
    this.brandSettings = {
      tagline: 'KPMG. Make the Difference.',
      url: 'kpmg.com',
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      cta: ''
    };

    // Live validation loop
    this.validationLoopId = null;
    this.lastValidationTime = 0;

    this.init();
  }

  async init() {
    this.showLoading('Initializing application...', 10);

    // Initialize with default size
    const defaultPreset = AssetPresets.getPreset('ig-square');
    const dims = AssetPresets.getCanvasDimensions(defaultPreset);

    this.canvasManager = new CanvasManager('main-canvas', dims.width, dims.height);

    this.showLoading('Setting up grid system...', 30);

    // Initialize grid
    this.gridSystem = new GridSystem(dims.width, dims.height);
    this.canvasManager.setGridSystem(this.gridSystem);
    this.canvasManager.drawGrid();

    this.showLoading('Initializing AI engine...', 50);

    // Initialize AI
    this.aiEngine = new AIAnalysisEngine();
    await this.aiEngine.initialize();
    this.aiEngine.setProgressCallback((percent, text) => {
      if (this.uiControls) {
        this.uiControls.updateAIProgress(percent, text);
      }
    });

    this.showLoading('Setting up composition engine...', 60);

    // Initialize composition engine
    this.compositionEngine = new CompositionEngine(this.canvasManager.canvas, this.gridSystem);

    // Initialize typography engine
    this.typographyEngine = new TypographyCompositionEngine(this.gridSystem, this.stateManager);

    // Initialize accessibility engine
    this.accessibilityEngine = new AccessibilityEngine(this.canvasManager, this.stateManager);

    // Initialize typography renderer
    this.typographyRenderer = new TypographyRenderer(this.canvasManager, this.stateManager);

    this.showLoading('Setting up validation & export...', 70);

    // Initialize validation
    this.validationRules = new ValidationRules();

    // Initialize export
    this.exportSystem = new ExportSystem(this.canvasManager.canvas, this.gridSystem);

    // Initialize orchestration
    this.orchestrationEngine = new OrchestrationEngine(this.canvasManager, this.gridSystem);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3: Initialize Compliance Engine & Constraint Engine
    // ═══════════════════════════════════════════════════════════════
    this.showLoading('Initializing compliance engine...', 75);

    this.complianceEngine = new ComplianceEngine(
      this.stateManager,
      this.canvasManager,
      this.gridSystem
    );

    this.constraintEngine = new ConstraintEngine(this.gridSystem);

    this.showLoading('Setting up interaction systems...', 80);

    // Initialize interaction manager
    this.interactionManager = new InteractionManager(this.canvasManager, this.stateManager);

    // Initialize edit mode controller with Phase 3 dependencies
    this.editModeController = new EditModeController(
      this.canvasManager,
      this.stateManager,
      this.interactionManager,
      this.complianceEngine,
      this.constraintEngine
    );

    // Initialize color picker
    this.colorPicker = new ColorPicker(this.stateManager, this.canvasManager);

    // Initialize contextual tooltip
    this.contextualTooltip = new ContextualTooltip();

    this.showLoading('Setting up UI...', 90);

    // Initialize UI
    this.uiControls = new UIControls(this);
    this.layersPanel = new LayersPanel(this.canvasManager);

    // Restore saved state
    this.restoreState();

    // Setup typography auto-generation on text input
    this.setupTypographyAutoGeneration();

    // Setup compliance subscriptions
    this.setupComplianceSubscriptions();

    // Setup live validation loop
    this.setupLiveValidationLoop();

    // Fit canvas to screen
    setTimeout(() => {
      this.canvasManager.fitToScreen();
    }, 100);

    this.showLoading('Ready!', 100);
    setTimeout(() => this.hideLoading(), 500);

    // Subscribe to step changes for canvas resize
    this.stateManager.subscribe('selectedPreset', (preset) => {
      if (preset) {
        this.onPresetSelected(preset);
      }
    });
  }

  /**
   * Setup compliance engine subscriptions for real-time UI updates
   */
  setupComplianceSubscriptions() {
    // Update brand score from compliance report
    this.stateManager.subscribe('complianceReport', (report) => {
      if (report && report.score !== undefined) {
        this.stateManager.set('brandScore', report.score);
      }
    });

    // Update export button state based on compliance
    this.stateManager.subscribe('complianceStatus', (status) => {
      this.updateExportGate(status);
    });

    // Update checklist status from compliance
    this.stateManager.subscribe('checklistStatus', (status) => {
      if (this.uiControls) {
        this.uiControls.updateChecklist(status);
      }
    });
  }

  /**
   * Setup live validation loop (60fps during manual editing)
   */
  setupLiveValidationLoop() {
    const loop = () => {
      const now = performance.now();

      // Run validation every 100ms during active editing
      if (this.editModeController.mode === 'manual' &&
          this.editModeController.dragState.isDragging &&
          now - this.lastValidationTime > 100) {
        this.lastValidationTime = now;

        // Quick validation (not full compliance)
        this.runQuickValidation();
      }

      this.validationLoopId = requestAnimationFrame(loop);
    };

    this.validationLoopId = requestAnimationFrame(loop);
  }

  /**
   * Quick validation during drag (lightweight, 60fps friendly)
   */
  runQuickValidation() {
    if (!this.complianceEngine) return;

    // Only validate changed elements
    const element = this.editModeController.selectedElement;
    if (element && element.name) {
      const result = this.complianceEngine.validate(element.name, this.stateManager.state);
      if (result && result.status === 'FAIL') {
        // Show immediate visual feedback
        this.showConstraintFeedback(element, result.issues);
      }
    }
  }

  /**
   * Show constraint violation feedback on element
   */
  showConstraintFeedback(element, issues) {
    const hasCritical = issues.some(i => i.severity === 'critical' || i.severity === 'hard');

    if (hasCritical) {
      // Red glow for hard violations
      element.set('shadow', new fabric.Shadow({
        color: 'rgba(239, 68, 68, 0.4)',
        blur: 15,
        offsetX: 0,
        offsetY: 0
      }));
    } else {
      // Amber glow for warnings
      element.set('shadow', new fabric.Shadow({
        color: 'rgba(245, 158, 11, 0.3)',
        blur: 10,
        offsetX: 0,
        offsetY: 0
      }));
    }

    this.canvasManager.requestRender();
  }

  /**
   * Update export button based on compliance status
   */
  updateExportGate(status) {
    const exportBtn = document.getElementById('btn-export');
    const refineContinue = document.getElementById('btn-continue-refine');

    if (exportBtn) {
      if (status === 'FAIL') {
        exportBtn.disabled = true;
        exportBtn.classList.add('disabled');
        exportBtn.title = 'Fix compliance issues before exporting';
      } else {
        exportBtn.disabled = false;
        exportBtn.classList.remove('disabled');
        exportBtn.title = '';
      }
    }

    if (refineContinue) {
      if (status === 'FAIL') {
        refineContinue.disabled = true;
        refineContinue.classList.add('disabled');
      } else {
        refineContinue.disabled = false;
        refineContinue.classList.remove('disabled');
      }
    }
  }

  /**
   * Setup auto-typography generation when text changes
   */
  setupTypographyAutoGeneration() {
    let debounceTimer = null;

    const generateTypography = () => {
      const headline = this.stateManager.get('headline');
      const subheading = this.stateManager.get('subheading');

      if (!headline || headline.trim().length === 0) return;

      const motif = this.canvasManager.objects.motif;
      const motifData = motif ? {
        x: motif.left,
        y: motif.top,
        width: motif.width * motif.scaleX,
        height: motif.height * motif.scaleY
      } : null;

      // Compose typography
      this.typographyComposition = this.typographyEngine.compose(
        headline,
        subheading,
        motifData,
        this.analysis
      );

      // Render to canvas
      if (this.typographyComposition) {
        this.typographyRenderer.render(this.typographyComposition, this.gridSystem);

        // Run accessibility check
        this.runAccessibilityCheck();

        // Update brand score from compliance
        if (this.complianceEngine) {
          this.complianceEngine.validateAll();
        }
      }
    };

    // Subscribe to text changes with debounce
    this.stateManager.subscribe('headline', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(generateTypography, 300);
    });

    this.stateManager.subscribe('subheading', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(generateTypography, 300);
    });
  }

  /**
   * Run accessibility validation
   */
  runAccessibilityCheck() {
    const treatment = this.stateManager.get('composition.treatment');
    const motif = this.canvasManager.objects.motif;
    const motifData = motif ? {
      x: motif.left,
      y: motif.top,
      width: motif.width * motif.scaleX,
      height: motif.height * motif.scaleY
    } : null;

    const result = this.accessibilityEngine.validate(
      this.typographyComposition,
      treatment,
      motifData
    );

    // Update checklist status based on accessibility
    const checklist = this.stateManager.get('checklistStatus') || {};

    if (result.wcag.aa) {
      checklist.accessibility = 'pass';
    } else if (result.wcag.aa) {
      checklist.accessibility = 'warning';
    } else {
      checklist.accessibility = 'fail';
    }

    this.stateManager.set('checklistStatus', checklist);

    // Apply auto-corrections if enabled
    if (result.corrections && result.corrections.length > 0) {
      const safeCorrections = result.corrections.filter(c =>
        c.strategy === 'contrast' || c.strategy === 'size'
      );

      if (safeCorrections.length > 0) {
        this.accessibilityEngine.applyCorrections(safeCorrections);
      }
    }

    return result;
  }

  /**
   * Restore state from localStorage
   */
  restoreState() {
    const headline = this.stateManager.get('headline');
    const subheading = this.stateManager.get('subheading');
    const imageDataUrl = this.stateManager.get('backgroundImageDataUrl');
    const step = this.stateManager.get('currentStep');

    if (headline) {
      const input = document.getElementById('headline-input');
      if (input) input.value = headline;
    }

    if (subheading) {
      const input = document.getElementById('subheading-input');
      if (input) input.value = subheading;
    }

    if (imageDataUrl) {
      const img = new Image();
      img.onload = () => {
        this.stateManager.set('backgroundImage', img);
        const preview = document.getElementById('image-preview');
        const zone = document.getElementById('upload-image-zone');
        if (preview && zone) {
          preview.innerHTML = '';
          preview.appendChild(img.cloneNode());
          preview.classList.remove('hidden');
          zone.classList.add('has-file');
        }
      };
      img.src = imageDataUrl;
    }

    if (step && step !== 'explore') {
      this.stateManager.goToStep(step);
    }
  }

  /**
   * Handle preset selection
   */
  onPresetSelected(preset) {
    this.currentPreset = preset;
    const dims = AssetPresets.getCanvasDimensions(preset);

    this.setCanvasSize(dims.width, dims.height);

    if (this.backgroundImage) {
      this.canvasManager.addBackgroundImage(this.backgroundImage);
    }

    if (this.analysis && this.placements) {
      this.placeBrandElements();
    }

    // Regenerate typography for new dimensions
    const headline = this.stateManager.get('headline');
    const subheading = this.stateManager.get('subheading');
    if (headline) {
      this.typographyComposition = this.typographyEngine.compose(
        headline, subheading, null, this.analysis
      );
      if (this.typographyComposition) {
        this.typographyRenderer.render(this.typographyComposition, this.gridSystem);
      }
    }

    // Re-run compliance validation for new dimensions
    if (this.complianceEngine) {
      setTimeout(() => this.complianceEngine.validateAll(), 100);
    }
  }

  /**
   * Set canvas size
   */
  setCanvasSize(width, height) {
    this.canvasManager.resize(width, height);
    this.gridSystem = new GridSystem(width, height);
    this.canvasManager.setGridSystem(this.gridSystem);
    this.canvasManager.drawGrid();
    this.canvasManager.fitToScreen();

    // Update engines with new grid
    this.typographyEngine = new TypographyCompositionEngine(this.gridSystem, this.stateManager);

    // Update constraint engine
    if (this.constraintEngine) {
      this.constraintEngine.setGridSystem(this.gridSystem);
    }

    // Update compliance engine
    if (this.complianceEngine) {
      // Re-initialize with new grid
      this.complianceEngine.gridSystem = this.gridSystem;
      this.complianceEngine.checklists.grid.gridSystem = this.gridSystem;
      this.complianceEngine.checklists.logo.gridSystem = this.gridSystem;
      this.complianceEngine.checklists.typography.gridSystem = this.gridSystem;
      this.complianceEngine.checklists.motif.gridSystem = this.gridSystem;
      this.complianceEngine.checklists.swoosh.gridSystem = this.gridSystem;
      this.complianceEngine.checklists.composition.gridSystem = this.gridSystem;
    }
  }

  /**
   * Load background image
   */
  async loadBackgroundImage(imageElement) {
    this.backgroundImage = imageElement;
    await this.canvasManager.addBackgroundImage(imageElement);
  }

  /**
   * Run AI analysis
   */
  async runAIAnalysis() {
    if (!this.backgroundImage) {
      alert('Please upload an image first');
      return;
    }

    this.stateManager.set('loading', true);
    this.stateManager.set('loadingText', 'Orchestrating composition...');
    this.stateManager.set('loadingPercent', 0);

    try {
      const preset = this.currentPreset || AssetPresets.getPreset('ig-square');
      const dims = AssetPresets.getCanvasDimensions(preset);

      this.stateManager.set('loadingPercent', 10);
      this.stateManager.set('loadingText', 'Analyzing image...');

      this.analysis = await this.aiEngine.analyzeImage(this.backgroundImage, dims.width, dims.height);
      this.stateManager.set('imageAnalysis', this.analysis);

      this.stateManager.set('loadingPercent', 40);
      this.stateManager.set('loadingText', 'Composing brand elements...');

      this.placements = await this.compositionEngine.autoCompose(this.logoImage, this.brandSettings);
      this.stateManager.set('placements', this.placements);

      this.stateManager.set('loadingPercent', 70);
      this.stateManager.set('loadingText', 'Applying treatment...');

      const treatment = this.stateManager.get('composition.treatment');
      this.canvasManager.applyColorTreatment(treatment);

      this.stateManager.set('loadingPercent', 90);
      this.stateManager.set('loadingText', 'Generating typography...');

      // Generate typography
      const headline = this.stateManager.get('headline');
      const subheading = this.stateManager.get('subheading');
      if (headline) {
        this.typographyComposition = this.typographyEngine.compose(
          headline, subheading, null, this.analysis
        );
        if (this.typographyComposition) {
          this.typographyRenderer.render(this.typographyComposition, this.gridSystem);
        }
      }

      this.placeBrandElements();

      // ═══════════════════════════════════════════════════════════════
      // PHASE 3: Run compliance validation after composition
      // ═══════════════════════════════════════════════════════════════
      this.stateManager.set('loadingPercent', 95);
      this.stateManager.set('loadingText', 'Validating brand compliance...');

      if (this.complianceEngine) {
        this.complianceEngine.validateAll();
      }

      this.calculateBrandScore();
      this.runAccessibilityCheck();

      this.stateManager.set('loadingPercent', 100);
      this.stateManager.set('loadingText', 'Complete!');

      setTimeout(() => {
        this.stateManager.set('loading', false);
      }, 500);

    } catch (error) {
      console.error('Analysis failed:', error);
      this.stateManager.set('loading', false);
      alert('Analysis failed: ' + error.message);
    }
  }

  /**
   * Place all brand elements on canvas
   */
  placeBrandElements() {
    if (!this.placements) return;

    // Place logo
    if (this.logoImage && this.placements.logo) {
      this.canvasManager.addLogo(this.logoImage, this.placements.logo);
    } else {
      this.generateDemoLogo();
    }

    // Place tagline
    if (this.placements.tagline) {
      this.canvasManager.addTagline(this.brandSettings.tagline, this.placements.tagline);
    } else {
      const zone = this.gridSystem.getTaglineZone();
      this.canvasManager.addTagline(this.brandSettings.tagline, {
        x: zone.x,
        y: zone.y,
        fontSize: Math.max(12, Math.min(20, this.gridSystem.canvasWidth / 60))
      });
    }

    // Place metadata
    if (this.placements.metadata) {
      this.canvasManager.addMetadata(this.buildMetadataText(), this.placements.metadata);
    } else {
      const zone = this.gridSystem.getMetadataZone();
      this.canvasManager.addMetadata(this.buildMetadataText(), zone);
    }

    // Add motif placeholder
    const motif = this.calculateMotifPlacement();
    this.canvasManager.addMotif(motif);

    this.canvasManager.requestRender();
  }

  /**
   * Calculate motif placement
   */
  calculateMotifPlacement() {
    const grid = this.gridSystem;
    const analysis = this.analysis;

    let x = grid.margin + grid.cellWidth * 4;
    let y = grid.margin + grid.cellHeight * 2;
    let w = grid.cellWidth * 6;
    let h = w * (7/10);

    if (analysis && analysis.saliency) {
      const focal = analysis.saliency.focalPoint;
      x = Math.max(grid.margin + grid.cellWidth * 2,
        Math.min(focal.x - w/2, grid.canvasWidth - grid.margin - w - grid.cellWidth * 2));
      y = Math.max(grid.margin + grid.cellHeight * 2,
        Math.min(focal.y - h/2, grid.canvasHeight - grid.margin - h - grid.cellHeight * 3));
    }

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
      this.logoImage = img;
      const zone = this.gridSystem.getLogoZone();
      this.canvasManager.addLogo(img, {
        x: zone.x,
        y: zone.y,
        scale: zone.width / img.width
      });
    };
    img.src = canvas.toDataURL();
  }

  /**
   * Build metadata text
   */
  buildMetadataText() {
    const parts = [];
    if (this.brandSettings.url) parts.push(this.brandSettings.url);
    if (this.brandSettings.date) parts.push(this.brandSettings.date);
    if (this.brandSettings.cta) parts.push(this.brandSettings.cta);
    return parts.join(' | ');
  }

  /**
   * Calculate brand score using compliance engine
   */
  calculateBrandScore() {
    // Phase 3: Use compliance engine score if available
    if (this.complianceEngine) {
      const report = this.complianceEngine.getReport();
      if (report && report.score !== undefined) {
        this.stateManager.set('brandScore', report.score);
        return;
      }
    }

    // Fallback to manual calculation
    let score = 0;
    const checklist = {
      logo: 'pending',
      colors: 'pending',
      typography: 'pending',
      imagery: 'pending',
      layout: 'pending'
    };

    // Logo check
    if (this.logoImage && this.placements && this.placements.logo) {
      const logoZone = this.gridSystem.getLogoZone();
      const placement = this.placements.logo;
      const logoOk = Math.abs(placement.x - logoZone.x) < 50 &&
        Math.abs(placement.y - logoZone.y) < 50;
      checklist.logo = logoOk ? 'pass' : 'warning';
      score += logoOk ? 20 : 10;
    } else {
      checklist.logo = 'fail';
    }

    // Colors check
    const treatment = this.stateManager.get('composition.treatment');
    if (treatment && (treatment.color === '#1E49E2' || treatment.color === '#00338D')) {
      checklist.colors = 'pass';
      score += 20;
    } else {
      checklist.colors = 'warning';
      score += 10;
    }

    // Typography check
    const headline = this.stateManager.get('headline');
    if (headline && headline.length > 0) {
      checklist.typography = 'pass';
      score += 20;
    } else {
      checklist.typography = 'fail';
    }

    // Imagery check
    if (this.backgroundImage && this.analysis) {
      const brandCompat = this.analysis.composition?.scores?.brandCompatibility || 0;
      if (brandCompat >= 7) {
        checklist.imagery = 'pass';
        score += 20;
      } else if (brandCompat >= 5) {
        checklist.imagery = 'warning';
        score += 10;
      } else {
        checklist.imagery = 'fail';
      }
    } else {
      checklist.imagery = 'fail';
    }

    // Layout check
    if (this.placements && this.analysis) {
      checklist.layout = 'pass';
      score += 20;
    } else {
      checklist.layout = 'pending';
      score += 10;
    }

    this.stateManager.set('brandScore', score);
    this.stateManager.set('checklistStatus', checklist);
  }

  /**
   * Toggle pan mode
   */
  togglePanMode(enabled) {
    this.canvasManager.togglePanMode(enabled);
    const btn = document.getElementById('tool-pan');
    if (btn) btn.classList.toggle('active', enabled);
  }

  /**
   * Show export modal with compliance gate check
   */
  async showExportModal() {
    // Phase 3: Export gate enforcement
    if (this.complianceEngine && !this.complianceEngine.canExport()) {
      const report = this.complianceEngine.getReport();
      const criticalIssues = report ? report.categories : {};
      let failMessage = 'Cannot export: The following issues must be resolved:

';

      for (const [cat, result] of Object.entries(criticalIssues)) {
        if (result.status === 'FAIL') {
          failMessage += `• ${cat.toUpperCase()}: ${result.issues[0]?.message || 'Failed'}
`;
        }
      }

      alert(failMessage);
      return;
    }

    const format = this.stateManager.get('exportFormat') || 'png';
    const dpi = this.stateManager.get('exportDpi') || 300;
    const quality = (this.stateManager.get('exportQuality') || 95) / 100;

    try {
      let result;
      if (format === 'pdf') {
        result = await this.exportSystem.exportPDF({ dpi, quality });
      } else {
        result = await this.exportSystem.export({ format, dpi, quality });
      }

      this.currentExport = result;
      this.uiControls.showExportModal(result);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    }
  }

  /**
   * Hide export modal
   */
  hideExportModal() {
    this.uiControls.hideExportModal();
  }

  /**
   * Download export
   */
  downloadExport() {
    if (this.currentExport) {
      this.exportSystem.download(this.currentExport);
      this.hideExportModal();
    }
  }

  /**
   * New project
   */
  newProject() {
    if (confirm('Start a new project? All unsaved work will be lost.')) {
      this.stateManager.reset();
      this.canvasManager.clear();
      this.analysis = null;
      this.placements = null;
      this.typographyComposition = null;
      this.logoImage = null;
      this.backgroundImage = null;

      // Reset compliance
      if (this.complianceEngine) {
        this.complianceEngine.status = 'PASS';
        this.complianceEngine.lastReport = null;
      }

      document.querySelectorAll('.preset-card').forEach(i => i.classList.remove('active'));
      document.getElementById('upload-image-zone')?.classList.remove('has-file');
      document.getElementById('image-preview')?.classList.add('hidden');
      document.getElementById('headline-input').value = '';
      document.getElementById('subheading-input').value = '';

      this.stateManager.goToStep('explore');

      const defaultPreset = AssetPresets.getPreset('ig-square');
      const dims = AssetPresets.getCanvasDimensions(defaultPreset);
      this.setCanvasSize(dims.width, dims.height);
    }
  }

  /**
   * Loading overlay
   */
  showLoading(text, percent) {
    this.stateManager.set('loading', true);
    this.stateManager.set('loadingText', text);
    this.stateManager.set('loadingPercent', percent);
  }

  hideLoading() {
    this.stateManager.set('loading', false);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new BrandCompositionApp();
});

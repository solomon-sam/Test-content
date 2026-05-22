/**
 * BrandCompositionApp — Phase 4 Integrated
 * Main application controller with OrchestrationEngineV2,
 * PerformanceMonitor, ObjectPool, and Export Gate Enforcement.
 */

class BrandCompositionApp {
  constructor() {
    this.stateManager = new StateManager();
    this.currentStep = 'explore';
    this.currentPreset = null;
    this.backgroundImage = null;
    this.logoImage = null;
    this.analysis = null;
    this.placements = null;
    this.typographyComposition = null;
    this.currentExport = null;
    this.brandSettings = {
      tagline: 'KPMG. Make the Difference.',
      url: 'kpmg.com',
      date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      cta: ''
    };
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 20;
    this.isEditMode = false;

    // Phase 4: Sub-engines (initialized in init())
    this.aiEngine = null;
    this.compositionEngine = null;
    this.typographyEngine = null;
    this.accessibilityEngine = null;
    this.complianceEngine = null;
    this.constraintEngine = null;
    this.exportSystem = null;
    this.orchestrationEngine = null;
    this.performanceMonitor = null;
    this.objectPool = null;

    // UI references
    this.uiControls = null;
    this.canvasManager = null;
    this.gridSystem = null;

    this.init();
  }

  init() {
    this.uiControls = new UIControls(this);
    this.canvasManager = new CanvasManager('main-canvas', this.stateManager);

    // Initialize grid with default preset
    const defaultPreset = AssetPresets.getPreset('ig-square');
    const dims = AssetPresets.getCanvasDimensions(defaultPreset);
    this.gridSystem = new GridSystem(dims.width, dims.height);
    this.canvasManager.setGridSystem(this.gridSystem);

    // Phase 4: Initialize all sub-engines
    this.initEngines();

    // Phase 4: Initialize Performance Monitor
    this.performanceMonitor = new PerformanceMonitor({
      enabled: true,
      showOverlay: false,
      sampleInterval: 1000
    });

    // Hook into canvas render loop for performance tracking
    const originalRequestRender = this.canvasManager.requestRender.bind(this.canvasManager);
    this.canvasManager.requestRender = () => {
      const start = performance.now();
      originalRequestRender();
      requestAnimationFrame(() => {
        this.performanceMonitor?.recordRenderTime(performance.now() - start);
      });
    };

    // Phase 4: Initialize Object Pool
    this.objectPool = new ObjectPool(this.canvasManager, {
      enabled: true,
      maxPoolSize: 50
    });
    this.objectPool.prewarm('rect', 10);
    this.objectPool.prewarm('text', 10);
    this.objectPool.prewarm('line', 20);

    // Initialize UI
    this.uiControls.init();
    this.setupEventListeners();
    this.renderPresetCards();

    // Restore state
    this.stateManager.hydrate();
    if (this.stateManager.get('currentStep')) {
      this.goToStep(this.stateManager.get('currentStep'));
    }

    // Check URL params for shared compositions
    this.checkUrlParams();

    console.log('Brand Composition Engine initialized (Phase 4)');
  }

  /**
   * Phase 4: Initialize all sub-engines and inject into OrchestrationEngineV2
   */
  initEngines() {
    this.aiEngine = new AIAnalysis();
    this.compositionEngine = new CompositionEngine(this.canvasManager, this.gridSystem);
    this.typographyEngine = new TypographyCompositionEngine(this.gridSystem, this.stateManager);
    this.accessibilityEngine = new AccessibilityEngine(this.canvasManager, this.stateManager);
    this.complianceEngine = new ComplianceEngine(
      this.stateManager,
      this.canvasManager,
      this.gridSystem
    );
    this.constraintEngine = new ConstraintEngine(this.gridSystem);
    this.exportSystem = new ExportSystem(this.canvasManager, this.stateManager);

    // Phase 4: Create OrchestrationEngineV2 and inject all engines
    this.orchestrationEngine = new OrchestrationEngineV2(
      this.canvasManager,
      this.gridSystem,
      this.stateManager
    );

    this.orchestrationEngine.setEngines({
      aiEngine: this.aiEngine,
      compositionEngine: this.compositionEngine,
      typographyEngine: this.typographyEngine,
      accessibilityEngine: this.accessibilityEngine,
      complianceEngine: this.complianceEngine,
      constraintEngine: this.constraintEngine,
      exportSystem: this.exportSystem
    });

    // Set up orchestration event callbacks
    this.orchestrationEngine.onStageChange = (stage, index, total) => {
      const percent = Math.round((index / total) * 100);
      this.showLoading(`Stage: ${stage}...`, percent);
    };

    this.orchestrationEngine.onComplete = (results) => {
      console.log('Pipeline complete:', results);
      this.showLoading('Complete!', 100);
      setTimeout(() => this.hideLoading(), 500);

      // Store results
      this.analysis = results.analysis;
      this.placements = results.placements;
      this.typographyComposition = results.typography;

      // Update brand score
      this.calculateBrandScore();
      this.runAccessibilityCheck();
    };

    this.orchestrationEngine.onError = (error) => {
      console.error('Pipeline error:', error);
      this.hideLoading();
      alert('Composition failed: ' + error.message);
    };
  }

  setupEventListeners() {
    // Step navigation
    document.querySelectorAll('.step-item').forEach(item => {
      item.addEventListener('click', () => {
        const step = item.dataset.step;
        if (this.stateManager.canGoToStep(step)) {
          this.goToStep(step);
        }
      });
    });

    // Continue buttons
    document.getElementById('explore-continue')?.addEventListener('click', () => {
      if (this.validateExploreStep()) {
        this.goToStep('compose');
      }
    });

    document.getElementById('compose-continue')?.addEventListener('click', () => {
      if (this.validateComposeStep()) {
        this.goToStep('refine');
        this.runAIAnalysis();
      }
    });

    document.getElementById('refine-continue')?.addEventListener('click', () => {
      this.goToStep('export');
    });

    // Back buttons
    document.getElementById('compose-back')?.addEventListener('click', () => this.goToStep('explore'));
    document.getElementById('refine-back')?.addEventListener('click', () => this.goToStep('compose'));
    document.getElementById('export-back')?.addEventListener('click', () => this.goToStep('refine'));

    // Export
    document.getElementById('export-btn')?.addEventListener('click', () => this.showExportModal());

    // Modal
    document.getElementById('modal-close')?.addEventListener('click', () => this.closeExportModal());
    document.getElementById('modal-cancel')?.addEventListener('click', () => this.closeExportModal());
    document.getElementById('modal-download')?.addEventListener('click', () => this.downloadExport());

    // Quality slider
    const qualitySlider = document.getElementById('quality-slider');
    if (qualitySlider) {
      qualitySlider.addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('quality-value').textContent = val + '%';
        this.stateManager.set('exportQuality', parseInt(val));
      });
    }

    // Format selection
    document.querySelectorAll('.format-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.format-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.stateManager.set('exportFormat', card.dataset.format);
      });
    });

    // DPI selection
    const dpiSelect = document.getElementById('dpi-select');
    if (dpiSelect) {
      dpiSelect.addEventListener('change', (e) => {
        this.stateManager.set('exportDpi', parseInt(e.target.value));
      });
    }

    // Refresh score
    document.getElementById('refresh-score')?.addEventListener('click', () => {
      this.calculateBrandScore();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) this.redo();
          else this.undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          this.redo();
        } else if (e.key === 'e') {
          e.preventDefault();
          this.showExportModal();
        }
      }
      if (e.key === 'Escape') {
        this.closeExportModal();
        this.uiControls.hideLayersPanel();
      }
    });

    // Window resize
    window.addEventListener('resize', () => {
      this.canvasManager.resizeCanvas();
    });

    // Visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stateManager.persist();
      }
    });

    // Before unload
    window.addEventListener('beforeunload', () => {
      this.stateManager.persist();
    });
  }

  goToStep(step) {
    if (!this.stateManager.canGoToStep(step)) {
      console.warn(`Cannot navigate to step: ${step}`);
      return;
    }

    this.stateManager.goToStep(step);
    this.currentStep = step;

    document.querySelectorAll('.step-panel').forEach(panel => panel.classList.remove('active'));
    document.querySelectorAll('.step-item').forEach(item => {
      item.classList.remove('active', 'completed');
      const itemStep = item.dataset.step;
      if (itemStep === step) item.classList.add('active');
      else if (this.stateManager.get('completedSteps').includes(itemStep)) {
        item.classList.add('completed');
      }
    });

    const panel = document.getElementById(`step-${step}`);
    if (panel) panel.classList.add('active');

    if (step === 'refine') {
      setTimeout(() => this.canvasManager.resizeCanvas(), 100);
    }
  }

  validateExploreStep() {
    const headline = document.getElementById('headline-input')?.value.trim();
    if (!headline) {
      alert('Please enter a headline to continue');
      return false;
    }
    if (!this.backgroundImage) {
      alert('Please upload an image to continue');
      return false;
    }
    return true;
  }

  validateComposeStep() {
    if (!this.currentPreset) {
      alert('Please select a dimension preset to continue');
      return false;
    }
    return true;
  }

  /**
   * Phase 4: Use orchestrated pipeline for AI analysis
   */
  async runAIAnalysis() {
    if (!this.backgroundImage) {
      alert('Please upload an image first');
      return;
    }

    this.showLoading('Starting composition pipeline...', 0);

    try {
      const result = await this.orchestrationEngine.runAutoPipeline(
        this.backgroundImage,
        this.logoImage,
        this.brandSettings,
        { preset: this.currentPreset }
      );

      // Results are handled by onComplete callback
      // But store them here as well for direct access
      this.analysis = result.analysis;
      this.placements = result.placements;
      this.typographyComposition = result.typography;

    } catch (error) {
      console.error('Analysis failed:', error);
      this.hideLoading();
      alert('Analysis failed: ' + error.message);
    }
  }

  calculateBrandScore() {
    const score = this.orchestrationEngine.calculateBrandScore();
    this.updateScoreDisplay(score);
    this.stateManager.set('brandScore', score);
    return score;
  }

  updateScoreDisplay(score) {
    const scoreValue = document.getElementById('brand-score-value');
    const scoreRing = document.getElementById('score-ring-progress');
    const overallValue = document.getElementById('overall-score-value');
    const overallRing = document.getElementById('overall-ring-progress');
    const overallDesc = document.getElementById('overall-score-desc');

    if (scoreValue) scoreValue.textContent = score;
    if (overallValue) overallValue.textContent = score;

    const circumference = 2 * Math.PI * 18;
    const offset = circumference - (score / 100) * circumference;
    if (scoreRing) scoreRing.style.strokeDashoffset = offset;

    const overallCircumference = 2 * Math.PI * 24;
    const overallOffset = overallCircumference - (score / 100) * overallCircumference;
    if (overallRing) overallRing.style.strokeDashoffset = overallOffset;

    if (overallDesc) {
      if (score >= 90) overallDesc.textContent = 'Excellent! Your composition is strong and on brand.';
      else if (score >= 70) overallDesc.textContent = 'Good job! Minor adjustments could improve it.';
      else if (score >= 50) overallDesc.textContent = 'Fair. Some brand guidelines need attention.';
      else overallDesc.textContent = 'Needs work. Several brand issues to address.';
    }

    // Update checklist items
    this.updateChecklist(score);
  }

  updateChecklist(score) {
    const checks = ['logo', 'colors', 'typography', 'imagery', 'layout'];
    const thresholds = { logo: 80, colors: 70, typography: 75, imagery: 60, layout: 70 };

    checks.forEach(check => {
      const element = document.getElementById(`check-${check}`);
      if (!element) return;

      const threshold = thresholds[check];
      if (score >= threshold + 20) {
        element.textContent = '✓';
        element.className = 'check-status pass';
      } else if (score >= threshold) {
        element.textContent = '!';
        element.className = 'check-status warning';
      } else {
        element.textContent = '✕';
        element.className = 'check-status fail';
      }
    });
  }

  runAccessibilityCheck() {
    if (!this.accessibilityEngine) return;

    const result = this.accessibilityEngine.validate(
      this.typographyComposition,
      this.stateManager.get('composition.treatment'),
      this.canvasManager.objects.motif
    );

    if (result.issues && result.issues.length > 0) {
      console.warn('Accessibility issues:', result.issues);
    }
  }

  /**
   * Phase 4: Export with pre-export validation through orchestration
   */
  async showExportModal() {
    // Phase 4: Run pre-export validation
    const validation = await this.orchestrationEngine.runPreExportValidation();

    if (!validation.canExport) {
      const criticalIssues = validation.issues.filter(i =>
        i.severity === 'critical' || i.severity === 'hard'
      );

      let failMessage = 'Cannot export: The following issues must be resolved:\n\n';
      for (const issue of criticalIssues) {
        failMessage += `• ${issue.category.toUpperCase()}: ${issue.message}\n`;
      }

      alert(failMessage);
      return;
    }

    // Show warnings if any
    const warnings = validation.issues.filter(i => i.severity === 'warning');
    if (warnings.length > 0) {
      console.warn('Export warnings:', warnings);
    }

    // Proceed with export
    const format = this.stateManager.get('exportFormat') || 'png';
    const dpi = this.stateManager.get('exportDpi') || 300;
    const quality = (this.stateManager.get('exportQuality') || 95) / 100;

    this.showLoading('Preparing export...', 0);

    try {
      const result = await this.orchestrationEngine.runExportPipeline({
        format,
        dpi,
        quality
      });

      this.currentExport = result;
      this.displayExportResult(result);
      this.hideLoading();

    } catch (error) {
      console.error('Export failed:', error);
      this.hideLoading();
      alert('Export failed: ' + error.message);
    }
  }

  displayExportResult(result) {
    const modal = document.getElementById('export-modal');
    const preview = document.getElementById('export-preview');
    const details = document.getElementById('export-details');

    if (preview) {
      preview.innerHTML = `<img src="${result.dataUrl}" alt="Export preview">`;
    }

    if (details) {
      const format = this.stateManager.get('exportFormat') || 'png';
      const dpi = this.stateManager.get('exportDpi') || 300;
      const quality = this.stateManager.get('exportQuality') || 95;
      const preset = this.currentPreset ? AssetPresets.getPreset(this.currentPreset) : null;

      details.innerHTML = `
        <div class="detail-row"><span>Format</span><span>${format.toUpperCase()}</span></div>
        <div class="detail-row"><span>Dimensions</span><span>${preset ? preset.width + 'x' + preset.height : '1080x1080'}</span></div>
        <div class="detail-row"><span>DPI</span><span>${dpi}</span></div>
        <div class="detail-row"><span>Quality</span><span>${quality}%</span></div>
        <div class="detail-row"><span>File Size</span><span>${this.formatFileSize(result.fileSize || 0)}</span></div>
        <div class="detail-row"><span>Brand Score</span><span>${this.stateManager.get('brandScore') || 0}/100</span></div>
      `;
    }

    if (modal) modal.classList.remove('hidden');
  }

  closeExportModal() {
    document.getElementById('export-modal')?.classList.add('hidden');
  }

  downloadExport() {
    if (!this.currentExport) return;

    const format = this.stateManager.get('exportFormat') || 'png';
    const link = document.createElement('a');
    link.href = this.currentExport.dataUrl;
    link.download = `kpmg-composition-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.closeExportModal();
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Undo/Redo
  saveState() {
    const state = this.canvasManager.getCanvasState();
    this.undoStack.push(state);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const currentState = this.canvasManager.getCanvasState();
    this.redoStack.push(currentState);
    const previousState = this.undoStack.pop();
    this.canvasManager.setCanvasState(previousState);
    this.canvasManager.requestRender();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const currentState = this.canvasManager.getCanvasState();
    this.undoStack.push(currentState);
    const nextState = this.redoStack.pop();
    this.canvasManager.setCanvasState(nextState);
    this.canvasManager.requestRender();
  }

  // Loading
  showLoading(title, percent) {
    const overlay = document.getElementById('loading-overlay');
    const titleEl = document.getElementById('loading-title');
    const bar = document.getElementById('loading-bar');

    if (overlay) overlay.classList.remove('hidden');
    if (titleEl) titleEl.textContent = title;
    if (bar) bar.style.width = percent + '%';
  }

  hideLoading() {
    document.getElementById('loading-overlay')?.classList.add('hidden');
  }

  // Presets
  renderPresetCards() {
    const categories = {
      'social': document.getElementById('social-presets'),
      'web': document.getElementById('web-presets'),
      'presentation': document.getElementById('presentation-presets')
    };

    for (const [category, container] of Object.entries(categories)) {
      if (!container) continue;
      const presets = AssetPresets.getCategoryPresets(category);
      container.innerHTML = presets.map(preset => this.createPresetCard(preset)).join('');
    }

    document.querySelectorAll('.preset-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectPreset(card.dataset.preset);
      });
    });
  }

  createPresetCard(preset) {
    const aspectRatio = preset.width / preset.height;
    let iconSvg = '';

    if (aspectRatio > 1.2) {
      iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/></svg>`;
    } else if (aspectRatio < 0.8) {
      iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="8" height="20" rx="2"/></svg>`;
    } else {
      iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
    }

    return `
      <div class="preset-card" data-preset="${preset.id}">
        <div class="preset-card-icon">${iconSvg}</div>
        <div class="preset-card-name">${preset.name}</div>
        <div class="preset-card-ratio">${preset.ratio || AssetPresets.getAspectRatio(preset)}</div>
      </div>
    `;
  }

  selectPreset(presetId) {
    this.currentPreset = presetId;
    this.stateManager.set('selectedPreset', presetId);

    const preset = AssetPresets.getPreset(presetId);
    const dims = AssetPresets.getCanvasDimensions(preset);

    this.gridSystem = new GridSystem(dims.width, dims.height);
    this.canvasManager.setGridSystem(this.gridSystem);
    this.canvasManager.resizeCanvas();

    if (this.complianceEngine) {
      this.complianceEngine.gridSystem = this.gridSystem;
    }
    if (this.constraintEngine) {
      this.constraintEngine.gridSystem = this.gridSystem;
    }
    if (this.orchestrationEngine) {
      this.orchestrationEngine.gridSystem = this.gridSystem;
    }
  }

  // URL sharing
  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('shared');
    if (shared) {
      try {
        const data = JSON.parse(atob(shared));
        this.loadSharedComposition(data);
      } catch (e) {
        console.error('Failed to load shared composition:', e);
      }
    }
  }

  loadSharedComposition(data) {
    if (data.preset) this.selectPreset(data.preset);
    if (data.headline) {
      document.getElementById('headline-input').value = data.headline;
      this.stateManager.set('headline', data.headline);
    }
    if (data.subheading) {
      document.getElementById('subheading-input').value = data.subheading;
      this.stateManager.set('subheading', data.subheading);
    }
    if (data.backgroundImage) {
      this.loadBackgroundImage(data.backgroundImage);
    }
  }

  loadBackgroundImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.backgroundImage = img;
        this.stateManager.set('backgroundImage', src);
        const uploadCard = document.getElementById('upload-card');
        if (uploadCard) {
          uploadCard.classList.add('has-file');
          let preview = uploadCard.querySelector('.upload-preview');
          if (!preview) {
            preview = document.createElement('div');
            preview.className = 'upload-preview';
            uploadCard.appendChild(preview);
          }
          preview.innerHTML = `<img src="${src}" alt="Uploaded image">`;
        }
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // Demo
  loadDemoImage() {
    const demoImages = [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&h=800&fit=crop'
    ];
    const randomImage = demoImages[Math.floor(Math.random() * demoImages.length)];
    this.loadBackgroundImage(randomImage);
  }

  // Performance
  getPerformanceReport() {
    return this.performanceMonitor?.getReport() || null;
  }

  togglePerformanceOverlay(show) {
    this.performanceMonitor?.toggleOverlay(show);
  }

  // Cleanup
  destroy() {
    this.orchestrationEngine?.destroy();
    this.performanceMonitor?.destroy();
    this.objectPool?.destroy();
    this.canvasManager?.destroy();
    this.stateManager?.persist();
  }
}

// Initialize when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new BrandCompositionApp();
  window.brandApp = app;
});

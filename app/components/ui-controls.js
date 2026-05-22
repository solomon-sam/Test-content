/**
 * UI Controls
 * Handles all UI interactions for the 4-step KPMG wizard
 */

class UIControls {
  constructor(app) {
    this.app = app;
    this.stateManager = app.stateManager;

    this.setupEventListeners();
    this.setupStateSubscriptions();
    this.renderPresets();
  }

  setupEventListeners() {
    // Step navigation clicks
    document.querySelectorAll('.step-item').forEach(step => {
      step.addEventListener('click', () => {
        const stepName = step.dataset.step;
        if (this.stateManager.canGoToStep(stepName)) {
          this.stateManager.goToStep(stepName);
        }
      });
    });

    // Continue buttons
    document.getElementById('btn-continue-explore')?.addEventListener('click', () => {
      this.stateManager.goToStep('compose');
    });

    document.getElementById('btn-continue-compose')?.addEventListener('click', () => {
      this.stateManager.goToStep('refine');
    });

    document.getElementById('btn-continue-refine')?.addEventListener('click', () => {
      this.stateManager.goToStep('export');
    });

    // Back buttons
    document.getElementById('btn-back-compose')?.addEventListener('click', () => {
      this.stateManager.goToStep('explore');
    });

    document.getElementById('btn-back-refine')?.addEventListener('click', () => {
      this.stateManager.goToStep('compose');
    });

    document.getElementById('btn-back-export')?.addEventListener('click', () => {
      this.stateManager.goToStep('refine');
    });

    // Image upload
    const imageZone = document.getElementById('upload-image-zone');
    const imageInput = document.getElementById('image-input');

    if (imageZone && imageInput) {
      imageZone.addEventListener('click', () => imageInput.click());

      imageZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageZone.classList.add('dragover');
      });

      imageZone.addEventListener('dragleave', () => {
        imageZone.classList.remove('dragover');
      });

      imageZone.addEventListener('drop', (e) => {
        e.preventDefault();
        imageZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          this.handleImageUpload(e.dataTransfer.files[0]);
        }
      });

      imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleImageUpload(e.target.files[0]);
        }
      });
    }

    // Text inputs
    const headlineInput = document.getElementById('headline-input');
    const subheadingInput = document.getElementById('subheading-input');

    if (headlineInput) {
      headlineInput.addEventListener('input', (e) => {
        this.stateManager.set('headline', e.target.value);
        this.updateCharCounter('headline', e.target.value.length, 60);
      });
    }

    if (subheadingInput) {
      subheadingInput.addEventListener('input', (e) => {
        this.stateManager.set('subheading', e.target.value);
        this.updateCharCounter('subheading', e.target.value.length, 120);
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

    // Quality slider
    const qualitySlider = document.getElementById('export-quality');
    if (qualitySlider) {
      qualitySlider.addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('quality-value').textContent = val + '%';
        this.stateManager.set('exportQuality', parseInt(val));
      });
    }

    // DPI select
    const dpiSelect = document.getElementById('export-dpi');
    if (dpiSelect) {
      dpiSelect.addEventListener('change', (e) => {
        this.stateManager.set('exportDpi', parseInt(e.target.value));
      });
    }

    // Export button
    document.getElementById('btn-export')?.addEventListener('click', () => {
      this.app.showExportModal();
    });

    // Modal close
    document.getElementById('modal-close')?.addEventListener('click', () => {
      this.hideExportModal();
    });
    document.getElementById('btn-modal-close')?.addEventListener('click', () => {
      this.hideExportModal();
    });
    document.getElementById('btn-download')?.addEventListener('click', () => {
      this.app.downloadExport();
    });

    // Brand score refresh
    document.getElementById('btn-refresh-score')?.addEventListener('click', () => {
      this.app.calculateBrandScore();
    });

    // Canvas toolbar
    document.getElementById('tool-zoom-in')?.addEventListener('click', () => {
      this.app.canvasManager.zoomIn();
    });
    document.getElementById('tool-zoom-out')?.addEventListener('click', () => {
      this.app.canvasManager.zoomOut();
    });
    document.getElementById('tool-fit')?.addEventListener('click', () => {
      this.app.canvasManager.fitToScreen();
    });
    document.getElementById('tool-grid')?.addEventListener('click', () => {
      this.app.canvasManager.showGrid = !this.app.canvasManager.showGrid;
      this.app.canvasManager.drawGrid();
    });
    document.getElementById('tool-snap')?.addEventListener('click', () => {
      this.app.canvasManager.snapToGrid = !this.app.canvasManager.snapToGrid;
    });
    document.getElementById('tool-pan')?.addEventListener('click', () => {
      this.app.togglePanMode(!this.app.canvasManager.isPanning);
    });
    document.getElementById('tool-analyze')?.addEventListener('click', () => {
      this.app.runAIAnalysis();
    });
  }

  setupStateSubscriptions() {
    // Step changes
    this.stateManager.subscribe('currentStep', (step) => {
      this.updateStepUI(step);
    });

    // Brand score
    this.stateManager.subscribe('brandScore', (score) => {
      this.updateBrandScore(score);
    });

    // Checklist status
    this.stateManager.subscribe('checklistStatus', (status) => {
      this.updateChecklist(status);
    });

    // Loading state
    this.stateManager.subscribe('loading', (loading) => {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.classList.toggle('hidden', !loading);
      }
    });

    this.stateManager.subscribe('loadingText', (text) => {
      const el = document.getElementById('loading-text');
      if (el) el.textContent = text;
    });

    this.stateManager.subscribe('loadingPercent', (percent) => {
      const bar = document.getElementById('loading-bar');
      if (bar) bar.style.width = percent + '%';
    });

    // Export preview
    this.stateManager.subscribe('composition', () => {
      this.updateExportPreview();
    });
  }

  /**
   * Update step UI
   */
  updateStepUI(step) {
    const steps = ['explore', 'compose', 'refine', 'export'];
    const stepIndex = steps.indexOf(step);

    // Update step nav
    document.querySelectorAll('.step-item').forEach((el, i) => {
      el.classList.remove('active', 'completed');
      if (i === stepIndex) {
        el.classList.add('active');
      } else if (i < stepIndex) {
        el.classList.add('completed');
      }
    });

    // Update panels
    document.querySelectorAll('.step-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    const activePanel = document.getElementById('step-' + step);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    // Step-specific initialization
    if (step === 'refine') {
      setTimeout(() => {
        this.app.canvasManager.fitToScreen();
      }, 100);
    }

    if (step === 'export') {
      this.updateExportPreview();
    }
  }

  /**
   * Update brand score display
   */
  updateBrandScore(score) {
    const valueEl = document.getElementById('brand-score-value');
    const circleEl = document.getElementById('brand-score-circle');

    if (valueEl) {
      valueEl.textContent = Math.round(score);
    }

    if (circleEl) {
      const circumference = 113; // 2 * PI * 18
      const offset = circumference - (score / 100) * circumference;
      circleEl.style.strokeDashoffset = offset;

      // Color based on score
      if (score >= 80) {
        circleEl.style.stroke = '#22c55e';
      } else if (score >= 60) {
        circleEl.style.stroke = '#f59e0b';
      } else {
        circleEl.style.stroke = '#ef4444';
      }
    }

    // Update overall score in refine panel
    const overallValue = document.getElementById('overall-score-value');
    const overallCircle = document.getElementById('overall-score-circle');
    const overallDesc = document.getElementById('overall-score-desc');

    if (overallValue) overallValue.textContent = Math.round(score);
    if (overallCircle) {
      const circ = 163.4; // 2 * PI * 26
      const off = circ - (score / 100) * circ;
      overallCircle.style.strokeDashoffset = off;
    }
    if (overallDesc) {
      if (score >= 80) {
        overallDesc.textContent = 'Great job! Your composition is strong and on brand.';
      } else if (score >= 60) {
        overallDesc.textContent = 'Good progress. Some adjustments recommended.';
      } else {
        overallDesc.textContent = 'Needs improvement. Check the items above.';
      }
    }
  }

  /**
   * Update checklist items
   */
  updateChecklist(status) {
    const statusMap = {
      pass: { class: 'pass', icon: '✓' },
      warning: { class: 'warning', icon: '!' },
      fail: { class: 'fail', icon: '✕' },
      pending: { class: 'pending', icon: '○' }
    };

    Object.entries(status).forEach(([key, value]) => {
      const el = document.getElementById('check-' + key);
      if (el) {
        const config = statusMap[value] || statusMap.pending;
        el.className = 'check-status ' + config.class;
        el.textContent = config.icon;
      }
    });
  }

  /**
   * Update character counter
   */
  updateCharCounter(type, current, max) {
    const el = document.getElementById(type + '-counter');
    if (el) {
      el.textContent = current + ' / ' + max;
      if (current >= max) {
        el.style.color = '#ef4444';
      } else {
        el.style.color = '';
      }
    }
  }

  /**
   * Handle image upload
   */
  handleImageUpload(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG or PNG)');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.stateManager.set('backgroundImage', img);
        this.stateManager.set('backgroundImageDataUrl', e.target.result);

        // Show preview
        const preview = document.getElementById('image-preview');
        const zone = document.getElementById('upload-image-zone');
        if (preview && zone) {
          preview.innerHTML = '';
          preview.appendChild(img.cloneNode());
          preview.classList.remove('hidden');
          zone.classList.add('has-file');
        }

        // Auto-run analysis if on refine step
        if (this.stateManager.get('currentStep') === 'refine') {
          this.app.loadBackgroundImage(img);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Render preset cards
   */
  renderPresets() {
    const socialContainer = document.getElementById('social-presets');
    const webContainer = document.getElementById('web-presets');
    const printContainer = document.getElementById('print-presets');

    if (!socialContainer || !AssetPresets) return;

    const categories = {
      'social': socialContainer,
      'web': webContainer,
      'presentation': printContainer
    };

    Object.entries(categories).forEach(([catKey, container]) => {
      if (!container) return;
      const presets = AssetPresets.getCategoryPresets(catKey);

      presets.forEach(preset => {
        const card = document.createElement('div');
        card.className = 'preset-card';
        card.dataset.preset = preset.id;

        const dims = AssetPresets.getCanvasDimensions(preset);
        const ratio = this.getRatioLabel(dims.width, dims.height);

        card.innerHTML = `
          <div class="preset-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" 
                style="width:${preset.width > preset.height ? 18 : 12}px; height:${preset.width > preset.height ? 12 : 18}px; x:${preset.width > preset.height ? 3 : 6}px; y:${preset.width > preset.height ? 6 : 3}px"/>
            </svg>
          </div>
          <span class="preset-card-name">${preset.name}</span>
          <span class="preset-card-ratio">${ratio}</span>
        `;

        card.addEventListener('click', () => {
          document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          this.stateManager.set('selectedPreset', preset);
        });

        container.appendChild(card);
      });
    });
  }

  /**
   * Get ratio label
   */
  getRatioLabel(w, h) {
    const ratio = w / h;
    if (Math.abs(ratio - 1) < 0.1) return '1:1';
    if (Math.abs(ratio - 4/5) < 0.1) return '4:5';
    if (Math.abs(ratio - 9/16) < 0.1) return '9:16';
    if (Math.abs(ratio - 16/9) < 0.1) return '16:9';
    if (Math.abs(ratio - 1.91) < 0.1) return '1.91:1';
    if (w > h) return `${w}×${h}`;
    return `${w}×${h}`;
  }

  /**
   * Update export preview
   */
  updateExportPreview() {
    const preview = document.getElementById('export-preview');
    if (!preview || !this.app.canvasManager) return;

    // Get canvas data URL
    const dataUrl = this.app.canvasManager.toDataURL({
      format: 'png',
      quality: 0.8
    });

    preview.innerHTML = `<img src="${dataUrl}" alt="Export preview">`;
  }

  /**
   * Show export modal
   */
  showExportModal(result) {
    const modal = document.getElementById('export-modal');
    const preview = document.getElementById('export-preview-img');
    const details = document.getElementById('export-details');

    if (!modal) return;

    if (result) {
      if (preview) {
        preview.innerHTML = `<img src="${result.dataUrl}" alt="Export">`;
      }
      if (details) {
        details.innerHTML = `
          <div class="detail-row"><span>Format</span><span>${result.format.toUpperCase()}</span></div>
          <div class="detail-row"><span>Dimensions</span><span>${result.dimensions.width} × ${result.dimensions.height}px</span></div>
          <div class="detail-row"><span>DPI</span><span>${result.dpi}</span></div>
          <div class="detail-row"><span>File size</span><span>${this.formatFileSize(result.blob?.size || 0)}</span></div>
        `;
      }
    }

    modal.classList.remove('hidden');
  }

  /**
   * Hide export modal
   */
  hideExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) modal.classList.add('hidden');
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Update AI progress
   */
  updateAIProgress(percent, text) {
    this.stateManager.set('loading', true);
    this.stateManager.set('loadingText', text);
    this.stateManager.set('loadingPercent', percent);

    if (percent >= 100) {
      setTimeout(() => {
        this.stateManager.set('loading', false);
      }, 500);
    }
  }

  /**
   * Update orchestration stage
   */
  updateOrchestrationStage(stage, percent) {
    // Stage indicators can be added here
  }

  /**
   * Update AI results panel
   */
  updateAIResults(analysis) {
    // Update AI panel with analysis results
  }

  /**
   * Update validation panel
   */
  updateValidationPanel(validation) {
    // Update validation UI
  }

  /**
   * Update composition info
   */
  updateCompositionInfo(analysis) {
    // Update composition info panel
  }
}

// Make available globally
window.UIControls = UIControls;

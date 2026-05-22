/**
 * UI Controls — Phase 3 Enhanced
 * Handles all UI interactions with compliance integration,
 * edit mode toggle, live scoring display, and export gate.
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
      // Phase 3: Check compliance before allowing export
      const status = this.stateManager.get('complianceStatus');
      if (status === 'FAIL') {
        alert('Please resolve brand compliance issues before exporting. Check the Brand Check panel for details.');
        return;
      }
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
      if (this.app.complianceEngine) {
        this.app.complianceEngine.validateAll();
      } else {
        this.app.calculateBrandScore();
      }
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

    // Phase 3: Edit Mode Toggle
    document.getElementById('tool-edit-mode')?.addEventListener('click', () => {
      const newMode = this.app.editModeController.toggleEditMode();
      const btn = document.getElementById('tool-edit-mode');
      if (btn) {
        btn.classList.toggle('active', newMode === 'manual');
        btn.title = newMode === 'manual' ? 'Exit Edit Mode' : 'Enter Edit Mode';
      }

      // Update canvas cursor
      const wrapper = document.getElementById('canvas-wrapper');
      if (wrapper) {
        wrapper.classList.toggle('edit-mode-active', newMode === 'manual');
      }
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

    // Phase 3: Compliance status
    this.stateManager.subscribe('complianceStatus', (status) => {
      this.updateComplianceStatus(status);
    });

    // Phase 3: Compliance report
    this.stateManager.subscribe('complianceReport', (report) => {
      if (report) {
        this.updateComplianceDetails(report);
      }
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

      // Phase 3: Run initial compliance validation when entering refine
      if (this.app.complianceEngine) {
        setTimeout(() => {
          this.app.complianceEngine.validateAll();
        }, 200);
      }
    }

    if (step === 'export') {
      this.updateExportPreview();

      // Phase 3: Update export button state based on compliance
      const status = this.stateManager.get('complianceStatus');
      this.updateExportGate(status);
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

      // Color based on score
      if (score >= 80) {
        overallCircle.style.stroke = '#22c55e';
      } else if (score >= 60) {
        overallCircle.style.stroke = '#f59e0b';
      } else {
        overallCircle.style.stroke = '#ef4444';
      }
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
   * Phase 3: Update compliance status bar
   */
  updateComplianceStatus(status) {
    const bar = document.getElementById('compliance-status-bar');
    const indicator = document.getElementById('compliance-indicator');
    const text = document.getElementById('compliance-text');

    if (!bar || !indicator || !text) return;

    // Remove all status classes
    bar.classList.remove('status-pass', 'status-warning', 'status-fail');

    switch (status) {
      case 'PASS':
        bar.classList.add('status-pass');
        indicator.style.background = '#22c55e';
        text.textContent = 'Brand Safe — All checks passed';
        text.style.color = '#16a34a';
        break;
      case 'WARNING':
        bar.classList.add('status-warning');
        indicator.style.background = '#eab308';
        text.textContent = 'Warning — Some items need attention';
        text.style.color = '#ca8a04';
        break;
      case 'FAIL':
        bar.classList.add('status-fail');
        indicator.style.background = '#ef4444';
        text.textContent = 'Invalid — Export blocked until resolved';
        text.style.color = '#dc2626';
        break;
      default:
        indicator.style.background = '#eab308';
        text.textContent = 'Checking compliance...';
        text.style.color = '#5A6B8A';
    }
  }

  /**
   * Phase 3: Update compliance details from report
   */
  updateComplianceDetails(report) {
    if (!report || !report.categories) return;

    // Update expanded checklist
    for (const [key, result] of Object.entries(report.categories)) {
      const el = document.getElementById('check-' + key);
      if (el) {
        const statusMap = {
          PASS: { class: 'pass', icon: '✓' },
          WARNING: { class: 'warning', icon: '!' },
          FAIL: { class: 'fail', icon: '✕' }
        };
        const config = statusMap[result.status] || statusMap.PASS;
        el.className = 'check-status ' + config.class;
        el.textContent = config.icon;
      }
    }

    // Update export gate
    this.updateExportGate(report.overall);
  }

  /**
   * Phase 3: Update export button based on compliance
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
        refineContinue.title = 'Resolve compliance issues before continuing';
      } else {
        refineContinue.disabled = false;
        refineContinue.classList.remove('disabled');
        refineContinue.title = '';
      }
    }
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

        // Icon based on category
        let iconSvg = '';
        if (catKey === 'social') {
          iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="3"/></svg>`;
        } else if (catKey === 'web') {
          iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20"/></svg>`;
        } else {
          iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>`;
        }

        card.innerHTML = `
          <div class="preset-card-icon">${iconSvg}</div>
          <div class="preset-card-name">${preset.name}</div>
          <div class="preset-card-ratio">${ratio}</div>
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

    const dataUrl = this.app.canvasManager.toDataURL({
      format: 'png',
      quality: 0.8
    });
    preview.innerHTML = `<img src="${dataUrl}" alt="Export preview" style="max-width:100%;max-height:100%;object-fit:contain;">`;
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
        preview.innerHTML = `<img src="${result.dataUrl}" alt="Export preview" style="max-width:100%;max-height:300px;border-radius:8px;">`;
      }
      if (details) {
        details.innerHTML = `
          <div class="detail-row">
            <span>Format</span>
            <span>${result.format.toUpperCase()}</span>
          </div>
          <div class="detail-row">
            <span>Dimensions</span>
            <span>${result.dimensions.width} × ${result.dimensions.height}px</span>
          </div>
          <div class="detail-row">
            <span>DPI</span>
            <span>${result.dpi}</span>
          </div>
          <div class="detail-row">
            <span>File size</span>
            <span>${this.formatFileSize(result.blob?.size || 0)}</span>
          </div>
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
}

// Make available globally
window.UIControls = UIControls;

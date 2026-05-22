/**
 * Color Picker — Phase 3B Enhanced
 * Overlay color changer with live preview, presets, and validation.
 * Integrates with ComplianceEngine for treatment validation.
 */

class ColorPicker {
  constructor(stateManager, canvasManager) {
    this.stateManager = stateManager;
    this.canvasManager = canvasManager;
    this.currentTreatment = null;
    this.previewCanvas = null;
    this.previewCtx = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Preset buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.preset-btn');
      if (btn && btn.closest('#color-picker-popup')) {
        document.querySelectorAll('#color-picker-popup .preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.onPresetSelect(btn.dataset.treatment);
      }
    });

    // Custom color
    const customColor = document.getElementById('custom-color');
    if (customColor) {
      customColor.addEventListener('input', (e) => {
        this.onCustomColorChange(e.target.value);
      });
    }

    // Blend mode
    const blendMode = document.getElementById('blend-mode');
    if (blendMode) {
      blendMode.addEventListener('change', (e) => {
        this.onBlendModeChange(e.target.value);
      });
    }

    // Opacity slider
    const opacitySlider = document.getElementById('opacity-slider');
    if (opacitySlider) {
      opacitySlider.addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('opacity-value').textContent = val + '%';
        this.onOpacityChange(parseInt(val) / 100);
      });
    }

    // Apply button
    document.getElementById('btn-picker-apply')?.addEventListener('click', () => {
      this.apply();
    });

    // Cancel button
    document.getElementById('btn-picker-cancel')?.addEventListener('click', () => {
      this.cancel();
    });

    // Close button
    document.getElementById('picker-close')?.addEventListener('click', () => {
      this.cancel();
    });

    // Keyboard: Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const picker = document.getElementById('color-picker-popup');
        if (picker && !picker.classList.contains('hidden')) {
          this.cancel();
        }
      }
    });
  }

  /**
   * Show color picker popup
   */
  show(currentTreatment) {
    this.currentTreatment = currentTreatment || this.getDefaultTreatment();
    this.backupTreatment = { ...this.currentTreatment };

    const picker = document.getElementById('color-picker-popup');
    if (!picker) return;

    // Set initial values
    const customColor = document.getElementById('custom-color');
    const blendMode = document.getElementById('blend-mode');
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityValue = document.getElementById('opacity-value');

    if (customColor) customColor.value = this.currentTreatment.color || '#1E49E2';
    if (blendMode) blendMode.value = this.currentTreatment.blendMode || 'multiply';
    if (opacitySlider) {
      const opacity = Math.round((this.currentTreatment.opacity || 0.85) * 100);
      opacitySlider.value = opacity;
      if (opacityValue) opacityValue.textContent = opacity + '%';
    }

    // Select matching preset
    const presetId = this.getPresetId(this.currentTreatment);
    document.querySelectorAll('#color-picker-popup .preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.treatment === presetId);
    });

    // Show
    picker.classList.remove('hidden');

    // Initialize preview
    this.initPreview();
    this.updatePreview();
  }

  /**
   * Hide color picker
   */
  hide() {
    const picker = document.getElementById('color-picker-popup');
    if (picker) picker.classList.add('hidden');
  }

  /**
   * Get default treatment
   */
  getDefaultTreatment() {
    return {
      color: '#1E49E2',
      blendMode: 'multiply',
      opacity: 0.85,
      name: 'Blue Multiply'
    };
  }

  /**
   * Get preset ID from treatment
   */
  getPresetId(treatment) {
    const presets = this.getPresets();
    for (const preset of presets) {
      if (preset.color === treatment.color && preset.blendMode === treatment.blendMode) {
        return preset.id;
      }
    }
    return 'blue-multiply';
  }

  /**
   * Get available presets
   */
  getPresets() {
    return [
      {
        id: 'blue-multiply',
        name: 'Blue Multiply',
        color: '#1E49E2',
        blendMode: 'multiply',
        opacity: 1.0,
        description: 'Dark images — deep blue overlay'
      },
      {
        id: 'cobalt-linear',
        name: 'Cobalt Linear Light',
        color: '#1E49E2',
        blendMode: 'linear-light',
        opacity: 1.0,
        description: 'Medium images — vibrant blue'
      },
      {
        id: 'pacific-gradient',
        name: 'Pacific Gradient',
        color: '#1E49E2',
        darkTone: '#1E49E2',
        lightTone: '#5FD7FF',
        blendMode: 'color',
        opacity: 1.0,
        description: 'Bright images — gradient map'
      },
      {
        id: 'hard-light',
        name: 'Hard Light Blue',
        color: '#00338D',
        blendMode: 'hard-light',
        opacity: 0.8,
        description: 'High contrast — deep navy'
      },
      {
        id: 'overlay',
        name: 'Blue Overlay',
        color: '#1E49E2',
        blendMode: 'overlay',
        opacity: 0.7,
        description: 'Subtle — gentle blue tint'
      }
    ];
  }

  /**
   * Handle preset selection
   */
  onPresetSelect(presetId) {
    const presets = this.getPresets();
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    this.currentTreatment = {
      ...this.currentTreatment,
      color: preset.color,
      blendMode: preset.blendMode,
      opacity: preset.opacity,
      name: preset.name
    };

    // Update UI
    const customColor = document.getElementById('custom-color');
    const blendMode = document.getElementById('blend-mode');
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityValue = document.getElementById('opacity-value');

    if (customColor) customColor.value = preset.color;
    if (blendMode) blendMode.value = preset.blendMode;
    if (opacitySlider) {
      const opacity = Math.round(preset.opacity * 100);
      opacitySlider.value = opacity;
      if (opacityValue) opacityValue.textContent = opacity + '%';
    }

    this.updatePreview();
    this.previewOnCanvas();
  }

  /**
   * Handle custom color change
   */
  onCustomColorChange(hex) {
    this.currentTreatment = {
      ...this.currentTreatment,
      color: hex,
      name: 'Custom'
    };

    // Deselect presets
    document.querySelectorAll('#color-picker-popup .preset-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    this.updatePreview();
    this.previewOnCanvas();
  }

  /**
   * Handle blend mode change
   */
  onBlendModeChange(mode) {
    this.currentTreatment = {
      ...this.currentTreatment,
      blendMode: mode
    };
    this.updatePreview();
    this.previewOnCanvas();
  }

  /**
   * Handle opacity change
   */
  onOpacityChange(opacity) {
    this.currentTreatment = {
      ...this.currentTreatment,
      opacity: opacity
    };
    this.updatePreview();
    this.previewOnCanvas();
  }

  /**
   * Initialize preview canvas
   */
  initPreview() {
    const previewEl = document.getElementById('treatment-preview');
    if (!previewEl) return;

    this.previewCanvas = previewEl;
    this.previewCtx = previewEl.getContext('2d');

    // Set size
    previewEl.width = 200;
    previewEl.height = 120;
  }

  /**
   * Update preview canvas
   */
  updatePreview() {
    if (!this.previewCtx) return;

    const ctx = this.previewCtx;
    const w = this.previewCanvas.width;
    const h = this.previewCanvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw sample image (gradient simulating photo)
    const imgGradient = ctx.createLinearGradient(0, 0, w, h);
    imgGradient.addColorStop(0, '#e0e7ff');
    imgGradient.addColorStop(0.5, '#c7d2fe');
    imgGradient.addColorStop(1, '#a5b4fc');
    ctx.fillStyle = imgGradient;
    ctx.fillRect(0, 0, w, h);

    // Draw motif window (clear area)
    ctx.save();
    ctx.beginPath();
    ctx.rect(w * 0.3, h * 0.2, w * 0.4, h * 0.5);
    ctx.clip();
    // Draw "image" inside motif
    const motifGradient = ctx.createLinearGradient(w * 0.3, h * 0.2, w * 0.7, h * 0.7);
    motifGradient.addColorStop(0, '#818cf8');
    motifGradient.addColorStop(1, '#4f46e5');
    ctx.fillStyle = motifGradient;
    ctx.fillRect(w * 0.3, h * 0.2, w * 0.4, h * 0.5);
    ctx.restore();

    // Apply treatment overlay
    ctx.save();
    ctx.globalCompositeOperation = this.getCanvasBlendMode(this.currentTreatment.blendMode);
    ctx.globalAlpha = this.currentTreatment.opacity;
    ctx.fillStyle = this.currentTreatment.color;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Draw border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
  }

  /**
   * Preview treatment on actual canvas (live)
   */
  previewOnCanvas() {
    if (!this.canvasManager) return;

    const treatment = this.canvasManager.objects.treatment;
    if (treatment) {
      treatment.set({
        fill: this.currentTreatment.color,
        opacity: this.currentTreatment.opacity,
        globalCompositeOperation: this.getCanvasBlendMode(this.currentTreatment.blendMode)
      });
      this.canvasManager.requestRender();
    }
  }

  /**
   * Convert blend mode to Canvas composite operation
   */
  getCanvasBlendMode(mode) {
    const map = {
      'multiply': 'multiply',
      'linear-light': 'hard-light',
      'hard-light': 'hard-light',
      'color': 'color',
      'overlay': 'overlay'
    };
    return map[mode] || 'multiply';
  }

  /**
   * Apply treatment and validate
   */
  apply() {
    // Update state
    this.stateManager.set('composition.treatment', this.currentTreatment);

    // Apply to canvas
    if (this.canvasManager) {
      this.canvasManager.applyColorTreatment(this.currentTreatment);
    }

    // Trigger compliance validation
    this.stateManager.set('composition.lastModified', Date.now());

    // Hide picker
    this.hide();

    // Show success toast
    this.showToast('Treatment applied', 'success');
  }

  /**
   * Cancel and revert
   */
  cancel() {
    // Revert to backup
    if (this.backupTreatment && this.canvasManager) {
      const treatment = this.canvasManager.objects.treatment;
      if (treatment) {
        treatment.set({
          fill: this.backupTreatment.color,
          opacity: this.backupTreatment.opacity,
          globalCompositeOperation: this.getCanvasBlendMode(this.backupTreatment.blendMode)
        });
        this.canvasManager.requestRender();
      }
    }

    this.hide();
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('correction-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'correction-toast';
    if (type === 'success') {
      toast.style.borderLeftColor = '#22c55e';
    }

    toast.innerHTML = `
      <div class="correction-toast-title">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

// Make available globally
window.ColorPicker = ColorPicker;

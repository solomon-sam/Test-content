/**
 * Color Picker Component
 * Overlay color changer with live preview
 */

class ColorPicker {
  constructor(stateManager, canvasManager) {
    this.stateManager = stateManager;
    this.canvasManager = canvasManager;

    this.popup = document.getElementById('color-picker-popup');
    this.closeBtn = document.getElementById('picker-close');
    this.cancelBtn = document.getElementById('btn-picker-cancel');
    this.applyBtn = document.getElementById('btn-picker-apply');
    this.colorInput = document.getElementById('custom-color');
    this.blendSelect = document.getElementById('blend-mode');
    this.opacitySlider = document.getElementById('opacity-slider');
    this.opacityValue = document.getElementById('opacity-value');

    this.currentTreatment = null;
    this.previewTreatment = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hide());
    }
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => this.hide());
    }
    if (this.applyBtn) {
      this.applyBtn.addEventListener('click', () => this.apply());
    }

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const treatment = btn.dataset.treatment;
        this.selectPreset(treatment);
      });
    });

    // Custom color
    if (this.colorInput) {
      this.colorInput.addEventListener('input', (e) => {
        this.previewTreatment = {
          ...this.previewTreatment,
          color: e.target.value
        };
        this.livePreview();
      });
    }

    // Blend mode
    if (this.blendSelect) {
      this.blendSelect.addEventListener('change', (e) => {
        this.previewTreatment = {
          ...this.previewTreatment,
          blendMode: e.target.value
        };
        this.livePreview();
      });
    }

    // Opacity
    if (this.opacitySlider) {
      this.opacitySlider.addEventListener('input', (e) => {
        const val = e.target.value;
        if (this.opacityValue) this.opacityValue.textContent = val + '%';
        this.previewTreatment = {
          ...this.previewTreatment,
          opacity: val / 100
        };
        this.livePreview();
      });
    }

    // Hide on click outside
    document.addEventListener('click', (e) => {
      if (this.isVisible() && this.popup && !this.popup.contains(e.target)) {
        const target = e.target.closest('.tooltip-action');
        if (!target || !target.textContent.includes('Color')) {
          this.hide();
        }
      }
    });
  }

  /**
   * Get preset treatments
   */
  getPresets() {
    return [
      { 
        id: 'blue-multiply', 
        name: 'Blue Multiply', 
        color: '#1E49E2', 
        blendMode: 'multiply', 
        opacity: 0.85 
      },
      { 
        id: 'cobalt-linear', 
        name: 'Cobalt Linear Light', 
        color: '#1E49E2', 
        blendMode: 'hard-light', 
        opacity: 0.85 
      },
      { 
        id: 'pacific-gradient', 
        name: 'Pacific Gradient', 
        darkTone: '#1E49E2', 
        lightTone: '#5FD7FF', 
        blendMode: 'color', 
        opacity: 1.0 
      }
    ];
  }

  /**
   * Select preset
   */
  selectPreset(treatmentId) {
    const presets = this.getPresets();
    const preset = presets.find(p => p.id === treatmentId);
    if (preset) {
      this.previewTreatment = { ...preset };

      // Update UI
      if (this.colorInput) this.colorInput.value = preset.color || preset.darkTone || '#1E49E2';
      if (this.blendSelect) this.blendSelect.value = preset.blendMode;
      if (this.opacitySlider) {
        this.opacitySlider.value = Math.round(preset.opacity * 100);
        if (this.opacityValue) this.opacityValue.textContent = Math.round(preset.opacity * 100) + '%';
      }

      this.livePreview();
    }
  }

  /**
   * Show color picker
   */
  show(currentTreatment) {
    this.currentTreatment = currentTreatment || this.stateManager.get('composition.treatment');
    this.previewTreatment = { ...this.currentTreatment };

    // Update UI with current values
    if (this.colorInput) this.colorInput.value = this.currentTreatment.color || '#1E49E2';
    if (this.blendSelect) this.blendSelect.value = this.currentTreatment.blendMode || 'multiply';
    if (this.opacitySlider) {
      this.opacitySlider.value = Math.round((this.currentTreatment.opacity || 0.85) * 100);
      if (this.opacityValue) this.opacityValue.textContent = Math.round((this.currentTreatment.opacity || 0.85) * 100) + '%';
    }

    // Select matching preset
    const presets = this.getPresets();
    const matching = presets.find(p => p.id === this.currentTreatment.id);
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', matching && btn.dataset.treatment === matching.id);
    });

    if (this.popup) {
      this.popup.classList.remove('hidden');
    }
  }

  /**
   * Hide color picker
   */
  hide() {
    if (this.popup) {
      this.popup.classList.add('hidden');
    }
    // Revert preview
    if (this.currentTreatment) {
      this.applyTreatment(this.currentTreatment);
    }
  }

  /**
   * Apply treatment
   */
  apply() {
    if (this.previewTreatment) {
      this.stateManager.set('composition.treatment', this.previewTreatment);
      this.applyTreatment(this.previewTreatment);
    }
    this.hide();
  }

  /**
   * Live preview treatment
   */
  livePreview() {
    if (this.previewTreatment) {
      this.applyTreatment(this.previewTreatment);
    }
  }

  /**
   * Apply treatment to canvas
   */
  applyTreatment(treatment) {
    // Remove existing treatment
    const existing = this.canvasManager.canvas.getObjects().filter(o => o.name === 'color-treatment');
    existing.forEach(o => this.canvasManager.canvas.remove(o));

    // Create new treatment overlay
    const overlay = new fabric.Rect({
      left: 0,
      top: 0,
      width: this.canvasManager.canvas.width,
      height: this.canvasManager.canvas.height,
      fill: treatment.color || '#1E49E2',
      opacity: treatment.opacity || 0.85,
      selectable: false,
      evented: false,
      name: 'color-treatment'
    });

    // Set blend mode
    const blendModes = {
      'multiply': 'multiply',
      'hard-light': 'hard-light',
      'linear-light': 'hard-light',
      'color': 'color',
      'overlay': 'overlay'
    };
    overlay.globalCompositeOperation = blendModes[treatment.blendMode] || 'multiply';

    // Handle gradient
    if (treatment.id === 'pacific-gradient' || treatment.lightTone) {
      const gradient = new fabric.Gradient({
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: this.canvasManager.canvas.height },
        colorStops: [
          { offset: 0, color: treatment.lightTone || '#5FD7FF' },
          { offset: 1, color: treatment.darkTone || '#1E49E2' }
        ]
      });
      overlay.set('fill', gradient);
      overlay.globalCompositeOperation = 'color';
    }

    this.canvasManager.canvas.add(overlay);

    // Keep background behind treatment
    if (this.canvasManager.objects.background) {
      this.canvasManager.canvas.sendToBack(this.canvasManager.objects.background);
    }

    // Send treatment to just above background
    overlay.moveTo(1);

    this.canvasManager.canvas.renderAll();
  }

  /**
   * Check if visible
   */
  isVisible() {
    return this.popup && !this.popup.classList.contains('hidden');
  }
}

// Make available globally
window.ColorPicker = ColorPicker;

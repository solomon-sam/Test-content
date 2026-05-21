/**
 * UI Controls
 * Handles all UI interactions, presets, uploads, and settings
 */

class UIControls {
    constructor(app) {
        this.app = app;
        this.currentCategory = 'social';
        this.currentPreset = null;
        this.setupEventListeners();
        this.renderPresets('social');
    }

    setupEventListeners() {
        // Category tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = e.target.dataset.category;
                this.renderPresets(this.currentCategory);

                // Show/hide custom size panel
                const customPanel = document.getElementById('custom-size-panel');
                if (customPanel) {
                    customPanel.style.display = this.currentCategory === 'custom' ? 'block' : 'none';
                }
            });
        });

        // Image upload
        const imageZone = document.getElementById('upload-image-zone');
        const imageInput = document.getElementById('image-upload');

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
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleImageUpload(files[0], imageZone);
                }
            });
            imageInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleImageUpload(e.target.files[0], imageZone);
                }
            });
        }

        // Logo upload
        const logoZone = document.getElementById('upload-logo-zone');
        const logoInput = document.getElementById('logo-upload');

        if (logoZone && logoInput) {
            logoZone.addEventListener('click', () => logoInput.click());
            logoZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                logoZone.classList.add('dragover');
            });
            logoZone.addEventListener('dragleave', () => {
                logoZone.classList.remove('dragover');
            });
            logoZone.addEventListener('drop', (e) => {
                e.preventDefault();
                logoZone.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleLogoUpload(files[0], logoZone);
                }
            });
            logoInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleLogoUpload(e.target.files[0], logoZone);
                }
            });
        }

        // Brand controls
        const updateBrandBtn = document.getElementById('btn-update-brand');
        if (updateBrandBtn) {
            updateBrandBtn.addEventListener('click', () => {
                this.app.updateBrandElements();
            });
        }

        // Grid toggles
        const gridToggles = {
            'show-grid': (checked) => { this.app.canvasManager.showGrid = checked; this.app.canvasManager.drawGrid(); },
            'show-margins': (checked) => { this.app.canvasManager.showMargins = checked; this.app.canvasManager.drawGrid(); },
            'snap-grid': (checked) => { this.app.canvasManager.snapToGrid = checked; },
            'show-heatmap': (checked) => { this.app.canvasManager.showHeatmap = checked; this.app.updateOverlays(); },
            'show-negative': (checked) => { this.app.canvasManager.showNegative = checked; this.app.updateOverlays(); },
            'show-zones': (checked) => { this.app.canvasManager.showZones = checked; this.app.updateOverlays(); }
        };

        Object.entries(gridToggles).forEach(([id, handler]) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', (e) => handler(e.target.checked));
            }
        });

        // Canvas toolbar
        document.getElementById('tool-zoom-in')?.addEventListener('click', () => this.app.canvasManager.zoomIn());
        document.getElementById('tool-zoom-out')?.addEventListener('click', () => this.app.canvasManager.zoomOut());
        document.getElementById('tool-fit')?.addEventListener('click', () => this.app.canvasManager.fitToScreen());
        document.getElementById('tool-pan')?.addEventListener('click', () => this.app.togglePanMode(true));
        document.getElementById('tool-select')?.addEventListener('click', () => this.app.togglePanMode(false));
        document.getElementById('tool-lock')?.addEventListener('click', () => this.app.canvasManager.lockSelected());
        document.getElementById('tool-unlock')?.addEventListener('click', () => this.app.canvasManager.unlockAll());
        document.getElementById('tool-align-left')?.addEventListener('click', () => this.app.canvasManager.align('left'));
        document.getElementById('tool-align-center')?.addEventListener('click', () => this.app.canvasManager.align('center'));
        document.getElementById('tool-align-right')?.addEventListener('click', () => this.app.canvasManager.align('right'));

        // AI Analysis
        document.getElementById('btn-run-ai')?.addEventListener('click', () => this.app.runAIAnalysis());

        // Export
        document.getElementById('btn-export')?.addEventListener('click', () => this.app.showExportModal());
        document.getElementById('btn-new-project')?.addEventListener('click', () => this.app.newProject());

        // Modal
        document.querySelector('.modal-close')?.addEventListener('click', () => this.app.hideExportModal());
        document.querySelector('.modal-cancel')?.addEventListener('click', () => this.app.hideExportModal());
        document.getElementById('btn-download')?.addEventListener('click', () => this.app.downloadExport());

        // Export quality slider
        const qualitySlider = document.getElementById('export-quality');
        if (qualitySlider) {
            qualitySlider.addEventListener('input', (e) => {
                const val = document.querySelector('.range-value');
                if (val) val.textContent = Math.round(e.target.value * 100) + '%';
            });
        }

        // Custom size
        document.getElementById('btn-apply-custom')?.addEventListener('click', () => this.applyCustomSize());
    }

    renderPresets(category) {
        const list = document.getElementById('preset-list');
        if (!list) return;

        const presets = AssetPresets.getCategoryPresets(category);

        if (presets.length === 0) {
            list.innerHTML = '<div class="preset-item"><span class="preset-name">Use custom dimensions</span></div>';
            return;
        }

        list.innerHTML = presets.map(preset => `
            <div class="preset-item" data-preset="${preset.id}">
                <div class="preset-icon">${preset.icon}</div>
                <div class="preset-info">
                    <div class="preset-name">${preset.name}</div>
                    <div class="preset-dims">${preset.width} × ${preset.height} ${preset.unit}</div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        list.querySelectorAll('.preset-item').forEach(item => {
            item.addEventListener('click', () => {
                list.querySelectorAll('.preset-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const presetId = item.dataset.preset;
                this.selectPreset(presetId);
            });
        });
    }

    selectPreset(presetId) {
        const preset = AssetPresets.getPreset(presetId);
        if (!preset) return;

        this.currentPreset = preset;
        const dims = AssetPresets.getCanvasDimensions(preset);

        this.app.setCanvasSize(dims.width, dims.height);
        this.updateCanvasStatus(preset);
    }

    applyCustomSize() {
        const width = parseInt(document.getElementById('custom-width')?.value || 1080);
        const height = parseInt(document.getElementById('custom-height')?.value || 1080);
        const unit = document.getElementById('custom-unit')?.value || 'px';
        const dpi = parseInt(document.getElementById('custom-dpi')?.value || 72);

        const pixelWidth = AssetPresets.toPixels(width, unit, dpi);
        const pixelHeight = AssetPresets.toPixels(height, unit, dpi);

        this.app.setCanvasSize(pixelWidth, pixelHeight);
        this.updateCanvasStatus({
            name: 'Custom',
            width,
            height,
            unit,
            dpi
        });
    }

    updateCanvasStatus(preset) {
        const dimsEl = document.getElementById('canvas-dims');
        const modeEl = document.getElementById('canvas-mode');

        if (dimsEl) {
            dimsEl.textContent = `${this.app.canvasManager.canvas.width} × ${this.app.canvasManager.canvas.height} px`;
        }

        if (modeEl) {
            const category = this.currentCategory.charAt(0).toUpperCase() + this.currentCategory.slice(1);
            modeEl.textContent = `${category} — ${preset.name || 'Custom'}`;
        }
    }

    handleImageUpload(file, zone) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.app.loadBackgroundImage(img);
                zone.classList.add('has-file');
                zone.querySelector('p').textContent = file.name;
                zone.querySelector('.upload-hint').textContent = `${img.width} × ${img.height} px`;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    handleLogoUpload(file, zone) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.app.logoImage = img;
                zone.classList.add('has-file');
                zone.querySelector('p').textContent = file.name;

                // If analysis exists, auto-place logo
                if (this.app.analysis) {
                    this.app.placeLogo();
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    updateAIProgress(percent, text) {
        const progressEl = document.getElementById('ai-progress');
        const fillEl = document.getElementById('progress-fill');
        const textEl = document.getElementById('progress-text');
        const statusEl = document.getElementById('ai-status');

        if (progressEl) progressEl.style.display = 'block';
        if (fillEl) fillEl.style.width = Math.min(100, percent) + '%';
        if (textEl) textEl.textContent = text;
        if (statusEl) {
            statusEl.className = 'ai-status analyzing';
            statusEl.textContent = percent < 20 ? 'Initializing...' : 
                                   percent < 50 ? 'Analyzing...' : 
                                   percent < 80 ? 'Composing...' : 'Finalizing...';
        }
    }

    
    /**
     * Update orchestration stage progress
     */
    updateOrchestrationStage(stageName, percent) {
        const stageMap = {
            'grid': 'stage-grid',
            'analysis': 'stage-analysis', 
            'motif': 'stage-motif',
            'treatment': 'stage-treatment',
            'typography': 'stage-typography',
            'validation': 'stage-validation'
        };

        const elementId = stageMap[stageName];
        if (elementId) {
            const el = document.getElementById(elementId);
            if (el) {
                el.style.width = percent + '%';
            }
        }
    }

    updateAIResults(analysis) {
        // Hide progress
        const progressEl = document.getElementById('ai-progress');
        if (progressEl) progressEl.style.display = 'none';

        // Update status
        const statusEl = document.getElementById('ai-status');
        if (statusEl) {
            statusEl.className = 'ai-status complete';
            statusEl.textContent = 'Analysis Complete';
        }

        // Update category
        const categoryEl = document.getElementById('ai-category');
        if (categoryEl) {
            categoryEl.textContent = analysis.scene.subcategory.replace(/-/g, ' ');
        }

        const confidenceEl = document.getElementById('ai-confidence');
        if (confidenceEl) {
            confidenceEl.textContent = (analysis.scene.confidence * 100).toFixed(0) + '%';
        }

        // Update scores
        const scores = analysis.composition.scores;
        this.updateScoreBar('score-focal', 'score-focal-val', scores.focalClarity);
        this.updateScoreBar('score-motion', 'score-motion-val', scores.motionEnergy);
        this.updateScoreBar('score-negative', 'score-negative-val', scores.negativeSpace);
        this.updateScoreBar('score-composition', 'score-composition-val', scores.compositionQuality);
        this.updateScoreBar('score-brand', 'score-brand-val', scores.brandCompatibility);

        // Update detection tags
        const tagsEl = document.getElementById('detection-tags');
        if (tagsEl) {
            const tags = analysis.objects.map(o => o.class);
            if (analysis.poses.length > 0) tags.push('person-pose');

            tagsEl.innerHTML = tags.map(tag => 
                `<span class="tag ${this.isImportantTag(tag) ? 'highlight' : ''}">${tag}</span>`
            ).join('');
        }

        // Update direction
        const directionArrow = document.getElementById('direction-arrow');
        const directionText = document.getElementById('direction-text');

        if (analysis.poses.length > 0) {
            const direction = analysis.poses[0].direction;
            const arrows = { left: '←', right: '→', center: '↑' };
            if (directionArrow) directionArrow.textContent = arrows[direction] || '↑';
            if (directionText) directionText.textContent = `Subject facing ${direction}`;
        }

        // Update composition info
        this.updateCompositionInfo(analysis);
    }

    updateScoreBar(barId, valId, score) {
        const bar = document.getElementById(barId);
        const val = document.getElementById(valId);
        if (bar) bar.style.width = (score * 10) + '%';
        if (val) val.textContent = score.toFixed(1);
    }

    isImportantTag(tag) {
        return ['person', 'building', 'water', 'sky'].includes(tag);
    }

    updateCompositionInfo(analysis) {
        const grid = this.app.gridSystem;
        if (!grid) return;

        const info = grid.getInfo();

        const gridTypeEl = document.getElementById('info-grid-type');
        const cellSizeEl = document.getElementById('info-cell-size');
        const marginEl = document.getElementById('info-margin');
        const focalEl = document.getElementById('info-focal');
        const logoPosEl = document.getElementById('info-logo-pos');
        const taglinePosEl = document.getElementById('info-tagline-pos');

        if (gridTypeEl) gridTypeEl.textContent = `${info.columns} × ${info.rows}`;
        if (cellSizeEl) cellSizeEl.textContent = `${info.cellWidth} × ${info.cellHeight} px`;
        if (marginEl) marginEl.textContent = `${info.margin} px`;

        if (focalEl && analysis.saliency) {
            focalEl.textContent = `${analysis.saliency.focalPoint.x}, ${analysis.saliency.focalPoint.y}`;
        }

        if (logoPosEl && this.app.placements?.logo) {
            const p = this.app.placements.logo;
            logoPosEl.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
        }

        if (taglinePosEl && this.app.placements?.tagline) {
            const p = this.app.placements.tagline;
            taglinePosEl.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
        }
    }

    updateValidationPanel(validation) {
        const statusEl = document.getElementById('validation-status');
        const warningsEl = document.getElementById('warnings-list');

        if (statusEl) {
            const color = validation.getStatusColor ? validation.getStatusColor(validation.status) : '#8a8a9a';
            const icon = validation.getStatusIcon ? validation.getStatusIcon(validation.status) : '?';

            statusEl.innerHTML = `
                <div class="status-badge ${validation.status}">
                    ${icon} ${validation.status.toUpperCase()}
                </div>
            `;
        }

        if (warningsEl) {
            const allMessages = [
                ...validation.errors.map(e => ({ ...e, type: 'error' })),
                ...validation.warnings.map(w => ({ ...w, type: 'warning' })),
                ...validation.info.map(i => ({ ...i, type: 'success' }))
            ];

            if (allMessages.length === 0) {
                allMessages.push({
                    type: 'info',
                    message: 'No issues detected'
                });
            }

            warningsEl.innerHTML = allMessages.map(msg => `
                <div class="warning-item ${msg.type}">
                    <span class="warning-icon">
                        ${msg.type === 'error' ? '✕' : msg.type === 'warning' ? '⚠' : '✓'}
                    </span>
                    <span>${msg.message}</span>
                </div>
            `).join('');
        }
    }

    showExportModal(exportResult) {
        const modal = document.getElementById('export-modal');
        if (!modal) return;

        const preview = document.getElementById('export-preview');
        const formatEl = document.getElementById('modal-format');
        const dimsEl = document.getElementById('modal-dims');
        const dpiEl = document.getElementById('modal-dpi');
        const sizeEl = document.getElementById('modal-size');

        if (preview && exportResult.dataUrl) {
            preview.innerHTML = `<img src="${exportResult.dataUrl}" alt="Export preview">`;
        }

        if (formatEl) formatEl.textContent = exportResult.format.toUpperCase();
        if (dimsEl) dimsEl.textContent = `${exportResult.dimensions.width} × ${exportResult.dimensions.height} px`;
        if (dpiEl) dpiEl.textContent = exportResult.dpi;
        if (sizeEl && exportResult.blob) {
            sizeEl.textContent = this.formatBytes(exportResult.blob.size);
        }

        modal.style.display = 'flex';
    }

    hideExportModal() {
        const modal = document.getElementById('export-modal');
        if (modal) modal.style.display = 'none';
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Make available globally
window.UIControls = UIControls;

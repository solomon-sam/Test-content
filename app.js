/**
 * Intelligent Brand Composition Engine
 * Main Application Controller
 */

class BrandCompositionApp {
    constructor() {
        this.canvasManager = null;
        this.gridSystem = null;
        this.aiEngine = null;
        this.compositionEngine = null;
        this.validationRules = null;
        this.exportSystem = null;
        this.uiControls = null;
        this.layersPanel = null;

        // State
        this.currentPreset = null;
        this.analysis = null;
        this.placements = null;
        this.logoImage = null;
        this.backgroundImage = null;

        // Brand settings
        this.brandSettings = {
            tagline: 'Make the Difference.',
            url: 'www.kpmg.com',
            date: new Date().toLocaleDateString(),
            cta: ''
        };

        this.init();
    }

    async init() {
        // Show loading overlay
        this.showLoading('Initializing application...', 10);

        // Initialize canvas with default size
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

        this.showLoading('Setting up composition engine...', 70);

        // Initialize composition engine
        this.compositionEngine = new CompositionEngine(this.canvasManager.canvas, this.gridSystem);

        // Initialize validation
        this.validationRules = new ValidationRules();

        // Initialize export
        this.exportSystem = new ExportSystem(this.canvasManager.canvas, this.gridSystem);

        this.showLoading('Setting up UI...', 90);

        // Initialize UI
        this.uiControls = new UIControls(this);
        this.layersPanel = new LayersPanel(this.canvasManager);
        // Demo buttons
        document.getElementById('demo-running')?.addEventListener('click', () => this.loadDemo('running'));
        document.getElementById('demo-arch')?.addEventListener('click', () => this.loadDemo('architecture'));
        document.getElementById('demo-nature')?.addEventListener('click', () => this.loadDemo('nature'));



        // Fit canvas to screen
        setTimeout(() => {
            this.canvasManager.fitToScreen();
        }, 100);

        this.showLoading('Ready!', 100);
        setTimeout(() => this.hideLoading(), 500);

        // Load saved settings
        this.loadSettings();
    }

    showLoading(text, percent) {
        const overlay = document.getElementById('loading-overlay');
        const textEl = document.getElementById('loading-text');
        const bar = document.getElementById('loading-bar');

        if (overlay) overlay.style.display = 'flex';
        if (textEl) textEl.textContent = text;
        if (bar) bar.style.width = percent + '%';
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    setCanvasSize(width, height) {
        this.canvasManager.resize(width, height);
        this.gridSystem = new GridSystem(width, height);
        this.canvasManager.setGridSystem(this.gridSystem);
        this.canvasManager.drawGrid();

        // Re-add background if exists
        if (this.backgroundImage) {
            this.canvasManager.addBackgroundImage(this.backgroundImage);
        }

        // Re-add brand elements if analysis exists
        if (this.analysis && this.placements) {
            this.placeBrandElements();
        }

        this.canvasManager.fitToScreen();
    }

    async loadBackgroundImage(imageElement) {
        this.backgroundImage = imageElement;
        await this.canvasManager.addBackgroundImage(imageElement);

        // Auto-run analysis if enabled
        // this.runAIAnalysis();
    }

    async runAIAnalysis() {
        if (!this.backgroundImage) {
            alert('Please upload an image first');
            return;
        }

        const statusEl = document.getElementById('ai-status');
        if (statusEl) {
            statusEl.className = 'ai-status analyzing';
            statusEl.textContent = 'Orchestrating...';
        }

        try {
            // Use the unified orchestration engine
            this.orchestration = new OrchestrationEngine(this.canvasManager, this.gridSystem);
            this.orchestration.setProgressCallback((percent, text) => {
                this.uiControls.updateAIProgress(percent, text);

                // Update stage indicators
                if (percent < 15) this.uiControls.updateOrchestrationStage('grid', 100);
                else if (percent < 30) {
                    this.uiControls.updateOrchestrationStage('analysis', Math.min(100, (percent - 15) * 6));
                }
                else if (percent < 50) {
                    this.uiControls.updateOrchestrationStage('analysis', 100);
                    this.uiControls.updateOrchestrationStage('motif', Math.min(100, (percent - 30) * 5));
                }
                else if (percent < 70) {
                    this.uiControls.updateOrchestrationStage('motif', 100);
                    this.uiControls.updateOrchestrationStage('treatment', Math.min(100, (percent - 50) * 5));
                }
                else if (percent < 85) {
                    this.uiControls.updateOrchestrationStage('treatment', 100);
                    this.uiControls.updateOrchestrationStage('typography', Math.min(100, (percent - 70) * 6));
                }
                else if (percent < 100) {
                    this.uiControls.updateOrchestrationStage('typography', 100);
                    this.uiControls.updateOrchestrationStage('validation', Math.min(100, (percent - 85) * 6));
                }
                else {
                    ['grid', 'analysis', 'motif', 'treatment', 'typography', 'validation'].forEach(s => {
                        this.uiControls.updateOrchestrationStage(s, 100);
                    });
                }
            });

            // Get current asset preset
            const preset = this.currentPreset || AssetPresets.getPreset('ig-square');

            // Run the full 17-stage pipeline
            this.state = await this.orchestration.runPipeline(
                preset,
                this.backgroundImage,
                this.logoImage
            );

            // Store analysis for UI updates
            this.analysis = this.state.imageAnalysis;
            this.placements = {
                logo: this.state.typography?.logo,
                tagline: this.state.typography?.tagline,
                metadata: this.state.typography?.metadata,
                motif: this.state.finalMotif
            };

            // Update UI with results
            if (this.analysis) {
                this.uiControls.updateAIResults(this.analysis);
            }

            // Update validation panel
            if (this.state.compositionBalance) {
                const validation = this.validationRules.validate(this.analysis);
                this.uiControls.updateValidationPanel(validation);
            }

            // Update composition info
            this.uiControls.updateCompositionInfo(this.analysis);

            // Update status
            if (statusEl) {
                statusEl.className = 'ai-status complete';
                statusEl.textContent = 'Composition Complete';
            }

        } catch (error) {
            console.error('Orchestration failed:', error);
            if (statusEl) {
                statusEl.className = 'ai-status error';
                statusEl.textContent = 'Orchestration Failed';
            }
        }
    }

    async autoCompose() {
        // Auto-compose is now handled by the orchestration engine
        // This method is kept for manual re-composition if needed
        if (!this.analysis || !this.logoImage) return;

        // If we have orchestration state, use it
        if (this.state && this.state.typography) {
            this.placements = {
                logo: this.state.typography.logo,
                tagline: this.state.typography.tagline,
                metadata: this.state.typography.metadata,
                motif: this.state.finalMotif
            };
            this.placeBrandElements();
        }
    }

    placeBrandElements() {
        if (!this.placements) return;

        // Place logo
        if (this.logoImage && this.placements.logo) {
            this.canvasManager.addLogo(this.logoImage, this.placements.logo);
        }

        // Place tagline
        if (this.placements.tagline) {
            const taglineText = document.getElementById('brand-tagline')?.value || this.brandSettings.tagline;
            this.canvasManager.addTagline(taglineText, this.placements.tagline);
        }

        // Place metadata
        if (this.placements.metadata) {
            const metadataText = this.buildMetadataText();
            this.canvasManager.addMetadata(metadataText, this.placements.metadata);
        }

        this.canvasManager.canvas.renderAll();
    }

    placeLogo() {
        if (!this.logoImage || !this.analysis) return;

        if (!this.placements) {
            this.placements = {};
        }

        this.placements.logo = this.compositionEngine.calculateLogoPlacement(this.logoImage);
        this.canvasManager.addLogo(this.logoImage, this.placements.logo);
        this.canvasManager.canvas.renderAll();
    }

    updateBrandElements() {
        this.brandSettings.tagline = document.getElementById('brand-tagline')?.value || this.brandSettings.tagline;
        this.brandSettings.url = document.getElementById('brand-url')?.value || this.brandSettings.url;
        this.brandSettings.date = document.getElementById('brand-date')?.value || this.brandSettings.date;
        this.brandSettings.cta = document.getElementById('brand-cta')?.value || '';

        // Re-compose if analysis exists
        if (this.analysis) {
            this.autoCompose();
        }
    }

    buildMetadataText() {
        const parts = [];
        if (this.brandSettings.url) parts.push(this.brandSettings.url);
        if (this.brandSettings.date) parts.push(this.brandSettings.date);
        if (this.brandSettings.cta) parts.push(this.brandSettings.cta);
        return parts.join('  |  ');
    }

    updateOverlays() {
        if (!this.analysis) return;

        // Heatmap
        if (this.canvasManager.showHeatmap) {
            this.canvasManager.drawHeatmap(this.analysis.saliency);
        }

        // Negative space
        if (this.canvasManager.showNegative) {
            this.canvasManager.drawNegativeSpace(this.analysis.negativeSpace);
        }

        // Zones
        if (this.canvasManager.showZones && this.placements) {
            const zones = [
                this.placements.logo,
                this.placements.tagline,
                this.placements.metadata
            ].filter(Boolean);
            this.canvasManager.drawZones(zones);
        }

        this.canvasManager.canvas.renderAll();
    }

    togglePanMode(enabled) {
        this.canvasManager.togglePanMode(enabled);

        document.getElementById('tool-pan')?.classList.toggle('active', enabled);
        document.getElementById('tool-select')?.classList.toggle('active', !enabled);
    }

    async showExportModal() {
        const format = document.getElementById('export-format')?.value || 'png';
        const dpi = parseInt(document.getElementById('export-dpi')?.value || 300);
        const quality = parseFloat(document.getElementById('export-quality')?.value || 0.95);
        const transparent = document.getElementById('export-transparent')?.checked || false;

        try {
            const result = await this.exportSystem.export({
                format,
                dpi,
                quality,
                transparent
            });

            this.currentExport = result;
            this.uiControls.showExportModal(result);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        }
    }

    hideExportModal() {
        this.uiControls.hideExportModal();
    }

    downloadExport() {
        if (this.currentExport) {
            this.exportSystem.download(this.currentExport);
            this.hideExportModal();
        }
    }

    newProject() {
        if (confirm('Start a new project? All unsaved work will be lost.')) {
            this.canvasManager.clear();
            this.analysis = null;
            this.placements = null;
            this.logoImage = null;
            this.backgroundImage = null;

            // Reset UI
            document.querySelectorAll('.preset-item').forEach(i => i.classList.remove('active'));
            document.getElementById('upload-image-zone')?.classList.remove('has-file');
            document.getElementById('upload-logo-zone')?.classList.remove('has-file');

            // Reset AI panel
            document.getElementById('ai-category').textContent = '—';
            document.getElementById('ai-confidence').textContent = '—';
            ['focal', 'motion', 'negative', 'composition', 'brand'].forEach(id => {
                document.getElementById(`score-${id}`).style.width = '0%';
                document.getElementById(`score-${id}-val`).textContent = '—';
            });

            // Reset validation
            const statusEl = document.getElementById('validation-status');
            if (statusEl) {
                statusEl.innerHTML = '<div class="status-badge pending">Pending Analysis</div>';
            }

            const warningsEl = document.getElementById('warnings-list');
            if (warningsEl) {
                warningsEl.innerHTML = `
                    <div class="warning-item info">
                        <span class="warning-icon">ℹ</span>
                        <span>Upload and analyze an image to see validation results</span>
                    </div>
                `;
            }

            // Reset composition info
            document.getElementById('info-focal').textContent = '—';
            document.getElementById('info-logo-pos').textContent = '—';
            document.getElementById('info-tagline-pos').textContent = '—';

            // Reset grid
            this.gridSystem = new GridSystem(this.canvasManager.canvas.width, this.canvasManager.canvas.height);
            this.canvasManager.setGridSystem(this.gridSystem);
            this.canvasManager.drawGrid();
        }
    }

    saveSettings() {
        const settings = {
            brand: this.brandSettings,
            preset: this.currentPreset,
            export: {
                format: document.getElementById('export-format')?.value,
                dpi: document.getElementById('export-dpi')?.value,
                quality: document.getElementById('export-quality')?.value
            }
        };

        try {
            localStorage.setItem('bce_settings', JSON.stringify(settings));
        } catch (e) {
            console.warn('Could not save settings:', e);
        }
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('bce_settings');
            if (saved) {
                const settings = JSON.parse(saved);

                if (settings.brand) {
                    this.brandSettings = { ...this.brandSettings, ...settings.brand };
                    document.getElementById('brand-tagline').value = this.brandSettings.tagline;
                    document.getElementById('brand-url').value = this.brandSettings.url;
                }

                if (settings.export) {
                    if (settings.export.format) {
                        document.getElementById('export-format').value = settings.export.format;
                    }
                    if (settings.export.dpi) {
                        document.getElementById('export-dpi').value = settings.export.dpi;
                    }
                }
            }
        } catch (e) {
            console.warn('Could not load settings:', e);
        }
    }

    /**
     * Load a demo image
     */
    async loadDemo(type) {
        const canvasWidth = this.canvasManager.canvas.width;
        const canvasHeight = this.canvasManager.canvas.height;

        let demoCanvas;
        switch(type) {
            case 'running':
                demoCanvas = DemoHelper.generateRunningPerson(canvasWidth, canvasHeight);
                break;
            case 'architecture':
                demoCanvas = DemoHelper.generateArchitecture(canvasWidth, canvasHeight);
                break;
            case 'nature':
                demoCanvas = DemoHelper.generateNatureMotion(canvasWidth, canvasHeight);
                break;
            default:
                return;
        }

        const img = DemoHelper.canvasToImage(demoCanvas);
        await new Promise(resolve => { img.onload = resolve; });

        this.backgroundImage = img;
        await this.canvasManager.addBackgroundImage(img);

        // Update upload zone UI
        const zone = document.getElementById('upload-image-zone');
        if (zone) {
            zone.classList.add('has-file');
            zone.querySelector('p').textContent = `Demo: ${type}`;
            zone.querySelector('.upload-hint').textContent = `${canvasWidth} x ${canvasHeight} px`;
        }

        // Generate and add logo if not present
        if (!this.logoImage) {
            this.logoImage = DemoHelper.generateLogo(200);
            await new Promise(resolve => { this.logoImage.onload = resolve; });

            const logoZone = document.getElementById('upload-logo-zone');
            if (logoZone) {
                logoZone.classList.add('has-file');
                logoZone.querySelector('p').textContent = 'Demo Logo';
            }
        }

        // Auto-run analysis
        setTimeout(() => this.runAIAnalysis(), 500);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BrandCompositionApp();
});

// Save settings on page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.saveSettings();
    }
});

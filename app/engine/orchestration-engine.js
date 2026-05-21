/**
 * Unified Composition Orchestration Engine
 * Centralized 17-stage pipeline with constraint propagation
 */

class OrchestrationEngine {
    constructor(canvasManager, gridSystem) {
        this.canvasManager = canvasManager;
        this.grid = gridSystem;
        this.aiEngine = null;
        this.motifEngine = null;
        this.extensionEngine = null;
        this.colorEngine = null;
        this.typographyEngine = null;
        this.validationEngine = null;

        // Pipeline state
        this.state = {
            stage: 0,
            assetType: null,
            canvasDims: null,
            grid: null,
            protectionZones: null,
            imageAnalysis: null,
            focalEmphasis: null,
            safeExpansion: null,
            imageFit: null,
            reconstruction: null,
            colorTreatment: null,
            motifCandidates: null,
            motifScores: null,
            finalMotif: null,
            typography: null,
            accessibility: null,
            compositionBalance: null,
            finalRender: null
        };

        // Constraint propagation - each stage writes constraints
        this.constraints = {
            protectedRegions: [],      // Zones no system may touch
            typographyZones: [],       // Reserved for text
            motifZones: [],            // Valid motif placements
            safeExpansionRegions: [],  // Safe for image extension
            focalRegions: [],          // Focal emphasis areas
            treatmentRegion: null      // Color treatment parameters
        };
    }

    /**
     * Main orchestration pipeline - 17 stages
     */
    async runPipeline(assetType, imageElement, logoElement) {
        console.log('[Orchestration] Starting 17-stage pipeline...');

        // Stage 1: Asset Type Selection
        this.state.stage = 1;
        this.state.assetType = assetType;
        this.updateProgress(1, 'Asset Type Selection');

        // Stage 2: Canvas Generation
        this.state.stage = 2;
        const dims = AssetPresets.getCanvasDimensions(assetType);
        this.state.canvasDims = dims;
        this.canvasManager.resize(dims.width, dims.height);
        this.updateProgress(2, 'Canvas Generation');
        await this.delay(100);

        // Stage 3: Adaptive Grid Generation
        this.state.stage = 3;
        this.grid = new GridSystem(dims.width, dims.height);
        this.canvasManager.setGridSystem(this.grid);
        this.state.grid = this.grid.getInfo();
        this.updateProgress(3, 'Adaptive Grid Generation');
        await this.delay(100);

        // Stage 4: Protection Zone Generation
        this.state.stage = 4;
        this.constraints.protectedRegions = this.generateProtectionZones();
        this.state.protectionZones = this.constraints.protectedRegions;
        this.updateProgress(4, 'Protection Zone Generation');
        await this.delay(100);

        // Stage 5: Image Analysis
        this.state.stage = 5;
        this.aiEngine = new AIAnalysisEngine();
        await this.aiEngine.initialize();
        this.aiEngine.setProgressCallback((p, t) => {
            this.updateProgress(5 + (p / 100) * 2, `Image Analysis: ${t}`);
        });
        this.state.imageAnalysis = await this.aiEngine.analyzeImage(
            imageElement, dims.width, dims.height
        );
        this.updateProgress(7, 'Image Analysis Complete');

        // Stage 6: Focal Emphasis Detection
        this.state.stage = 6;
        this.state.focalEmphasis = this.detectFocalEmphasis();
        this.constraints.focalRegions = [this.state.focalEmphasis];
        this.updateProgress(8, 'Focal Emphasis Detection');
        await this.delay(100);

        // Stage 7: Safe Expansion Analysis
        this.state.stage = 7;
        this.state.safeExpansion = this.analyzeSafeExpansion();
        this.constraints.safeExpansionRegions = this.state.safeExpansion.regions;
        this.updateProgress(9, 'Safe Expansion Analysis');
        await this.delay(100);

        // Stage 8: Image Fit Evaluation
        this.state.stage = 8;
        this.state.imageFit = this.evaluateImageFit(imageElement, dims);
        this.updateProgress(10, 'Image Fit Evaluation');
        await this.delay(100);

        // Stage 9: Image Reconstruction / Extension
        this.state.stage = 9;
        if (this.state.imageFit.requiresExtension) {
            this.extensionEngine = new ImageExtensionEngine(this.canvasManager.canvas);
            this.state.reconstruction = await this.extensionEngine.extend(
                imageElement,
                this.state.imageFit,
                this.constraints
            );
        }
        this.updateProgress(11, 'Image Reconstruction');
        await this.delay(100);

        // Stage 10: Color Treatment Selection
        this.state.stage = 10;
        this.colorEngine = new ColorTreatmentEngine();
        this.state.colorTreatment = this.colorEngine.selectTreatment(
            this.state.imageAnalysis,
            this.state.focalEmphasis
        );
        this.constraints.treatmentRegion = this.state.colorTreatment;
        this.updateProgress(12, 'Color Treatment Selection');
        await this.delay(100);

        // Stage 11: Window Motif Candidate Generation
        this.state.stage = 11;
        this.motifEngine = new WindowMotifEngine(this.grid, this.constraints);
        this.state.motifCandidates = this.motifEngine.generateCandidates(
            this.state.focalEmphasis,
            this.state.imageAnalysis
        );
        this.updateProgress(13, 'Motif Candidate Generation');
        await this.delay(100);

        // Stage 12: Window Motif Scoring
        this.state.stage = 12;
        this.state.motifScores = this.motifEngine.scoreCandidates(
            this.state.motifCandidates,
            this.state.focalEmphasis,
            this.state.imageAnalysis
        );
        this.updateProgress(14, 'Motif Scoring');
        await this.delay(100);

        // Stage 13: Final Motif Placement
        this.state.stage = 13;
        this.state.finalMotif = this.motifEngine.selectBestCandidate(this.state.motifScores);
        this.constraints.motifZones = [this.state.finalMotif];
        this.updateProgress(15, 'Final Motif Placement');
        await this.delay(100);

        // Stage 14: Typography Placement
        this.state.stage = 14;
        this.typographyEngine = new TypographyEngine(this.grid, this.constraints);
        this.state.typography = this.typographyEngine.placeTypography(
            this.state.finalMotif,
            logoElement
        );
        this.constraints.typographyZones = this.state.typography.zones;
        this.updateProgress(16, 'Typography Placement');
        await this.delay(100);

        // Stage 15: Accessibility Validation
        this.state.stage = 15;
        this.validationEngine = new AccessibilityValidator();
        this.state.accessibility = this.validationEngine.validate(
            this.state.typography,
            this.state.colorTreatment,
            this.state.finalMotif
        );
        this.updateProgress(17, 'Accessibility Validation');
        await this.delay(100);

        // Stage 16: Composition Balance Validation
        this.state.stage = 16;
        this.state.compositionBalance = this.validateCompositionBalance();

        // If validation fails, regenerate
        if (!this.state.compositionBalance.valid) {
            console.log('[Orchestration] Composition balance failed, regenerating...');
            return await this.regenerateComposition();
        }
        this.updateProgress(18, 'Composition Balance Validation');
        await this.delay(100);

        // Stage 17: Final Render Export
        this.state.stage = 17;
        await this.finalRender(imageElement, logoElement);
        this.updateProgress(19, 'Final Render Export');

        console.log('[Orchestration] Pipeline complete!');
        return this.state;
    }

    /**
     * Generate protection zones based on grid
     */
    generateProtectionZones() {
        const zones = [];
        const cellW = this.grid.cellWidth;
        const cellH = this.grid.cellHeight;

        // Left Protection: 3 grid modules minimum
        zones.push({
            name: 'left-protection',
            x: 0,
            y: 0,
            width: cellW * 3,
            height: this.grid.canvasHeight,
            type: 'logo-protection'
        });

        // Top Protection: 2 grid modules minimum
        zones.push({
            name: 'top-protection',
            x: 0,
            y: 0,
            width: this.grid.canvasWidth,
            height: cellH * 2,
            type: 'logo-protection'
        });

        // Bottom Typography Protection: 2 grid modules minimum
        zones.push({
            name: 'bottom-typography',
            x: 0,
            y: this.grid.canvasHeight - (cellH * 2),
            width: this.grid.canvasWidth,
            height: cellH * 2,
            type: 'typography-protection'
        });

        return zones;
    }

    /**
     * Detect focal emphasis from AI analysis
     */
    detectFocalEmphasis() {
        const analysis = this.state.imageAnalysis;
        if (!analysis || !analysis.saliency) {
            return {
                x: this.grid.canvasWidth / 2,
                y: this.grid.canvasHeight / 2,
                intensity: 0.5,
                radius: 100
            };
        }

        return {
            x: analysis.saliency.focalPoint.x,
            y: analysis.saliency.focalPoint.y,
            intensity: analysis.saliency.focalPoint.intensity,
            radius: analysis.saliency.salientRegions[0]?.radius || 100,
            regions: analysis.saliency.salientRegions
        };
    }

    /**
     * Analyze safe expansion regions
     */
    analyzeSafeExpansion() {
        const analysis = this.state.imageAnalysis;
        const safeRegions = [];

        if (analysis && analysis.segmentation) {
            // Very safe regions
            const verySafe = ['sky', 'clouds', 'water', 'walls', 'blur'];
            const moderate = ['mountains', 'roads', 'foliage', 'reflections'];

            Object.entries(analysis.segmentation).forEach(([key, value]) => {
                if (verySafe.includes(key)) {
                    safeRegions.push({ type: 'very-safe', ...value });
                } else if (moderate.includes(key)) {
                    safeRegions.push({ type: 'moderate', ...value });
                }
            });
        }

        // Also use negative space as safe expansion
        if (analysis && analysis.negativeSpace) {
            analysis.negativeSpace.preferredZones.forEach(zone => {
                safeRegions.push({ type: 'negative-space', ...zone });
            });
        }

        return { regions: safeRegions };
    }

    /**
     * Evaluate if image fits canvas naturally
     */
    evaluateImageFit(imageElement, dims) {
        const imgRatio = imageElement.width / imageElement.height;
        const canvasRatio = dims.width / dims.height;

        const ratioDiff = Math.abs(imgRatio - canvasRatio);
        const fit = {
            natural: ratioDiff < 0.1,
            requiresCrop: ratioDiff >= 0.1 && ratioDiff < 0.5,
            requiresExtension: ratioDiff >= 0.5,
            imgRatio,
            canvasRatio,
            ratioDiff
        };

        // Determine best strategy
        if (fit.natural) {
            fit.strategy = 'fit';
        } else if (fit.requiresCrop) {
            fit.strategy = 'smart-crop';
        } else {
            // Check if safe expansion is available
            const safeRegions = this.state.safeExpansion?.regions || [];
            if (safeRegions.length > 0) {
                fit.strategy = 'extend';
            } else {
                fit.strategy = 'reposition';
            }
        }

        return fit;
    }

    /**
     * Validate overall composition balance
     */
    validateCompositionBalance() {
        const result = { valid: true, issues: [] };

        // Check motif doesn't overlap protection zones
        const motif = this.state.finalMotif;
        if (motif) {
            for (const zone of this.constraints.protectedRegions) {
                if (this.rectsOverlap(motif, zone)) {
                    result.valid = false;
                    result.issues.push('Motif overlaps protection zone');
                }
            }
        }

        // Check typography doesn't overlap focal point
        if (this.state.typography && this.state.focalEmphasis) {
            const focal = this.state.focalEmphasis;
            for (const zone of this.state.typography.zones) {
                const dist = Math.sqrt(
                    Math.pow(zone.x - focal.x, 2) + 
                    Math.pow(zone.y - focal.y, 2)
                );
                if (dist < 80) {
                    result.valid = false;
                    result.issues.push('Typography too close to focal point');
                }
            }
        }

        // Check motif area >= 20%
        if (motif) {
            const motifArea = motif.width * motif.height;
            const canvasArea = this.grid.canvasWidth * this.grid.canvasHeight;
            if (motifArea < canvasArea * 0.20) {
                result.valid = false;
                result.issues.push('Motif area below 20% minimum');
            }
        }

        return result;
    }

    /**
     * Regenerate composition if validation fails
     */
    async regenerateComposition() {
        console.log('[Orchestration] Regenerating with adjusted parameters...');

        // Adjust constraints and try again
        if (this.state.compositionBalance.issues.includes('Motif overlaps protection zone')) {
            // Tighten protection zones
            this.constraints.protectedRegions.forEach(z => {
                if (z.type === 'logo-protection') {
                    z.width *= 1.2;
                    z.height *= 1.2;
                }
            });
        }

        // Regenerate motif candidates with new constraints
        this.state.motifCandidates = this.motifEngine.generateCandidates(
            this.state.focalEmphasis,
            this.state.imageAnalysis
        );

        this.state.motifScores = this.motifEngine.scoreCandidates(
            this.state.motifCandidates,
            this.state.focalEmphasis,
            this.state.imageAnalysis
        );

        this.state.finalMotif = this.motifEngine.selectBestCandidate(this.state.motifScores);

        // Re-place typography
        this.state.typography = this.typographyEngine.placeTypography(
            this.state.finalMotif,
            null
        );

        // Re-validate
        this.state.compositionBalance = this.validateCompositionBalance();

        return this.state.compositionBalance;
    }

    /**
     * Final render - apply all treatments and compose
     */
    async finalRender(imageElement, logoElement) {
        const canvas = this.canvasManager.canvas;

        // 1. Apply background image (possibly extended)
        if (this.state.reconstruction && this.state.reconstruction.result) {
            await this.canvasManager.addBackgroundImage(this.state.reconstruction.result);
        } else {
            await this.canvasManager.addBackgroundImage(imageElement);
        }

        // 2. Apply color treatment to background
        if (this.state.colorTreatment) {
            await this.applyColorTreatment(this.state.colorTreatment);
        }

        // 3. Apply motif reveal (untreated image shows through motif)
        if (this.state.finalMotif) {
            await this.applyMotifReveal(imageElement, this.state.finalMotif);
        }

        // 4. Add logo
        if (logoElement && this.state.typography?.logo) {
            await this.canvasManager.addLogo(logoElement, this.state.typography.logo);
        }

        // 5. Add typography
        if (this.state.typography) {
            if (this.state.typography.tagline) {
                this.canvasManager.addTagline(
                    this.state.typography.tagline.text,
                    this.state.typography.tagline
                );
            }
            if (this.state.typography.metadata) {
                this.canvasManager.addMetadata(
                    this.state.typography.metadata.text,
                    this.state.typography.metadata
                );
            }
        }

        // 6. Re-apply grid if visible
        this.canvasManager.drawGrid();

        canvas.renderAll();
    }

    /**
     * Apply color treatment to canvas
     */
    async applyColorTreatment(treatment) {
        const canvas = this.canvasManager.canvas;
        const bg = this.canvasManager.objects.background;
        if (!bg) return;

        // Create treatment overlay
        const overlay = new fabric.Rect({
            left: 0,
            top: 0,
            width: canvas.width,
            height: canvas.height,
            fill: treatment.color,
            opacity: treatment.opacity,
            selectable: false,
            evented: false,
            name: 'color-treatment'
        });

        // Set blend mode
        overlay.globalCompositeOperation = treatment.blendMode;

        canvas.add(overlay);
        canvas.sendToBack(overlay);

        // Keep background behind treatment
        if (bg) canvas.sendToBack(bg);
    }

    /**
     * Apply motif reveal - untreated image shows through motif window
     */
    async applyMotifReveal(imageElement, motif) {
        const canvas = this.canvasManager.canvas;

        // Create untreated image clone for motif
        const untreatedImg = await new Promise((resolve) => {
            fabric.Image.fromURL(imageElement.src, (img) => {
                // Scale to fit canvas
                const scaleX = canvas.width / img.width;
                const scaleY = canvas.height / img.height;
                const scale = Math.max(scaleX, scaleY);
                img.scale(scale);
                img.set({
                    left: (canvas.width - img.width * scale) / 2,
                    top: (canvas.height - img.height * scale) / 2,
                    selectable: false,
                    evented: false,
                    name: 'motif-untreated'
                });
                resolve(img);
            });
        });

        // Create motif mask (clip path)
        const clipPath = new fabric.Rect({
            left: motif.x,
            top: motif.y,
            width: motif.width,
            height: motif.height,
            absolutePositioned: true
        });

        untreatedImg.clipPath = clipPath;
        canvas.add(untreatedImg);

        // Add motif border for editorial feel
        const border = new fabric.Rect({
            left: motif.x,
            top: motif.y,
            width: motif.width,
            height: motif.height,
            fill: 'transparent',
            stroke: 'rgba(255,255,255,0.3)',
            strokeWidth: 1,
            selectable: false,
            evented: false,
            name: 'motif-border'
        });
        canvas.add(border);
    }

    /**
     * Utility: Check rectangle overlap
     */
    rectsOverlap(a, b) {
        return !(a.x + a.width < b.x || b.x + b.width < a.x ||
                 a.y + a.height < b.y || b.y + b.height < a.y);
    }

    /**
     * Update progress callback
     */
    updateProgress(stage, message) {
        const percent = Math.min(100, (stage / 19) * 100);
        if (this.onProgress) {
            this.onProgress(percent, message);
        }
    }

    setProgressCallback(callback) {
        this.onProgress = callback;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Make available globally
window.OrchestrationEngine = OrchestrationEngine;

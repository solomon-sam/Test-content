/**
 * Color Treatment Engine
 * Three-brand-color system with automatic selection based on image analysis
 */

class ColorTreatmentEngine {
    constructor() {
        // Brand color definitions
        this.treatments = {
            blueMultiply: {
                name: 'Blue Multiply',
                id: 'blue-multiply',
                blendMode: 'multiply',
                color: '#1E49E2',
                opacity: 1.0,
                formula: 'result = base * overlay',
                purpose: 'preserve shadows, deepen contrast, create cinematic density',
                conditions: {
                    brightnessThreshold: 0.40,
                    shadowDensity: 'high',
                    contrast: 'strong'
                }
            },
            cobaltLinearLight: {
                name: 'Cobalt Blue Linear Light',
                id: 'cobalt-linear-light',
                blendMode: 'linear-light',
                color: '#1E49E2',
                opacity: 1.0,
                formula: 'LinearLight(base, overlay)',
                purpose: 'amplify highlights, increase energy, preserve detail',
                conditions: {
                    brightnessMin: 0.40,
                    brightnessMax: 0.70,
                    contrast: 'moderate',
                    subjectType: 'people'
                }
            },
            pacificGradientMap: {
                name: 'Pacific Blue Gradient Map',
                id: 'pacific-gradient-map',
                blendMode: 'gradient-map',
                darkTone: '#1E49E2',
                lightTone: '#5FD7FF',
                opacity: 1.0,
                formula: 'gradient map from dark to light tone',
                purpose: 'preserve soft highlights, maintain airy atmosphere, premium environmental tone',
                conditions: {
                    brightnessThreshold: 0.70,
                    environment: 'open',
                    dominantTones: ['sky', 'water']
                }
            }
        };
    }

    /**
     * Select optimal treatment based on comprehensive image analysis
     */
    selectTreatment(imageAnalysis, focalEmphasis) {
        if (!imageAnalysis) {
            return this.treatments.blueMultiply;
        }

        const features = imageAnalysis.scene?.features || {};
        const scores = imageAnalysis.composition?.scores || {};

        // Calculate image brightness
        const brightness = this.calculateBrightness(features);

        // Calculate contrast
        const contrast = features.colorVariance || 0.5;

        // Detect dominant tones
        const dominantTones = this.detectDominantTones(features);

        // Detect shadow density
        const shadowDensity = this.detectShadowDensity(features);

        // Calculate treatment scores
        const treatmentScores = {
            blueMultiply: this.scoreBlueMultiply(brightness, contrast, shadowDensity, dominantTones),
            cobaltLinearLight: this.scoreCobaltLinearLight(brightness, contrast, dominantTones, imageAnalysis),
            pacificGradientMap: this.scorePacificGradientMap(brightness, dominantTones, imageAnalysis)
        };

        // Select highest scoring treatment
        let bestTreatment = this.treatments.blueMultiply;
        let bestScore = -1;

        for (const [key, score] of Object.entries(treatmentScores)) {
            if (score > bestScore) {
                bestScore = score;
                bestTreatment = this.treatments[key];
            }
        }

        console.log('[ColorTreatment] Selected:', bestTreatment.name, 'Score:', bestScore.toFixed(2));

        return {
            ...bestTreatment,
            selectionScore: bestScore,
            analysis: {
                brightness,
                contrast,
                dominantTones,
                shadowDensity
            }
        };
    }

    /**
     * Calculate image brightness (0-1)
     */
    calculateBrightness(features) {
        if (!features) return 0.5;

        // Use color variance and edge density as proxies
        const baseBrightness = 0.5;
        const edgeFactor = 1 - (features.edgeDensity || 0);
        const varianceFactor = features.colorVariance || 0.5;

        // Higher edge density + lower variance = darker image (cinematic)
        // Lower edge density + higher variance = brighter image (open)
        return Math.max(0, Math.min(1, baseBrightness + (varianceFactor * 0.3) - (features.edgeDensity * 0.2)));
    }

    /**
     * Detect dominant tones from features
     */
    detectDominantTones(features) {
        const tones = [];

        if (features.blueSkyRatio > 0.15) tones.push('sky');
        if (features.waterLike > 0.08) tones.push('water');
        if (features.humanSkinTones > 0.05) tones.push('people');
        if (features.verticalLines > 0.15) tones.push('architecture');
        if (features.edgeDensity > 0.1) tones.push('detailed');

        return tones;
    }

    /**
     * Detect shadow density
     */
    detectShadowDensity(features) {
        if (!features) return 'moderate';

        // High edge density with low color variance = high shadow density (cinematic)
        const cinematicScore = features.edgeDensity * (1 - features.colorVariance);

        if (cinematicScore > 0.08) return 'high';
        if (cinematicScore > 0.04) return 'moderate';
        return 'low';
    }

    /**
     * Score Blue Multiply treatment
     */
    scoreBlueMultiply(brightness, contrast, shadowDensity, dominantTones) {
        let score = 0;

        // Brightness < 40%
        if (brightness < 0.40) score += 0.4;
        else if (brightness < 0.50) score += 0.2;

        // High shadow density
        if (shadowDensity === 'high') score += 0.3;
        else if (shadowDensity === 'moderate') score += 0.15;

        // Strong contrast
        if (contrast > 0.6) score += 0.2;

        // Cinematic imagery (people with motion)
        if (dominantTones.includes('people') && dominantTones.includes('detailed')) {
            score += 0.1;
        }

        return score;
    }

    /**
     * Score Cobalt Blue Linear Light treatment
     */
    scoreCobaltLinearLight(brightness, contrast, dominantTones, imageAnalysis) {
        let score = 0;

        // Brightness between 40% and 70%
        if (brightness >= 0.40 && brightness <= 0.70) score += 0.4;
        else if (brightness >= 0.35 && brightness <= 0.75) score += 0.2;

        // Moderate contrast
        if (contrast >= 0.3 && contrast <= 0.7) score += 0.2;

        // People imagery
        if (dominantTones.includes('people')) score += 0.25;

        // Balanced exposure
        const scene = imageAnalysis.scene;
        if (scene && (scene.category === 'people-motion' || scene.category === 'architecture')) {
            score += 0.15;
        }

        return score;
    }

    /**
     * Score Pacific Blue Gradient Map treatment
     */
    scorePacificGradientMap(brightness, dominantTones, imageAnalysis) {
        let score = 0;

        // Brightness > 70%
        if (brightness > 0.70) score += 0.4;
        else if (brightness > 0.60) score += 0.2;

        // Open environments
        if (dominantTones.includes('sky') || dominantTones.includes('water')) {
            score += 0.35;
        }

        // Airy imagery
        const scene = imageAnalysis.scene;
        if (scene && scene.category === 'nature-motion') {
            score += 0.15;
        }

        // Low shadow density
        const shadowDensity = this.detectShadowDensity(imageAnalysis.scene?.features);
        if (shadowDensity === 'low') score += 0.1;

        return score;
    }

    /**
     * Apply treatment to canvas context
     */
    applyTreatment(ctx, treatment, width, height) {
        switch(treatment.id) {
            case 'blue-multiply':
                return this.applyBlueMultiply(ctx, width, height);
            case 'cobalt-linear-light':
                return this.applyCobaltLinearLight(ctx, width, height);
            case 'pacific-gradient-map':
                return this.applyPacificGradientMap(ctx, width, height);
            default:
                return this.applyBlueMultiply(ctx, width, height);
        }
    }

    /**
     * Apply Blue Multiply treatment
     * result = base * overlay
     */
    applyBlueMultiply(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Parse overlay color
        const r = parseInt('1E', 16);
        const g = parseInt('49', 16);
        const b = parseInt('E2', 16);

        // Normalize to 0-1
        const or = r / 255;
        const og = g / 255;
        const ob = b / 255;

        for (let i = 0; i < data.length; i += 4) {
            // Multiply blend: result = base * overlay
            data[i] = Math.min(255, data[i] * or);
            data[i + 1] = Math.min(255, data[i + 1] * og);
            data[i + 2] = Math.min(255, data[i + 2] * ob);
            // Alpha unchanged
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Apply Cobalt Blue Linear Light treatment
     * LinearLight(base, overlay)
     */
    applyCobaltLinearLight(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const r = parseInt('1E', 16);
        const g = parseInt('49', 16);
        const b = parseInt('E2', 16);

        const or = r / 255;
        const og = g / 255;
        const ob = b / 255;

        for (let i = 0; i < data.length; i += 4) {
            const br = data[i] / 255;
            const bg = data[i + 1] / 255;
            const bb = data[i + 2] / 255;

            // Linear Light formula
            data[i] = Math.min(255, this.linearLight(br, or) * 255);
            data[i + 1] = Math.min(255, this.linearLight(bg, og) * 255);
            data[i + 2] = Math.min(255, this.linearLight(bb, ob) * 255);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Linear Light blend mode
     */
    linearLight(base, blend) {
        if (blend < 0.5) {
            return base + 2 * blend - 1;
        } else {
            return base + 2 * (blend - 0.5);
        }
    }

    /**
     * Apply Pacific Blue Gradient Map treatment
     * Maps dark tones to #1E49E2, light tones to #5FD7FF
     */
    applyPacificGradientMap(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Dark tone: #1E49E2
        const dr = parseInt('1E', 16) / 255;
        const dg = parseInt('49', 16) / 255;
        const db = parseInt('E2', 16) / 255;

        // Light tone: #5FD7FF
        const lr = parseInt('5F', 16) / 255;
        const lg = parseInt('D7', 16) / 255;
        const lb = parseInt('FF', 16) / 255;

        for (let i = 0; i < data.length; i += 4) {
            // Calculate luminance
            const luminance = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;

            // Map luminance to gradient
            data[i] = Math.min(255, (dr + (lr - dr) * luminance) * 255);
            data[i + 1] = Math.min(255, (dg + (lg - dg) * luminance) * 255);
            data[i + 2] = Math.min(255, (db + (lb - db) * luminance) * 255);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Create treatment overlay for Fabric.js
     */
    createTreatmentOverlay(treatment, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Fill with treatment color
        if (treatment.id === 'pacific-gradient-map') {
            // Create gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, treatment.lightTone);
            gradient.addColorStop(1, treatment.darkTone);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = treatment.color;
        }

        ctx.fillRect(0, 0, width, height);

        return canvas;
    }
}

// Make available globally
window.ColorTreatmentEngine = ColorTreatmentEngine;

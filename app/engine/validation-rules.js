/**
 * Image Validation Rules Engine
 * Brand-compliant image validation with rule-based approval system
 */

class ValidationRules {
    constructor() {
        this.rules = this.initializeRules();
    }

    initializeRules() {
        return {
            // People in Motion Rules
            peopleMotion: {
                name: 'People in Motion',
                allowed: ['running', 'walking', 'cycling', 'dynamic-movement', 'sports', 'dancing'],
                rejected: ['selfies', 'static-portraits', 'group-photos', 'passport-like', 'posed'],
                minMotionScore: 0.15,
                maxStaticScore: 0.05
            },

            // Architecture Rules
            architecture: {
                name: 'Architecture',
                allowed: ['modern-structures', 'perspective-lines', 'geometry', 'urban-composition', 'interior-design'],
                rejected: ['cluttered-interiors', 'low-detail-buildings', 'messy-environments', 'construction'],
                minEdgeDensity: 0.1,
                minVerticalLines: 0.15
            },

            // Nature in Motion Rules
            natureMotion: {
                name: 'Nature in Motion',
                allowed: ['water-movement', 'waves', 'wind', 'dynamic-landscapes', 'waterfalls', 'ocean'],
                rejected: ['static-scenery', 'empty-skies', 'generic-wallpaper', 'still-water'],
                minMotionScore: 0.08,
                minWaterRatio: 0.05
            },

            // General Composition Rules
            composition: {
                minFocalClarity: 4.0,
                minCompositionQuality: 5.0,
                minBrandCompatibility: 5.0,
                maxNoiseLevel: 0.3
            },

            // Brand Visual Rules
            brandVisual: {
                minContrast: 0.3,
                maxSaturation: 1.5,
                preferredColorTemperature: 'neutral',
                avoidOversaturated: true,
                avoidLowContrast: true
            }
        };
    }

    /**
     * Validate image against all rules
     */
    validate(analysis) {
        const results = {
            status: 'pending',
            category: null,
            warnings: [],
            errors: [],
            info: [],
            details: {}
        };

        if (!analysis || !analysis.scene) {
            results.errors.push({
                type: 'error',
                message: 'No analysis data available for validation'
            });
            results.status = 'rejected';
            return results;
        }

        const scene = analysis.scene;
        const scores = analysis.composition ? analysis.composition.scores : {};

        // Step 1: Category Validation
        const categoryResult = this.validateCategory(scene);
        results.category = scene.category;
        results.details.category = categoryResult;

        if (categoryResult.rejected) {
            results.errors.push({
                type: 'error',
                message: `Image category "${scene.subcategory}" is not approved for brand use`
            });
        } else if (categoryResult.warning) {
            results.warnings.push({
                type: 'warning',
                message: `Image category "${scene.subcategory}" has limited approval`
            });
        } else {
            results.info.push({
                type: 'success',
                message: `Category "${scene.subcategory}" approved for brand use`
            });
        }

        // Step 2: Composition Score Validation
        const compositionResult = this.validateComposition(scores);
        results.details.composition = compositionResult;

        if (scores.focalClarity !== undefined && scores.focalClarity < this.rules.composition.minFocalClarity) {
            results.warnings.push({
                type: 'warning',
                message: `Low focal clarity (${scores.focalClarity}/10) — image may lack clear subject`
            });
        }

        if (scores.compositionQuality !== undefined && scores.compositionQuality < this.rules.composition.minCompositionQuality) {
            results.warnings.push({
                type: 'warning',
                message: `Composition quality below threshold (${scores.compositionQuality}/10)`
            });
        }

        // Step 3: Brand Compatibility
        if (scores.brandCompatibility !== undefined) {
            if (scores.brandCompatibility < 5) {
                results.errors.push({
                    type: 'error',
                    message: `Brand compatibility too low (${scores.brandCompatibility}/10)`
                });
            } else if (scores.brandCompatibility < 7) {
                results.warnings.push({
                    type: 'warning',
                    message: `Brand compatibility could be improved (${scores.brandCompatibility}/10)`
                });
            }
        }

        // Step 4: Focal Point Overlap Check
        if (analysis.saliency && analysis.saliency.salientRegions) {
            const focalCheck = this.checkFocalPointDistribution(analysis.saliency);
            if (!focalCheck.isGood) {
                results.warnings.push({
                    type: 'warning',
                    message: focalCheck.message
                });
            }
        }

        // Step 5: Negative Space Validation
        if (analysis.negativeSpace) {
            const negativeCheck = this.validateNegativeSpace(analysis.negativeSpace);
            if (!negativeCheck.isGood) {
                results.warnings.push({
                    type: 'warning',
                    message: negativeCheck.message
                });
            }
        }

        // Determine final status
        if (results.errors.length > 0) {
            results.status = 'rejected';
        } else if (results.warnings.length > 0) {
            results.status = 'warning';
        } else {
            results.status = 'approved';
        }

        return results;
    }

    /**
     * Validate image category
     */
    validateCategory(scene) {
        const result = { approved: false, rejected: false, warning: false };

        let ruleSet = null;

        switch(scene.category) {
            case 'people-motion':
                ruleSet = this.rules.peopleMotion;
                break;
            case 'architecture':
                ruleSet = this.rules.architecture;
                break;
            case 'nature-motion':
                ruleSet = this.rules.natureMotion;
                break;
            case 'people-static':
            case 'nature-static':
                result.rejected = true;
                return result;
            default:
                result.warning = true;
                return result;
        }

        if (ruleSet) {
            if (ruleSet.allowed.includes(scene.subcategory)) {
                result.approved = true;
            } else if (ruleSet.rejected.includes(scene.subcategory)) {
                result.rejected = true;
            } else {
                result.warning = true;
            }
        }

        return result;
    }

    /**
     * Validate composition scores
     */
    validateComposition(scores) {
        const result = { passed: true, issues: [] };

        if (scores.focalClarity < this.rules.composition.minFocalClarity) {
            result.passed = false;
            result.issues.push(`Focal clarity below minimum (${scores.focalClarity} < ${this.rules.composition.minFocalClarity})`);
        }

        if (scores.compositionQuality < this.rules.composition.minCompositionQuality) {
            result.passed = false;
            result.issues.push(`Composition quality below minimum (${scores.compositionQuality} < ${this.rules.composition.minCompositionQuality})`);
        }

        if (scores.brandCompatibility < this.rules.composition.minBrandCompatibility) {
            result.passed = false;
            result.issues.push(`Brand compatibility below minimum (${scores.brandCompatibility} < ${this.rules.composition.minBrandCompatibility})`);
        }

        return result;
    }

    /**
     * Check focal point distribution
     */
    checkFocalPointDistribution(saliency) {
        const regions = saliency.salientRegions || [];

        if (regions.length === 0) {
            return { isGood: false, message: 'No focal points detected — image may lack visual interest' };
        }

        if (regions.length > 5) {
            return { isGood: false, message: 'Too many competing focal points — composition may be cluttered' };
        }

        // Check if focal points are well-distributed
        const focalPoint = saliency.focalPoint;
        const centerX = saliency.mapWidth / 2;
        const centerY = saliency.mapHeight / 2;
        const distFromCenter = Math.sqrt(
            Math.pow(focalPoint.x - centerX, 2) + 
            Math.pow(focalPoint.y - centerY, 2)
        );

        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
        const centerRatio = distFromCenter / maxDist;

        if (centerRatio < 0.1) {
            return { isGood: false, message: 'Focal point too close to center — consider off-center composition' };
        }

        return { isGood: true, message: 'Focal point distribution is good' };
    }

    /**
     * Validate negative space
     */
    validateNegativeSpace(negativeSpace) {
        const coverage = negativeSpace.coverage || 0;

        if (coverage < 0.1) {
            return { isGood: false, message: 'Insufficient negative space — image may be too cluttered for branding' };
        }

        if (coverage > 0.8) {
            return { isGood: false, message: 'Excessive negative space — image may lack content' };
        }

        if (negativeSpace.preferredZones && negativeSpace.preferredZones.length < 2) {
            return { isGood: false, message: 'Limited safe zones for brand element placement' };
        }

        return { isGood: true, message: 'Negative space distribution is adequate' };
    }

    /**
     * Check logo placement against rules
     */
    validateLogoPlacement(logoPlacement, focalPoint, grid) {
        const issues = [];

        // Check focal overlap
        const logoCenterX = logoPlacement.x + logoPlacement.width / 2;
        const logoCenterY = logoPlacement.y + logoPlacement.height / 2;
        const distFromFocal = Math.sqrt(
            Math.pow(logoCenterX - focalPoint.x, 2) + 
            Math.pow(logoCenterY - focalPoint.y, 2)
        );

        if (distFromFocal < 100) {
            issues.push({
                type: 'warning',
                message: 'Logo overlaps focal area'
            });
        }

        // Check safe margins
        if (!grid.isInSafeZone(logoPlacement.x, logoPlacement.y, logoPlacement.width, logoPlacement.height)) {
            issues.push({
                type: 'error',
                message: 'Logo outside safe margins'
            });
        }

        // Check minimum size
        if (logoPlacement.width < 60) {
            issues.push({
                type: 'warning',
                message: 'Logo smaller than recommended minimum (60px)'
            });
        }

        return issues;
    }

    /**
     * Get validation status color
     */
    getStatusColor(status) {
        switch(status) {
            case 'approved': return '#22c55e';
            case 'warning': return '#f59e0b';
            case 'rejected': return '#ef4444';
            default: return '#8a8a9a';
        }
    }

    /**
     * Get validation status icon
     */
    getStatusIcon(status) {
        switch(status) {
            case 'approved': return '✓';
            case 'warning': return '⚠';
            case 'rejected': return '✕';
            default: return '?';
        }
    }
}

// Make available globally
window.ValidationRules = ValidationRules;

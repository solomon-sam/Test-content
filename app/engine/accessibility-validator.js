/**
 * Accessibility Validator
 * WCAG-inspired validation for composition readability and contrast
 */

class AccessibilityValidator {
    constructor() {
        this.wcagThresholds = {
            aa: {
                normal: 4.5,
                large: 3.0
            },
            aaa: {
                normal: 7.0,
                large: 4.5
            }
        };
    }

    /**
     * Validate typography, treatment, and motif for accessibility
     */
    validate(typography, treatment, motif) {
        const results = {
            passed: true,
            issues: [],
            scores: {}
        };

        // 1. Contrast validation
        const contrastScore = this.validateContrast(typography, treatment);
        results.scores.contrast = contrastScore;
        if (contrastScore < this.wcagThresholds.aa.normal) {
            results.passed = false;
            results.issues.push({
                type: 'error',
                message: `Contrast ratio ${contrastScore.toFixed(2)} below WCAG AA threshold (${this.wcagThresholds.aa.normal})`
            });
        }

        // 2. Typography size validation
        const sizeScore = this.validateTypographySize(typography);
        results.scores.typographySize = sizeScore;
        if (sizeScore < 0.7) {
            results.issues.push({
                type: 'warning',
                message: 'Typography sizes may be too small for readability'
            });
        }

        // 3. Motif visibility validation
        const motifScore = this.validateMotifVisibility(motif, treatment);
        results.scores.motifVisibility = motifScore;
        if (motifScore < 0.5) {
            results.issues.push({
                type: 'warning',
                message: 'Motif may not be sufficiently visible against treatment'
            });
        }

        // 4. Focal clarity validation
        const focalScore = this.validateFocalClarity(motif);
        results.scores.focalClarity = focalScore;
        if (focalScore < 0.6) {
            results.issues.push({
                type: 'warning',
                message: 'Focal emphasis may be insufficient'
            });
        }

        // 5. Hierarchy validation
        const hierarchyScore = this.validateHierarchy(typography);
        results.scores.hierarchy = hierarchyScore;
        if (hierarchyScore < 0.7) {
            results.issues.push({
                type: 'info',
                message: 'Typography hierarchy could be improved'
            });
        }

        // Overall score
        results.overallScore = (
            results.scores.contrast / 10 * 0.3 +
            results.scores.typographySize * 0.2 +
            results.scores.motifVisibility * 0.2 +
            results.scores.focalClarity * 0.15 +
            results.scores.hierarchy * 0.15
        );

        return results;
    }

    /**
     * Calculate contrast ratio between text and background
     */
    validateContrast(typography, treatment) {
        if (!treatment) return 7.0; // Default high contrast

        // Get background luminance from treatment
        const bgLuminance = this.getTreatmentLuminance(treatment);

        // Text is typically white on dark treatments
        const textLuminance = 1.0; // White text

        // Calculate contrast ratio
        const ratio = (textLuminance + 0.05) / (bgLuminance + 0.05);

        return ratio;
    }

    /**
     * Get luminance of treatment color
     */
    getTreatmentLuminance(treatment) {
        let r, g, b;

        if (treatment.id === 'pacific-gradient-map') {
            // Use average of dark and light tones
            const darkLum = this.hexToLuminance(treatment.darkTone);
            const lightLum = this.hexToLuminance(treatment.lightTone);
            return (darkLum + lightLum) / 2;
        } else {
            return this.hexToLuminance(treatment.color);
        }
    }

    /**
     * Convert hex to luminance
     */
    hexToLuminance(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        // WCAG luminance formula
        const lr = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
        const lg = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
        const lb = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

        return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    }

    /**
     * Validate typography sizes
     */
    validateTypographySize(typography) {
        if (!typography) return 0.5;

        let score = 0;
        let checks = 0;

        if (typography.tagline) {
            const taglineSize = typography.tagline.fontSize;
            // Ideal: 18-32px
            if (taglineSize >= 18 && taglineSize <= 32) score += 1;
            else if (taglineSize >= 14) score += 0.7;
            else if (taglineSize >= 12) score += 0.4;
            else score += 0.2;
            checks++;
        }

        if (typography.metadata) {
            const metaSize = typography.metadata.fontSize;
            // Ideal: 10-14px
            if (metaSize >= 10 && metaSize <= 14) score += 1;
            else if (metaSize >= 9) score += 0.7;
            else score += 0.3;
            checks++;
        }

        return checks > 0 ? score / checks : 0.5;
    }

    /**
     * Validate motif visibility against treatment
     */
    validateMotifVisibility(motif, treatment) {
        if (!motif || !treatment) return 0.5;

        // Check motif area
        const canvasArea = motif.width * motif.height / 0.2; // Approximate
        const motifRatio = motif.width * motif.height / canvasArea;

        // Larger motifs are more visible
        if (motifRatio >= 0.30) return 1.0;
        if (motifRatio >= 0.25) return 0.9;
        if (motifRatio >= 0.20) return 0.8;
        if (motifRatio >= 0.15) return 0.6;
        return 0.4;
    }

    /**
     * Validate focal clarity
     */
    validateFocalClarity(motif) {
        if (!motif) return 0.5;

        // Check if motif is well-positioned (not at extreme edges)
        const canvasCenterX = motif.x / 0.5; // Approximate
        const canvasCenterY = motif.y / 0.5;

        const motifCenterX = motif.x + motif.width / 2;
        const motifCenterY = motif.y + motif.height / 2;

        // Distance from center (ideal: slightly off-center for visual interest)
        const distFromCenter = Math.sqrt(
            Math.pow(motifCenterX - canvasCenterX, 2) +
            Math.pow(motifCenterY - canvasCenterY, 2)
        );

        // Normalize
        const maxDist = Math.sqrt(canvasCenterX * canvasCenterX + canvasCenterY * canvasCenterY);
        const normalizedDist = distFromCenter / maxDist;

        // Ideal: 0.1-0.4 from center (slightly off-center)
        if (normalizedDist >= 0.1 && normalizedDist <= 0.4) return 1.0;
        if (normalizedDist <= 0.5) return 0.8;
        if (normalizedDist <= 0.6) return 0.6;
        return 0.4;
    }

    /**
     * Validate typography hierarchy
     */
    validateHierarchy(typography) {
        if (!typography) return 0.5;

        let score = 0;
        let checks = 0;

        // Check size hierarchy: tagline > metadata
        if (typography.tagline && typography.metadata) {
            const taglineSize = typography.tagline.fontSize;
            const metaSize = typography.metadata.fontSize;

            if (taglineSize > metaSize * 1.5) score += 1;
            else if (taglineSize > metaSize * 1.2) score += 0.8;
            else if (taglineSize > metaSize) score += 0.5;
            else score += 0.2;
            checks++;
        }

        // Check position hierarchy: logo top-left, tagline bottom, metadata bottom-right
        if (typography.logo && typography.tagline && typography.metadata) {
            const logoY = typography.logo.y;
            const taglineY = typography.tagline.y;
            const metaY = typography.metadata.y;

            // Logo should be above tagline
            if (logoY < taglineY) score += 0.5;

            // Tagline and metadata should be at similar heights
            if (Math.abs(taglineY - metaY) < 50) score += 0.5;

            checks++;
        }

        return checks > 0 ? score / checks : 0.5;
    }
}

// Make available globally
window.AccessibilityValidator = AccessibilityValidator;

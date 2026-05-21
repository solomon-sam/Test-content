/**
 * Smart Composition Engine
 * Rule-based brand composition with AI-assisted placement
 */

class CompositionEngine {
    constructor(canvas, gridSystem) {
        this.canvas = canvas;
        this.grid = gridSystem;
        this.analysis = null;
        this.brandElements = {
            logo: null,
            tagline: null,
            metadata: null
        };
        this.placementRules = new PlacementRules(gridSystem);
    }

    /**
     * Set AI analysis results
     */
    setAnalysis(analysis) {
        this.analysis = analysis;
    }

    /**
     * Auto-compose brand elements based on AI analysis
     */
    async autoCompose(logoImage, brandText) {
        if (!this.analysis) {
            throw new Error('AI analysis required before composition');
        }

        const placements = {
            logo: null,
            tagline: null,
            metadata: null
        };

        // Determine logo placement
        placements.logo = this.calculateLogoPlacement(logoImage);

        // Determine tagline placement
        placements.tagline = this.calculateTaglinePlacement(placements.logo);

        // Determine metadata placement
        placements.metadata = this.calculateMetadataPlacement(placements.logo, placements.tagline);

        return placements;
    }

    /**
     * Calculate optimal logo placement
     */
    calculateLogoPlacement(logoImage) {
        const zones = this.grid.getLogoZones();
        const focalPoint = this.analysis.saliency.focalPoint;
        const negativeSpace = this.analysis.negativeSpace;
        const direction = this.analysis.poses.length > 0 ? this.analysis.poses[0].direction : 'center';

        let bestZone = null;
        let bestScore = -Infinity;

        for (const zone of zones) {
            let score = 0;

            // Distance from focal point (higher is better)
            const dx = (zone.x + zone.width / 2) - focalPoint.x;
            const dy = (zone.y + zone.height / 2) - focalPoint.y;
            const distFromFocal = Math.sqrt(dx * dx + dy * dy);
            score += distFromFocal * 0.3;

            // Overlap with negative space (higher is better)
            const negativeOverlap = this.calculateZoneNegativeOverlap(zone, negativeSpace.regions);
            score += negativeOverlap * 200;

            // Direction awareness
            if (direction === 'right' && zone.name.includes('left')) {
                score += 50; // Place logo on left if subject moving right
            } else if (direction === 'left' && zone.name.includes('right')) {
                score += 50;
            }

            // Prefer bottom corners for logos
            if (zone.name.includes('bottom')) {
                score += 30;
            }

            // Avoid center
            const centerDist = Math.abs((zone.x + zone.width / 2) - this.grid.canvasWidth / 2);
            score += centerDist * 0.1;

            if (score > bestScore) {
                bestScore = score;
                bestZone = zone;
            }
        }

        // Calculate logo size (max 20% of canvas width, min 80px)
        const maxLogoWidth = Math.min(this.grid.canvasWidth * 0.2, 200);
        const minLogoWidth = 80;

        // Scale based on negative space availability
        const availableSpace = bestZone ? 
            Math.min(bestZone.width, bestZone.height) : maxLogoWidth;
        const logoWidth = Math.max(minLogoWidth, Math.min(maxLogoWidth, availableSpace * 0.8));

        return {
            zone: bestZone ? bestZone.name : 'bottom-right',
            x: bestZone ? bestZone.x + (bestZone.width - logoWidth) / 2 : this.grid.canvasWidth - logoWidth - this.grid.margin,
            y: bestZone ? bestZone.y + 10 : this.grid.canvasHeight - logoWidth - this.grid.margin,
            width: logoWidth,
            height: logoWidth, // Assuming square logo
            scale: logoWidth / (logoImage ? logoImage.width : 200),
            score: bestScore
        };
    }

    /**
     * Calculate tagline placement
     */
    calculateTaglinePlacement(logoPlacement) {
        const textZones = this.grid.getTextZones();
        const focalPoint = this.analysis.saliency.focalPoint;

        let bestZone = null;
        let bestScore = -Infinity;

        for (const zone of textZones) {
            let score = 0;

            // Distance from focal point
            const dx = (zone.x + zone.width / 2) - focalPoint.x;
            const dy = (zone.y + zone.height / 2) - focalPoint.y;
            const distFromFocal = Math.sqrt(dx * dx + dy * dy);
            score += distFromFocal * 0.2;

            // Proximity to logo (moderate distance is good)
            const logoDx = (zone.x + zone.width / 2) - (logoPlacement.x + logoPlacement.width / 2);
            const logoDy = (zone.y + zone.height / 2) - (logoPlacement.y + logoPlacement.height / 2);
            const distFromLogo = Math.sqrt(logoDx * logoDx + logoDy * logoDy);

            // Prefer tagline near logo but not overlapping
            if (distFromLogo > 20 && distFromLogo < 150) {
                score += 100;
            }

            // Prefer bottom for tagline
            if (zone.name === 'bottom') {
                score += 80;
            }

            // Check alignment with logo
            if (Math.abs(zone.y - logoPlacement.y) < 50 || 
                Math.abs((zone.y + zone.height) - logoPlacement.y) < 50) {
                score += 40;
            }

            if (score > bestScore) {
                bestScore = score;
                bestZone = zone;
            }
        }

        return {
            zone: bestZone ? bestZone.name : 'bottom',
            x: bestZone ? bestZone.x + 20 : this.grid.margin + 20,
            y: bestZone ? bestZone.y + 10 : this.grid.canvasHeight - 60,
            width: bestZone ? bestZone.width - 40 : this.grid.usableWidth - 40,
            height: 40,
            fontSize: Math.max(14, Math.min(24, this.grid.canvasWidth / 50)),
            score: bestScore
        };
    }

    /**
     * Calculate metadata placement
     */
    calculateMetadataPlacement(logoPlacement, taglinePlacement) {
        // Metadata usually goes bottom-right, aligned to grid
        const zones = this.grid.getTextZones();
        const bottomZone = zones.find(z => z.name === 'bottom') || zones[0];

        // Position at bottom-right corner of safe zone
        const metaWidth = 200;
        const metaHeight = 30;

        return {
            zone: 'bottom-right',
            x: this.grid.canvasWidth - this.grid.margin - metaWidth - 10,
            y: this.grid.canvasHeight - this.grid.margin - metaHeight - 5,
            width: metaWidth,
            height: metaHeight,
            fontSize: Math.max(10, Math.min(14, this.grid.canvasWidth / 80)),
            align: 'right'
        };
    }

    /**
     * Calculate overlap between zone and negative space regions
     */
    calculateZoneNegativeOverlap(zone, negativeRegions) {
        let overlap = 0;

        for (const region of negativeRegions) {
            const intersectX = Math.max(0, Math.min(zone.x + zone.width, region.x + region.width) - Math.max(zone.x, region.x));
            const intersectY = Math.max(0, Math.min(zone.y + zone.height, region.y + region.height) - Math.max(zone.y, region.y));
            overlap += intersectX * intersectY;
        }

        return overlap / (zone.width * zone.height);
    }

    /**
     * Generate composition warnings
     */
    generateWarnings(logoPlacement, taglinePlacement) {
        const warnings = [];
        const focalPoint = this.analysis.saliency.focalPoint;

        // Check logo overlap with focal area
        const logoCenterX = logoPlacement.x + logoPlacement.width / 2;
        const logoCenterY = logoPlacement.y + logoPlacement.height / 2;
        const focalDist = Math.sqrt(
            Math.pow(logoCenterX - focalPoint.x, 2) + 
            Math.pow(logoCenterY - focalPoint.y, 2)
        );

        if (focalDist < 100) {
            warnings.push({
                type: 'warning',
                message: 'Logo overlaps focal area — consider repositioning'
            });
        }

        // Check safe margins
        if (!this.grid.isInSafeZone(logoPlacement.x, logoPlacement.y, logoPlacement.width, logoPlacement.height)) {
            warnings.push({
                type: 'error',
                message: 'Logo outside safe margins'
            });
        }

        // Check tagline overlap
        if (taglinePlacement) {
            const tagCenterX = taglinePlacement.x + taglinePlacement.width / 2;
            const tagCenterY = taglinePlacement.y + taglinePlacement.height / 2;
            const tagFocalDist = Math.sqrt(
                Math.pow(tagCenterX - focalPoint.x, 2) + 
                Math.pow(tagCenterY - focalPoint.y, 2)
            );

            if (tagFocalDist < 80) {
                warnings.push({
                    type: 'warning',
                    message: 'Tagline overlaps focal area'
                });
            }
        }

        // Check brand compatibility
        if (this.analysis.composition.status === 'rejected') {
            warnings.push({
                type: 'error',
                message: `Image rejected: ${this.analysis.scene.category} does not meet brand guidelines`
            });
        } else if (this.analysis.composition.status === 'warning') {
            warnings.push({
                type: 'warning',
                message: 'Image has brand compatibility warnings'
            });
        }

        return warnings;
    }
}

/**
 * Placement Rules Engine
 */
class PlacementRules {
    constructor(gridSystem) {
        this.grid = gridSystem;
        this.rules = this.initializeRules();
    }

    initializeRules() {
        return {
            logo: {
                minSize: 60,
                maxSize: 0.25, // 25% of canvas width
                margin: this.grid.margin,
                avoidFocalRadius: 100,
                preferredCorners: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
                clearSpace: 10 // minimum space around logo
            },
            tagline: {
                minFontSize: 12,
                maxFontSize: 32,
                margin: this.grid.margin,
                avoidFocalRadius: 80,
                preferredAlignment: ['bottom', 'left', 'right'],
                maxWidth: 0.8 // 80% of canvas width
            },
            metadata: {
                minFontSize: 9,
                maxFontSize: 14,
                margin: this.grid.margin,
                preferredAlignment: 'bottom-right',
                maxWidth: 0.4
            }
        };
    }

    validatePlacement(element, placement) {
        const rule = this.rules[element];
        const errors = [];

        if (!rule) return errors;

        // Size validation
        if (placement.width < rule.minSize) {
            errors.push(`${element} too small (min ${rule.minSize}px)`);
        }

        // Margin validation
        if (placement.x < rule.margin || placement.y < rule.margin) {
            errors.push(`${element} violates safe margins`);
        }

        return errors;
    }
}

// Make available globally
window.CompositionEngine = CompositionEngine;
window.PlacementRules = PlacementRules;

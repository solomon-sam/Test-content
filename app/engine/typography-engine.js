/**
 * Typography Engine
 * Grid-aligned typography placement with hierarchy and breathing room
 */

class TypographyEngine {
    constructor(gridSystem, constraints) {
        this.grid = gridSystem;
        this.constraints = constraints;

        // Typography zones
        this.zones = [];

        // Minimum padding: 1 grid module from motif edges
        this.minPadding = Math.min(this.grid.cellWidth, this.grid.cellHeight);
    }

    /**
     * Place all typography elements
     */
    placeTypography(motif, logoImage) {
        const result = {
            logo: null,
            tagline: null,
            metadata: null,
            zones: []
        };

        // Place logo in left protection zone
        if (logoImage) {
            result.logo = this.placeLogo(logoImage);
            if (result.logo) {
                result.zones.push({
                    name: 'logo',
                    ...result.logo
                });
            }
        }

        // Place tagline in bottom typography zone
        result.tagline = this.placeTagline(motif);
        if (result.tagline) {
            result.zones.push({
                name: 'tagline',
                ...result.tagline
            });
        }

        // Place metadata in bottom-right
        result.metadata = this.placeMetadata(motif);
        if (result.metadata) {
            result.zones.push({
                name: 'metadata',
                ...result.metadata
            });
        }

        return result;
    }

    /**
     * Place logo in left protection zone
     */
    placeLogo(logoImage) {
        const cellW = this.grid.cellWidth;
        const cellH = this.grid.cellHeight;

        // Left protection zone: 3 grid modules
        const logoX = this.grid.margin + cellW * 0.5;
        const logoY = this.grid.margin + cellH * 0.5;

        // Logo size: max 2 grid modules
        const maxLogoSize = Math.min(cellW * 2, cellH * 2, 120);
        const logoSize = Math.max(60, Math.min(maxLogoSize, logoImage.width * 0.3));

        return {
            x: logoX,
            y: logoY,
            width: logoSize,
            height: logoSize,
            scale: logoSize / logoImage.width
        };
    }

    /**
     * Place tagline with grid baseline alignment
     */
    placeTagline(motif) {
        const cellW = this.grid.cellWidth;
        const cellH = this.grid.cellHeight;

        // Bottom typography zone: 2 grid modules from bottom
        const zoneY = this.grid.canvasHeight - (cellH * 2);
        const zoneHeight = cellH * 1.5;

        // Calculate safe position (avoiding motif and maintaining padding)
        let taglineX, taglineY;

        if (motif) {
            // Check if motif overlaps bottom zone
            const motifBottom = motif.y + motif.height;
            const motifRight = motif.x + motif.width;

            if (motifBottom > zoneY - this.minPadding) {
                // Motif extends into bottom zone, place text to the side
                if (motif.x > this.grid.canvasWidth * 0.5) {
                    // Motif is on right, place text on left
                    taglineX = this.grid.margin + cellW;
                } else {
                    // Motif is on left, place text on right
                    taglineX = motifRight + this.minPadding;
                }
                taglineY = zoneY + cellH * 0.3;
            } else {
                // Motif doesn't reach bottom, center text
                taglineX = this.grid.margin + cellW;
                taglineY = zoneY + cellH * 0.3;
            }
        } else {
            // No motif, center in bottom zone
            taglineX = this.grid.margin + cellW;
            taglineY = zoneY + cellH * 0.3;
        }

        // Ensure text stays within safe margins
        taglineX = Math.max(this.grid.margin + cellW, taglineX);
        taglineY = Math.min(
            this.grid.canvasHeight - this.grid.margin - cellH * 0.2,
            taglineY
        );

        // Font size based on canvas size
        const fontSize = Math.max(16, Math.min(32, this.grid.canvasWidth / 40));

        return {
            x: taglineX,
            y: taglineY,
            width: this.grid.canvasWidth - taglineX - this.grid.margin - cellW,
            height: fontSize * 1.5,
            fontSize: fontSize,
            text: 'Make the Difference.',
            align: 'left'
        };
    }

    /**
     * Place metadata (URL, date, CTA)
     */
    placeMetadata(motif) {
        const cellW = this.grid.cellWidth;
        const cellH = this.grid.cellHeight;

        // Bottom-right corner, aligned to grid
        const metaX = this.grid.canvasWidth - this.grid.margin - cellW * 4;
        const metaY = this.grid.canvasHeight - this.grid.margin - cellH * 0.8;

        const fontSize = Math.max(10, Math.min(14, this.grid.canvasWidth / 60));

        return {
            x: metaX,
            y: metaY,
            width: cellW * 3.5,
            height: fontSize * 1.5,
            fontSize: fontSize,
            text: 'www.kpmg.com  |  2026',
            align: 'right'
        };
    }

    /**
     * Check if position overlaps with motif
     */
    overlapsMotif(x, y, width, height, motif) {
        if (!motif) return false;

        // Add padding
        const padded = {
            x: motif.x - this.minPadding,
            y: motif.y - this.minPadding,
            width: motif.width + this.minPadding * 2,
            height: motif.height + this.minPadding * 2
        };

        return !(x + width < padded.x || 
                 x > padded.x + padded.width ||
                 y + height < padded.y || 
                 y > padded.y + padded.height);
    }

    /**
     * Validate typography readability
     */
    validateReadability(typography, treatment) {
        const issues = [];

        // Check contrast against treatment
        if (treatment && treatment.id === 'blue-multiply') {
            // Dark treatment, ensure light text
            issues.push({ type: 'info', message: 'Using light text on dark treatment' });
        }

        // Check minimum font sizes
        if (typography.tagline && typography.tagline.fontSize < 12) {
            issues.push({ type: 'warning', message: 'Tagline font size may be too small' });
        }

        if (typography.metadata && typography.metadata.fontSize < 9) {
            issues.push({ type: 'warning', message: 'Metadata font size may be too small' });
        }

        // Check padding
        if (typography.tagline && typography.tagline.x < this.grid.margin + this.grid.cellWidth) {
            issues.push({ type: 'warning', message: 'Tagline too close to edge' });
        }

        return issues;
    }
}

// Make available globally
window.TypographyEngine = TypographyEngine;

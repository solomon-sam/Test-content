/**
 * Window Motif Engine
 * Constrained adaptive reveal system with editorial composition logic
 */

class WindowMotifEngine {
    constructor(gridSystem, constraints) {
        this.grid = gridSystem;
        this.constraints = constraints;

        // Fixed brand geometry ratios
        this.ratios = {
            portrait: 7 / 10,   // width:height = 7:10
            landscape: 10 / 7   // width:height = 10:7
        };

        // Minimum area: 20% of composition
        this.minAreaRatio = 0.20;

        // Scoring weights
        this.weights = {
            focalEmphasis: 0.30,
            visualBalance: 0.20,
            typographyCompatibility: 0.15,
            gridHarmony: 0.15,
            negativeSpacePreservation: 0.10,
            narrativeEmphasis: 0.05,
            brandHierarchy: 0.05
        };
    }

    /**
     * Generate multiple valid motif candidates
     */
    generateCandidates(focalEmphasis, imageAnalysis) {
        const candidates = [];
        const canvasArea = this.grid.canvasWidth * this.grid.canvasHeight;
        const minArea = canvasArea * this.minAreaRatio;

        // Determine motif orientation based on canvas aspect ratio
        const canvasRatio = this.grid.canvasWidth / this.grid.canvasHeight;
        const isPortrait = canvasRatio < 0.9;
        const isLandscape = canvasRatio > 1.3;

        // Generate candidates across the grid
        const maxCols = this.grid.columns - 3; // Leave room for protection
        const maxRows = this.grid.rows - 4;    // Leave room for top/bottom protection

        for (let col = 2; col < maxCols; col += 2) {
            for (let row = 2; row < maxRows; row += 2) {
                // Try different sizes (whole and half grid modules)
                for (let wModules of [3, 4, 5, 6, 6.5]) {
                    for (let hModules of [3, 4, 5, 6, 6.5]) {
                        const candidate = this.buildCandidate(
                            col, row, wModules, hModules,
                            isPortrait, isLandscape,
                            minArea, focalEmphasis
                        );

                        if (candidate && this.isValidCandidate(candidate)) {
                            candidates.push(candidate);
                        }
                    }
                }
            }
        }

        // Also generate focal-aware candidates
        const focalCandidates = this.generateFocalAwareCandidates(
            focalEmphasis, isPortrait, isLandscape, minArea
        );
        candidates.push(...focalCandidates);

        return candidates;
    }

    /**
     * Build a single candidate motif
     */
    buildCandidate(col, row, wModules, hModules, isPortrait, isLandscape, minArea, focalEmphasis) {
        const cellW = this.grid.cellWidth + this.grid.gutter;
        const cellH = this.grid.cellHeight + this.grid.gutter;

        let width = wModules * cellW;
        let height = hModules * cellH;

        // Enforce exact brand ratio
        if (isPortrait) {
            // Portrait motif: width:height = 7:10
            height = width * (10 / 7);
        } else if (isLandscape) {
            // Landscape motif: width:height = 10:7
            width = height * (10 / 7);
        } else {
            // Square-ish canvas: choose based on focal emphasis
            const focalRatio = focalEmphasis ? 
                (focalEmphasis.radius * 2) / Math.max(focalEmphasis.radius * 2, 100) : 1;

            if (focalRatio > 1.2) {
                width = height * (10 / 7); // Landscape motif
            } else {
                height = width * (10 / 7); // Portrait motif
            }
        }

        const x = this.grid.margin + col * cellW;
        const y = this.grid.margin + row * cellH;

        const area = width * height;
        if (area < minArea) return null;

        return {
            x, y, width, height,
            col, row,
            wModules, hModules,
            area,
            areaRatio: area / (this.grid.canvasWidth * this.grid.canvasHeight),
            orientation: isPortrait ? 'portrait' : (isLandscape ? 'landscape' : 'adaptive'),
            ratio: width / height
        };
    }

    /**
     * Generate candidates centered on focal point
     */
    generateFocalAwareCandidates(focalEmphasis, isPortrait, isLandscape, minArea) {
        const candidates = [];
        if (!focalEmphasis) return candidates;

        // Snap focal point to grid
        const gridPos = this.grid.pixelToGrid(focalEmphasis.x, focalEmphasis.y);

        // Generate around focal point
        for (let offset of [-1, 0, 1]) {
            const col = Math.max(2, Math.min(this.grid.columns - 4, gridPos.col + offset));
            const row = Math.max(2, Math.min(this.grid.rows - 4, gridPos.row + offset));

            for (let size of [4, 5, 6]) {
                const candidate = this.buildCandidate(
                    col, row, size, size,
                    isPortrait, isLandscape,
                    minArea, focalEmphasis
                );

                if (candidate && this.isValidCandidate(candidate)) {
                    // Boost focal proximity
                    candidate.focalProximity = this.calculateFocalProximity(candidate, focalEmphasis);
                    candidates.push(candidate);
                }
            }
        }

        return candidates;
    }

    /**
     * Validate candidate against all constraints
     */
    isValidCandidate(candidate) {
        // Must not overlap protection zones
        for (const zone of this.constraints.protectedRegions || []) {
            if (this.rectsOverlap(candidate, zone)) {
                return false;
            }
        }

        // Must stay within safe margins
        if (!this.grid.isInSafeZone(candidate.x, candidate.y, candidate.width, candidate.height)) {
            return false;
        }

        // Must align to grid rhythm
        const cellW = this.grid.cellWidth + this.grid.gutter;
        const cellH = this.grid.cellHeight + this.grid.gutter;
        const colAlign = Math.abs((candidate.x - this.grid.margin) % cellW) < 2;
        const rowAlign = Math.abs((candidate.y - this.grid.margin) % cellH) < 2;

        if (!colAlign || !rowAlign) {
            return false;
        }

        // Must preserve exact ratio
        const expectedRatio = candidate.orientation === 'portrait' ? 
            (7 / 10) : (10 / 7);
        const ratioDiff = Math.abs(candidate.ratio - expectedRatio);

        if (ratioDiff > 0.05) {
            return false;
        }

        // Must exceed minimum area
        const canvasArea = this.grid.canvasWidth * this.grid.canvasHeight;
        if (candidate.area < canvasArea * 0.20) {
            return false;
        }

        return true;
    }

    /**
     * Score all candidates
     */
    scoreCandidates(candidates, focalEmphasis, imageAnalysis) {
        const scored = candidates.map(candidate => {
            const scores = {
                focalEmphasis: this.scoreFocalEmphasis(candidate, focalEmphasis),
                visualBalance: this.scoreVisualBalance(candidate),
                typographyCompatibility: this.scoreTypographyCompatibility(candidate),
                gridHarmony: this.scoreGridHarmony(candidate),
                negativeSpacePreservation: this.scoreNegativeSpace(candidate, imageAnalysis),
                narrativeEmphasis: this.scoreNarrativeEmphasis(candidate, imageAnalysis),
                brandHierarchy: this.scoreBrandHierarchy(candidate)
            };

            // Weighted total
            const total = 
                scores.focalEmphasis * this.weights.focalEmphasis +
                scores.visualBalance * this.weights.visualBalance +
                scores.typographyCompatibility * this.weights.typographyCompatibility +
                scores.gridHarmony * this.weights.gridHarmony +
                scores.negativeSpacePreservation * this.weights.negativeSpacePreservation +
                scores.narrativeEmphasis * this.weights.narrativeEmphasis +
                scores.brandHierarchy * this.weights.brandHierarchy;

            return {
                candidate,
                scores,
                totalScore: total
            };
        });

        // Sort by total score descending
        scored.sort((a, b) => b.totalScore - a.totalScore);

        return scored;
    }

    /**
     * Select best candidate
     */
    selectBestCandidate(scoredCandidates) {
        if (scoredCandidates.length === 0) {
            // Fallback: create centered motif
            const canvasW = this.grid.canvasWidth;
            const canvasH = this.grid.canvasHeight;
            const isPortrait = canvasW / canvasH < 0.9;

            let width = canvasW * 0.5;
            let height = isPortrait ? width * (10 / 7) : width * (7 / 10);

            return {
                x: (canvasW - width) / 2,
                y: (canvasH - height) / 2,
                width, height,
                orientation: isPortrait ? 'portrait' : 'landscape',
                fallback: true
            };
        }

        return scoredCandidates[0].candidate;
    }

    // Scoring methods

    scoreFocalEmphasis(candidate, focalEmphasis) {
        if (!focalEmphasis) return 0.5;

        const cx = candidate.x + candidate.width / 2;
        const cy = candidate.y + candidate.height / 2;
        const dist = Math.sqrt(
            Math.pow(cx - focalEmphasis.x, 2) + 
            Math.pow(cy - focalEmphasis.y, 2)
        );

        // Focal should be INSIDE motif or very near
        const maxDist = Math.max(candidate.width, candidate.height) * 0.6;
        const score = Math.max(0, 1 - (dist / maxDist));

        // Bonus if focal is well inside
        if (dist < candidate.width * 0.3) {
            return Math.min(1, score + 0.2);
        }

        return score;
    }

    scoreVisualBalance(candidate) {
        const canvasW = this.grid.canvasWidth;
        const canvasH = this.grid.canvasHeight;

        // Optical balance: prefer slightly off-center (rule of thirds)
        const idealX = canvasW * (0.33 + 0.33 * Math.random()); // Between 1/3 and 2/3
        const idealY = canvasH * 0.4; // Slightly above center

        const cx = candidate.x + candidate.width / 2;
        const cy = candidate.y + candidate.height / 2;

        const distX = Math.abs(cx - idealX) / canvasW;
        const distY = Math.abs(cy - idealY) / canvasH;

        return Math.max(0, 1 - (distX + distY));
    }

    scoreTypographyCompatibility(candidate) {
        // Check distance from typography zones
        const bottomZone = this.grid.canvasHeight - (this.grid.cellHeight * 2);
        const distFromBottom = bottomZone - (candidate.y + candidate.height);

        if (distFromBottom < 0) return 0; // Overlaps typography
        if (distFromBottom < this.grid.cellHeight) return 0.3; // Too close

        return Math.min(1, distFromBottom / (this.grid.cellHeight * 3));
    }

    scoreGridHarmony(candidate) {
        // Perfect grid alignment = 1.0
        const cellW = this.grid.cellWidth + this.grid.gutter;
        const cellH = this.grid.cellHeight + this.grid.gutter;

        const colAlign = ((candidate.x - this.grid.margin) / cellW) % 1;
        const rowAlign = ((candidate.y - this.grid.margin) / cellH) % 1;

        const colScore = 1 - Math.abs(colAlign - 0.5) * 2;
        const rowScore = 1 - Math.abs(rowAlign - 0.5) * 2;

        return (colScore + rowScore) / 2;
    }

    scoreNegativeSpace(candidate, imageAnalysis) {
        if (!imageAnalysis || !imageAnalysis.negativeSpace) return 0.5;

        // Check if motif overlaps with negative space
        let overlapScore = 0;
        const negativeRegions = imageAnalysis.negativeSpace.preferredZones || [];

        negativeRegions.forEach(region => {
            if (this.rectsOverlap(candidate, region)) {
                overlapScore += 0.1;
            }
        });

        return Math.min(1, 0.5 + overlapScore);
    }

    scoreNarrativeEmphasis(candidate, imageAnalysis) {
        if (!imageAnalysis) return 0.5;

        // Prefer motifs that align with detected direction
        const poses = imageAnalysis.poses || [];
        if (poses.length === 0) return 0.5;

        const direction = poses[0].direction;
        const cx = candidate.x + candidate.width / 2;
        const canvasCenter = this.grid.canvasWidth / 2;

        // If subject faces right, motif should be left of center (leading space)
        if (direction === 'right' && cx < canvasCenter) return 0.8;
        if (direction === 'left' && cx > canvasCenter) return 0.8;

        return 0.5;
    }

    scoreBrandHierarchy(candidate) {
        // Larger motifs = stronger hierarchy, but not too large
        const canvasArea = this.grid.canvasWidth * this.grid.canvasHeight;
        const areaRatio = candidate.area / canvasArea;

        // Ideal: 25-40% of canvas
        if (areaRatio >= 0.25 && areaRatio <= 0.40) return 1.0;
        if (areaRatio < 0.20) return 0.5;
        if (areaRatio > 0.50) return 0.6;

        return 0.8;
    }

    calculateFocalProximity(candidate, focalEmphasis) {
        const cx = candidate.x + candidate.width / 2;
        const cy = candidate.y + candidate.height / 2;
        const dist = Math.sqrt(
            Math.pow(cx - focalEmphasis.x, 2) + 
            Math.pow(cy - focalEmphasis.y, 2)
        );
        return Math.max(0, 1 - dist / 500);
    }

    rectsOverlap(a, b) {
        return !(a.x + a.width < b.x || b.x + b.width < a.x ||
                 a.y + a.height < b.y || b.y + b.height < a.y);
    }
}

// Make available globally
window.WindowMotifEngine = WindowMotifEngine;

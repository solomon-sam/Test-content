/**
 * Typography Composition Intelligence System
 * Fully automated editorial modular typography with zero manual editing
 */

class TypographyCompositionEngine {
    constructor(gridSystem, constraints) {
        this.grid = gridSystem;
        this.constraints = constraints;

        // Font definitions
        this.fonts = {
            headline: "'KPMG Bold', 'Arial Black', 'Helvetica Neue', Arial, sans-serif",
            subheading: "'Univers', 'Helvetica Neue', Arial, sans-serif",
            metadata: "'Univers', 'Helvetica Neue', Arial, sans-serif"
        };

        // Character optical weights for line balancing
        this.characterWeights = {
            'W': 1.3, 'M': 1.3, 'w': 1.3, 'm': 1.3,
            'A': 1.15, 'B': 1.15, 'C': 1.15, 'D': 1.15, 'E': 1.15, 'F': 1.15,
            'G': 1.15, 'H': 1.15, 'K': 1.15, 'N': 1.15, 'O': 1.15, 'P': 1.15,
            'Q': 1.15, 'R': 1.15, 'T': 1.15, 'U': 1.15, 'V': 1.15, 'X': 1.15, 'Y': 1.15,
            'a': 1.0, 'b': 1.0, 'c': 1.0, 'd': 1.0, 'e': 1.0, 'f': 1.0, 'g': 1.0,
            'h': 1.0, 'i': 1.0, 'j': 1.0, 'k': 1.0, 'l': 1.0, 'n': 1.0, 'o': 1.0,
            'p': 1.0, 'q': 1.0, 'r': 1.0, 's': 1.0, 't': 1.0, 'u': 1.0, 'v': 1.0,
            'x': 1.0, 'y': 1.0, 'z': 1.0,
            'I': 0.8, 'J': 0.8, 'L': 0.8, 'S': 0.8, 'Z': 0.8,
            'i': 0.8, 'l': 0.8, 'f': 0.8, 't': 0.8, 'j': 0.8,
            '.': 0.5, ',': 0.5, '!': 0.5, '?': 0.5, ':': 0.5, ';': 0.5,
            '-': 0.5, '–': 0.5, '—': 0.8, ' ': 0.4, "'": 0.3, '"': 0.4
        };

        // Scoring weights
        this.scoringWeights = {
            readability: 0.25,
            hierarchyStrength: 0.20,
            opticalBalance: 0.20,
            gridHarmony: 0.15,
            motifCompatibility: 0.10,
            negativeSpacePreservation: 0.05,
            brandCompliance: 0.05
        };

        // Baseline unit
        this.baselineUnit = this.grid.cellHeight / 4;
    }

    /**
     * Main composition method
     * Takes headline and subheading, returns complete typography composition
     */
    compose(headlineText, subheadingText, motif, imageAnalysis) {
        console.log('[Typography] Starting composition...');

        // Generate multiple headline compositions
        const headlineCandidates = this.generateHeadlineCandidates(headlineText, motif, imageAnalysis);

        // Generate subheading compositions for each headline
        const fullCompositions = headlineCandidates.map(headline => {
            const subheading = this.composeSubheading(subheadingText, headline, motif);
            const metadata = this.composeMetadata(headline, subheading, motif);

            return {
                headline,
                subheading,
                metadata,
                score: 0,
                valid: true,
                issues: []
            };
        });

        // Validate each composition
        fullCompositions.forEach(comp => {
            this.validateComposition(comp, motif);
        });

        // Filter valid compositions
        const validCompositions = fullCompositions.filter(c => c.valid);

        if (validCompositions.length === 0) {
            console.warn('[Typography] No valid compositions, using best invalid');
            // Use best invalid and flag issues
            fullCompositions.sort((a, b) => b.score - a.score);
            return this.finalizeComposition(fullCompositions[0]);
        }

        // Score valid compositions
        validCompositions.forEach(comp => {
            comp.score = this.scoreComposition(comp, motif, imageAnalysis);
        });

        // Sort by score and select best
        validCompositions.sort((a, b) => b.score - a.score);

        console.log('[Typography] Generated', validCompositions.length, 'valid compositions');
        console.log('[Typography] Best score:', validCompositions[0].score.toFixed(2));

        return this.finalizeComposition(validCompositions[0]);
    }

    /**
     * Generate headline candidates with different line groupings
     */
    generateHeadlineCandidates(text, motif, imageAnalysis) {
        const candidates = [];

        // Clean and tokenize
        const words = this.tokenize(text);
        if (words.length === 0) return candidates;

        // Generate different line groupings
        const groupings = this.generateSemanticGroupings(words);

        groupings.forEach(grouping => {
            // Calculate font size based on available space
            const fontSize = this.calculateHeadlineFontSize(grouping, motif);

            // Calculate line heights and spacing
            const lineHeight = fontSize * 1.1;
            const lineSpacing = fontSize * 0.25;

            // Check height constraint: max 6 grid modules
            const totalHeight = (grouping.length * lineHeight) + ((grouping.length - 1) * lineSpacing);
            const maxHeight = this.grid.cellHeight * 6;

            if (totalHeight > maxHeight) {
                // Reduce font size
                const scaleFactor = maxHeight / totalHeight;
                const adjustedFontSize = Math.max(16, fontSize * scaleFactor * 0.9);

                candidates.push(this.buildHeadlineCandidate(
                    grouping, adjustedFontSize, motif, imageAnalysis
                ));
            } else {
                candidates.push(this.buildHeadlineCandidate(
                    grouping, fontSize, motif, imageAnalysis
                ));
            }
        });

        // Also try single-line if text is short
        if (words.length <= 3) {
            const singleLine = [words.join(' ')];
            const fontSize = this.calculateHeadlineFontSize(singleLine, motif);
            candidates.push(this.buildHeadlineCandidate(singleLine, fontSize, motif, imageAnalysis));
        }

        return candidates;
    }

    /**
     * Tokenize text into words, preserving semantic units
     */
    tokenize(text) {
        if (!text) return [];

        // Split by spaces but preserve multi-word concepts
        return text.trim().split(/\s+/).filter(w => w.length > 0);
    }

    /**
     * Generate semantic groupings of words into lines
     */
    generateSemanticGroupings(words) {
        const groupings = [];
        const n = words.length;

        if (n === 0) return groupings;
        if (n === 1) return [[words[0]]];

        // Single line
        groupings.push([words.join(' ')]);

        // Two lines - try different splits
        if (n >= 2) {
            for (let i = 1; i < n; i++) {
                const line1 = words.slice(0, i).join(' ');
                const line2 = words.slice(i).join(' ');

                // Avoid orphan words
                if (words.slice(i).length === 1 && words[i].length < 4) continue;

                groupings.push([line1, line2]);
            }
        }

        // Three lines
        if (n >= 3) {
            for (let i = 1; i < n - 1; i++) {
                for (let j = i + 1; j < n; j++) {
                    const line1 = words.slice(0, i).join(' ');
                    const line2 = words.slice(i, j).join(' ');
                    const line3 = words.slice(j).join(' ');

                    // Avoid weak endings
                    if (words[j] && words[j].length < 3 && j === n - 1) continue;

                    groupings.push([line1, line2, line3]);
                }
            }
        }

        // Filter out groupings with too many lines
        return groupings.filter(g => g.length <= 4);
    }

    /**
     * Calculate optimal headline font size
     */
    calculateHeadlineFontSize(lines, motif) {
        const canvasWidth = this.grid.canvasWidth;
        const canvasHeight = this.grid.canvasHeight;

        // Base size on canvas width
        let baseSize = canvasWidth / 12;

        // Adjust for number of lines
        baseSize = baseSize / Math.sqrt(lines.length);

        // Adjust for canvas ratio
        const ratio = canvasWidth / canvasHeight;
        if (ratio > 1.5) baseSize *= 1.1; // Landscape gets slightly larger
        if (ratio < 0.9) baseSize *= 0.9; // Portrait gets slightly smaller

        // Constrain
        return Math.max(18, Math.min(72, baseSize));
    }

    /**
     * Build a headline candidate with positioning and offsets
     */
    buildHeadlineCandidate(lines, fontSize, motif, imageAnalysis) {
        const lineHeight = fontSize * 1.1;
        const lineSpacing = fontSize * 0.25;

        // Calculate line widths using optical weights
        const lineWidths = lines.map(line => this.calculateOpticalWidth(line, fontSize));
        const maxWidth = Math.max(...lineWidths);

        // Determine base position based on motif
        const position = this.calculateHeadlinePosition(motif, maxWidth, lines.length * lineHeight);

        // Calculate offsets for each line
        const offsets = this.calculateLineOffsets(lines, lineWidths, motif, imageAnalysis);

        // Build line objects
        const lineObjects = lines.map((line, i) => ({
            text: line,
            fontSize: fontSize,
            lineHeight: lineHeight,
            width: lineWidths[i],
            x: position.x + (offsets[i] || 0),
            y: position.y + (i * (lineHeight + lineSpacing)),
            offset: offsets[i] || 0
        }));

        return {
            lines: lineObjects,
            fontSize: fontSize,
            lineHeight: lineHeight,
            lineSpacing: lineSpacing,
            totalWidth: maxWidth,
            totalHeight: (lines.length * lineHeight) + ((lines.length - 1) * lineSpacing),
            position: position,
            offsets: offsets
        };
    }

    /**
     * Calculate optical width of a line
     */
    calculateOpticalWidth(text, fontSize) {
        let totalWeight = 0;
        for (const char of text) {
            totalWeight += this.characterWeights[char] || 1.0;
        }
        // Convert to approximate pixel width
        return (totalWeight / text.length) * text.length * fontSize * 0.55;
    }

    /**
     * Calculate headline position based on motif location
     */
    calculateHeadlinePosition(motif, textWidth, textHeight) {
        const margin = this.grid.margin;
        const cellW = this.grid.cellWidth;
        const cellH = this.grid.cellHeight;

        let x, y;

        if (!motif) {
            // No motif, place in upper-left
            x = margin + cellW;
            y = margin + cellH * 2;
        } else {
            const motifCenterX = motif.x + motif.width / 2;
            const motifRight = motif.x + motif.width;
            const canvasCenterX = this.grid.canvasWidth / 2;

            // Position headline on the side opposite to motif
            if (motifCenterX > canvasCenterX) {
                // Motif is on right, place text on left
                x = margin + cellW;
            } else {
                // Motif is on left, place text on right
                x = motifRight + cellW * 2;
                // Ensure it doesn't go off canvas
                if (x + textWidth > this.grid.canvasWidth - margin) {
                    x = this.grid.canvasWidth - margin - textWidth - cellW;
                }
            }

            // Vertical position: upper portion, aligned to grid
            y = margin + cellH * 2;
        }

        // Snap to baseline
        y = Math.round(y / this.baselineUnit) * this.baselineUnit;

        return { x, y };
    }

    /**
     * Calculate editorial offsets for each line
     */
    calculateLineOffsets(lines, lineWidths, motif, imageAnalysis) {
        const offsets = [];
        const cellW = this.grid.cellWidth;
        const maxOffset = cellW * 3; // Max 3 grid modules

        if (!motif) {
            // No motif, minimal offset for editorial feel
            offsets.push(0);
            for (let i = 1; i < lines.length; i++) {
                offsets.push(cellW * (0.3 + (i * 0.2)));
            }
            return offsets;
        }

        const motifCenterX = motif.x + motif.width / 2;
        const canvasCenterX = this.grid.canvasWidth / 2;

        if (motifCenterX > canvasCenterX) {
            // Motif on right: text on left, offset progressively inward
            lines.forEach((line, i) => {
                const progress = i / Math.max(1, lines.length - 1);
                offsets.push(progress * maxOffset * 0.5);
            });
        } else if (motifCenterX < canvasCenterX) {
            // Motif on left: text on right, offset progressively inward
            lines.forEach((line, i) => {
                const progress = i / Math.max(1, lines.length - 1);
                offsets.push(-progress * maxOffset * 0.5);
            });
        } else {
            // Motif centered: balance toward strongest negative space
            const direction = imageAnalysis?.negativeSpace?.preferredZones?.[0]?.x > canvasCenterX ? 1 : -1;
            lines.forEach((line, i) => {
                const progress = i / Math.max(1, lines.length - 1);
                offsets.push(direction * progress * maxOffset * 0.3);
            });
        }

        return offsets;
    }

    /**
     * Compose subheading
     */
    composeSubheading(text, headline, motif) {
        if (!text) return null;

        const words = this.tokenize(text);
        if (words.length === 0) return null;

        // Subheading font size: 0.4x to 0.5x of headline
        const fontSize = Math.max(12, headline.fontSize * 0.42);
        const lineHeight = fontSize * 1.3;

        // Determine width based on available space
        const maxWidth = this.calculateSubheadingWidth(headline, motif);

        // Group words into lines that fit
        const lines = this.wrapSubheading(words, maxWidth, fontSize);

        // Position: below headline, aligned to headline edge
        const x = headline.position.x;
        const y = headline.position.y + headline.totalHeight + this.baselineUnit * 2;

        // Snap to baseline
        const snappedY = Math.round(y / this.baselineUnit) * this.baselineUnit;

        // Build line objects
        const lineObjects = lines.map((line, i) => ({
            text: line,
            fontSize: fontSize,
            lineHeight: lineHeight,
            x: x,
            y: snappedY + (i * lineHeight),
            width: this.calculateOpticalWidth(line, fontSize)
        }));

        return {
            lines: lineObjects,
            fontSize: fontSize,
            lineHeight: lineHeight,
            totalHeight: lines.length * lineHeight,
            position: { x, y: snappedY }
        };
    }

    /**
     * Calculate subheading max width
     */
    calculateSubheadingWidth(headline, motif) {
        const canvasWidth = this.grid.canvasWidth;
        const margin = this.grid.margin;
        const cellW = this.grid.cellWidth;

        let maxWidth = canvasWidth - headline.position.x - margin - cellW;

        if (motif) {
            // Ensure subheading doesn't overlap motif
            const motifLeft = motif.x;
            const motifRight = motif.x + motif.width;
            const headlineRight = headline.position.x + headline.totalWidth;

            if (headlineRight > motifLeft && headline.position.x < motifRight) {
                // Headline overlaps motif horizontally, constrain width
                maxWidth = Math.min(maxWidth, motifLeft - headline.position.x - cellW);
            }
        }

        return Math.max(100, maxWidth);
    }

    /**
     * Wrap subheading words into lines
     */
    wrapSubheading(words, maxWidth, fontSize) {
        const lines = [];
        let currentLine = [];
        let currentWidth = 0;

        for (const word of words) {
            const wordWidth = this.calculateOpticalWidth(word, fontSize);
            const spaceWidth = this.calculateOpticalWidth(' ', fontSize);

            if (currentWidth + wordWidth + (currentLine.length > 0 ? spaceWidth : 0) > maxWidth) {
                if (currentLine.length > 0) {
                    lines.push(currentLine.join(' '));
                    currentLine = [word];
                    currentWidth = wordWidth;
                } else {
                    // Word is too long, force break
                    lines.push(word);
                }
            } else {
                currentLine.push(word);
                currentWidth += wordWidth + (currentLine.length > 1 ? spaceWidth : 0);
            }
        }

        if (currentLine.length > 0) {
            lines.push(currentLine.join(' '));
        }

        return lines;
    }

    /**
     * Compose metadata/tagline
     */
    composeMetadata(headline, subheading, motif) {
        const tagline = "Make the Difference.";
        const fontSize = Math.max(9, Math.min(12, this.grid.canvasWidth / 80));
        const lineHeight = fontSize * 1.4;

        // Position: bottom-right, aligned to grid
        const margin = this.grid.margin;
        const cellW = this.grid.cellWidth;
        const cellH = this.grid.cellHeight;

        const x = this.grid.canvasWidth - margin - cellW * 4;
        const y = this.grid.canvasHeight - margin - cellH * 0.5;

        // Snap to baseline
        const snappedY = Math.round(y / this.baselineUnit) * this.baselineUnit;

        return {
            text: tagline,
            fontSize: fontSize,
            lineHeight: lineHeight,
            x: x,
            y: snappedY,
            width: this.calculateOpticalWidth(tagline, fontSize),
            align: 'right'
        };
    }

    /**
     * Validate composition against all rules
     */
    validateComposition(comp, motif) {
        const issues = [];

        // 1. Headline height <= 6 grid modules
        const maxHeadlineHeight = this.grid.cellHeight * 6;
        if (comp.headline.totalHeight > maxHeadlineHeight) {
            issues.push({ rule: 'headline-height', message: 'Headline exceeds 6 grid modules' });
            comp.valid = false;
        }

        // 2. Subheading height <= 0.5 grid module
        if (comp.subheading && comp.subheading.totalHeight > this.grid.cellHeight * 0.5) {
            issues.push({ rule: 'subheading-height', message: 'Subheading exceeds 0.5 grid module' });
            comp.valid = false;
        }

        // 3. No orphan words
        const lastHeadlineLine = comp.headline.lines[comp.headline.lines.length - 1];
        if (lastHeadlineLine && lastHeadlineLine.text.split(' ').length === 1 && 
            lastHeadlineLine.text.length < 4 && comp.headline.lines.length > 1) {
            issues.push({ rule: 'orphan-word', message: 'Orphan word in headline' });
            comp.valid = false;
        }

        // 4. Subheading doesn't dominate headline
        if (comp.subheading && comp.subheading.fontSize > comp.headline.fontSize * 0.6) {
            issues.push({ rule: 'hierarchy', message: 'Subheading too large' });
            comp.valid = false;
        }

        // 5. Minimum distance from motif
        if (motif) {
            const minDist = this.grid.cellWidth;

            comp.headline.lines.forEach(line => {
                if (this.distanceToMotif(line, motif) < minDist) {
                    issues.push({ rule: 'motif-distance', message: 'Headline too close to motif' });
                    comp.valid = false;
                }
            });
        }

        // 6. Typography doesn't exit canvas
        comp.headline.lines.forEach(line => {
            if (line.x < this.grid.margin || 
                line.x + line.width > this.grid.canvasWidth - this.grid.margin ||
                line.y < this.grid.margin ||
                line.y + line.fontSize > this.grid.canvasHeight - this.grid.margin) {
                issues.push({ rule: 'canvas-boundary', message: 'Typography exits canvas' });
                comp.valid = false;
            }
        });

        // 7. No split words
        comp.headline.lines.forEach(line => {
            const words = line.text.split(' ');
            words.forEach(word => {
                if (word.length < 2 && words.length > 1) {
                    issues.push({ rule: 'split-word', message: 'Word unnaturally split' });
                    comp.valid = false;
                }
            });
        });

        comp.issues = issues;
    }

    /**
     * Score a composition
     */
    scoreComposition(comp, motif, imageAnalysis) {
        let score = 0;

        // Readability (25%)
        const readabilityScore = this.scoreReadability(comp);
        score += readabilityScore * this.scoringWeights.readability;

        // Hierarchy Strength (20%)
        const hierarchyScore = this.scoreHierarchy(comp);
        score += hierarchyScore * this.scoringWeights.hierarchyStrength;

        // Optical Balance (20%)
        const balanceScore = this.scoreOpticalBalance(comp);
        score += balanceScore * this.scoringWeights.opticalBalance;

        // Grid Harmony (15%)
        const gridScore = this.scoreGridHarmony(comp);
        score += gridScore * this.scoringWeights.gridHarmony;

        // Motif Compatibility (10%)
        const motifScore = this.scoreMotifCompatibility(comp, motif);
        score += motifScore * this.scoringWeights.motifCompatibility;

        // Negative Space Preservation (5%)
        const spaceScore = this.scoreNegativeSpace(comp, imageAnalysis);
        score += spaceScore * this.scoringWeights.negativeSpacePreservation;

        // Brand Compliance (5%)
        const brandScore = this.scoreBrandCompliance(comp);
        score += brandScore * this.scoringWeights.brandCompliance;

        return score;
    }

    scoreReadability(comp) {
        let score = 1.0;

        // Penalize if font too small
        if (comp.headline.fontSize < 16) score -= 0.3;
        if (comp.subheading && comp.subheading.fontSize < 10) score -= 0.2;

        // Penalize too many lines
        if (comp.headline.lines.length > 3) score -= 0.2;

        // Penalize if lines too long
        const maxLineWidth = this.grid.canvasWidth * 0.7;
        comp.headline.lines.forEach(line => {
            if (line.width > maxLineWidth) score -= 0.1;
        });

        return Math.max(0, score);
    }

    scoreHierarchy(comp) {
        if (!comp.subheading) return 0.8;

        const ratio = comp.subheading.fontSize / comp.headline.fontSize;

        // Ideal: subheading is 35-45% of headline
        if (ratio >= 0.35 && ratio <= 0.45) return 1.0;
        if (ratio >= 0.30 && ratio <= 0.50) return 0.8;
        if (ratio > 0.50) return 0.3; // Too dominant
        return 0.6;
    }

    scoreOpticalBalance(comp) {
        const lineWidths = comp.headline.lines.map(l => l.width);
        const avgWidth = lineWidths.reduce((a, b) => a + b, 0) / lineWidths.length;

        // Calculate variance
        const variance = lineWidths.reduce((sum, w) => sum + Math.pow(w - avgWidth, 2), 0) / lineWidths.length;
        const stdDev = Math.sqrt(variance);

        // Lower variance = better balance, but some variation is editorial
        const cv = stdDev / avgWidth; // Coefficient of variation

        if (cv < 0.1) return 0.6; // Too uniform
        if (cv < 0.3) return 1.0; // Good editorial variation
        if (cv < 0.5) return 0.8;
        return 0.5;
    }

    scoreGridHarmony(comp) {
        let score = 1.0;

        // Check if positions align to grid
        comp.headline.lines.forEach(line => {
            const xAligned = Math.abs(line.x % this.grid.cellWidth) < 5;
            const yAligned = Math.abs(line.y % this.baselineUnit) < 2;

            if (!xAligned) score -= 0.05;
            if (!yAligned) score -= 0.05;
        });

        return Math.max(0, score);
    }

    scoreMotifCompatibility(comp, motif) {
        if (!motif) return 0.8;

        let score = 1.0;
        const minDist = this.grid.cellWidth;

        comp.headline.lines.forEach(line => {
            const dist = this.distanceToMotif(line, motif);
            if (dist < minDist) score -= 0.3;
            else if (dist < minDist * 2) score -= 0.1;
        });

        return Math.max(0, score);
    }

    scoreNegativeSpace(comp, imageAnalysis) {
        if (!imageAnalysis || !imageAnalysis.negativeSpace) return 0.5;

        // Check if typography sits in negative space
        let overlapScore = 0;
        const zones = imageAnalysis.negativeSpace.preferredZones || [];

        comp.headline.lines.forEach(line => {
            zones.forEach(zone => {
                if (this.lineInZone(line, zone)) overlapScore += 0.1;
            });
        });

        return Math.min(1, 0.5 + overlapScore);
    }

    scoreBrandCompliance(comp) {
        let score = 1.0;

        // Check hierarchy order is preserved
        if (comp.subheading && comp.subheading.fontSize >= comp.headline.fontSize * 0.5) {
            score -= 0.5;
        }

        // Metadata should be smallest
        if (comp.metadata && comp.metadata.fontSize > (comp.subheading?.fontSize || 0) * 0.8) {
            score -= 0.3;
        }

        return Math.max(0, score);
    }

    distanceToMotif(line, motif) {
        const lineCenterX = line.x + line.width / 2;
        const lineCenterY = line.y + line.fontSize / 2;
        const motifCenterX = motif.x + motif.width / 2;
        const motifCenterY = motif.y + motif.height / 2;

        return Math.sqrt(
            Math.pow(lineCenterX - motifCenterX, 2) +
            Math.pow(lineCenterY - motifCenterY, 2)
        );
    }

    lineInZone(line, zone) {
        return !(line.x + line.width < zone.x || 
                 line.x > zone.x + zone.width ||
                 line.y + line.fontSize < zone.y || 
                 line.y > zone.y + zone.height);
    }

    finalizeComposition(comp) {
        return {
            headline: comp.headline,
            subheading: comp.subheading,
            metadata: comp.metadata,
            score: comp.score,
            valid: comp.valid,
            issues: comp.issues
        };
    }
}

// Make available globally
window.TypographyCompositionEngine = TypographyCompositionEngine;

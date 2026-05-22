/**
 * Typography Composition Engine
 * Intelligent auto-typography from 2 inputs
 * Semantic tokenization, optical balancing, editorial line grouping, line offsets
 * FIXED: Baseline grid snap enforced during composition
 */

class TypographyCompositionEngine {
  constructor(gridSystem, stateManager) {
    this.gridSystem = gridSystem;
    this.stateManager = stateManager;

    // Font configuration
    this.fonts = {
      headline: {
        family: "'KPMG Bold', 'Arial Black', 'Helvetica Neue', Arial, sans-serif",
        weight: 'bold',
        baseSize: 36,
        lineHeight: 1.15,
        letterSpacing: -0.5
      },
      subheading: {
        family: "'Univers', 'Helvetica Neue', Arial, sans-serif",
        weight: 'normal',
        baseSize: 18,
        lineHeight: 1.3,
        letterSpacing: 0
      },
      metadata: {
        family: "'Univers', 'Helvetica Neue', Arial, sans-serif",
        weight: 'normal',
        baseSize: 12,
        lineHeight: 1.4,
        letterSpacing: 0.5
      }
    };

    // Character weight map for optical width calculation
    this.characterWeights = this.buildCharacterWeights();
  }

  /**
   * Main entry: compose typography from headline + subheading
   */
  compose(headlineText, subheadingText, motif, imageAnalysis) {
    if (!headlineText || headlineText.trim().length === 0) {
      return null;
    }

    // Tokenize headline
    const tokens = this.tokenize(headlineText);

    // Generate semantic groupings
    const groupings = this.generateSemanticGroupings(tokens);

    // Compose headline with editorial layout
    const headline = this.composeHeadline(groupings, motif, imageAnalysis);

    // Compose subheading
    const subheading = subheadingText ?
      this.composeSubheading(subheadingText, headline, motif) : null;

    // Compose metadata
    const metadata = this.composeMetadata(headline, subheading, motif);

    // Calculate line offsets for editorial stagger
    const offsets = this.calculateLineOffsets(headline.lines, motif, imageAnalysis);
    headline.lines = this.applyOffsets(headline.lines, offsets);

    // NEW: Snap all text positions to baseline grid
    this.snapToBaselineGrid(headline, subheading);

    // Validate and score
    const validation = this.validateComposition({ headline, subheading, metadata }, motif);
    const score = this.scoreComposition({ headline, subheading, metadata }, motif, imageAnalysis);

    return {
      headline,
      subheading,
      metadata,
      validation,
      score,
      tokens,
      groupings
    };
  }

  /**
   * NEW: Snap all text element positions to baseline grid
   * KPMG brand rule: All text baselines snap to baselineUnit intervals (cellHeight/4)
   */
  snapToBaselineGrid(headline, subheading) {
    const grid = this.gridSystem;
    if (!grid) return;

    // Snap headline line positions
    if (headline && headline.lines) {
      let currentY = headline.lines[0]?.y || grid.margin + grid.cellHeight * 3;
      headline.lines.forEach((line, i) => {
        if (i === 0) {
          line.y = grid.snapToBaseline(currentY);
        } else {
          // Snap each line's Y to baseline grid, maintaining line height
          const rawY = currentY + (headline.lines[i-1].height || headline.fontSize * headline.lineHeight);
          line.y = grid.snapToBaseline(rawY);
        }
        currentY = line.y;
      });
    }

    // Snap subheading position
    if (subheading && subheading.lines) {
      let currentY = subheading.lines[0]?.y || grid.margin + grid.cellHeight * 3;
      subheading.lines.forEach((line, i) => {
        if (i === 0) {
          line.y = grid.snapToBaseline(currentY);
        } else {
          const rawY = currentY + (subheading.lines[i-1].height || subheading.fontSize * subheading.lineHeight);
          line.y = grid.snapToBaseline(rawY);
        }
        currentY = line.y;
      });
    }
  }

  /**
   * Tokenize text into semantic units
   */
  tokenize(text) {
    // Split by spaces but preserve punctuation
    const rawTokens = text.trim().split(/\s+/);

    return rawTokens.map((token, index) => ({
      text: token,
      index,
      isPunctuation: /^[.,;:!?]+$/.test(token),
      isCapitalized: /^[A-Z]/.test(token),
      isAllCaps: /^[A-Z]+$/.test(token),
      length: token.length,
      weight: this.getTokenWeight(token)
    }));
  }

  /**
   * Generate semantic groupings (phrases that stay together)
   */
  generateSemanticGroupings(tokens) {
    const groupings = [];
    let currentGroup = [];

    tokens.forEach((token, i) => {
      currentGroup.push(token);

      // Break group at punctuation or natural pause points
      const shouldBreak =
        token.isPunctuation ||
        (i < tokens.length - 1 && tokens[i + 1].isCapitalized && currentGroup.length >= 2) ||
        currentGroup.length >= 4 ||
        this.getGroupWeight(currentGroup) > 15;

      if (shouldBreak && currentGroup.length > 0) {
        groupings.push([...currentGroup]);
        currentGroup = [];
      }
    });

    if (currentGroup.length > 0) {
      groupings.push(currentGroup);
    }

    return groupings;
  }

  /**
   * Compose headline with editorial line breaking
   */
  composeHeadline(groupings, motif, imageAnalysis) {
    const grid = this.gridSystem;
    const maxWidth = this.getHeadlineMaxWidth(motif);
    const maxLines = 6; // KPMG rule: max 6 grid modules height

    const lines = [];
    let currentLine = [];
    let currentWidth = 0;

    // Flatten groupings into words
    const words = groupings.flat();

    words.forEach((word, i) => {
      const wordWidth = this.calculateOpticalWidth(word.text, this.fonts.headline.baseSize);
      const spaceWidth = currentLine.length > 0 ?
        this.calculateOpticalWidth(' ', this.fonts.headline.baseSize) : 0;

      if (currentWidth + spaceWidth + wordWidth > maxWidth && currentLine.length > 0) {
        // Start new line
        lines.push({
          text: currentLine.map(w => w.text).join(' '),
          words: [...currentLine],
          width: currentWidth,
          height: this.fonts.headline.baseSize * this.fonts.headline.lineHeight
        });
        currentLine = [word];
        currentWidth = wordWidth;
      } else {
        currentLine.push(word);
        currentWidth += spaceWidth + wordWidth;
      }
    });

    // Add remaining words
    if (currentLine.length > 0) {
      lines.push({
        text: currentLine.map(w => w.text).join(' '),
        words: [...currentLine],
        width: currentWidth,
        height: this.fonts.headline.baseSize * this.fonts.headline.lineHeight
      });
    }

    // Apply font size scaling based on line count
    const fontSize = this.calculateOptimalFontSize(lines.length, grid);

    // Recalculate widths with scaled font
    lines.forEach(line => {
      line.width = this.calculateOpticalWidth(line.text, fontSize);
      line.height = fontSize * this.fonts.headline.lineHeight;
    });

    return {
      lines,
      fontSize,
      fontFamily: this.fonts.headline.family,
      fontWeight: this.fonts.headline.weight,
      lineHeight: this.fonts.headline.lineHeight,
      letterSpacing: this.fonts.headline.letterSpacing,
      totalHeight: lines.reduce((sum, l) => sum + l.height, 0),
      maxWidth: Math.max(...lines.map(l => l.width))
    };
  }

  /**
   * Compose subheading
   */
  composeSubheading(text, headline, motif) {
    const grid = this.gridSystem;
    const maxWidth = this.getSubheadingMaxWidth(motif, headline);

    // FIXED: Subheading should be noticeably smaller than headline (0.5x or less)
    const fontSize = Math.max(14, Math.min(22, headline.fontSize * 0.5));

    // Simple line break for subheading (no stagger)
    const words = text.trim().split(/\s+/);
    const lines = [];
    let currentLine = [];
    let currentWidth = 0;

    words.forEach(word => {
      const wordWidth = this.calculateOpticalWidth(word, fontSize);
      const spaceWidth = currentLine.length > 0 ?
        this.calculateOpticalWidth(' ', fontSize) : 0;

      if (currentWidth + spaceWidth + wordWidth > maxWidth && currentLine.length > 0) {
        lines.push({
          text: currentLine.join(' '),
          width: currentWidth,
          height: fontSize * this.fonts.subheading.lineHeight
        });
        currentLine = [word];
        currentWidth = wordWidth;
      } else {
        currentLine.push(word);
        currentWidth += spaceWidth + wordWidth;
      }
    });

    if (currentLine.length > 0) {
      lines.push({
        text: currentLine.join(' '),
        width: currentWidth,
        height: fontSize * this.fonts.subheading.lineHeight
      });
    }

    return {
      lines,
      fontSize,
      fontFamily: this.fonts.subheading.family,
      fontWeight: this.fonts.subheading.weight,
      lineHeight: this.fonts.subheading.lineHeight,
      totalHeight: lines.reduce((sum, l) => sum + l.height, 0),
      maxWidth: Math.max(...lines.map(l => l.width), 0)
    };
  }

  /**
   * Compose metadata (tagline, URL, date)
   */
  composeMetadata(headline, subheading, motif) {
    const brandSettings = {
      tagline: 'KPMG. Make the Difference.',
      url: 'kpmg.com',
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    };

    return {
      tagline: {
        text: brandSettings.tagline,
        fontSize: Math.max(10, Math.min(16, this.gridSystem.canvasWidth / 100)),
        fontFamily: this.fonts.metadata.family
      },
      url: {
        text: brandSettings.url,
        fontSize: Math.max(9, Math.min(12, this.gridSystem.canvasWidth / 120)),
        fontFamily: this.fonts.metadata.family
      },
      date: {
        text: brandSettings.date,
        fontSize: Math.max(9, Math.min(12, this.gridSystem.canvasWidth / 120)),
        fontFamily: this.fonts.metadata.family
      }
    };
  }

  /**
   * Calculate line offsets for editorial stagger
   * KPMG rule: max 3 grid units offset
   */
  calculateLineOffsets(lines, motif, imageAnalysis) {
    const grid = this.gridSystem;
    const maxOffset = grid.cellWidth * 3; // Max 3 grid units

    // Determine offset direction based on motif position
    let direction = 1; // Rightward stagger

    if (motif) {
      const motifCenter = motif.x + motif.width / 2;
      const canvasCenter = grid.canvasWidth / 2;

      // If motif is on right, stagger leftward
      if (motifCenter > canvasCenter) {
        direction = -1;
      }
    }

    // Calculate progressive offsets
    const offsets = [];
    lines.forEach((line, i) => {
      // Progressive offset: each line shifts more
      const progress = i / Math.max(1, lines.length - 1);
      const offset = direction * progress * maxOffset * 0.6;
      offsets.push(offset);
    });

    return offsets;
  }

  /**
   * Apply offsets to lines
   */
  applyOffsets(lines, offsets) {
    return lines.map((line, i) => ({
      ...line,
      offsetX: offsets[i] || 0
    }));
  }

  /**
   * Calculate optical width of text
   */
  calculateOpticalWidth(text, fontSize) {
    let width = 0;
    const scale = fontSize / 16; // Base at 16px

    for (const char of text) {
      const weight = this.characterWeights[char] || this.characterWeights['default'];
      width += weight * scale;
    }

    return width;
  }

  /**
   * Build character weight map for optical width
   */
  buildCharacterWeights() {
    const weights = {
      'default': 9,
      ' ': 4,
      'i': 4, 'l': 4, 'j': 4, 't': 5, 'f': 5,
      'r': 6, 's': 6, 'z': 6,
      'a': 8, 'b': 8, 'c': 8, 'd': 8, 'e': 8, 'g': 8, 'h': 8, 'k': 8, 'n': 8, 'o': 8, 'p': 8, 'q': 8, 'u': 8, 'v': 8, 'x': 8, 'y': 8,
      'm': 12, 'w': 12,
      'A': 10, 'B': 10, 'C': 10, 'D': 10, 'E': 10, 'F': 9, 'G': 11, 'H': 11, 'I': 4, 'J': 8, 'K': 10, 'L': 9, 'M': 13, 'N': 11,
      'O': 11, 'P': 9, 'Q': 11, 'R': 10, 'S': 9, 'T': 10, 'U': 11, 'V': 10, 'W': 14, 'X': 10, 'Y': 10, 'Z': 9,
      '0': 9, '1': 6, '2': 9, '3': 9, '4': 9, '5': 9, '6': 9, '7': 9, '8': 9, '9': 9,
      '.': 4, ',': 4, ';': 4, ':': 4, '!': 5, '?': 8, '-': 6, '–': 8, '—': 12,
      '"': 6, "'": 3, '(': 6, ')': 6
    };

    // Fill in lowercase from uppercase equivalents
    'abcdefghijklmnopqrstuvwxyz'.split('').forEach(char => {
      if (!weights[char]) {
        weights[char] = weights[char.toUpperCase()] ? weights[char.toUpperCase()] * 0.85 : weights['default'];
      }
    });

    return weights;
  }

  /**
   * Get character weight
   */
  getCharacterWeight(char) {
    return this.characterWeights[char] || this.characterWeights['default'];
  }

  /**
   * Get token weight for grouping decisions
   */
  getTokenWeight(token) {
    return token.length * 0.5 + (token.isCapitalized ? 1 : 0) + (token.isAllCaps ? 2 : 0);
  }

  /**
   * Get group weight
   */
  getGroupWeight(group) {
    return group.reduce((sum, t) => sum + this.getTokenWeight(t), 0);
  }

  /**
   * Get headline max width based on motif position
   */
  getHeadlineMaxWidth(motif) {
    const grid = this.gridSystem;
    const usableWidth = grid.usableWidth;

    if (!motif) {
      return usableWidth * 0.6;
    }

    // If motif is on right, headline goes on left
    const motifCenter = motif.x + motif.width / 2;
    const canvasCenter = grid.canvasWidth / 2;

    if (motifCenter > canvasCenter) {
      // Motif on right, headline on left
      return motif.x - grid.margin - grid.cellWidth;
    } else {
      // Motif on left, headline on right
      return grid.canvasWidth - grid.margin - (motif.x + motif.width) - grid.cellWidth;
    }
  }

  /**
   * Get subheading max width
   */
  getSubheadingMaxWidth(motif, headline) {
    const grid = this.gridSystem;
    return this.getHeadlineMaxWidth(motif) * 0.9;
  }

  /**
   * Calculate optimal font size based on line count
   */
  calculateOptimalFontSize(lineCount, grid) {
    const baseSize = this.fonts.headline.baseSize;
    const maxHeight = grid.usableHeight * 0.4; // Max 40% of usable height
    const totalLineHeight = lineCount * baseSize * this.fonts.headline.lineHeight;

    if (totalLineHeight > maxHeight) {
      return Math.max(18, Math.floor(baseSize * (maxHeight / totalLineHeight)));
    }

    return baseSize;
  }

  /**
   * Validate composition
   */
  validateComposition(comp, motif) {
    const issues = [];
    const grid = this.gridSystem;

    // Check headline doesn't exceed max height
    if (comp.headline.totalHeight > grid.usableHeight * 0.5) {
      issues.push('Headline exceeds maximum height');
    }

    // Check line count
    if (comp.headline.lines.length > 6) {
      issues.push('Headline exceeds 6 lines');
    }

    // Check offset limits
    const maxOffset = Math.max(...comp.headline.lines.map(l => Math.abs(l.offsetX || 0)));
    if (maxOffset > grid.cellWidth * 3) {
      issues.push('Line offsets exceed 3 grid units');
    }

    // NEW: Check baseline alignment
    const baselineAligned = comp.headline.lines.every(line => {
      const snappedY = grid.snapToBaseline(line.y);
      return Math.abs(line.y - snappedY) < 1;
    });
    if (!baselineAligned) {
      issues.push('Headline lines are not aligned to baseline grid');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Score composition
   */
  scoreComposition(comp, motif, imageAnalysis) {
    let score = 0;

    // Balance score (lines of different lengths)
    const lineWidths = comp.headline.lines.map(l => l.width);
    const widthVariance = this.calculateVariance(lineWidths);
    score += Math.min(20, widthVariance * 2);

    // Offset score (editorial stagger)
    const offsets = comp.headline.lines.map(l => l.offsetX || 0);
    const hasStagger = offsets.some(o => o !== 0);
    score += hasStagger ? 20 : 5;

    // Readability score (font size)
    const fontSize = comp.headline.fontSize;
    if (fontSize >= 24) score += 20;
    else if (fontSize >= 18) score += 15;
    else score += 10;

    // Fit score (within bounds)
    const grid = this.gridSystem;
    if (comp.headline.maxWidth < grid.usableWidth * 0.7) score += 20;
    else score += 10;

    // Hierarchy score (subheading smaller than headline)
    if (comp.subheading && comp.subheading.fontSize < comp.headline.fontSize * 0.6) {
      score += 20;
    }

    // Baseline alignment score
    const baselineAligned = comp.headline.lines.every(line => {
      const snappedY = grid.snapToBaseline(line.y);
      return Math.abs(line.y - snappedY) < 1;
    });
    if (baselineAligned) score += 10;

    return Math.min(100, score);
  }

  /**
   * Calculate variance
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => (v - mean) ** 2);
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  /**
   * Regenerate composition (called when text changes)
   */
  regenerate(headlineText, subheadingText, motif, imageAnalysis) {
    return this.compose(headlineText, subheadingText, motif, imageAnalysis);
  }
}

// Make available globally
window.TypographyCompositionEngine = TypographyCompositionEngine;

/**
 * Validation Rules
 * Brand compliance validation engine
 */

class ValidationRules {
  constructor() {
    this.rules = {
      logo: {
        minSize: 0.05,
        maxSize: 0.15,
        safeZone: 0.02,
        required: true
      },
      text: {
        minSize: 12,
        maxSize: 72,
        minContrast: 4.5,
        safeZone: 0.01
      },
      composition: {
        minElements: 3,
        maxElements: 8,
        balanceThreshold: 0.3
      }
    };
  }

  validateAll(placements, canvasWidth, canvasHeight) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Validate logo
    if (placements.logo) {
      const logoValidation = this.validateLogo(placements.logo, canvasWidth, canvasHeight);
      results.errors.push(...logoValidation.errors);
      results.warnings.push(...logoValidation.warnings);
    } else {
      results.errors.push('Logo placement is required');
    }

    // Validate text
    if (placements.tagline) {
      const textValidation = this.validateText(placements.tagline, canvasWidth, canvasHeight);
      results.errors.push(...textValidation.errors);
      results.warnings.push(...textValidation.warnings);
    }

    // Validate overall composition
    const compositionValidation = this.validateComposition(placements, canvasWidth, canvasHeight);
    results.errors.push(...compositionValidation.errors);
    results.warnings.push(...compositionValidation.warnings);

    results.valid = results.errors.length === 0;
    return results;
  }

  validateLogo(logo, canvasWidth, canvasHeight) {
    const result = { errors: [], warnings: [] };
    const rules = this.rules.logo;

    const logoArea = (logo.width * logo.height) / (canvasWidth * canvasHeight);

    if (logoArea < rules.minSize) {
      result.warnings.push('Logo may be too small for visibility');
    }

    if (logoArea > rules.maxSize) {
      result.warnings.push('Logo may be too large for the composition');
    }

    if (logo.x < rules.safeZone * canvasWidth || logo.y < rules.safeZone * canvasHeight) {
      result.errors.push('Logo is too close to the edge');
    }

    return result;
  }

  validateText(text, canvasWidth, canvasHeight) {
    const result = { errors: [], warnings: [] };
    const rules = this.rules.text;

    if (text.fontSize < rules.minSize) {
      result.warnings.push('Text may be too small to read');
    }

    if (text.fontSize > rules.maxSize) {
      result.warnings.push('Text may be too large for the composition');
    }

    return result;
  }

  validateComposition(placements, canvasWidth, canvasHeight) {
    const result = { errors: [], warnings: [] };
    const rules = this.rules.composition;

    const elementCount = Object.keys(placements).length;

    if (elementCount < rules.minElements) {
      result.warnings.push('Composition may be too sparse');
    }

    if (elementCount > rules.maxElements) {
      result.warnings.push('Composition may be too cluttered');
    }

    return result;
  }

  calculateContrast(color1, color2) {
    const lum1 = this.calculateLuminance(color1);
    const lum2 = this.calculateLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  calculateLuminance(color) {
    // Simplified luminance calculation
    const rgb = this.hexToRgb(color) || { r: 255, g: 255, b: 255 };
    const a = [rgb.r, rgb.g, rgb.b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}

// Make available globally
window.ValidationRules = ValidationRules;

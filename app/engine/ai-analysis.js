/**
 * AI Analysis Engine
 * Image analysis for composition optimization
 * FIXED: Real pixel-based analysis instead of random data
 */

class AIAnalysisEngine {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 10;
  }

  /**
   * Analyze image for composition optimization
   * Uses real canvas pixel sampling instead of random data
   */
  async analyze(imageElement, canvasWidth, canvasHeight) {
    const cacheKey = this.getCacheKey(imageElement);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Create analysis canvas
      const analysisCanvas = document.createElement('canvas');
      const ctx = analysisCanvas.getContext('2d');

      // Scale down for performance while maintaining aspect ratio
      const maxAnalysisSize = 400;
      const scale = Math.min(maxAnalysisSize / imageElement.naturalWidth, 
                              maxAnalysisSize / imageElement.naturalHeight, 1);

      analysisCanvas.width = Math.round(imageElement.naturalWidth * scale);
      analysisCanvas.height = Math.round(imageElement.naturalHeight * scale);

      ctx.drawImage(imageElement, 0, 0, analysisCanvas.width, analysisCanvas.height);

      const imageData = ctx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
      const pixels = imageData.data;

      // Perform real analysis
      const saliency = this.calculateSaliency(pixels, analysisCanvas.width, analysisCanvas.height, 
                                             canvasWidth, canvasHeight);
      const negativeSpace = this.calculateNegativeSpace(pixels, analysisCanvas.width, analysisCanvas.height,
                                                       canvasWidth, canvasHeight);
      const composition = this.analyzeComposition(pixels, analysisCanvas.width, analysisCanvas.height,
                                                    canvasWidth, canvasHeight);
      const quality = this.assessQuality(pixels, analysisCanvas.width, analysisCanvas.height);

      const result = {
        saliency,
        negativeSpace,
        composition,
        quality,
        timestamp: Date.now()
      };

      // Cache result
      this.cache.set(cacheKey, result);
      this.trimCache();

      return result;
    } catch (error) {
      console.error('AI Analysis failed:', error);
      // Return safe fallback
      return this.getFallbackAnalysis(canvasWidth, canvasHeight);
    }
  }

  /**
   * Calculate saliency map using brightness and color contrast
   */
  calculateSaliency(pixels, imgW, imgH, canvasW, canvasH) {
    const saliencyMap = new Float32Array(imgW * imgH);
    const scaleX = canvasW / imgW;
    const scaleY = canvasH / imgH;

    // Calculate average brightness
    let totalBrightness = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      totalBrightness += (r * 0.299 + g * 0.587 + b * 0.114);
    }
    const avgBrightness = totalBrightness / (imgW * imgH);

    // Calculate saliency based on brightness deviation and edge detection
    let maxSaliency = 0;
    let focalX = 0, focalY = 0;
    let totalWeightX = 0, totalWeightY = 0, totalWeight = 0;

    for (let y = 1; y < imgH - 1; y++) {
      for (let x = 1; x < imgW - 1; x++) {
        const idx = (y * imgW + x) * 4;

        // Brightness
        const brightness = (pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114);
        const brightnessDiff = Math.abs(brightness - avgBrightness) / 255;

        // Edge detection (Sobel-like)
        const left = ((y * imgW + (x - 1)) * 4);
        const right = ((y * imgW + (x + 1)) * 4);
        const top = (((y - 1) * imgW + x) * 4);
        const bottom = (((y + 1) * imgW + x) * 4);

        const edgeX = Math.abs(pixels[left] - pixels[right]) + 
                      Math.abs(pixels[left + 1] - pixels[right + 1]) + 
                      Math.abs(pixels[left + 2] - pixels[right + 2]);
        const edgeY = Math.abs(pixels[top] - pixels[bottom]) + 
                      Math.abs(pixels[top + 1] - pixels[bottom + 1]) + 
                      Math.abs(pixels[top + 2] - pixels[bottom + 2]);

        const edgeStrength = Math.min(1, (edgeX + edgeY) / (255 * 6));

        // Combine brightness difference and edge strength
        const saliency = brightnessDiff * 0.4 + edgeStrength * 0.6;
        saliencyMap[y * imgW + x] = saliency;

        if (saliency > maxSaliency) {
          maxSaliency = saliency;
        }

        // Weighted center calculation
        totalWeightX += x * saliency;
        totalWeightY += y * saliency;
        totalWeight += saliency;
      }
    }

    // Calculate focal point (weighted center of saliency)
    focalX = totalWeight > 0 ? (totalWeightX / totalWeight) * scaleX : canvasW / 2;
    focalY = totalWeight > 0 ? (totalWeightY / totalWeight) * scaleY : canvasH / 2;

    // Normalize saliency map
    if (maxSaliency > 0) {
      for (let i = 0; i < saliencyMap.length; i++) {
        saliencyMap[i] /= maxSaliency;
      }
    }

    return {
      map: saliencyMap,
      width: imgW,
      height: imgH,
      focalPoint: { x: focalX, y: focalY },
      maxSaliency,
      score: Math.min(10, maxSaliency * 10)
    };
  }

  /**
   * Calculate negative space regions
   */
  calculateNegativeSpace(pixels, imgW, imgH, canvasW, canvasH) {
    const scaleX = canvasW / imgW;
    const scaleY = canvasH / imgH;

    // Divide image into grid cells
    const gridCols = 6;
    const gridRows = 6;
    const cellW = Math.floor(imgW / gridCols);
    const cellH = Math.floor(imgH / gridRows);

    const regions = [];

    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        let totalBrightness = 0;
        let pixelCount = 0;

        for (let y = gy * cellH; y < Math.min((gy + 1) * cellH, imgH); y++) {
          for (let x = gx * cellW; x < Math.min((gx + 1) * cellW, imgW); x++) {
            const idx = (y * imgW + x) * 4;
            const brightness = (pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114);
            totalBrightness += brightness;
            pixelCount++;
          }
        }

        const avgBrightness = totalBrightness / pixelCount;
        const normalizedBrightness = avgBrightness / 255;

        // Negative space = low brightness variance and mid-to-high brightness
        // (flat, bright areas are good for text)
        const variance = this.calculateCellVariance(pixels, imgW, imgH, gx * cellW, gy * cellH, cellW, cellH);
        const score = (1 - variance) * normalizedBrightness;

        regions.push({
          x: gx * cellW * scaleX,
          y: gy * cellH * scaleY,
          w: cellW * scaleX,
          h: cellH * scaleY,
          score: score,
          brightness: normalizedBrightness,
          variance: variance
        });
      }
    }

    // Sort by score (higher = better negative space)
    regions.sort((a, b) => b.score - a.score);

    return {
      regions: regions.slice(0, 5), // Top 5 regions
      bestRegion: regions[0] || null,
      totalRegions: regions.length
    };
  }

  /**
   * Calculate brightness variance within a cell
   */
  calculateCellVariance(pixels, imgW, imgH, startX, startY, cellW, cellH) {
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = startY; y < Math.min(startY + cellH, imgH); y++) {
      for (let x = startX; x < Math.min(startX + cellW, imgW); x++) {
        const idx = (y * imgW + x) * 4;
        const brightness = (pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114) / 255;
        sum += brightness;
        sumSq += brightness * brightness;
        count++;
      }
    }

    if (count === 0) return 0;

    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);

    return Math.sqrt(Math.max(0, variance));
  }

  /**
   * Analyze composition metrics
   */
  analyzeComposition(pixels, imgW, imgH, canvasW, canvasH) {
    // Calculate color distribution
    const colorBins = { red: 0, green: 0, blue: 0, yellow: 0, cyan: 0, magenta: 0, neutral: 0 };
    let totalPixels = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;

      if (saturation < 0.1 || (r > 200 && g > 200 && b > 200) || (r < 50 && g < 50 && b < 50)) {
        colorBins.neutral++;
      } else if (r > g && r > b) {
        colorBins.red++;
      } else if (g > r && g > b) {
        colorBins.green++;
      } else if (b > r && b > g) {
        colorBins.blue++;
      } else if (r > 200 && g > 200 && b < 100) {
        colorBins.yellow++;
      } else if (r < 100 && g > 200 && b > 200) {
        colorBins.cyan++;
      } else {
        colorBins.magenta++;
      }

      totalPixels++;
    }

    // Calculate brand compatibility (KPMG blue = #00338D or #1E49E2)
    const blueRatio = colorBins.blue / totalPixels;
    const neutralRatio = colorBins.neutral / totalPixels;
    const brandCompatibility = Math.min(10, (blueRatio * 20) + (neutralRatio * 5));

    // Calculate overall quality score
    const brightnessVariance = this.calculateImageVariance(pixels, imgW, imgH);
    const qualityScore = Math.min(10, 10 - brightnessVariance * 5);

    return {
      colorDistribution: {
        red: colorBins.red / totalPixels,
        green: colorBins.green / totalPixels,
        blue: colorBins.blue / totalPixels,
        yellow: colorBins.yellow / totalPixels,
        cyan: colorBins.cyan / totalPixels,
        magenta: colorBins.magenta / totalPixels,
        neutral: colorBins.neutral / totalPixels
      },
      scores: {
        brandCompatibility: Math.round(brandCompatibility * 10) / 10,
        overall: Math.round(qualityScore * 10) / 10,
        colorBalance: Math.round((1 - Math.abs(blueRatio - 0.3)) * 10 * 10) / 10,
        complexity: Math.round(brightnessVariance * 10 * 10) / 10
      }
    };
  }

  /**
   * Calculate overall image brightness variance
   */
  calculateImageVariance(pixels, imgW, imgH) {
    let sum = 0;
    let sumSq = 0;
    const count = imgW * imgH;

    for (let i = 0; i < pixels.length; i += 4) {
      const brightness = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114) / 255;
      sum += brightness;
      sumSq += brightness * brightness;
    }

    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);

    return Math.sqrt(Math.max(0, variance));
  }

  /**
   * Assess image quality
   */
  assessQuality(pixels, imgW, imgH) {
    // Check for blur (edge sharpness)
    let edgeCount = 0;
    let totalEdges = 0;

    for (let y = 1; y < imgH - 1; y++) {
      for (let x = 1; x < imgW - 1; x++) {
        const idx = (y * imgW + x) * 4;
        const right = (y * imgW + (x + 1)) * 4;
        const bottom = ((y + 1) * imgW + x) * 4;

        const diff = Math.abs(pixels[idx] - pixels[right]) + 
                     Math.abs(pixels[idx + 1] - pixels[right + 1]) + 
                     Math.abs(pixels[idx + 2] - pixels[right + 2]) +
                     Math.abs(pixels[idx] - pixels[bottom]) + 
                     Math.abs(pixels[idx + 1] - pixels[bottom + 1]) + 
                     Math.abs(pixels[idx + 2] - pixels[bottom + 2]);

        if (diff > 100) edgeCount++;
        totalEdges++;
      }
    }

    const sharpness = edgeCount / totalEdges;

    // Check exposure
    let darkPixels = 0;
    let brightPixels = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const brightness = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114) / 255;
      if (brightness < 0.1) darkPixels++;
      if (brightness > 0.9) brightPixels++;
    }

    const totalPixels = imgW * imgH;
    const exposure = 1 - Math.abs((darkPixels / totalPixels) - (brightPixels / totalPixels));

    return {
      sharpness: Math.round(sharpness * 10 * 10) / 10,
      exposure: Math.round(exposure * 10 * 10) / 10,
      score: Math.round(((sharpness + exposure) / 2) * 10 * 10) / 10
    };
  }

  /**
   * Fallback analysis when image analysis fails
   */
  getFallbackAnalysis(canvasW, canvasH) {
    return {
      saliency: {
        focalPoint: { x: canvasW / 2, y: canvasH / 2 },
        score: 5,
        maxSaliency: 0.5
      },
      negativeSpace: {
        regions: [
          { x: canvasW * 0.1, y: canvasH * 0.1, w: canvasW * 0.3, h: canvasH * 0.3, score: 0.7 },
          { x: canvasW * 0.6, y: canvasH * 0.1, w: canvasW * 0.3, h: canvasH * 0.3, score: 0.6 }
        ],
        bestRegion: { x: canvasW * 0.1, y: canvasH * 0.1, w: canvasW * 0.3, h: canvasH * 0.3, score: 0.7 }
      },
      composition: {
        colorDistribution: { neutral: 0.5, blue: 0.2, red: 0.1, green: 0.1, yellow: 0.05, cyan: 0.03, magenta: 0.02 },
        scores: { brandCompatibility: 5, overall: 5, colorBalance: 5, complexity: 5 }
      },
      quality: { sharpness: 5, exposure: 5, score: 5 },
      timestamp: Date.now(),
      isFallback: true
    };
  }

  /**
   * Get cache key for image
   */
  getCacheKey(imageElement) {
    return `${imageElement.src || imageElement.currentSrc}_${imageElement.naturalWidth}_${imageElement.naturalHeight}`;
  }

  /**
   * Trim cache to max size
   */
  trimCache() {
    if (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Make available globally
window.AIAnalysisEngine = AIAnalysisEngine;

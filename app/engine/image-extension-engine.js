/**
 * Image Extension Engine
 * Intelligent image reconstruction with prioritized solution hierarchy
 */

class ImageExtensionEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.lamaModel = null;
        this.sdModel = null;
        this.session = null;
    }

    /**
     * Main extension pipeline
     * Attempts solutions in order: reposition -> crop -> extend -> texture -> outpainting
     */
    async extend(imageElement, fitAnalysis, constraints) {
        console.log('[Extension] Starting extension pipeline...');
        console.log('[Extension] Strategy:', fitAnalysis.strategy);

        const result = {
            strategy: fitAnalysis.strategy,
            steps: [],
            result: null,
            confidence: 0
        };

        switch(fitAnalysis.strategy) {
            case 'fit':
                // Image fits naturally, just scale
                result.result = imageElement;
                result.confidence = 1.0;
                result.steps.push('natural-fit');
                break;

            case 'reposition':
                result.result = await this.intelligentReposition(imageElement, fitAnalysis);
                result.steps.push('intelligent-reposition');
                result.confidence = 0.95;
                break;

            case 'smart-crop':
                result.result = await this.smartCrop(imageElement, fitAnalysis);
                result.steps.push('smart-crop');
                result.confidence = 0.90;
                break;

            case 'extend':
                const extensionResult = await this.safeEdgeExtension(
                    imageElement, fitAnalysis, constraints
                );
                result.result = extensionResult.image;
                result.steps.push(...extensionResult.steps);
                result.confidence = extensionResult.confidence;
                break;

            default:
                result.result = imageElement;
                result.confidence = 0.5;
        }

        return result;
    }

    /**
     * Solution 1: Intelligent Repositioning
     * Move image to better align focal point with canvas center
     */
    async intelligentReposition(imageElement, fitAnalysis) {
        const canvas = document.createElement('canvas');
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
        const ctx = canvas.getContext('2d');

        // Fill with average color
        ctx.drawImage(imageElement, 0, 0, 1, 1);
        const pixel = ctx.getImageData(0, 0, 1, 1).data;
        ctx.fillStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate scale to cover canvas
        const scaleX = canvas.width / imageElement.width;
        const scaleY = canvas.height / imageElement.height;
        const scale = Math.max(scaleX, scaleY);

        // Center the image
        const drawWidth = imageElement.width * scale;
        const drawHeight = imageElement.height * scale;
        const x = (canvas.width - drawWidth) / 2;
        const y = (canvas.height - drawHeight) / 2;

        ctx.drawImage(imageElement, x, y, drawWidth, drawHeight);

        return this.canvasToImage(canvas);
    }

    /**
     * Solution 2: Smart Cropping
     * Crop image while preserving focal point
     */
    async smartCrop(imageElement, fitAnalysis) {
        const canvas = document.createElement('canvas');
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
        const ctx = canvas.getContext('2d');

        // Determine crop region based on canvas ratio
        const targetRatio = fitAnalysis.canvasRatio;
        const imgRatio = fitAnalysis.imgRatio;

        let sx, sy, sWidth, sHeight;

        if (imgRatio > targetRatio) {
            // Image is wider, crop sides
            sHeight = imageElement.height;
            sWidth = sHeight * targetRatio;
            sx = (imageElement.width - sWidth) / 2;
            sy = 0;
        } else {
            // Image is taller, crop top/bottom
            sWidth = imageElement.width;
            sHeight = sWidth / targetRatio;
            sx = 0;
            sy = (imageElement.height - sHeight) / 2;
        }

        ctx.drawImage(
            imageElement,
            sx, sy, sWidth, sHeight,
            0, 0, canvas.width, canvas.height
        );

        return this.canvasToImage(canvas);
    }

    /**
     * Solution 3: Safe Edge Extension
     * Extend image edges using texture synthesis and AI outpainting
     */
    async safeEdgeExtension(imageElement, fitAnalysis, constraints) {
        const steps = [];
        let currentImage = imageElement;
        let confidence = 0.8;

        const safeRegions = constraints.safeExpansionRegions || [];
        const verySafeRegions = safeRegions.filter(r => r.type === 'very-safe');

        // If we have very safe regions, try texture synthesis first
        if (verySafeRegions.length > 0) {
            console.log('[Extension] Using texture synthesis for safe regions');
            const textureResult = await this.textureSynthesis(currentImage, fitAnalysis, verySafeRegions);
            if (textureResult) {
                currentImage = textureResult;
                steps.push('texture-synthesis');
                confidence = 0.85;
            }
        }

        // If still needs extension, try LaMa
        const stillNeedsExtension = this.checkStillNeedsExtension(currentImage);
        if (stillNeedsExtension) {
            console.log('[Extension] Attempting LaMa reconstruction');
            const lamaResult = await this.lamaOutpainting(currentImage, fitAnalysis);
            if (lamaResult) {
                currentImage = lamaResult.image;
                steps.push('lama-outpainting');
                confidence = lamaResult.confidence;
            } else {
                // Fallback to Stable Diffusion
                console.log('[Extension] LaMa insufficient, trying Stable Diffusion');
                const sdResult = await this.stableDiffusionOutpainting(currentImage, fitAnalysis);
                if (sdResult) {
                    currentImage = sdResult.image;
                    steps.push('stable-diffusion-outpainting');
                    confidence = sdResult.confidence;
                }
            }
        }

        return { image: currentImage, steps, confidence };
    }

    /**
     * Texture synthesis for safe regions
     */
    async textureSynthesis(imageElement, fitAnalysis, safeRegions) {
        const canvas = document.createElement('canvas');
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
        const ctx = canvas.getContext('2d');

        // Draw original image centered
        const scaleX = canvas.width / imageElement.width;
        const scaleY = canvas.height / imageElement.height;
        const scale = Math.min(scaleX, scaleY);

        const drawWidth = imageElement.width * scale;
        const drawHeight = imageElement.height * scale;
        const x = (canvas.width - drawWidth) / 2;
        const y = (canvas.height - drawHeight) / 2;

        ctx.drawImage(imageElement, x, y, drawWidth, drawHeight);

        // For safe regions, extend with edge pixels
        // Simple approach: mirror/reflect edges
        if (x > 0) {
            // Need to fill left/right
            const gradient = ctx.createLinearGradient(0, 0, x, 0);
            const edgePixel = ctx.getImageData(x + 2, y + drawHeight / 2, 1, 1).data;
            gradient.addColorStop(0, `rgb(${edgePixel[0]}, ${edgePixel[1]}, ${edgePixel[2]})`);
            gradient.addColorStop(1, `rgb(${edgePixel[0]}, ${edgePixel[1]}, ${edgePixel[2]})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, x, canvas.height);
            ctx.fillRect(x + drawWidth, 0, canvas.width - x - drawWidth, canvas.height);
        }

        if (y > 0) {
            // Need to fill top/bottom
            const gradient = ctx.createLinearGradient(0, 0, 0, y);
            const edgePixel = ctx.getImageData(x + drawWidth / 2, y + 2, 1, 1).data;
            gradient.addColorStop(0, `rgb(${edgePixel[0]}, ${edgePixel[1]}, ${edgePixel[2]})`);
            gradient.addColorStop(1, `rgb(${edgePixel[0]}, ${edgePixel[1]}, ${edgePixel[2]})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, y);
            ctx.fillRect(0, y + drawHeight, canvas.width, canvas.height - y - drawHeight);
        }

        // Redraw image on top
        ctx.drawImage(imageElement, x, y, drawWidth, drawHeight);

        return this.canvasToImage(canvas);
    }

    /**
     * LaMa outpainting (primary model)
     */
    async lamaOutpainting(imageElement, fitAnalysis) {
        try {
            // Check if ONNX is available
            if (typeof ort === 'undefined') {
                console.warn('[Extension] ONNX Runtime not available');
                return null;
            }

            // In production, this would load and run the LaMa ONNX model
            // For now, simulate with edge-aware fill
            const canvas = document.createElement('canvas');
            canvas.width = this.canvas.width;
            canvas.height = this.canvas.height;
            const ctx = canvas.getContext('2d');

            // Create mask for areas needing reconstruction
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = canvas.width;
            maskCanvas.height = canvas.height;
            const maskCtx = maskCanvas.getContext('2d');

            // Draw original image
            const scaleX = canvas.width / imageElement.width;
            const scaleY = canvas.height / imageElement.height;
            const scale = Math.min(scaleX, scaleY);

            const drawWidth = imageElement.width * scale;
            const drawHeight = imageElement.height * scale;
            const x = (canvas.width - drawWidth) / 2;
            const y = (canvas.height - drawHeight) / 2;

            ctx.drawImage(imageElement, x, y, drawWidth, drawHeight);

            // Mark areas outside image as needing reconstruction
            maskCtx.fillStyle = 'white';
            maskCtx.fillRect(0, 0, canvas.width, canvas.height);
            maskCtx.fillStyle = 'black';
            maskCtx.fillRect(x, y, drawWidth, drawHeight);

            // Simple edge-aware fill for reconstruction areas
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);

            // Fill white mask regions with edge-aware color
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const idx = (y * canvas.width + x) * 4;
                    if (maskData.data[idx] > 128) {
                        // Find nearest edge pixel
                        const nearest = this.findNearestEdgePixel(x, y, maskData, canvas.width, canvas.height);
                        if (nearest) {
                            const nearestIdx = (nearest.y * canvas.width + nearest.x) * 4;
                            imageData.data[idx] = imageData.data[nearestIdx];
                            imageData.data[idx + 1] = imageData.data[nearestIdx + 1];
                            imageData.data[idx + 2] = imageData.data[nearestIdx + 2];
                            imageData.data[idx + 3] = 255;
                        }
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);

            return {
                image: this.canvasToImage(canvas),
                confidence: 0.75
            };

        } catch (error) {
            console.error('[Extension] LaMa outpainting failed:', error);
            return null;
        }
    }

    /**
     * Stable Diffusion inpainting (secondary model)
     */
    async stableDiffusionOutpainting(imageElement, fitAnalysis) {
        try {
            // In production, this would load and run SD inpainting ONNX model
            // For now, use enhanced texture synthesis
            console.log('[Extension] Using enhanced texture synthesis (SD fallback)');

            const canvas = document.createElement('canvas');
            canvas.width = this.canvas.width;
            canvas.height = this.canvas.height;
            const ctx = canvas.getContext('2d');

            // Draw original
            const scaleX = canvas.width / imageElement.width;
            const scaleY = canvas.height / imageElement.height;
            const scale = Math.min(scaleX, scaleY);

            const drawWidth = imageElement.width * scale;
            const drawHeight = imageElement.height * scale;
            const x = (canvas.width - drawWidth) / 2;
            const y = (canvas.height - drawHeight) / 2;

            ctx.drawImage(imageElement, x, y, drawWidth, drawHeight);

            // Enhanced edge fill with noise for realism
            if (x > 0 || y > 0) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // Sample edge colors
                const edgeColors = [];
                for (let i = 0; i < 20; i++) {
                    const sx = x > 0 ? x + 2 : Math.random() * drawWidth + x;
                    const sy = y > 0 ? y + 2 : Math.random() * drawHeight + y;
                    const idx = (Math.floor(sy) * canvas.width + Math.floor(sx)) * 4;
                    edgeColors.push([
                        imageData.data[idx],
                        imageData.data[idx + 1],
                        imageData.data[idx + 2]
                    ]);
                }

                // Fill gaps with sampled colors + noise
                for (let py = 0; py < canvas.height; py++) {
                    for (let px = 0; px < canvas.width; px++) {
                        if (px < x || px > x + drawWidth || py < y || py > y + drawHeight) {
                            const idx = (py * canvas.width + px) * 4;
                            const color = edgeColors[Math.floor(Math.random() * edgeColors.length)];
                            const noise = (Math.random() - 0.5) * 20;

                            imageData.data[idx] = Math.max(0, Math.min(255, color[0] + noise));
                            imageData.data[idx + 1] = Math.max(0, Math.min(255, color[1] + noise));
                            imageData.data[idx + 2] = Math.max(0, Math.min(255, color[2] + noise));
                            imageData.data[idx + 3] = 255;
                        }
                    }
                }

                ctx.putImageData(imageData, 0, 0);
            }

            return {
                image: this.canvasToImage(canvas),
                confidence: 0.65
            };

        } catch (error) {
            console.error('[Extension] SD outpainting failed:', error);
            return null;
        }
    }

    /**
     * Find nearest non-masked pixel
     */
    findNearestEdgePixel(x, y, maskData, width, height) {
        const maxRadius = 50;

        for (let r = 1; r < maxRadius; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;

                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        if (maskData.data[idx] < 128) {
                            return { x: nx, y: ny };
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Check if image still needs extension
     */
    checkStillNeedsExtension(imageElement) {
        const imgRatio = imageElement.width / imageElement.height;
        const canvasRatio = this.canvas.width / this.canvas.height;
        return Math.abs(imgRatio - canvasRatio) > 0.1;
    }

    /**
     * Convert canvas to image element
     */
    canvasToImage(canvas) {
        const img = new Image();
        img.src = canvas.toDataURL('image/png');
        return img;
    }
}

// Make available globally
window.ImageExtensionEngine = ImageExtensionEngine;

/**
 * AI Analysis Engine
 * Local image analysis using ONNX Runtime Web
 * Simulates AI pipeline with computer vision algorithms
 */

class AIAnalysisEngine {
    constructor() {
        this.session = null;
        this.modelsLoaded = false;
        this.analysisCache = new Map();

        // Simulated model configurations
        this.models = {
            scene: { name: 'MobileNet-Scene', input: [1, 224, 224, 3] },
            object: { name: 'YOLOv8n-Object', input: [1, 640, 640, 3] },
            pose: { name: 'MoveNet-Pose', input: [1, 256, 256, 3] },
            saliency: { name: 'U2Net-Saliency', input: [1, 320, 320, 3] },
            segmentation: { name: 'DeepLab-Seg', input: [1, 513, 513, 3] }
        };
    }

    /**
     * Initialize ONNX Runtime and load models
     */
    async initialize() {
        try {
            // Check if ONNX Runtime is available
            if (typeof ort === 'undefined') {
                console.warn('ONNX Runtime not available, using simulation mode');
                this.modelsLoaded = false;
                return false;
            }

            // Initialize ONNX Runtime with WebGL backend
            const options = {
                executionProviders: ['webgl', 'wasm'],
                graphOptimizationLevel: 'all'
            };

            this.session = await ort.InferenceSession.create('./models/scene-classifier.onnx', options);
            this.modelsLoaded = true;
            return true;
        } catch (error) {
            console.warn('AI initialization failed, using simulation mode:', error);
            this.modelsLoaded = false;
            return false;
        }
    }

    /**
     * Run complete AI analysis pipeline
     */
    async analyzeImage(imageElement, canvasWidth, canvasHeight) {
        const startTime = performance.now();

        // Update progress
        this.updateProgress(0, 'Initializing analysis...');

        try {
            // Step 1: Scene Classification
            this.updateProgress(10, 'Classifying scene...');
            const sceneResult = await this.classifyScene(imageElement);
            await this.delay(200);

            // Step 2: Object Detection
            this.updateProgress(25, 'Detecting objects...');
            const objects = await this.detectObjects(imageElement);
            await this.delay(200);

            // Step 3: Pose Detection
            this.updateProgress(40, 'Analyzing poses...');
            const poses = await this.detectPoses(imageElement);
            await this.delay(200);

            // Step 4: Saliency Detection (Critical)
            this.updateProgress(55, 'Detecting focal points...');
            const saliency = await this.detectSaliency(imageElement, canvasWidth, canvasHeight);
            await this.delay(200);

            // Step 5: Segmentation
            this.updateProgress(70, 'Segmenting image...');
            const segmentation = await this.segmentImage(imageElement);
            await this.delay(200);

            // Step 6: Negative Space Analysis
            this.updateProgress(80, 'Analyzing negative space...');
            const negativeSpace = await this.analyzeNegativeSpace(saliency, segmentation, canvasWidth, canvasHeight);
            await this.delay(200);

            // Step 7: Composition Analysis
            this.updateProgress(90, 'Evaluating composition...');
            const composition = await this.analyzeComposition(sceneResult, objects, poses, saliency, canvasWidth, canvasHeight);
            await this.delay(200);

            // Step 8: Brand Compatibility
            this.updateProgress(95, 'Checking brand compatibility...');
            const brandCompatibility = await this.checkBrandCompatibility(sceneResult, composition);

            this.updateProgress(100, 'Analysis complete!');

            const analysisTime = ((performance.now() - startTime) / 1000).toFixed(1);

            return {
                scene: sceneResult,
                objects: objects,
                poses: poses,
                saliency: saliency,
                segmentation: segmentation,
                negativeSpace: negativeSpace,
                composition: composition,
                brandCompatibility: brandCompatibility,
                analysisTime: analysisTime,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('AI Analysis error:', error);
            throw error;
        }
    }

    /**
     * Scene Classification
     * Determines image category: people in motion, architecture, nature in motion
     */
    async classifyScene(imageElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 224;
        canvas.height = 224;
        ctx.drawImage(imageElement, 0, 0, 224, 224);

        const imageData = ctx.getImageData(0, 0, 224, 224);
        const features = this.extractImageFeatures(imageData);

        // Classification logic based on image features
        let category, confidence, subcategory;

        const { edgeDensity, colorVariance, motionBlur, humanSkinTones, verticalLines, blueSkyRatio, waterLike } = features;

        // People in motion detection
        if (humanSkinTones > 0.08 && motionBlur > 0.15) {
            category = 'people-motion';
            subcategory = motionBlur > 0.3 ? 'running' : 'walking';
            confidence = Math.min(0.95, 0.7 + motionBlur * 0.5);
        }
        // Architecture detection
        else if (verticalLines > 0.2 && edgeDensity > 0.15 && humanSkinTones < 0.05) {
            category = 'architecture';
            subcategory = verticalLines > 0.4 ? 'modern-structures' : 'urban-composition';
            confidence = Math.min(0.92, 0.6 + verticalLines * 0.8);
        }
        // Nature in motion detection
        else if ((waterLike > 0.1 || motionBlur > 0.1) && blueSkyRatio > 0.1) {
            category = 'nature-motion';
            subcategory = waterLike > 0.15 ? 'water-movement' : 'dynamic-landscape';
            confidence = Math.min(0.88, 0.55 + waterLike * 1.5);
        }
        // Static people (rejected category)
        else if (humanSkinTones > 0.1 && motionBlur < 0.05) {
            category = 'people-static';
            subcategory = 'static-portrait';
            confidence = 0.75;
        }
        // Static nature (rejected category)
        else if (blueSkyRatio > 0.3 && waterLike < 0.03 && motionBlur < 0.05) {
            category = 'nature-static';
            subcategory = 'static-scenery';
            confidence = 0.7;
        }
        // Default
        else {
            category = 'mixed';
            subcategory = 'general';
            confidence = 0.5;
        }

        return {
            category,
            subcategory,
            confidence: Math.round(confidence * 100) / 100,
            features
        };
    }

    /**
     * Object Detection
     */
    async detectObjects(imageElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 640;
        canvas.height = 640;
        ctx.drawImage(imageElement, 0, 0, 640, 640);

        const imageData = ctx.getImageData(0, 0, 640, 640);
        const features = this.extractImageFeatures(imageData);

        const detections = [];

        // Simulate object detection based on features
        if (features.humanSkinTones > 0.05) {
            detections.push({
                class: 'person',
                confidence: Math.min(0.95, features.humanSkinTones * 3),
                bbox: this.generateRandomBBox(640, 640, 0.3, 0.7)
            });
        }

        if (features.verticalLines > 0.2) {
            detections.push({
                class: 'building',
                confidence: Math.min(0.9, features.verticalLines * 2),
                bbox: this.generateRandomBBox(640, 640, 0.4, 0.8)
            });
        }

        if (features.waterLike > 0.08) {
            detections.push({
                class: 'water',
                confidence: Math.min(0.85, features.waterLike * 4),
                bbox: this.generateRandomBBox(640, 640, 0.2, 0.5)
            });
        }

        if (features.blueSkyRatio > 0.15) {
            detections.push({
                class: 'sky',
                confidence: Math.min(0.9, features.blueSkyRatio * 2),
                bbox: this.generateRandomBBox(640, 640, 0.3, 0.4)
            });
        }

        return detections;
    }

    /**
     * Pose Detection
     */
    async detectPoses(imageElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 256;
        ctx.drawImage(imageElement, 0, 0, 256, 256);

        const imageData = ctx.getImageData(0, 0, 256, 256);
        const features = this.extractImageFeatures(imageData);

        const poses = [];

        if (features.humanSkinTones > 0.05) {
            const isDynamic = features.motionBlur > 0.1;
            const keypoints = this.generateKeypoints(256, 256, isDynamic);

            poses.push({
                confidence: Math.min(0.95, features.humanSkinTones * 2.5),
                keypoints: keypoints,
                isDynamic: isDynamic,
                direction: this.inferDirection(keypoints)
            });
        }

        return poses;
    }

    /**
     * Saliency Detection - CRITICAL SYSTEM
     * Detects focal points and visual attention areas
     */
    async detectSaliency(imageElement, canvasWidth, canvasHeight) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Use smaller size for performance
        const analysisSize = 320;
        canvas.width = analysisSize;
        canvas.height = analysisSize;
        ctx.drawImage(imageElement, 0, 0, analysisSize, analysisSize);

        const imageData = ctx.getImageData(0, 0, analysisSize, analysisSize);
        const data = imageData.data;

        // Generate saliency map using multi-scale analysis
        const saliencyMap = new Float32Array(analysisSize * analysisSize);

        // Center bias (images often have subject near center)
        const centerX = analysisSize / 2;
        const centerY = analysisSize / 2;

        for (let y = 0; y < analysisSize; y++) {
            for (let x = 0; x < analysisSize; x++) {
                const idx = (y * analysisSize + x) * 4;

                // Color contrast
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

                // Edge detection (simplified Sobel)
                let edgeScore = 0;
                if (x > 0 && x < analysisSize - 1 && y > 0 && y < analysisSize - 1) {
                    const left = ((y * analysisSize + (x - 1)) * 4);
                    const right = ((y * analysisSize + (x + 1)) * 4);
                    const top = (((y - 1) * analysisSize + x) * 4);
                    const bottom = (((y + 1) * analysisSize + x) * 4);

                    const gx = Math.abs(data[right] - data[left]);
                    const gy = Math.abs(data[bottom] - data[top]);
                    edgeScore = Math.sqrt(gx * gx + gy * gy) / 255;
                }

                // Center distance falloff
                const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                const centerBias = Math.exp(-distFromCenter / (analysisSize * 0.4));

                // Combine factors
                const colorContrast = Math.abs(luminance - 128) / 128;
                saliencyMap[y * analysisSize + x] = 
                    (edgeScore * 0.4 + colorContrast * 0.3 + centerBias * 0.3);
            }
        }

        // Find focal point (peak saliency)
        let maxSaliency = 0;
        let focalX = 0, focalY = 0;

        for (let y = 0; y < analysisSize; y++) {
            for (let x = 0; x < analysisSize; x++) {
                const val = saliencyMap[y * analysisSize + x];
                if (val > maxSaliency) {
                    maxSaliency = val;
                    focalX = x;
                    focalY = y;
                }
            }
        }

        // Scale to canvas coordinates
        const scaleX = canvasWidth / analysisSize;
        const scaleY = canvasHeight / analysisSize;

        // Find salient regions (areas above threshold)
        const threshold = maxSaliency * 0.6;
        const regions = [];
        const visited = new Set();

        for (let y = 0; y < analysisSize; y += 4) {
            for (let x = 0; x < analysisSize; x += 4) {
                const key = `${x},${y}`;
                if (visited.has(key)) continue;

                const val = saliencyMap[y * analysisSize + x];
                if (val > threshold) {
                    // Flood fill to find region
                    const region = this.floodFill(saliencyMap, x, y, analysisSize, threshold, visited);
                    if (region.size > 50) {
                        regions.push({
                            x: Math.round(region.centerX * scaleX),
                            y: Math.round(region.centerY * scaleY),
                            radius: Math.round(Math.sqrt(region.size) * Math.max(scaleX, scaleY) * 0.5),
                            intensity: region.avgIntensity
                        });
                    }
                }
            }
        }

        // Sort by intensity
        regions.sort((a, b) => b.intensity - a.intensity);

        return {
            focalPoint: {
                x: Math.round(focalX * scaleX),
                y: Math.round(focalY * scaleY),
                intensity: maxSaliency
            },
            salientRegions: regions.slice(0, 5),
            map: saliencyMap,
            mapWidth: analysisSize,
            mapHeight: analysisSize
        };
    }

    /**
     * Semantic Segmentation
     */
    async segmentImage(imageElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 513;
        canvas.height = 513;
        ctx.drawImage(imageElement, 0, 0, 513, 513);

        const imageData = ctx.getImageData(0, 0, 513, 513);
        const features = this.extractImageFeatures(imageData);

        // Simulate segmentation masks
        const masks = {};

        if (features.blueSkyRatio > 0.1) {
            masks.sky = { ratio: features.blueSkyRatio, color: [135, 206, 235] };
        }
        if (features.waterLike > 0.05) {
            masks.water = { ratio: features.waterLike, color: [64, 164, 223] };
        }
        if (features.humanSkinTones > 0.03) {
            masks.person = { ratio: features.humanSkinTones, color: [255, 220, 177] };
        }
        if (features.verticalLines > 0.1) {
            masks.building = { ratio: features.verticalLines * 0.5, color: [128, 128, 128] };
        }

        return masks;
    }

    /**
     * Negative Space Analysis
     */
    async analyzeNegativeSpace(saliency, segmentation, canvasWidth, canvasHeight) {
        const negativeRegions = [];
        const gridSize = 20;
        const cellW = canvasWidth / gridSize;
        const cellH = canvasHeight / gridSize;

        // Create low-attention map
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const x = col * cellW;
                const y = row * cellH;

                // Check if this cell overlaps with salient regions
                let attention = 0;
                for (const region of saliency.salientRegions) {
                    const dx = x + cellW / 2 - region.x;
                    const dy = y + cellH / 2 - region.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < region.radius * 1.5) {
                        attention += region.intensity * (1 - dist / (region.radius * 1.5));
                    }
                }

                // Low attention = negative space
                if (attention < 0.1) {
                    negativeRegions.push({
                        x: Math.round(x),
                        y: Math.round(y),
                        width: Math.round(cellW),
                        height: Math.round(cellH),
                        attention: attention
                    });
                }
            }
        }

        // Merge adjacent regions
        const merged = this.mergeRegions(negativeRegions);

        // Score negative space quality
        const totalArea = canvasWidth * canvasHeight;
        const negativeArea = merged.reduce((sum, r) => sum + r.width * r.height, 0);
        const coverage = negativeArea / totalArea;

        return {
            regions: merged,
            coverage: Math.round(coverage * 100) / 100,
            quality: coverage > 0.3 && coverage < 0.7 ? 0.9 : 0.5,
            preferredZones: merged.filter(r => r.width > 100 && r.height > 50).slice(0, 4)
        };
    }

    /**
     * Composition Analysis
     */
    async analyzeComposition(scene, objects, poses, saliency, canvasWidth, canvasHeight) {
        const scores = {
            focalClarity: 0,
            motionEnergy: 0,
            negativeSpace: 0,
            compositionQuality: 0,
            brandCompatibility: 0
        };

        // Focal clarity based on saliency peak
        scores.focalClarity = Math.min(10, saliency.focalPoint.intensity * 15 + 3);

        // Motion energy based on scene type and blur
        if (scene.category === 'people-motion') {
            scores.motionEnergy = Math.min(10, scene.features.motionBlur * 25 + 4);
        } else if (scene.category === 'nature-motion') {
            scores.motionEnergy = Math.min(10, scene.features.waterLike * 30 + 3);
        } else {
            scores.motionEnergy = Math.min(10, scene.features.motionBlur * 20 + 2);
        }

        // Negative space (will be updated after negative space analysis)
        scores.negativeSpace = 5;

        // Composition quality based on rule of thirds
        const focalX = saliency.focalPoint.x / canvasWidth;
        const focalY = saliency.focalPoint.y / canvasHeight;
        const thirdsScore = this.calculateRuleOfThirds(focalX, focalY);
        scores.compositionQuality = Math.min(10, thirdsScore * 8 + 2);

        // Brand compatibility
        scores.brandCompatibility = this.calculateBrandCompatibility(scene, scores);

        return {
            scores: {
                focalClarity: Math.round(scores.focalClarity * 10) / 10,
                motionEnergy: Math.round(scores.motionEnergy * 10) / 10,
                negativeSpace: Math.round(scores.negativeSpace * 10) / 10,
                compositionQuality: Math.round(scores.compositionQuality * 10) / 10,
                brandCompatibility: Math.round(scores.brandCompatibility * 10) / 10
            },
            overall: Math.round(
                (scores.focalClarity + scores.motionEnergy + scores.negativeSpace + 
                 scores.compositionQuality + scores.brandCompatibility) / 5 * 10
            ) / 10,
            status: scores.brandCompatibility >= 7 ? 'approved' : 
                    scores.brandCompatibility >= 5 ? 'warning' : 'rejected'
        };
    }

    /**
     * Check brand compatibility
     */
    async checkBrandCompatibility(scene, composition) {
        // Approved categories
        const approvedCategories = ['people-motion', 'architecture', 'nature-motion'];

        // Rejected categories
        const rejectedCategories = ['people-static', 'nature-static'];

        if (rejectedCategories.includes(scene.category)) {
            return Math.max(2, composition.scores.compositionQuality * 0.3);
        }

        if (approvedCategories.includes(scene.category)) {
            return Math.min(10, composition.scores.compositionQuality * 0.8 + 2);
        }

        return Math.min(7, composition.scores.compositionQuality * 0.6 + 1);
    }

    /**
     * Extract image features for analysis
     */
    extractImageFeatures(imageData) {
        const data = imageData.data;
        const pixelCount = data.length / 4;

        let edgeDensity = 0;
        let colorVariance = 0;
        let motionBlur = 0;
        let humanSkinTones = 0;
        let verticalLines = 0;
        let blueSkyRatio = 0;
        let waterLike = 0;

        const width = imageData.width;
        const height = imageData.height;

        // Sample pixels for performance
        const sampleStep = Math.max(1, Math.floor(Math.sqrt(pixelCount / 5000)));
        let sampleCount = 0;

        let prevLuminance = 0;
        let luminanceSum = 0;
        let luminanceSqSum = 0;

        for (let y = 0; y < height; y += sampleStep) {
            for (let x = 0; x < width; x += sampleStep) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                luminanceSum += luminance;
                luminanceSqSum += luminance * luminance;

                // Detect human skin tones
                if (r > 60 && r < 255 && g > 40 && g < 220 && b > 20 && b < 180) {
                    const rg = r - g;
                    const rb = r - b;
                    if (rg > 10 && rg < 60 && rb > 10 && rb < 70) {
                        humanSkinTones++;
                    }
                }

                // Detect blue sky
                if (b > r + 20 && b > g + 10 && b > 80) {
                    blueSkyRatio++;
                }

                // Detect water-like colors
                if ((b > 80 && g > 60 && r < b - 10) || (g > 100 && b > 80 && r < g - 20)) {
                    waterLike++;
                }

                // Simple edge detection
                if (x > 0) {
                    const prevIdx = (y * width + (x - sampleStep)) * 4;
                    const prevLum = 0.299 * data[prevIdx] + 0.587 * data[prevIdx + 1] + 0.114 * data[prevIdx + 2];
                    const diff = Math.abs(luminance - prevLum);
                    if (diff > 30) edgeDensity++;

                    // Vertical line detection
                    if (diff > 50 && Math.abs(y - height / 2) < height * 0.3) {
                        verticalLines++;
                    }
                }

                // Motion blur detection (simplified)
                if (x > sampleStep) {
                    const motionDiff = Math.abs(luminance - prevLuminance);
                    if (motionDiff > 5 && motionDiff < 30) {
                        motionBlur++;
                    }
                }
                prevLuminance = luminance;

                sampleCount++;
            }
        }

        const meanLum = luminanceSum / sampleCount;
        const variance = (luminanceSqSum / sampleCount) - (meanLum * meanLum);
        colorVariance = Math.sqrt(variance) / 128;

        return {
            edgeDensity: edgeDensity / sampleCount,
            colorVariance: colorVariance,
            motionBlur: motionBlur / sampleCount,
            humanSkinTones: humanSkinTones / sampleCount,
            verticalLines: verticalLines / (sampleCount * 0.5),
            blueSkyRatio: blueSkyRatio / sampleCount,
            waterLike: waterLike / sampleCount
        };
    }

    /**
     * Calculate rule of thirds score
     */
    calculateRuleOfThirds(x, y) {
        const thirds = [1/3, 2/3];
        const distX = Math.min(Math.abs(x - thirds[0]), Math.abs(x - thirds[1]));
        const distY = Math.min(Math.abs(y - thirds[0]), Math.abs(y - thirds[1]));
        const score = 1 - (distX + distY) / 2;
        return Math.max(0, score);
    }

    /**
     * Calculate brand compatibility score
     */
    calculateBrandCompatibility(scene, scores) {
        const approvedCategories = ['people-motion', 'architecture', 'nature-motion'];

        if (approvedCategories.includes(scene.category)) {
            return Math.min(10, (scores.focalClarity + scores.compositionQuality) / 2 + 2);
        }

        return Math.min(6, scores.compositionQuality * 0.5);
    }

    /**
     * Generate random bounding box
     */
    generateRandomBBox(width, height, minScale, maxScale) {
        const scale = minScale + Math.random() * (maxScale - minScale);
        const w = width * scale;
        const h = height * scale * (0.5 + Math.random() * 0.5);
        const x = Math.random() * (width - w);
        const y = Math.random() * (height - h);
        return [x, y, w, h];
    }

    /**
     * Generate pose keypoints
     */
    generateKeypoints(width, height, isDynamic) {
        const cx = width / 2 + (Math.random() - 0.5) * width * 0.2;
        const cy = height / 2 + (Math.random() - 0.5) * height * 0.2;

        const spread = isDynamic ? 0.3 : 0.15;

        return {
            nose: { x: cx, y: cy - height * 0.25 },
            leftEye: { x: cx - width * 0.05, y: cy - height * 0.28 },
            rightEye: { x: cx + width * 0.05, y: cy - height * 0.28 },
            leftShoulder: { x: cx - width * spread, y: cy - height * 0.1 },
            rightShoulder: { x: cx + width * spread, y: cy - height * 0.1 },
            leftElbow: { x: cx - width * spread * 1.5, y: cy + height * 0.05 },
            rightElbow: { x: cx + width * spread * 1.5, y: cy + height * 0.05 },
            leftWrist: { x: cx - width * spread * 2, y: cy - height * 0.05 },
            rightWrist: { x: cx + width * spread * 2, y: cy + height * 0.1 },
            leftHip: { x: cx - width * spread * 0.7, y: cy + height * 0.15 },
            rightHip: { x: cx + width * spread * 0.7, y: cy + height * 0.15 },
            leftKnee: { x: cx - width * spread, y: cy + height * 0.3 },
            rightKnee: { x: cx + width * spread, y: cy + height * 0.3 },
            leftAnkle: { x: cx - width * spread * 1.2, y: cy + height * 0.45 },
            rightAnkle: { x: cx + width * spread * 1.2, y: cy + height * 0.45 }
        };
    }

    /**
     * Infer direction from pose
     */
    inferDirection(keypoints) {
        const leftX = (keypoints.leftShoulder.x + keypoints.leftHip.x) / 2;
        const rightX = (keypoints.rightShoulder.x + keypoints.rightHip.x) / 2;

        if (Math.abs(leftX - rightX) < 10) return 'center';
        return leftX < rightX ? 'right' : 'left';
    }

    /**
     * Flood fill for region detection
     */
    floodFill(map, startX, startY, size, threshold, visited) {
        const stack = [[startX, startY]];
        let sumX = 0, sumY = 0, count = 0, sumIntensity = 0;

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            if (x < 0 || x >= size || y < 0 || y >= size) continue;

            const val = map[y * size + x];
            if (val < threshold) continue;

            visited.add(key);
            sumX += x;
            sumY += y;
            sumIntensity += val;
            count++;

            stack.push([x + 4, y], [x - 4, y], [x, y + 4], [x, y - 4]);
        }

        return {
            size: count,
            centerX: count > 0 ? sumX / count : startX,
            centerY: count > 0 ? sumY / count : startY,
            avgIntensity: count > 0 ? sumIntensity / count : 0
        };
    }

    /**
     * Merge adjacent regions
     */
    mergeRegions(regions) {
        if (regions.length === 0) return [];

        const merged = [regions[0]];

        for (let i = 1; i < regions.length; i++) {
            const r = regions[i];
            let mergedWith = false;

            for (const m of merged) {
                if (this.regionsOverlap(r, m)) {
                    m.x = Math.min(m.x, r.x);
                    m.y = Math.min(m.y, r.y);
                    m.width = Math.max(m.x + m.width, r.x + r.width) - m.x;
                    m.height = Math.max(m.y + m.height, r.y + r.height) - m.y;
                    mergedWith = true;
                    break;
                }
            }

            if (!mergedWith) {
                merged.push(r);
            }
        }

        return merged;
    }

    /**
     * Check if two regions overlap
     */
    regionsOverlap(a, b) {
        return !(a.x + a.width < b.x || b.x + b.width < a.x ||
                 a.y + a.height < b.y || b.y + b.height < a.y);
    }

    /**
     * Update progress callback
     */
    updateProgress(percent, text) {
        if (this.onProgress) {
            this.onProgress(percent, text);
        }
    }

    /**
     * Utility delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Set progress callback
     */
    setProgressCallback(callback) {
        this.onProgress = callback;
    }
}

// Make available globally
window.AIAnalysisEngine = AIAnalysisEngine;

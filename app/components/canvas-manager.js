/**
 * Canvas Manager
 * Fabric.js canvas with zoom, pan, snapping, and layer management
 */

class CanvasManager {
    constructor(canvasId, width, height) {
        this.canvasId = canvasId;
        this.originalWidth = width;
        this.originalHeight = height;

        // Initialize Fabric.js canvas
        this.canvas = new fabric.Canvas(canvasId, {
            width: width,
            height: height,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true,
            selection: true,
            uniScaleTransform: false
        });

        // State
        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 5;
        this.isPanning = false;
        this.lastPosX = 0;
        this.lastPosY = 0;
        this.gridSystem = null;
        this.showGrid = true;
        this.showMargins = true;
        this.snapToGrid = false;
        this.showHeatmap = false;
        this.showNegative = false;
        this.showZones = false;

        // Layer management
        this.layers = {
            background: { visible: true, locked: false, zIndex: 0 },
            logo: { visible: true, locked: false, zIndex: 10 },
            tagline: { visible: true, locked: false, zIndex: 20 },
            metadata: { visible: true, locked: false, zIndex: 30 },
            grid: { visible: true, locked: true, zIndex: 100 },
            aiOverlay: { visible: true, locked: true, zIndex: 90 }
        };

        // Objects registry
        this.objects = {
            background: null,
            logo: null,
            tagline: null,
            metadata: null,
            gridLines: [],
            marginRect: null,
            heatmap: null,
            negativeSpace: null,
            zones: []
        };

        this.setupEventListeners();
        this.setupCanvasBehavior();
    }

    /**
     * Set grid system
     */
    setGridSystem(gridSystem) {
        this.gridSystem = gridSystem;
        this.drawGrid();
    }

    /**
     * Setup canvas event listeners
     */
    setupEventListeners() {
        // Mouse wheel zoom
        this.canvas.on('mouse:wheel', (opt) => {
            const delta = opt.e.deltaY;
            let zoom = this.canvas.getZoom();
            zoom *= 0.999 ** delta;
            zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));

            this.canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
            this.zoom = zoom;
            this.updateZoomDisplay();
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });

        // Pan mode
        this.canvas.on('mouse:down', (opt) => {
            if (this.isPanning || opt.e.altKey) {
                this.canvas.isDragging = true;
                this.lastPosX = opt.e.clientX;
                this.lastPosY = opt.e.clientY;
                this.canvas.selection = false;
            }
        });

        this.canvas.on('mouse:move', (opt) => {
            if (this.canvas.isDragging) {
                const vpt = this.canvas.viewportTransform;
                vpt[4] += opt.e.clientX - this.lastPosX;
                vpt[5] += opt.e.clientY - this.lastPosY;
                this.canvas.requestRenderAll();
                this.lastPosX = opt.e.clientX;
                this.lastPosY = opt.e.clientY;
            }
        });

        this.canvas.on('mouse:up', () => {
            this.canvas.isDragging = false;
            this.canvas.selection = true;
        });

        // Object modified - snap to grid
        this.canvas.on('object:modified', (opt) => {
            if (this.snapToGrid && this.gridSystem && opt.target) {
                this.snapObjectToGrid(opt.target);
            }
            this.updateObjectPosition(opt.target);
        });

        // Object moving - show alignment guides
        this.canvas.on('object:moving', (opt) => {
            this.showAlignmentGuides(opt.target);
        });
    }

    /**
     * Setup canvas behavior defaults
     */
    setupCanvasBehavior() {
        // Set default properties for new objects
        fabric.Object.prototype.set({
            borderColor: '#4f8fff',
            cornerColor: '#4f8fff',
            cornerStrokeColor: '#ffffff',
            cornerSize: 8,
            transparentCorners: false,
            cornerStyle: 'circle',
            selectionBackgroundColor: 'rgba(79, 143, 255, 0.1)'
        });

        // Disable rotation for text
        fabric.Text.prototype.set({
            lockRotation: true
        });
    }

    /**
     * Draw grid overlay
     */
    drawGrid() {
        if (!this.gridSystem) return;

        // Remove existing grid
        this.objects.gridLines.forEach(line => this.canvas.remove(line));
        this.objects.gridLines = [];

        if (this.objects.marginRect) {
            this.canvas.remove(this.objects.marginRect);
        }

        if (!this.showGrid && !this.showMargins) return;

        const lines = this.gridSystem.generateGridLines();
        const marginRect = this.gridSystem.generateMarginRect();

        // Draw margin rectangle
        if (this.showMargins) {
            const rect = new fabric.Rect({
                left: marginRect.left,
                top: marginRect.top,
                width: marginRect.width,
                height: marginRect.height,
                fill: 'transparent',
                stroke: 'rgba(245, 158, 11, 0.4)',
                strokeWidth: 1,
                strokeDashArray: [4, 4],
                selectable: false,
                evented: false,
                name: 'margin'
            });
            this.canvas.add(rect);
            this.objects.marginRect = rect;
        }

        // Draw grid lines
        if (this.showGrid) {
            lines.forEach(line => {
                const fabricLine = new fabric.Line(
                    [line.x1, line.y1, line.x2, line.y2],
                    {
                        stroke: line.major ? 'rgba(79, 143, 255, 0.3)' : 'rgba(79, 143, 255, 0.15)',
                        strokeWidth: 1,
                        selectable: false,
                        evented: false,
                        name: 'grid'
                    }
                );
                this.canvas.add(fabricLine);
                this.objects.gridLines.push(fabricLine);
            });
        }

        this.canvas.renderAll();
    }

    /**
     * Draw focal point heatmap
     */
    drawHeatmap(saliency) {
        // Remove existing heatmap
        if (this.objects.heatmap) {
            this.canvas.remove(this.objects.heatmap);
        }

        if (!this.showHeatmap || !saliency) return;

        const focalPoint = saliency.focalPoint;

        // Draw focal point indicator
        const circle = new fabric.Circle({
            left: focalPoint.x - 20,
            top: focalPoint.y - 20,
            radius: 20,
            fill: 'rgba(239, 68, 68, 0.2)',
            stroke: 'rgba(239, 68, 68, 0.6)',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            name: 'heatmap'
        });

        // Add crosshair
        const crossV = new fabric.Line(
            [focalPoint.x, focalPoint.y - 30, focalPoint.x, focalPoint.y + 30],
            {
                stroke: 'rgba(239, 68, 68, 0.6)',
                strokeWidth: 1,
                selectable: false,
                evented: false
            }
        );
        const crossH = new fabric.Line(
            [focalPoint.x - 30, focalPoint.y, focalPoint.x + 30, focalPoint.y],
            {
                stroke: 'rgba(239, 68, 68, 0.6)',
                strokeWidth: 1,
                selectable: false,
                evented: false
            }
        );

        this.canvas.add(circle, crossV, crossH);
        this.objects.heatmap = new fabric.Group([circle, crossV, crossH], {
            selectable: false,
            evented: false
        });
    }

    /**
     * Draw negative space overlay
     */
    drawNegativeSpace(negativeSpace) {
        // Remove existing
        if (this.objects.negativeSpace) {
            this.canvas.remove(this.objects.negativeSpace);
        }

        if (!this.showNegative || !negativeSpace) return;

        const rects = [];
        negativeSpace.preferredZones.forEach(zone => {
            const rect = new fabric.Rect({
                left: zone.x,
                top: zone.y,
                width: zone.width,
                height: zone.height,
                fill: 'rgba(0, 212, 170, 0.15)',
                stroke: 'rgba(0, 212, 170, 0.4)',
                strokeWidth: 1,
                strokeDashArray: [2, 2],
                selectable: false,
                evented: false
            });
            rects.push(rect);
        });

        if (rects.length > 0) {
            const group = new fabric.Group(rects, {
                selectable: false,
                evented: false,
                name: 'negative-space'
            });
            this.canvas.add(group);
            this.objects.negativeSpace = group;
        }
    }

    /**
     * Draw composition zones
     */
    drawZones(zones) {
        // Remove existing
        this.objects.zones.forEach(z => this.canvas.remove(z));
        this.objects.zones = [];

        if (!this.showZones || !zones) return;

        zones.forEach(zone => {
            const rect = new fabric.Rect({
                left: zone.x,
                top: zone.y,
                width: zone.width,
                height: zone.height,
                fill: 'rgba(139, 92, 246, 0.1)',
                stroke: 'rgba(139, 92, 246, 0.3)',
                strokeWidth: 1,
                selectable: false,
                evented: false
            });
            this.canvas.add(rect);
            this.objects.zones.push(rect);
        });
    }

    /**
     * Add background image
     */
    async addBackgroundImage(imageElement) {
        // Remove existing background
        if (this.objects.background) {
            this.canvas.remove(this.objects.background);
        }

        return new Promise((resolve) => {
            const img = new fabric.Image(imageElement, {
                left: 0,
                top: 0,
                selectable: false,
                evented: false,
                name: 'background'
            });

            // Scale to fit canvas
            const scaleX = this.canvas.width / img.width;
            const scaleY = this.canvas.height / img.height;
            const scale = Math.max(scaleX, scaleY);

            img.scale(scale);

            // Center crop
            img.set({
                left: (this.canvas.width - img.width * scale) / 2,
                top: (this.canvas.height - img.height * scale) / 2,
                cropX: 0,
                cropY: 0
            });

            this.canvas.add(img);
            this.objects.background = img;
            this.canvas.sendToBack(img);

            resolve(img);
        });
    }

    /**
     * Add logo
     */
    async addLogo(imageElement, placement) {
        if (this.objects.logo) {
            this.canvas.remove(this.objects.logo);
        }

        return new Promise((resolve) => {
            const img = new fabric.Image(imageElement, {
                left: placement.x,
                top: placement.y,
                scaleX: placement.scale,
                scaleY: placement.scale,
                selectable: !this.layers.logo.locked,
                evented: !this.layers.logo.locked,
                name: 'logo',
                lockRotation: true,
                lockScalingFlip: true
            });

            this.canvas.add(img);
            this.objects.logo = img;
            this.canvas.bringToFront(img);

            resolve(img);
        });
    }

    /**
     * Add tagline text
     */
    addTagline(text, placement) {
        if (this.objects.tagline) {
            this.canvas.remove(this.objects.tagline);
        }

        const textObj = new fabric.Text(text, {
            left: placement.x,
            top: placement.y,
            fontSize: placement.fontSize,
            fontFamily: 'Arial, sans-serif',
            fill: '#ffffff',
            stroke: 'rgba(0,0,0,0.5)',
            strokeWidth: 3,
            strokeLineJoin: 'round',
            paintFirst: 'stroke',
            fontWeight: '600',
            selectable: !this.layers.tagline.locked,
            evented: !this.layers.tagline.locked,
            name: 'tagline',
            lockRotation: true
        });

        // Add shadow for readability
        textObj.setShadow({
            color: 'rgba(0,0,0,0.5)',
            blur: 4,
            offsetX: 1,
            offsetY: 1
        });

        this.canvas.add(textObj);
        this.objects.tagline = textObj;
        this.canvas.bringToFront(textObj);

        return textObj;
    }

    /**
     * Add metadata text
     */
    addMetadata(text, placement) {
        if (this.objects.metadata) {
            this.canvas.remove(this.objects.metadata);
        }

        const textObj = new fabric.Text(text, {
            left: placement.x,
            top: placement.y,
            fontSize: placement.fontSize,
            fontFamily: 'Arial, sans-serif',
            fill: '#ffffff',
            stroke: 'rgba(0,0,0,0.5)',
            strokeWidth: 2,
            strokeLineJoin: 'round',
            paintFirst: 'stroke',
            textAlign: placement.align || 'right',
            selectable: !this.layers.metadata.locked,
            evented: !this.layers.metadata.locked,
            name: 'metadata',
            lockRotation: true
        });

        textObj.setShadow({
            color: 'rgba(0,0,0,0.4)',
            blur: 3,
            offsetX: 1,
            offsetY: 1
        });

        this.canvas.add(textObj);
        this.objects.metadata = textObj;
        this.canvas.bringToFront(textObj);

        return textObj;
    }

    /**
     * Snap object to grid
     */
    snapObjectToGrid(obj) {
        if (!this.gridSystem) return;

        const snapped = this.gridSystem.snapToGrid(
            obj.left,
            obj.top,
            obj.width * obj.scaleX,
            obj.height * obj.scaleY
        );

        obj.set({
            left: snapped.x,
            top: snapped.y
        });

        obj.setCoords();
        this.canvas.renderAll();
    }

    /**
     * Show alignment guides
     */
    showAlignmentGuides(obj) {
        // Remove existing guides
        const guides = this.canvas.getObjects().filter(o => o.name === 'guide');
        guides.forEach(g => this.canvas.remove(g));

        const centerX = obj.left + (obj.width * obj.scaleX) / 2;
        const centerY = obj.top + (obj.height * obj.scaleY) / 2;

        // Center guides
        const hGuide = new fabric.Line(
            [0, centerY, this.canvas.width, centerY],
            {
                stroke: 'rgba(79, 143, 255, 0.5)',
                strokeWidth: 1,
                strokeDashArray: [2, 2],
                selectable: false,
                evented: false,
                name: 'guide'
            }
        );
        const vGuide = new fabric.Line(
            [centerX, 0, centerX, this.canvas.height],
            {
                stroke: 'rgba(79, 143, 255, 0.5)',
                strokeWidth: 1,
                strokeDashArray: [2, 2],
                selectable: false,
                evented: false,
                name: 'guide'
            }
        );

        this.canvas.add(hGuide, vGuide);
    }

    /**
     * Update object position tracking
     */
    updateObjectPosition(obj) {
        if (!obj || !obj.name) return;

        const name = obj.name;
        if (this.objects[name]) {
            // Update stored position
        }
    }

    /**
     * Toggle layer visibility
     */
    toggleLayer(layerName) {
        if (this.layers[layerName]) {
            this.layers[layerName].visible = !this.layers[layerName].visible;

            // Update object visibility
            const obj = this.objects[layerName];
            if (obj) {
                if (Array.isArray(obj)) {
                    obj.forEach(o => o.set('visible', this.layers[layerName].visible));
                } else {
                    obj.set('visible', this.layers[layerName].visible);
                }
            }

            this.canvas.renderAll();
        }
    }

    /**
     * Toggle layer lock
     */
    toggleLayerLock(layerName) {
        if (this.layers[layerName]) {
            this.layers[layerName].locked = !this.layers[layerName].locked;

            const obj = this.objects[layerName];
            if (obj) {
                const locked = this.layers[layerName].locked;
                if (Array.isArray(obj)) {
                    obj.forEach(o => {
                        o.set('selectable', !locked);
                        o.set('evented', !locked);
                    });
                } else {
                    obj.set('selectable', !locked);
                    obj.set('evented', !locked);
                }
            }

            this.canvas.renderAll();
        }
    }

    /**
     * Zoom in
     */
    zoomIn() {
        const newZoom = Math.min(this.maxZoom, this.zoom * 1.2);
        this.setZoom(newZoom);
    }

    /**
     * Zoom out
     */
    zoomOut() {
        const newZoom = Math.max(this.minZoom, this.zoom / 1.2);
        this.setZoom(newZoom);
    }

    /**
     * Set zoom level
     */
    setZoom(zoom) {
        this.zoom = zoom;
        this.canvas.setZoom(zoom);
        this.canvas.renderAll();
        this.updateZoomDisplay();
    }

    /**
     * Fit to screen
     */
    fitToScreen() {
        const wrapper = document.getElementById('canvas-wrapper');
        if (!wrapper) return;

        const wrapperWidth = wrapper.clientWidth - 40;
        const wrapperHeight = wrapper.clientHeight - 40;

        const scaleX = wrapperWidth / this.canvas.width;
        const scaleY = wrapperHeight / this.canvas.height;
        const scale = Math.min(scaleX, scaleY, 1);

        this.setZoom(scale);

        // Center canvas
        const vpt = this.canvas.viewportTransform;
        vpt[4] = (wrapperWidth - this.canvas.width * scale) / 2;
        vpt[5] = (wrapperHeight - this.canvas.height * scale) / 2;
        this.canvas.requestRenderAll();
    }

    /**
     * Reset zoom
     */
    resetZoom() {
        this.setZoom(1);
        const vpt = this.canvas.viewportTransform;
        vpt[4] = 0;
        vpt[5] = 0;
        this.canvas.requestRenderAll();
    }

    /**
     * Update zoom display
     */
    updateZoomDisplay() {
        const display = document.getElementById('zoom-level');
        if (display) {
            display.textContent = Math.round(this.zoom * 100) + '%';
        }
    }

    /**
     * Toggle pan mode
     */
    togglePanMode(enabled) {
        this.isPanning = enabled;
        this.canvas.selection = !enabled;
    }

    /**
     * Align selected objects
     */
    align(alignment) {
        const activeObject = this.canvas.getActiveObject();
        if (!activeObject) return;

        switch(alignment) {
            case 'left':
                activeObject.set('left', this.gridSystem.margin);
                break;
            case 'center':
                activeObject.set('left', (this.canvas.width - activeObject.width * activeObject.scaleX) / 2);
                break;
            case 'right':
                activeObject.set('left', this.canvas.width - this.gridSystem.margin - activeObject.width * activeObject.scaleX);
                break;
        }

        activeObject.setCoords();
        this.canvas.renderAll();
    }

    /**
     * Lock selected object
     */
    lockSelected() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            activeObject.set('selectable', false);
            activeObject.set('evented', false);
            this.canvas.discardActiveObject();
            this.canvas.renderAll();
        }
    }

    /**
     * Unlock all objects
     */
    unlockAll() {
        this.canvas.getObjects().forEach(obj => {
            if (obj.name && obj.name !== 'grid' && obj.name !== 'margin') {
                obj.set('selectable', true);
                obj.set('evented', true);
            }
        });
        this.canvas.renderAll();
    }

    /**
     * Get canvas data URL
     */
    toDataURL(options = {}) {
        return this.canvas.toDataURL(options);
    }

    /**
     * Resize canvas
     */
    resize(width, height) {
        this.canvas.setWidth(width);
        this.canvas.setHeight(height);
        this.originalWidth = width;
        this.originalHeight = height;
        this.canvas.renderAll();
    }

    /**
     * Clear canvas
     */
    clear() {
        this.canvas.clear();
        this.canvas.backgroundColor = '#ffffff';
        this.objects = {
            background: null,
            logo: null,
            tagline: null,
            metadata: null,
            gridLines: [],
            marginRect: null,
            heatmap: null,
            negativeSpace: null,
            zones: []
        };
    }

    /**
     * Destroy canvas
     */
    destroy() {
        this.canvas.dispose();
    }

    /**
     * Apply motif reveal - untreated image shows through motif window
     */
    async applyMotifReveal(imageElement, motif) {
        // Create untreated image for motif
        const untreatedImg = await new Promise((resolve) => {
            fabric.Image.fromURL(imageElement.src, (img) => {
                const scaleX = this.canvas.width / img.width;
                const scaleY = this.canvas.height / img.height;
                const scale = Math.max(scaleX, scaleY);
                img.scale(scale);
                img.set({
                    left: (this.canvas.width - img.width * scale) / 2,
                    top: (this.canvas.height - img.height * scale) / 2,
                    selectable: false,
                    evented: false,
                    name: 'motif-untreated'
                });
                resolve(img);
            });
        });

        // Create clip path for motif
        const clipPath = new fabric.Rect({
            left: motif.x,
            top: motif.y,
            width: motif.width,
            height: motif.height,
            absolutePositioned: true
        });

        untreatedImg.clipPath = clipPath;
        this.canvas.add(untreatedImg);

        // Add subtle border
        const border = new fabric.Rect({
            left: motif.x,
            top: motif.y,
            width: motif.width,
            height: motif.height,
            fill: 'transparent',
            stroke: 'rgba(255,255,255,0.2)',
            strokeWidth: 1,
            selectable: false,
            evented: false,
            name: 'motif-border'
        });
        this.canvas.add(border);

        this.canvas.renderAll();
    }

    /**
     * Apply color treatment overlay
     */
    applyColorTreatment(treatment) {
        const overlay = new fabric.Rect({
            left: 0,
            top: 0,
            width: this.canvas.width,
            height: this.canvas.height,
            fill: treatment.color || '#1E49E2',
            opacity: 0.85,
            selectable: false,
            evented: false,
            name: 'color-treatment'
        });

        // Set blend mode for different treatments
        if (treatment.id === 'blue-multiply') {
            overlay.globalCompositeOperation = 'multiply';
        } else if (treatment.id === 'cobalt-linear-light') {
            overlay.globalCompositeOperation = 'hard-light';
        } else if (treatment.id === 'pacific-gradient-map') {
            // Create gradient fill
            const gradient = new fabric.Gradient({
                type: 'linear',
                coords: { x1: 0, y1: 0, x2: 0, y2: this.canvas.height },
                colorStops: [
                    { offset: 0, color: treatment.lightTone || '#5FD7FF' },
                    { offset: 1, color: treatment.darkTone || '#1E49E2' }
                ]
            });
            overlay.set('fill', gradient);
            overlay.globalCompositeOperation = 'color';
        }

        this.canvas.add(overlay);
        this.canvas.sendToBack(overlay);

        // Keep background behind treatment
        if (this.objects.background) {
            this.canvas.sendToBack(this.objects.background);
        }

        this.canvas.renderAll();
    }

    /**
     * Clear all composition elements for re-render
     */
    clearComposition() {
        const toRemove = ['motif-untreated', 'motif-border', 'color-treatment', 'logo', 'tagline', 'metadata'];
        this.canvas.getObjects().forEach(obj => {
            if (toRemove.includes(obj.name)) {
                this.canvas.remove(obj);
            }
        });

        // Reset object references
        toRemove.forEach(name => {
            if (this.objects[name]) this.objects[name] = null;
        });

        this.canvas.renderAll();
    }
}

// Make available globally
window.CanvasManager = CanvasManager;

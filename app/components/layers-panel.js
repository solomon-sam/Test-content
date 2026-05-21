/**
 * Layers Panel
 * Layer management with visibility and lock toggles
 */

class LayersPanel {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.layersList = document.getElementById('layers-list');
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!this.layersList) return;

        this.layersList.addEventListener('click', (e) => {
            const layerItem = e.target.closest('.layer-item');
            if (!layerItem) return;

            const layerName = layerItem.dataset.layer;

            // Handle visibility toggle
            if (e.target.classList.contains('layer-visibility')) {
                this.toggleVisibility(layerName, layerItem);
            }

            // Handle lock toggle
            if (e.target.classList.contains('layer-lock')) {
                this.toggleLock(layerName, layerItem);
            }

            // Handle layer selection
            if (e.target.classList.contains('layer-name')) {
                this.selectLayer(layerName, layerItem);
            }
        });
    }

    toggleVisibility(layerName, element) {
        this.canvasManager.toggleLayer(layerName);

        const isVisible = this.canvasManager.layers[layerName]?.visible;
        element.classList.toggle('hidden', !isVisible);

        const visibilityIcon = element.querySelector('.layer-visibility');
        visibilityIcon.textContent = isVisible ? '👁' : '🚫';
    }

    toggleLock(layerName, element) {
        this.canvasManager.toggleLayerLock(layerName);

        const isLocked = this.canvasManager.layers[layerName]?.locked;
        const lockIcon = element.querySelector('.layer-lock');
        lockIcon.textContent = isLocked ? '🔒' : '🔓';
    }

    selectLayer(layerName, element) {
        // Remove active from all
        document.querySelectorAll('.layer-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active to selected
        element.classList.add('active');

        // Select corresponding object on canvas
        const obj = this.canvasManager.objects[layerName];
        if (obj && !Array.isArray(obj)) {
            this.canvasManager.canvas.setActiveObject(obj);
        }
    }

    updateLayerOrder() {
        // Sort layers by z-index
        const sortedLayers = Object.entries(this.canvasManager.layers)
            .sort((a, b) => a[1].zIndex - b[1].zIndex);

        // Rebuild layer list
        if (this.layersList) {
            this.layersList.innerHTML = '';
            sortedLayers.forEach(([name, config]) => {
                const item = document.createElement('div');
                item.className = 'layer-item';
                item.dataset.layer = name;
                if (!config.visible) item.classList.add('hidden');

                item.innerHTML = `
                    <span class="layer-visibility">${config.visible ? '👁' : '🚫'}</span>
                    <span class="layer-name">${this.getLayerDisplayName(name)}</span>
                    <span class="layer-lock">${config.locked ? '🔒' : '🔓'}</span>
                `;

                this.layersList.appendChild(item);
            });
        }
    }

    getLayerDisplayName(name) {
        const names = {
            background: 'Background Image',
            logo: 'Brand Logo',
            tagline: 'Tagline',
            metadata: 'Metadata',
            grid: 'Grid Overlay',
            aiOverlay: 'AI Overlays'
        };
        return names[name] || name;
    }
}

// Make available globally
window.LayersPanel = LayersPanel;

/**
 * Layers Panel
 * Layer management for the composition
 */

class LayersPanel {
  constructor(canvasManager) {
    this.canvasManager = canvasManager;
    this.layers = this.canvasManager.layers;
  }

  toggleLayer(layerName) {
    this.canvasManager.toggleLayer(layerName);
  }

  bringToFront(layerName) {
    const obj = this.canvasManager.objects[layerName];
    if (obj) {
      this.canvasManager.canvas.bringToFront(obj);
      this.canvasManager.requestRender();
    }
  }

  sendToBack(layerName) {
    const obj = this.canvasManager.objects[layerName];
    if (obj) {
      this.canvasManager.canvas.sendToBack(obj);
      this.canvasManager.requestRender();
    }
  }

  getLayerInfo(layerName) {
    const layer = this.layers[layerName];
    const obj = this.canvasManager.objects[layerName];

    return {
      name: layerName,
      visible: layer?.visible ?? true,
      locked: layer?.locked ?? false,
      zIndex: layer?.zIndex ?? 0,
      hasObject: !!obj
    };
  }

  getAllLayers() {
    return Object.keys(this.layers).map(name => this.getLayerInfo(name));
  }
}

// Make available globally
window.LayersPanel = LayersPanel;

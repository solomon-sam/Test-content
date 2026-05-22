/**
 * Object Pool — Phase 4
 * Pools Fabric.js objects to reduce GC pressure during frequent create/destroy cycles.
 * Supports Rect, Text, Image, Line, and Group objects.
 */

class ObjectPool {
  constructor(canvasManager, options = {}) {
    this.canvasManager = canvasManager;
    this.maxPoolSize = options.maxPoolSize || 50;

    // Pools by type
    this.pools = {
      rect: [],
      text: [],
      image: [],
      line: [],
      group: [],
      circle: []
    };

    // Stats
    this.stats = {
      created: 0,
      reused: 0,
      released: 0,
      destroyed: 0
    };

    this.enabled = options.enabled !== false;
  }

  /**
   * Acquire an object from pool or create new
   */
  acquire(type, properties = {}) {
    if (!this.enabled) {
      return this.createNew(type, properties);
    }

    const pool = this.pools[type];

    // Try to reuse from pool
    if (pool && pool.length > 0) {
      const obj = pool.pop();
      this.resetObject(obj, type, properties);
      this.stats.reused++;
      return obj;
    }

    // Create new
    this.stats.created++;
    return this.createNew(type, properties);
  }

  /**
   * Release object back to pool
   */
  release(obj, type) {
    if (!this.enabled || !obj) return;

    const pool = this.pools[type];
    if (!pool) return;

    // Remove from canvas
    if (this.canvasManager && this.canvasManager.canvas) {
      this.canvasManager.canvas.remove(obj);
    }

    // Reset object state
    this.deactivateObject(obj);

    // Add to pool if not full
    if (pool.length < this.maxPoolSize) {
      pool.push(obj);
      this.stats.released++;
    } else {
      // Pool full, dispose
      this.disposeObject(obj);
      this.stats.destroyed++;
    }
  }

  /**
   * Release multiple objects
   */
  releaseMultiple(objects, type) {
    objects.forEach(obj => this.release(obj, type));
  }

  /**
   * Create new Fabric.js object
   */
  createNew(type, properties) {
    switch (type) {
      case 'rect':
        return new fabric.Rect({
          left: 0,
          top: 0,
          width: 100,
          height: 100,
          fill: 'transparent',
          ...properties
        });

      case 'text':
        return new fabric.Text(properties.text || '', {
          left: 0,
          top: 0,
          fontSize: 16,
          fontFamily: 'Arial',
          fill: '#000000',
          ...properties
        });

      case 'image':
        // Images are special — they need source
        return new fabric.Image(properties.source || null, {
          left: 0,
          top: 0,
          ...properties
        });

      case 'line':
        return new fabric.Line([0, 0, 100, 100], {
          stroke: '#000000',
          strokeWidth: 1,
          ...properties
        });

      case 'group':
        return new fabric.Group([], {
          left: 0,
          top: 0,
          ...properties
        });

      case 'circle':
        return new fabric.Circle({
          left: 0,
          top: 0,
          radius: 50,
          fill: 'transparent',
          ...properties
        });

      default:
        throw new Error(`Unknown object type: ${type}`);
    }
  }

  /**
   * Reset object with new properties
   */
  resetObject(obj, type, properties) {
    // Common reset
    obj.set({
      left: 0,
      top: 0,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      opacity: 1,
      visible: true,
      selectable: false,
      evented: false,
      ...properties
    });

    // Type-specific reset
    switch (type) {
      case 'rect':
        obj.set({
          width: properties.width || 100,
          height: properties.height || 100,
          fill: properties.fill || 'transparent',
          stroke: properties.stroke || null,
          strokeWidth: properties.strokeWidth || 0,
          rx: properties.rx || 0,
          ry: properties.ry || 0
        });
        break;

      case 'text':
        obj.set({
          text: properties.text || '',
          fontSize: properties.fontSize || 16,
          fontFamily: properties.fontFamily || 'Arial',
          fill: properties.fill || '#000000',
          fontWeight: properties.fontWeight || 'normal',
          textAlign: properties.textAlign || 'left'
        });
        break;

      case 'line':
        const coords = properties.coords || [0, 0, 100, 100];
        obj.set({
          x1: coords[0],
          y1: coords[1],
          x2: coords[2],
          y2: coords[3],
          stroke: properties.stroke || '#000000',
          strokeWidth: properties.strokeWidth || 1
        });
        break;

      case 'image':
        if (properties.source) {
          obj.setElement(properties.source);
        }
        break;

      case 'group':
        obj.remove(...obj.getObjects());
        if (properties.objects) {
          properties.objects.forEach(o => obj.addWithUpdate(o));
        }
        break;
    }

    obj.setCoords();
  }

  /**
   * Deactivate object (remove from canvas, reset state)
   */
  deactivateObject(obj) {
    if (!obj) return;

    // Remove all event listeners
    obj.off();

    // Reset to neutral state
    obj.set({
      visible: false,
      selectable: false,
      evented: false,
      hoverCursor: null,
      moveCursor: null
    });

    // Clear custom properties
    delete obj.name;
    delete obj.customData;
  }

  /**
   * Dispose object (permanent removal)
   */
  disposeObject(obj) {
    if (!obj) return;

    this.deactivateObject(obj);

    if (obj.dispose) {
      obj.dispose();
    }
  }

  /**
   * Pre-warm pool with objects
   */
  prewarm(type, count, properties = {}) {
    if (!this.enabled) return;

    for (let i = 0; i < count; i++) {
      const obj = this.createNew(type, properties);
      this.deactivateObject(obj);
      this.pools[type].push(obj);
    }
  }

  /**
   * Clear all pools
   */
  clear() {
    for (const [type, pool] of Object.entries(this.pools)) {
      pool.forEach(obj => this.disposeObject(obj));
      this.pools[type] = [];
    }
    this.stats.destroyed += this.stats.released;
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const poolSizes = {};
    for (const [type, pool] of Object.entries(this.pools)) {
      poolSizes[type] = pool.length;
    }

    return {
      ...this.stats,
      poolSizes,
      totalPooled: Object.values(poolSizes).reduce((a, b) => a + b, 0),
      maxPoolSize: this.maxPoolSize,
      enabled: this.enabled
    };
  }

  /**
   * Get pool size for a type
   */
  getPoolSize(type) {
    return this.pools[type]?.length || 0;
  }

  /**
   * Resize pool
   */
  setMaxPoolSize(size) {
    this.maxPoolSize = size;
    // Trim existing pools
    for (const [type, pool] of Object.entries(this.pools)) {
      while (pool.length > size) {
        const obj = pool.pop();
        this.disposeObject(obj);
        this.stats.destroyed++;
      }
    }
  }

  /**
   * Destroy
   */
  destroy() {
    this.clear();
    this.canvasManager = null;
  }
}

// Make available globally
window.ObjectPool = ObjectPool;

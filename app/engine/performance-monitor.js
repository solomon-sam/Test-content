/**
 * Performance Monitor — Phase 4
 * Tracks frame rates, memory usage, render times, and pipeline stage timings.
 * Provides real-time performance metrics and optimization recommendations.
 */

class PerformanceMonitor {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.showOverlay = options.showOverlay || false;
    this.sampleInterval = options.sampleInterval || 1000; // ms
    this.maxSamples = options.maxSamples || 60;

    // FPS tracking
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsTime = 0;
    this.fpsHistory = [];

    // Render time tracking
    this.renderTimes = [];
    this.avgRenderTime = 0;
    this.maxRenderTime = 0;

    // Memory tracking
    this.memoryHistory = [];
    this.currentMemory = 0;

    // Pipeline stage timings
    this.stageTimings = new Map();

    // Validation timing
    this.validationTimes = [];
    this.avgValidationTime = 0;

    // Interaction timing
    this.interactionTimes = [];

    // Long task tracking
    this.longTasks = [];
    this.longTaskThreshold = 50; // ms

    // RAF id
    this.rafId = null;
    this.intervalId = null;

    // Overlay element
    this.overlayEl = null;

    // Bindings
    this.tick = this.tick.bind(this);
    this.sample = this.sample.bind(this);

    if (this.enabled) {
      this.init();
    }
  }

  init() {
    this.lastFpsTime = performance.now();
    this.startMonitoring();

    if (this.showOverlay) {
      this.createOverlay();
    }

    // Listen for long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > this.longTaskThreshold) {
              this.longTasks.push({
                duration: entry.duration,
                startTime: entry.startTime,
                timestamp: Date.now()
              });
              // Keep only last 50
              if (this.longTasks.length > 50) {
                this.longTasks.shift();
              }
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long task observer not supported
      }
    }
  }

  /**
   * Start monitoring loop
   */
  startMonitoring() {
    this.rafId = requestAnimationFrame(this.tick);
    this.intervalId = setInterval(this.sample, this.sampleInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * RAF tick for FPS counting
   */
  tick() {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.fpsHistory.push(this.fps);
      if (this.fpsHistory.length > this.maxSamples) {
        this.fpsHistory.shift();
      }
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    this.rafId = requestAnimationFrame(this.tick);
  }

  /**
   * Periodic sampling (memory, etc.)
   */
  sample() {
    // Memory usage
    if (performance.memory) {
      const mem = performance.memory;
      this.currentMemory = mem.usedJSHeapSize / (1024 * 1024); // MB
      this.memoryHistory.push({
        used: this.currentMemory,
        total: mem.totalJSHeapSize / (1024 * 1024),
        limit: mem.jsHeapSizeLimit / (1024 * 1024),
        timestamp: Date.now()
      });
      if (this.memoryHistory.length > this.maxSamples) {
        this.memoryHistory.shift();
      }
    }

    // Update overlay
    if (this.showOverlay && this.overlayEl) {
      this.updateOverlay();
    }
  }

  /**
   * Record a render pass time
   */
  recordRenderTime(duration) {
    this.renderTimes.push(duration);
    if (this.renderTimes.length > 100) {
      this.renderTimes.shift();
    }
    this.avgRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
    this.maxRenderTime = Math.max(...this.renderTimes);
  }

  /**
   * Record a validation pass time
   */
  recordValidationTime(duration) {
    this.validationTimes.push(duration);
    if (this.validationTimes.length > 50) {
      this.validationTimes.shift();
    }
    this.avgValidationTime = this.validationTimes.reduce((a, b) => a + b, 0) / this.validationTimes.length;
  }

  /**
   * Record pipeline stage timing
   */
  recordStageTiming(stageName, duration) {
    if (!this.stageTimings.has(stageName)) {
      this.stageTimings.set(stageName, []);
    }
    const times = this.stageTimings.get(stageName);
    times.push(duration);
    if (times.length > 20) {
      times.shift();
    }
  }

  /**
   * Record interaction time (drag, click, etc.)
   */
  recordInteractionTime(duration, type = 'generic') {
    this.interactionTimes.push({ duration, type, timestamp: Date.now() });
    if (this.interactionTimes.length > 50) {
      this.interactionTimes.shift();
    }
  }

  /**
   * Get performance report
   */
  getReport() {
    const avgFps = this.fpsHistory.length > 0
      ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      : 0;

    const minFps = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0;
    const maxFps = this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 0;

    const stageAverages = {};
    for (const [stage, times] of this.stageTimings.entries()) {
      stageAverages[stage] = {
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        count: times.length
      };
    }

    return {
      fps: {
        current: this.fps,
        average: Math.round(avgFps),
        min: minFps,
        max: maxFps,
        history: [...this.fpsHistory]
      },
      render: {
        averageTime: Math.round(this.avgRenderTime * 100) / 100,
        maxTime: Math.round(this.maxRenderTime * 100) / 100,
        sampleCount: this.renderTimes.length
      },
      validation: {
        averageTime: Math.round(this.avgValidationTime * 100) / 100,
        sampleCount: this.validationTimes.length
      },
      memory: {
        current: Math.round(this.currentMemory * 100) / 100,
        history: [...this.memoryHistory]
      },
      stages: stageAverages,
      longTasks: {
        count: this.longTasks.length,
        recent: this.longTasks.slice(-5)
      },
      interactions: {
        count: this.interactionTimes.length,
        averageTime: this.interactionTimes.length > 0
          ? this.interactionTimes.reduce((a, b) => a + b.duration, 0) / this.interactionTimes.length
          : 0
      },
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations() {
    const recommendations = [];

    if (this.fps < 30) {
      recommendations.push({
        severity: 'high',
        category: 'fps',
        message: 'FPS is below 30. Consider reducing canvas complexity or disabling grid overlay.',
        action: 'Reduce visual complexity'
      });
    } else if (this.fps < 50) {
      recommendations.push({
        severity: 'medium',
        category: 'fps',
        message: 'FPS is below 50. Monitor for dropped frames during interactions.',
        action: 'Monitor performance'
      });
    }

    if (this.avgRenderTime > 16) {
      recommendations.push({
        severity: 'high',
        category: 'render',
        message: `Average render time (${this.avgRenderTime.toFixed(1)}ms) exceeds 16ms target.`,
        action: 'Optimize canvas rendering'
      });
    }

    if (this.avgValidationTime > 20) {
      recommendations.push({
        severity: 'medium',
        category: 'validation',
        message: `Validation is taking ${this.avgValidationTime.toFixed(1)}ms. Consider throttling.`,
        action: 'Throttle validation frequency'
      });
    }

    if (this.currentMemory > 200) {
      recommendations.push({
        severity: 'medium',
        category: 'memory',
        message: `Memory usage is ${this.currentMemory.toFixed(1)}MB. Consider cleanup.`,
        action: 'Run memory cleanup'
      });
    }

    if (this.longTasks.length > 5) {
      recommendations.push({
        severity: 'high',
        category: 'longtasks',
        message: `${this.longTasks.length} long tasks detected. Main thread may be blocked.`,
        action: 'Offload work to Web Workers'
      });
    }

    return recommendations;
  }

  /**
   * Create performance overlay
   */
  createOverlay() {
    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'perf-monitor-overlay';
    this.overlayEl.style.cssText = `
      position: fixed;
      top: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.75);
      color: #00ff88;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 11px;
      padding: 10px 14px;
      border-radius: 6px;
      z-index: 9999;
      pointer-events: none;
      line-height: 1.6;
      min-width: 180px;
      backdrop-filter: blur(4px);
    `;
    document.body.appendChild(this.overlayEl);
  }

  /**
   * Update overlay display
   */
  updateOverlay() {
    if (!this.overlayEl) return;

    const memStr = this.currentMemory > 0 ? `${this.currentMemory.toFixed(1)}MB` : 'N/A';
    const renderStr = this.avgRenderTime > 0 ? `${this.avgRenderTime.toFixed(1)}ms` : 'N/A';

    this.overlayEl.innerHTML = `
      <div style="font-weight:bold;margin-bottom:4px;color:#fff;">⚡ Performance</div>
      <div>FPS: <span style="color:${this.fps >= 55 ? '#22c55e' : this.fps >= 30 ? '#eab308' : '#ef4444'}">${this.fps}</span></div>
      <div>Render: ${renderStr}</div>
      <div>Memory: ${memStr}</div>
      <div>Validations: ${this.validationTimes.length}</div>
      <div>Long Tasks: ${this.longTasks.length}</div>
    `;
  }

  /**
   * Toggle overlay visibility
   */
  toggleOverlay(show) {
    this.showOverlay = show;
    if (show && !this.overlayEl) {
      this.createOverlay();
    }
    if (this.overlayEl) {
      this.overlayEl.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * Destroy
   */
  destroy() {
    this.stopMonitoring();
    if (this.overlayEl) {
      this.overlayEl.remove();
      this.overlayEl = null;
    }
  }
}

// Make available globally
window.PerformanceMonitor = PerformanceMonitor;

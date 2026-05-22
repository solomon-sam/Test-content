/**
 * Observable State Manager
 * Lightweight reactive state system for vanilla JS
 * Path-based state access, batch updates, localStorage persistence
 */

class StateManager {
  constructor() {
    this.state = {
      // Navigation
      currentStep: 'explore', // explore | compose | refine | export
      completedSteps: [],

      // Explore step
      headline: '',
      subheading: '',
      backgroundImage: null,
      backgroundImageDataUrl: null,

      // Compose step
      selectedPreset: null,
      customDimensions: null,

      // Refine step
      composition: {
        canvasWidth: 0,
        canvasHeight: 0,
        grid: null,
        elements: {},
        treatment: {
          id: 'blue-multiply',
          color: '#1E49E2',
          blendMode: 'multiply',
          opacity: 0.85,
          darkTone: '#1E49E2',
          lightTone: '#5FD7FF'
        },
        motif: null,
        swoosh: null
      },

      // Analysis
      imageAnalysis: null,
      placements: null,

      // Brand check
      brandScore: 0,
      checklistStatus: {
        logo: 'pending',
        colors: 'pending',
        typography: 'pending',
        imagery: 'pending',
        layout: 'pending'
      },

      // Export
      exportFormat: 'png',
      exportQuality: 95,
      exportDpi: 300,

      // Editing
      editMode: 'auto', // auto | manual
      selectedElement: null,
      dragState: null,

      // UI
      loading: false,
      loadingText: '',
      loadingPercent: 0
    };

    this.listeners = new Map();
    this.batchQueue = new Set();
    this.rafId = null;
    this.persistKey = 'bce_state_v1';

    // Hydrate from localStorage
    this.hydrate();
  }

  /**
   * Get state at path
   */
  get(path) {
    if (!path) return this.state;
    const parts = path.split('.');
    let current = this.state;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Set state at path (triggers reactive update)
   */
  set(path, value) {
    const parts = path.split('.');
    let current = this.state;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    const oldValue = current[parts[parts.length - 1]];
    current[parts[parts.length - 1]] = value;

    // Queue notification
    this.batchQueue.add(path);

    // Notify on next frame
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.flushBatch());
    }

    return oldValue;
  }

  /**
   * Batch update multiple paths
   */
  batchUpdate(updates) {
    for (const [path, value] of Object.entries(updates)) {
      const parts = path.split('.');
      let current = this.state;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      this.batchQueue.add(path);
    }

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.flushBatch());
    }
  }

  /**
   * Flush batched notifications
   */
  flushBatch() {
    this.rafId = null;
    const paths = Array.from(this.batchQueue);
    this.batchQueue.clear();

    // Collect all affected listeners
    const notified = new Set();

    for (const path of paths) {
      // Notify exact path listeners
      const exact = this.listeners.get(path);
      if (exact) {
        for (const cb of exact) {
          if (!notified.has(cb)) {
            notified.add(cb);
            cb(this.get(path), path);
          }
        }
      }

      // Notify parent path listeners
      const parts = path.split('.');
      for (let i = 1; i < parts.length; i++) {
        const parentPath = parts.slice(0, i).join('.');
        const parentListeners = this.listeners.get(parentPath);
        if (parentListeners) {
          for (const cb of parentListeners) {
            if (!notified.has(cb)) {
              notified.add(cb);
              cb(this.get(parentPath), parentPath);
            }
          }
        }
      }

      // Notify wildcard listeners
      const wildcard = this.listeners.get('*');
      if (wildcard) {
        for (const cb of wildcard) {
          if (!notified.has(cb)) {
            notified.add(cb);
            cb(this.state, path);
          }
        }
      }
    }

    // Persist after batch
    this.persist();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path).add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(path)?.delete(callback);
    };
  }

  /**
   * Subscribe once
   */
  subscribeOnce(path, callback) {
    const unsubscribe = this.subscribe(path, (value, p) => {
      callback(value, p);
      unsubscribe();
    });
    return unsubscribe;
  }

  /**
   * Persist to localStorage
   */
  persist() {
    try {
      // Don't persist large binary data
      const persistable = { ...this.state };
      delete persistable.backgroundImage; // DOM element
      delete persistable.composition.grid; // Complex object
      delete persistable.composition.elements; // Fabric objects
      delete persistable.imageAnalysis; // Large object

      localStorage.setItem(this.persistKey, JSON.stringify(persistable));
    } catch (e) {
      console.warn('State persistence failed:', e);
    }
  }

  /**
   * Hydrate from localStorage
   */
  hydrate() {
    try {
      const saved = localStorage.getItem(this.persistKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge carefully, preserving defaults for missing keys
        this.deepMerge(this.state, parsed);
      }
    } catch (e) {
      console.warn('State hydration failed:', e);
    }
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * Reset state
   */
  reset() {
    this.state = {
      currentStep: 'explore',
      completedSteps: [],
      headline: '',
      subheading: '',
      backgroundImage: null,
      backgroundImageDataUrl: null,
      selectedPreset: null,
      customDimensions: null,
      composition: {
        canvasWidth: 0,
        canvasHeight: 0,
        grid: null,
        elements: {},
        treatment: {
          id: 'blue-multiply',
          color: '#1E49E2',
          blendMode: 'multiply',
          opacity: 0.85,
          darkTone: '#1E49E2',
          lightTone: '#5FD7FF'
        },
        motif: null,
        swoosh: null
      },
      imageAnalysis: null,
      placements: null,
      brandScore: 0,
      checklistStatus: {
        logo: 'pending',
        colors: 'pending',
        typography: 'pending',
        imagery: 'pending',
        layout: 'pending'
      },
      exportFormat: 'png',
      exportQuality: 95,
      exportDpi: 300,
      editMode: 'auto',
      selectedElement: null,
      dragState: null,
      loading: false,
      loadingText: '',
      loadingPercent: 0
    };
    this.listeners.clear();
    this.batchQueue.clear();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    localStorage.removeItem(this.persistKey);
  }

  /**
   * Go to step
   */
  goToStep(step) {
    const steps = ['explore', 'compose', 'refine', 'export'];
    const currentIndex = steps.indexOf(this.state.currentStep);
    const targetIndex = steps.indexOf(step);

    // Mark previous steps as completed
    for (let i = 0; i < targetIndex; i++) {
      if (!this.state.completedSteps.includes(steps[i])) {
        this.state.completedSteps.push(steps[i]);
      }
    }

    this.set('currentStep', step);
  }

  /**
   * Can go to step
   */
  canGoToStep(step) {
    const steps = ['explore', 'compose', 'refine', 'export'];
    const targetIndex = steps.indexOf(step);

    // Can always go to current or previous steps
    const currentIndex = steps.indexOf(this.state.currentStep);
    if (targetIndex <= currentIndex) return true;

    // Can go to next step if current is completed
    if (targetIndex === currentIndex + 1) {
      return this.state.completedSteps.includes(steps[currentIndex]);
    }

    return false;
  }
}

// Make available globally
window.StateManager = StateManager;

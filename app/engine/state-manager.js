/**
 * State Manager
 * Centralized state management with pub/sub
 * FIXED: Enforces logo locked state, prevents logo position mutation
 */

class StateManager {
  constructor() {
    this.state = {
      composition: {
        logo: null,
        tagline: null,
        metadata: null,
        motif: null,
        headline: null,
        subheading: null,
        swoosh: null,
        treatment: null,
        background: null,
        lastModified: null
      },
      typographyComposition: null,
      imageAnalysis: null,
      complianceReport: null,
      complianceStatus: 'PASS',
      checklistStatus: {},
      exportFormat: 'png',
      exportDpi: 300,
      exportQuality: 95,
      orchestration: {
        state: 'IDLE',
        stage: 0,
        totalStages: 12
      },
      history: [],
      historyIndex: -1,
      maxHistory: 50
    };

    this.subscribers = {};
    this.batchUpdate = false;
    this.pendingUpdates = [];
  }

  /**
   * Get state value by path
   */
  get(path) {
    const keys = path.split('.');
    let current = this.state;

    for (const key of keys) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Set state value by path
   * FIXED: Prevents mutation of locked logo position
   */
  set(path, value) {
    // BRAND GUARD: Prevent logo position mutation
    if (path === 'composition.logo' || path.startsWith('composition.logo.')) {
      const currentLogo = this.state.composition.logo;
      if (currentLogo && currentLogo.locked) {
        // Only allow setting locked property itself, not position
        if (path !== 'composition.logo.locked' && !path.includes('locked')) {
          console.warn('BRAND VIOLATION: Attempted to mutate locked logo position. Operation blocked.');
          return false;
        }
      }
    }

    // BRAND GUARD: Prevent tagline position mutation
    if (path === 'composition.tagline' || path.startsWith('composition.tagline.')) {
      const currentTagline = this.state.composition.tagline;
      if (currentTagline && currentTagline.locked) {
        if (path !== 'composition.tagline.locked' && !path.includes('locked')) {
          console.warn('BRAND VIOLATION: Attempted to mutate locked tagline position. Operation blocked.');
          return false;
        }
      }
    }

    // BRAND GUARD: Prevent metadata position mutation
    if (path === 'composition.metadata' || path.startsWith('composition.metadata.')) {
      const currentMetadata = this.state.composition.metadata;
      if (currentMetadata && currentMetadata.locked) {
        if (path !== 'composition.metadata.locked' && !path.includes('locked')) {
          console.warn('BRAND VIOLATION: Attempted to mutate locked metadata position. Operation blocked.');
          return false;
        }
      }
    }

    const keys = path.split('.');
    let current = this.state;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    const oldValue = current[keys[keys.length - 1]];
    current[keys[keys.length - 1]] = value;

    if (!this.batchUpdate) {
      this.notify(path, value, oldValue);
    } else {
      this.pendingUpdates.push({ path, value, oldValue });
    }

    return true;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(path, callback) {
    if (!this.subscribers[path]) {
      this.subscribers[path] = [];
    }
    this.subscribers[path].push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.subscribers[path].indexOf(callback);
      if (index > -1) {
        this.subscribers[path].splice(index, 1);
      }
    };
  }

  /**
   * Notify subscribers
   */
  notify(path, newValue, oldValue) {
    // Notify exact path subscribers
    if (this.subscribers[path]) {
      this.subscribers[path].forEach(cb => {
        try {
          cb(newValue, oldValue, path);
        } catch (error) {
          console.error('Subscriber error:', error);
        }
      });
    }

    // Notify parent path subscribers
    const parentPath = path.substring(0, path.lastIndexOf('.'));
    if (parentPath && this.subscribers[parentPath]) {
      this.subscribers[parentPath].forEach(cb => {
        try {
          cb(this.get(parentPath), null, parentPath);
        } catch (error) {
          console.error('Parent subscriber error:', error);
        }
      });
    }

    // Notify wildcard subscribers
    if (this.subscribers['*']) {
      this.subscribers['*'].forEach(cb => {
        try {
          cb(newValue, oldValue, path);
        } catch (error) {
          console.error('Wildcard subscriber error:', error);
        }
      });
    }
  }

  /**
   * Batch updates
   */
  batch(fn) {
    this.batchUpdate = true;
    this.pendingUpdates = [];

    try {
      fn();
    } finally {
      this.batchUpdate = false;

      // Notify all pending updates
      this.pendingUpdates.forEach(update => {
        this.notify(update.path, update.value, update.oldValue);
      });

      this.pendingUpdates = [];
    }
  }

  /**
   * Save state to history
   */
  saveToHistory() {
    const snapshot = JSON.parse(JSON.stringify(this.state));

    // Remove from current index forward (if we undid)
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
    }

    this.state.history.push(snapshot);

    // Limit history size
    if (this.state.history.length > this.state.maxHistory) {
      this.state.history.shift();
    } else {
      this.state.historyIndex++;
    }
  }

  /**
   * Undo
   */
  undo() {
    if (this.state.historyIndex > 0) {
      this.state.historyIndex--;
      const snapshot = this.state.history[this.state.historyIndex];
      this.restoreState(snapshot);
      return true;
    }
    return false;
  }

  /**
   * Redo
   */
  redo() {
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.historyIndex++;
      const snapshot = this.state.history[this.state.historyIndex];
      this.restoreState(snapshot);
      return true;
    }
    return false;
  }

  /**
   * Restore state from snapshot
   */
  restoreState(snapshot) {
    // Preserve locked element positions
    const lockedPositions = {
      logo: this.state.composition.logo ? {
        x: this.state.composition.logo.x,
        y: this.state.composition.logo.y,
        locked: this.state.composition.logo.locked
      } : null,
      tagline: this.state.composition.tagline ? {
        x: this.state.composition.tagline.x,
        y: this.state.composition.tagline.y,
        locked: this.state.composition.tagline.locked
      } : null,
      metadata: this.state.composition.metadata ? {
        x: this.state.composition.metadata.x,
        y: this.state.composition.metadata.y,
        locked: this.state.composition.metadata.locked
      } : null
    };

    this.state = JSON.parse(JSON.stringify(snapshot));

    // Restore locked positions
    if (lockedPositions.logo && this.state.composition.logo) {
      this.state.composition.logo.x = lockedPositions.logo.x;
      this.state.composition.logo.y = lockedPositions.logo.y;
      this.state.composition.logo.locked = true;
    }
    if (lockedPositions.tagline && this.state.composition.tagline) {
      this.state.composition.tagline.x = lockedPositions.tagline.x;
      this.state.composition.tagline.y = lockedPositions.tagline.y;
      this.state.composition.tagline.locked = true;
    }
    if (lockedPositions.metadata && this.state.composition.metadata) {
      this.state.composition.metadata.x = lockedPositions.metadata.x;
      this.state.composition.metadata.y = lockedPositions.metadata.y;
      this.state.composition.metadata.locked = true;
    }

    // Notify all subscribers
    Object.keys(this.subscribers).forEach(path => {
      if (this.subscribers[path]) {
        this.subscribers[path].forEach(cb => {
          try {
            cb(this.get(path), null, path);
          } catch (error) {
            console.error('Restore subscriber error:', error);
          }
        });
      }
    });
  }

  /**
   * Get full state
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Reset state
   */
  reset() {
    this.state = {
      composition: {
        logo: null,
        tagline: null,
        metadata: null,
        motif: null,
        headline: null,
        subheading: null,
        swoosh: null,
        treatment: null,
        background: null,
        lastModified: null
      },
      typographyComposition: null,
      imageAnalysis: null,
      complianceReport: null,
      complianceStatus: 'PASS',
      checklistStatus: {},
      exportFormat: 'png',
      exportDpi: 300,
      exportQuality: 95,
      orchestration: {
        state: 'IDLE',
        stage: 0,
        totalStages: 12
      },
      history: [],
      historyIndex: -1,
      maxHistory: 50
    };

    this.subscribers = {};
  }

  /**
   * Export state as JSON
   */
  exportState() {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Import state from JSON
   */
  importState(json) {
    try {
      const parsed = JSON.parse(json);

      // Preserve locked positions
      const lockedPositions = {
        logo: this.state.composition.logo?.locked ? {
          x: this.state.composition.logo.x,
          y: this.state.composition.logo.y
        } : null,
        tagline: this.state.composition.tagline?.locked ? {
          x: this.state.composition.tagline.x,
          y: this.state.composition.tagline.y
        } : null,
        metadata: this.state.composition.metadata?.locked ? {
          x: this.state.composition.metadata.x,
          y: this.state.composition.metadata.y
        } : null
      };

      this.state = parsed;

      // Restore locked positions
      if (lockedPositions.logo) {
        this.state.composition.logo.x = lockedPositions.logo.x;
        this.state.composition.logo.y = lockedPositions.logo.y;
        this.state.composition.logo.locked = true;
      }
      if (lockedPositions.tagline) {
        this.state.composition.tagline.x = lockedPositions.tagline.x;
        this.state.composition.tagline.y = lockedPositions.tagline.y;
        this.state.composition.tagline.locked = true;
      }
      if (lockedPositions.metadata) {
        this.state.composition.metadata.x = lockedPositions.metadata.x;
        this.state.composition.metadata.y = lockedPositions.metadata.y;
        this.state.composition.metadata.locked = true;
      }

      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }
}

// Make available globally
window.StateManager = StateManager;

/**
 * Typography Renderer
 * Renders composed typography to Fabric.js canvas with baseline alignment, stroke-first painting
 */

class TypographyRenderer {
  constructor(canvasManager, stateManager) {
    this.canvasManager = canvasManager;
    this.canvas = canvasManager.canvas;
    this.stateManager = stateManager;

    // Stroke-first painting config for readability
    this.strokeConfig = {
      enabled: true,
      color: 'rgba(255, 255, 255, 0.7)',
      width: 3
    };

    // Shadow for depth separation
    this.shadowConfig = {
      enabled: true,
      color: 'rgba(0, 0, 0, 0.15)',
      blur: 4,
      offsetX: 1,
      offsetY: 2
    };
  }

  /**
   * Render full typography composition to canvas
   */
  render(composition, gridSystem) {
    if (!composition) return;

    // Remove existing text elements
    this.removeExistingText();

    // Render headline
    if (composition.headline) {
      this.renderHeadline(composition.headline, gridSystem);
    }

    // Render subheading
    if (composition.subheading) {
      this.renderSubheading(composition.subheading, gridSystem);
    }

    // Render metadata
    if (composition.metadata) {
      this.renderMetadata(composition.metadata, gridSystem);
    }

    this.canvas.renderAll();
  }

  /**
   * Render headline with editorial offsets
   */
  renderHeadline(headline, gridSystem) {
    const textZones = gridSystem.getTextZones();
    const leftZone = textZones.find(z => z.name === 'left') || textZones[0];

    let currentY = leftZone.y + 20;
    const baseX = leftZone.x + 20;

    headline.lines.forEach((line, i) => {
      const offsetX = line.offsetX || 0;
      const x = baseX + offsetX;

      // Create text with stroke-first painting
      const textObj = new fabric.Text(line.text, {
        left: x,
        top: currentY,
        fontSize: headline.fontSize,
        fontFamily: headline.fontFamily,
        fontWeight: headline.fontWeight,
        fill: '#1A2B4A',
        lineHeight: headline.lineHeight,
        charSpacing: headline.letterSpacing * 10,
        selectable: true,
        evented: true,
        name: 'headline',
        lockRotation: true
      });

      // Apply stroke for readability
      if (this.strokeConfig.enabled) {
        textObj.set({
          stroke: this.strokeConfig.color,
          strokeWidth: this.strokeConfig.width
        });
      }

      // Apply shadow for depth
      if (this.shadowConfig.enabled) {
        textObj.set({
          shadow: new fabric.Shadow({
            color: this.shadowConfig.color,
            blur: this.shadowConfig.blur,
            offsetX: this.shadowConfig.offsetX,
            offsetY: this.shadowConfig.offsetY
          })
        });
      }

      // Snap to baseline
      const snappedY = gridSystem.snapToBaseline(currentY);
      textObj.set('top', snappedY);

      this.canvas.add(textObj);
      this.canvasManager.objects.headline = textObj;

      currentY += line.height;
    });
  }

  /**
   * Render subheading (no stagger, below headline)
   */
  renderSubheading(subheading, gridSystem) {
    const headlineObj = this.canvasManager.objects.headline;

    let startY = gridSystem.margin + gridSystem.cellHeight * 3;
    let startX = gridSystem.margin + gridSystem.cellWidth;

    if (headlineObj) {
      // Position below headline
      const headlineBounds = headlineObj.getBoundingRect();
      startY = headlineBounds.top + headlineBounds.height + 16;
      startX = headlineBounds.left;
    }

    const textZones = gridSystem.getTextZones();
    const leftZone = textZones.find(z => z.name === 'left') || textZones[0];

    let currentY = startY;

    subheading.lines.forEach((line, i) => {
      const textObj = new fabric.Text(line.text, {
        left: startX,
        top: currentY,
        fontSize: subheading.fontSize,
        fontFamily: subheading.fontFamily,
        fontWeight: subheading.fontWeight,
        fill: '#5A6B8A',
        lineHeight: subheading.lineHeight,
        selectable: true,
        evented: true,
        name: 'subheading',
        lockRotation: true
      });

      // Snap to baseline
      const snappedY = gridSystem.snapToBaseline(currentY);
      textObj.set('top', snappedY);

      this.canvas.add(textObj);
      this.canvasManager.objects.subheading = textObj;

      currentY += line.height;
    });
  }

  /**
   * Render metadata (tagline, URL, date)
   */
  renderMetadata(metadata, gridSystem) {
    // Tagline - bottom-left
    if (metadata.tagline) {
      const taglineZone = gridSystem.getTaglineZone();
      const tagline = new fabric.Text(metadata.tagline.text, {
        left: taglineZone.x,
        top: taglineZone.y,
        fontSize: metadata.tagline.fontSize,
        fontFamily: metadata.tagline.fontFamily,
        fill: '#00338D',
        fontWeight: 500,
        selectable: false,
        evented: false,
        name: 'tagline',
        lockRotation: true
      });

      this.canvas.add(tagline);
      this.canvasManager.objects.tagline = tagline;
    }

    // URL and date - bottom-right
    if (metadata.url || metadata.date) {
      const metaZone = gridSystem.getMetadataZone();
      const metaText = [metadata.url?.text, metadata.date?.text].filter(Boolean).join(' | ');

      const metadataObj = new fabric.Text(metaText, {
        left: metaZone.x,
        top: metaZone.y,
        fontSize: metadata.url?.fontSize || 11,
        fontFamily: metadata.url?.fontFamily || "'Univers', Arial, sans-serif",
        fill: '#5A6B8A',
        textAlign: 'right',
        selectable: false,
        evented: false,
        name: 'metadata',
        lockRotation: true
      });

      this.canvas.add(metadataObj);
      this.canvasManager.objects.metadata = metadataObj;
    }
  }

  /**
   * Remove existing text elements from canvas
   */
  removeExistingText() {
    const textNames = ['headline', 'subheading', 'tagline', 'metadata'];

    textNames.forEach(name => {
      const obj = this.canvasManager.objects[name];
      if (obj) {
        this.canvas.remove(obj);
        this.canvasManager.objects[name] = null;
      }
    });

    // Also remove any orphaned text objects
    const textObjects = this.canvas.getObjects().filter(o => 
      (o.type === 'text' || o.type === 'i-text') && 
      ['headline', 'subheading', 'tagline', 'metadata'].includes(o.name)
    );

    textObjects.forEach(obj => this.canvas.remove(obj));
  }

  /**
   * Update text content without full re-render
   */
  updateText(elementName, newText) {
    const obj = this.canvasManager.objects[elementName];
    if (obj && obj.type === 'text') {
      obj.set('text', newText);
      obj.setCoords();
      this.canvas.renderAll();
    }
  }

  /**
   * Update font size
   */
  updateFontSize(elementName, newSize) {
    const obj = this.canvasManager.objects[elementName];
    if (obj && obj.type === 'text') {
      obj.set('fontSize', newSize);
      obj.setCoords();
      this.canvas.renderAll();
    }
  }

  /**
   * Update text color
   */
  updateColor(elementName, newColor) {
    const obj = this.canvasManager.objects[elementName];
    if (obj && obj.type === 'text') {
      obj.set('fill', newColor);
      this.canvas.renderAll();
    }
  }

  /**
   * Get text bounding box
   */
  getTextBounds(elementName) {
    const obj = this.canvasManager.objects[elementName];
    if (obj) {
      return obj.getBoundingRect();
    }
    return null;
  }

  /**
   * Animate text appearance
   */
  animateTextIn(elementName, duration = 300) {
    const obj = this.canvasManager.objects[elementName];
    if (!obj) return;

    obj.set('opacity', 0);
    this.canvas.renderAll();

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      obj.set('opacity', progress);
      this.canvas.renderAll();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Enable/disable stroke-first painting
   */
  setStrokeEnabled(enabled) {
    this.strokeConfig.enabled = enabled;
  }

  /**
   * Enable/disable shadow
   */
  setShadowEnabled(enabled) {
    this.shadowConfig.enabled = enabled;
  }
}

// Make available globally
window.TypographyRenderer = TypographyRenderer;

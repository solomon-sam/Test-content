/**
 * Export System
 * Export compositions in multiple formats with quality settings
 */

class ExportSystem {
  constructor(canvas, gridSystem) {
    this.canvas = canvas;
    this.gridSystem = gridSystem;
  }

  async export(options = {}) {
    const {
      format = 'png',
      dpi = 300,
      quality = 0.95,
      transparent = false
    } = options;

    // Calculate export dimensions based on DPI
    const baseWidth = this.canvas.width;
    const baseHeight = this.canvas.height;
    const scaleFactor = dpi / 72; // Base is 72 DPI
    const exportWidth = Math.round(baseWidth * scaleFactor);
    const exportHeight = Math.round(baseHeight * scaleFactor);

    // Create temporary canvas for export
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = exportWidth;
    tempCanvas.height = exportHeight;
    const ctx = tempCanvas.getContext('2d');

    // Fill background if not transparent
    if (!transparent) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportWidth, exportHeight);
    }

    // Get canvas data URL
    const dataUrl = this.canvas.toDataURL({
      format: format === 'jpg' ? 'jpeg' : format,
      quality: quality,
      multiplier: scaleFactor
    });

    // Load and draw to temp canvas
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
        resolve();
      };
      img.src = dataUrl;
    });

    // Convert to blob
    const blob = await new Promise(resolve => {
      tempCanvas.toBlob(resolve, `image/${format === 'jpg' ? 'jpeg' : format}`, quality);
    });

    return {
      dataUrl: tempCanvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : format}`, quality),
      blob,
      format,
      dimensions: { width: exportWidth, height: exportHeight },
      dpi,
      quality,
      fileSize: blob?.size || 0
    };
  }

  async exportPDF(options = {}) {
    const { dpi = 300, quality = 0.95 } = options;

    // Export as PNG first
    const pngResult = await this.export({ format: 'png', dpi, quality });

    // Create PDF using jsPDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: this.canvas.width > this.canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [this.canvas.width, this.canvas.height]
    });

    pdf.addImage(pngResult.dataUrl, 'PNG', 0, 0, this.canvas.width, this.canvas.height);

    const pdfBlob = pdf.output('blob');

    return {
      dataUrl: pdf.output('datauristring'),
      blob: pdfBlob,
      format: 'pdf',
      dimensions: { width: this.canvas.width, height: this.canvas.height },
      dpi,
      quality,
      fileSize: pdfBlob.size
    };
  }

  download(exportResult, filename = null) {
    if (!exportResult || !exportResult.blob) return;

    const ext = exportResult.format === 'jpg' ? 'jpg' : exportResult.format;
    const name = filename || `kpmg-composition-${Date.now()}.${ext}`;

    const url = URL.createObjectURL(exportResult.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async exportAllFormats() {
    const formats = ['png', 'jpg', 'pdf'];
    const results = {};

    for (const format of formats) {
      if (format === 'pdf') {
        results[format] = await this.exportPDF();
      } else {
        results[format] = await this.export({ format });
      }
    }

    return results;
  }
}

// Make available globally
window.ExportSystem = ExportSystem;

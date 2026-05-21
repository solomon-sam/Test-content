/**
 * Export System
 * High-resolution export with DPI scaling using Fabric.js native methods
 */

class ExportSystem {
    constructor(canvas, gridSystem) {
        this.canvas = canvas;
        this.grid = gridSystem;
    }

    /**
     * Export canvas as image using Fabric.js native toDataURL with multiplier
     */
    async export(options = {}) {
        const defaults = {
            format: 'png',
            dpi: 300,
            quality: 0.95,
            transparent: false,
            colorMode: 'rgb'
        };

        const config = { ...defaults, ...options };

        // Calculate multiplier based on DPI
        // Base DPI is 72, so multiplier = targetDPI / 72
        const baseDpi = 72;
        const multiplier = config.dpi / baseDpi;

        // Get original dimensions
        const originalWidth = this.canvas.width;
        const originalHeight = this.canvas.height;

        // Calculate export dimensions
        const exportWidth = Math.round(originalWidth * multiplier);
        const exportHeight = Math.round(originalHeight * multiplier);

        // Use Fabric.js toDataURL with multiplier for high-res export
        // This is the recommended approach - it renders at higher resolution internally
        let dataUrl;

        if (config.format === 'jpg' || config.format === 'jpeg') {
            dataUrl = this.canvas.toDataURL({
                format: 'jpeg',
                quality: config.quality,
                multiplier: multiplier
            });
        } else {
            // PNG (default)
            dataUrl = this.canvas.toDataURL({
                format: 'png',
                multiplier: multiplier
            });
        }

        // Convert to blob
        const blob = await this.dataUrlToBlob(dataUrl);

        // Handle PDF export
        if (config.format === 'pdf') {
            return await this.exportPDF(dataUrl, exportWidth, exportHeight, config);
        }

        return {
            blob,
            dataUrl,
            filename: `brand-asset-${Date.now()}.${config.format === 'jpg' ? 'jpg' : config.format}`,
            mimeType: config.format === 'jpg' || config.format === 'jpeg' ? 'image/jpeg' : 'image/png',
            dimensions: { width: exportWidth, height: exportHeight },
            dpi: config.dpi,
            format: config.format
        };
    }

    /**
     * Export as PDF using jsPDF
     */
    async exportPDF(imageDataUrl, width, height, config) {
        const { jsPDF } = window.jspdf;

        // Convert pixels to mm at target DPI
        const pxToMm = 25.4 / config.dpi;
        const widthMm = width * pxToMm;
        const heightMm = height * pxToMm;

        // Determine orientation
        const orientation = widthMm > heightMm ? 'landscape' : 'portrait';

        // Create PDF with exact dimensions
        const pdf = new jsPDF({
            orientation,
            unit: 'mm',
            format: [widthMm, heightMm]
        });

        // Add image to PDF
        pdf.addImage(imageDataUrl, 'PNG', 0, 0, widthMm, heightMm);

        // Generate blob
        const pdfBlob = pdf.output('blob');
        const pdfDataUrl = pdf.output('datauristring');

        return {
            blob: pdfBlob,
            dataUrl: pdfDataUrl,
            filename: `brand-asset-${Date.now()}.pdf`,
            mimeType: 'application/pdf',
            dimensions: { width, height },
            dpi: config.dpi,
            format: 'pdf'
        };
    }

    /**
     * Convert data URL to blob
     */
    async dataUrlToBlob(dataUrl) {
        const response = await fetch(dataUrl);
        return response.blob();
    }

    /**
     * Download file
     */
    download(result) {
        const link = document.createElement('a');
        link.href = result.dataUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Get file size string
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Make available globally
window.ExportSystem = ExportSystem;

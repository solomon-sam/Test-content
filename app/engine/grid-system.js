/**
 * Adaptive Grid System
 * Mathematical grid generation with dynamic cell sizing
 */

class GridSystem {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.columns = 12;
        this.rows = 12;
        this.margin = 0;
        this.gutter = 0;
        this.cellWidth = 0;
        this.cellHeight = 0;
        this.usableWidth = 0;
        this.usableHeight = 0;
        this.gridType = 'square';

        this.calculateGrid();
    }

    /**
     * Determine grid type based on aspect ratio
     */
    determineGridType() {
        const ratio = this.canvasWidth / this.canvasHeight;

        if (ratio >= 2.5) {
            this.gridType = 'ultra-wide';
            this.columns = 16;
            this.rows = 6;
        } else if (ratio >= 1.5) {
            this.gridType = 'landscape';
            this.columns = 14;
            this.rows = 8;
        } else if (ratio >= 0.8 && ratio <= 1.2) {
            this.gridType = 'square';
            this.columns = 12;
            this.rows = 12;
        } else if (ratio <= 0.6) {
            this.gridType = 'portrait';
            this.columns = 8;
            this.rows = 14;
        } else {
            this.gridType = 'landscape';
            this.columns = 12;
            this.rows = 10;
        }
    }

    /**
     * Calculate grid dimensions
     */
    calculateGrid() {
        this.determineGridType();

        // Safe margin: 5% of smallest dimension
        this.margin = Math.min(this.canvasWidth, this.canvasHeight) * 0.05;

        // Gutter: 1.5% of smallest dimension
        this.gutter = Math.min(this.canvasWidth, this.canvasHeight) * 0.015;

        // Usable area
        this.usableWidth = this.canvasWidth - (this.margin * 2);
        this.usableHeight = this.canvasHeight - (this.margin * 2);

        // Cell dimensions (accounting for gutters)
        const totalGutterWidth = this.gutter * (this.columns - 1);
        const totalGutterHeight = this.gutter * (this.rows - 1);

        this.cellWidth = (this.usableWidth - totalGutterWidth) / this.columns;
        this.cellHeight = (this.usableHeight - totalGutterHeight) / this.rows;
    }

    /**
     * Convert grid coordinates to pixel coordinates
     */
    gridToPixel(col, row, colSpan = 1, rowSpan = 1) {
        const x = this.margin + col * (this.cellWidth + this.gutter);
        const y = this.margin + row * (this.cellHeight + this.gutter);
        const w = colSpan * this.cellWidth + (colSpan - 1) * this.gutter;
        const h = rowSpan * this.cellHeight + (rowSpan - 1) * this.gutter;

        return { x, y, width: w, height: h };
    }

    /**
     * Convert pixel coordinates to nearest grid cell
     */
    pixelToGrid(x, y) {
        const col = Math.round((x - this.margin) / (this.cellWidth + this.gutter));
        const row = Math.round((y - this.margin) / (this.cellHeight + this.gutter));

        return {
            col: Math.max(0, Math.min(col, this.columns - 1)),
            row: Math.max(0, Math.min(row, this.rows - 1))
        };
    }

    /**
     * Snap coordinates to grid
     */
    snapToGrid(x, y, width, height) {
        const gridPos = this.pixelToGrid(x, y);
        const gridEnd = this.pixelToGrid(x + width, y + height);

        const colSpan = Math.max(1, gridEnd.col - gridPos.col + 1);
        const rowSpan = Math.max(1, gridEnd.row - gridPos.row + 1);

        return this.gridToPixel(gridPos.col, gridPos.row, colSpan, rowSpan);
    }

    /**
     * Get safe zone rectangle
     */
    getSafeZone() {
        return {
            x: this.margin,
            y: this.margin,
            width: this.usableWidth,
            height: this.usableHeight
        };
    }

    /**
     * Get corner zones for logo placement
     */
    getLogoZones() {
        // Logo typically placed in corners, avoiding center
        const zoneSize = 3; // cells

        return [
            { name: 'top-left', ...this.gridToPixel(0, 0, zoneSize, zoneSize) },
            { name: 'top-right', ...this.gridToPixel(this.columns - zoneSize, 0, zoneSize, zoneSize) },
            { name: 'bottom-left', ...this.gridToPixel(0, this.rows - zoneSize, zoneSize, zoneSize) },
            { name: 'bottom-right', ...this.gridToPixel(this.columns - zoneSize, this.rows - zoneSize, zoneSize, zoneSize) }
        ];
    }

    /**
     * Get baseline zones for text placement
     */
    getTextZones() {
        return [
            { name: 'bottom', ...this.gridToPixel(1, this.rows - 3, this.columns - 2, 2) },
            { name: 'top', ...this.gridToPixel(1, 1, this.columns - 2, 2) },
            { name: 'left', ...this.gridToPixel(1, 3, 3, this.rows - 6) },
            { name: 'right', ...this.gridToPixel(this.columns - 4, 3, 3, this.rows - 6) }
        ];
    }

    /**
     * Generate grid lines for Fabric.js
     */
    generateGridLines() {
        const lines = [];

        // Vertical lines
        for (let i = 0; i <= this.columns; i++) {
            const x = this.margin + i * (this.cellWidth + this.gutter) - (i > 0 ? this.gutter / 2 : 0);
            lines.push({
                x1: x, y1: this.margin,
                x2: x, y2: this.canvasHeight - this.margin,
                major: i % 4 === 0
            });
        }

        // Horizontal lines
        for (let i = 0; i <= this.rows; i++) {
            const y = this.margin + i * (this.cellHeight + this.gutter) - (i > 0 ? this.gutter / 2 : 0);
            lines.push({
                x1: this.margin, y1: y,
                x2: this.canvasWidth - this.margin, y2: y,
                major: i % 4 === 0
            });
        }

        return lines;
    }

    /**
     * Generate margin rectangle
     */
    generateMarginRect() {
        return {
            left: this.margin,
            top: this.margin,
            width: this.usableWidth,
            height: this.usableHeight
        };
    }

    /**
     * Check if a point is in the safe zone
     */
    isInSafeZone(x, y, width = 0, height = 0) {
        return (
            x >= this.margin &&
            y >= this.margin &&
            (x + width) <= (this.canvasWidth - this.margin) &&
            (y + height) <= (this.canvasHeight - this.margin)
        );
    }

    /**
     * Get grid info for display
     */
    getInfo() {
        return {
            type: this.gridType,
            columns: this.columns,
            rows: this.rows,
            cellWidth: Math.round(this.cellWidth),
            cellHeight: Math.round(this.cellHeight),
            margin: Math.round(this.margin),
            gutter: Math.round(this.gutter)
        };
    }
}

// Make available globally
window.GridSystem = GridSystem;

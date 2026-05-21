/**
 * Demo Helper - Generates test images for demonstration
 */

class DemoHelper {
    /**
     * Generate a test image with a person in motion (running figure)
     */
    static generateRunningPerson(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.6);
        skyGrad.addColorStop(0, '#4a90d9');
        skyGrad.addColorStop(1, '#87ceeb');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height * 0.6);

        // Ground
        ctx.fillStyle = '#3a7d3a';
        ctx.fillRect(0, height * 0.6, width, height * 0.4);

        // Running figure (simplified silhouette)
        ctx.fillStyle = '#2c3e50';
        const cx = width * 0.5;
        const cy = height * 0.5;

        // Head
        ctx.beginPath();
        ctx.arc(cx, cy - 40, 15, 0, Math.PI * 2);
        ctx.fill();

        // Body (leaning forward to show motion)
        ctx.beginPath();
        ctx.moveTo(cx, cy - 25);
        ctx.lineTo(cx + 10, cy + 20);
        ctx.lineTo(cx - 5, cy + 20);
        ctx.closePath();
        ctx.fill();

        // Arms (running pose)
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#2c3e50';
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy - 10);
        ctx.lineTo(cx + 30, cy - 30); // Forward arm
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 10);
        ctx.lineTo(cx - 25, cy + 10); // Back arm
        ctx.stroke();

        // Legs (running pose)
        ctx.beginPath();
        ctx.moveTo(cx, cy + 20);
        ctx.lineTo(cx + 20, cy + 50); // Forward leg
        ctx.lineTo(cx + 25, cy + 80);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, cy + 20);
        ctx.lineTo(cx - 15, cy + 45); // Back leg
        ctx.lineTo(cx - 10, cy + 75);
        ctx.stroke();

        // Motion blur effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(cx + 20 + i * 10, cy - 20, 5, 60);
        }

        return canvas;
    }

    /**
     * Generate a test architecture image
     */
    static generateArchitecture(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Sky
        ctx.fillStyle = '#b8d4e3';
        ctx.fillRect(0, 0, width, height * 0.5);

        // Building
        ctx.fillStyle = '#e8e8e8';
        const buildingX = width * 0.2;
        const buildingY = height * 0.3;
        const buildingW = width * 0.6;
        const buildingH = height * 0.7;

        ctx.fillRect(buildingX, buildingY, buildingW, buildingH);

        // Windows (grid pattern)
        ctx.fillStyle = '#4a5568';
        const cols = 6;
        const rows = 8;
        const padX = 10;
        const padY = 10;
        const winW = (buildingW - padX * (cols + 1)) / cols;
        const winH = (buildingH * 0.7 - padY * (rows + 1)) / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                ctx.fillRect(
                    buildingX + padX + c * (winW + padX),
                    buildingY + padY + r * (winH + padY),
                    winW,
                    winH
                );
            }
        }

        // Ground
        ctx.fillStyle = '#718096';
        ctx.fillRect(0, height * 0.85, width, height * 0.15);

        return canvas;
    }

    /**
     * Generate a test nature/water image
     */
    static generateNatureMotion(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.4);
        skyGrad.addColorStop(0, '#ff9a9e');
        skyGrad.addColorStop(1, '#fad0c4');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height * 0.4);

        // Ocean with waves
        for (let i = 0; i < 20; i++) {
            const alpha = 0.3 + (i / 20) * 0.7;
            ctx.fillStyle = `rgba(66, 153, 225, ${alpha})`;
            const y = height * 0.4 + i * (height * 0.6 / 20);
            const waveHeight = 10 + Math.sin(i) * 5;

            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x < width; x += 10) {
                ctx.lineTo(x, y + Math.sin(x * 0.02 + i * 0.5) * waveHeight);
            }
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();
            ctx.fill();
        }

        return canvas;
    }

    /**
     * Convert canvas to image element
     */
    static canvasToImage(canvas) {
        const img = new Image();
        img.src = canvas.toDataURL('image/png');
        return img;
    }

    /**
     * Generate a simple logo for testing
     */
    static generateLogo(size = 200) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Transparent background
        ctx.clearRect(0, 0, size, size);

        // Circle background
        ctx.beginPath();
        ctx.arc(size/2, size/2, size/2 - 5, 0, Math.PI * 2);
        ctx.fillStyle = '#00338d';
        ctx.fill();

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${size * 0.35}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('K', size/2, size/2);

        return this.canvasToImage(canvas);
    }
}

// Make available globally
window.DemoHelper = DemoHelper;

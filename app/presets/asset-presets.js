/**
 * Asset Presets Configuration
 * Predefined dimensions and settings for common brand assets
 */

const AssetPresets = {
    categories: {
        social: {
            name: 'Social Media',
            icon: '📱',
            presets: [
                { id: 'ig-square', name: 'Instagram Square', width: 1080, height: 1080, unit: 'px', dpi: 72, icon: '□' },
                { id: 'ig-portrait', name: 'Instagram Portrait', width: 1080, height: 1350, unit: 'px', dpi: 72, icon: '▯' },
                { id: 'ig-story', name: 'Instagram Story', width: 1080, height: 1920, unit: 'px', dpi: 72, icon: '▭' },
                { id: 'linkedin-post', name: 'LinkedIn Post', width: 1200, height: 627, unit: 'px', dpi: 72, icon: '▭' },
                { id: 'linkedin-banner', name: 'LinkedIn Banner', width: 1584, height: 396, unit: 'px', dpi: 72, icon: '▬' },
                { id: 'youtube-thumb', name: 'YouTube Thumbnail', width: 1280, height: 720, unit: 'px', dpi: 72, icon: '▭' },
                { id: 'twitter-post', name: 'Twitter / X Post', width: 1200, height: 675, unit: 'px', dpi: 72, icon: '▭' },
                { id: 'facebook-post', name: 'Facebook Post', width: 1200, height: 630, unit: 'px', dpi: 72, icon: '▭' }
            ]
        },
        web: {
            name: 'Web',
            icon: '🌐',
            presets: [
                { id: 'web-fullwidth', name: 'Full Width Banner', width: 1920, height: 600, unit: 'px', dpi: 72, icon: '▬' },
                { id: 'web-motif', name: 'Motif Banner', width: 1600, height: 400, unit: 'px', dpi: 72, icon: '▬' },
                { id: 'web-hero', name: 'Hero Banner', width: 1920, height: 1080, unit: 'px', dpi: 72, icon: '▭' },
                { id: 'web-supporting', name: 'Supporting Image', width: 800, height: 600, unit: 'px', dpi: 72, icon: '▭' },
                { id: 'web-headshot', name: 'Contact Headshot', width: 400, height: 400, unit: 'px', dpi: 72, icon: '□' }
            ]
        },
        email: {
            name: 'Email',
            icon: '✉',
            presets: [
                { id: 'email-header', name: 'Email Header', width: 600, height: 200, unit: 'px', dpi: 72, icon: '▬' },
                { id: 'email-banner', name: 'Email Banner', width: 600, height: 300, unit: 'px', dpi: 72, icon: '▭' },
                { id: 'email-hero', name: 'Newsletter Hero', width: 600, height: 400, unit: 'px', dpi: 72, icon: '▭' }
            ]
        },
        print: {
            name: 'Print',
            icon: '📄',
            presets: [
                { id: 'a4-portrait', name: 'A4 Portrait', width: 210, height: 297, unit: 'mm', dpi: 300, icon: '▯' },
                { id: 'a4-landscape', name: 'A4 Landscape', width: 297, height: 210, unit: 'mm', dpi: 300, icon: '▭' },
                { id: 'a4-header', name: 'A4 Header Banner', width: 210, height: 60, unit: 'mm', dpi: 300, icon: '▬' },
                { id: 'a5-portrait', name: 'A5 Portrait', width: 148, height: 210, unit: 'mm', dpi: 300, icon: '▯' },
                { id: 'business-card', name: 'Business Card', width: 85, height: 55, unit: 'mm', dpi: 300, icon: '▭' }
            ]
        },
        presentation: {
            name: 'Presentation',
            icon: '📊',
            presets: [
                { id: 'ppt-fhd', name: 'Full HD (16:9)', width: 1920, height: 1080, unit: 'px', dpi: 72, icon: '▭' },
                { id: 'ppt-4k', name: '4K UHD', width: 3840, height: 2160, unit: 'px', dpi: 72, icon: '▭' },
                { id: 'ppt-slide', name: 'PowerPoint Slide', width: 1280, height: 720, unit: 'px', dpi: 72, icon: '▭' },
                { id: 'ppt-4x3', name: 'Standard (4:3)', width: 1024, height: 768, unit: 'px', dpi: 72, icon: '▭' }
            ]
        },
        custom: {
            name: 'Custom',
            icon: '⚙',
            presets: []
        }
    },

    /**
     * Get preset by ID
     */
    getPreset(id) {
        for (const category of Object.values(this.categories)) {
            const preset = category.presets.find(p => p.id === id);
            if (preset) return { ...preset, category: category.name };
        }
        return null;
    },

    /**
     * Get all presets for a category
     */
    getCategoryPresets(categoryKey) {
        return this.categories[categoryKey]?.presets || [];
    },

    /**
     * Convert dimensions to pixels
     */
    toPixels(value, unit, dpi = 72) {
        switch(unit) {
            case 'mm': return Math.round(value * dpi / 25.4);
            case 'in': return Math.round(value * dpi);
            case 'px': default: return Math.round(value);
        }
    },

    /**
     * Get canvas dimensions in pixels
     */
    getCanvasDimensions(preset) {
        return {
            width: this.toPixels(preset.width, preset.unit, preset.dpi),
            height: this.toPixels(preset.height, preset.unit, preset.dpi)
        };
    }
};

// Make available globally
window.AssetPresets = AssetPresets;

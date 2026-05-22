/**
 * Asset Presets
 * All dimension presets for social, web, and print
 */

class AssetPresets {
  static getAllPresets() {
    return {
      // Social Media
      'ig-portrait': {
        id: 'ig-portrait',
        name: 'Instagram Portrait',
        category: 'social',
        width: 1080,
        height: 1350,
        aspectRatio: '4:5',
        description: 'Instagram Portrait Post',
        icon: 'portrait'
      },
      'ig-square': {
        id: 'ig-square',
        name: 'Instagram Square',
        category: 'social',
        width: 1080,
        height: 1080,
        aspectRatio: '1:1',
        description: 'Instagram Square Post',
        icon: 'square'
      },
      'ig-story': {
        id: 'ig-story',
        name: 'Instagram Story',
        category: 'social',
        width: 1080,
        height: 1920,
        aspectRatio: '9:16',
        description: 'Instagram Story',
        icon: 'story'
      },
      'linkedin-post': {
        id: 'linkedin-post',
        name: 'LinkedIn Post',
        category: 'social',
        width: 1200,
        height: 627,
        aspectRatio: '1.91:1',
        description: 'LinkedIn Feed Post',
        icon: 'landscape'
      },
      'facebook-post': {
        id: 'facebook-post',
        name: 'Facebook Post',
        category: 'social',
        width: 1200,
        height: 630,
        aspectRatio: '1.91:1',
        description: 'Facebook Feed Post',
        icon: 'landscape'
      },
      'youtube-thumbnail': {
        id: 'youtube-thumbnail',
        name: 'YouTube Thumbnail',
        category: 'social',
        width: 1280,
        height: 720,
        aspectRatio: '16:9',
        description: 'YouTube Video Thumbnail',
        icon: 'landscape'
      },
      'tiktok-cover': {
        id: 'tiktok-cover',
        name: 'TikTok Cover',
        category: 'social',
        width: 1080,
        height: 1920,
        aspectRatio: '9:16',
        description: 'TikTok Video Cover',
        icon: 'story'
      },

      // Web Banners
      'web-hero': {
        id: 'web-hero',
        name: 'Web Hero',
        category: 'web',
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        description: 'Website Hero Banner',
        icon: 'landscape'
      },
      'email-banner': {
        id: 'email-banner',
        name: 'Email Banner',
        category: 'web',
        width: 600,
        height: 200,
        aspectRatio: '3:1',
        description: 'Email Marketing Banner',
        icon: 'wide'
      },
      'landing-banner': {
        id: 'landing-banner',
        name: 'Landing Banner',
        category: 'web',
        width: 1200,
        height: 628,
        aspectRatio: '1.91:1',
        description: 'Landing Page Banner',
        icon: 'landscape'
      },
      'full-width-banner': {
        id: 'full-width-banner',
        name: 'Full Width Banner',
        category: 'web',
        width: 1920,
        height: 600,
        aspectRatio: '3.2:1',
        description: 'Full Width Website Banner',
        icon: 'wide'
      },

      // Presentation / Print
      'slide-16-9': {
        id: 'slide-16-9',
        name: 'Slide 16:9',
        category: 'presentation',
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        description: 'Presentation Slide 16:9',
        icon: 'landscape'
      },
      'slide-4-3': {
        id: 'slide-4-3',
        name: 'Slide 4:3',
        category: 'presentation',
        width: 1024,
        height: 768,
        aspectRatio: '4:3',
        description: 'Presentation Slide 4:3',
        icon: 'landscape'
      },
      'a4-portrait': {
        id: 'a4-portrait',
        name: 'A4 Portrait',
        category: 'presentation',
        width: 794,
        height: 1123,
        aspectRatio: '1:1.41',
        description: 'A4 Portrait Print',
        icon: 'portrait'
      },
      'a4-landscape': {
        id: 'a4-landscape',
        name: 'A4 Landscape',
        category: 'presentation',
        width: 1123,
        height: 794,
        aspectRatio: '1.41:1',
        description: 'A4 Landscape Print',
        icon: 'landscape'
      },
      'custom': {
        id: 'custom',
        name: 'Custom Size',
        category: 'presentation',
        width: 1080,
        height: 1080,
        aspectRatio: 'custom',
        description: 'Set your own width & height',
        icon: 'custom'
      }
    };
  }

  static getPreset(id) {
    return this.getAllPresets()[id] || this.getAllPresets()['ig-square'];
  }

  static getCategoryPresets(category) {
    return Object.values(this.getAllPresets()).filter(p => p.category === category);
  }

  static getCanvasDimensions(preset) {
    if (!preset) return { width: 1080, height: 1080 };
    return {
      width: preset.width,
      height: preset.height
    };
  }

  static getAspectRatio(preset) {
    return preset?.aspectRatio || '1:1';
  }

  static getDisplaySize(preset) {
    const dims = this.getCanvasDimensions(preset);
    const maxDisplay = 800;
    const scale = Math.min(maxDisplay / dims.width, maxDisplay / dims.height, 1);
    return {
      width: Math.round(dims.width * scale),
      height: Math.round(dims.height * scale),
      scale: scale
    };
  }
}

// Make available globally
window.AssetPresets = AssetPresets;

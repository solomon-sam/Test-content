# KPMG Intelligent Brand Composition Engine

A complete offline brand composition tool that runs entirely in the browser with zero installation. Built for the KPMG brand guidelines, this application guides users through a 4-step wizard to create on-brand compositions.

## Features

### Phase 1: Foundation & Infrastructure
- **4-Step Wizard UI** — Explore → Compose → Refine → Export
- **Observable State Manager** — Reactive state with pub/sub, batch updates, localStorage persistence
- **Adaptive Grid System** — KPMG brand grid (7:10/10:7 modules, 5% margins, baseline snapping)
- **Pointer Events** — Mouse + touch + pen support, pinch-to-zoom, cursor state machine
- **17 Dimension Presets** — Social Media, Web Banners, Presentation/Print
- **Brand Score** — Real-time animated circular progress indicator
- **Export System** — PNG/JPG/PDF with quality/DPI settings

### Phase 2: Typography & Accessibility
- **Typography Composition Engine** — Auto-generates editorial typography from 2 inputs
  - Semantic tokenization
  - Optical width calculation
  - Editorial line grouping with asymmetric line lengths
  - Progressive line offsets (max 3 grid units)
- **Accessibility Engine** — Real-time WCAG validation
  - Contrast ratio calculations
  - Typography safety heatmaps
  - 10-strategy auto-correction
  - Color blindness safety checks
- **Typography Renderer** — Fabric.js rendering with baseline alignment, stroke-first painting, shadow depth

## Quick Start

No installation required. Simply open `index.html` in any modern browser.

```bash
# Clone or download the repository
git clone https://github.com/solomon-sam/Test-content.git

# Open in browser (macOS)
open index.html

# Or on Linux
xdg-open index.html

# Or on Windows
start index.html
```

## File Structure

```
├── index.html                          # Main application
├── app.js                              # Main controller
├── README.md                           # This file
│
├── app/
│   ├── styles/
│   │   └── styles.css                  # KPMG light theme
│   │
│   ├── presets/
│   │   └── asset-presets.js            # 17 dimension presets
│   │
│   ├── engine/                         # Core engines
│   │   ├── state-manager.js            # Observable reactive state
│   │   ├── grid-system.js              # KPMG brand grid
│   │   ├── ai-analysis.js              # Image analysis
│   │   ├── composition-engine.js       # Auto-composition
│   │   ├── typography-composition-engine.js  # Auto-typography
│   │   ├── accessibility-engine.js     # WCAG validation
│   │   ├── validation-rules.js         # Brand validation
│   │   ├── export-system.js            # Export system
│   │   └── orchestration-engine.js     # Pipeline orchestration
│   │
│   └── components/                     # UI components
│       ├── canvas-manager.js           # Fabric.js canvas
│       ├── ui-controls.js              # UI interactions
│       ├── typography-renderer.js      # Text rendering
│       ├── interaction-manager.js      # Pointer events
│       ├── edit-mode-controller.js     # Manual editing
│       ├── contextual-tooltip.js       # Tooltips
│       ├── color-picker.js             # Overlay colors
│       └── layers-panel.js             # Layer management
```

## Usage

1. **Explore** — Upload an image (JPG/PNG up to 50MB) and enter your headline and subheading
2. **Compose** — Select dimensions from 17 presets across Social, Web, and Print categories
3. **Refine** — Review the AI-composed layout on the canvas. The Brand Check panel shows real-time compliance scores
4. **Export** — Choose format (PNG/JPG/PDF/MP4), quality, and DPI, then download

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

All loaded via CDN (or can be vendored for fully offline use):
- [Fabric.js](https://fabricjs.com/) 5.3.1 — Canvas rendering
- [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 — PDF export

## Architecture

The application uses a vanilla JavaScript class-based architecture:

- **StateManager** — Central reactive state with path-based subscriptions
- **GridSystem** — Mathematical grid with KPMG brand rules (5% margins, 7:10 modules)
- **CanvasManager** — Fabric.js wrapper with rAF rendering loop
- **Engines** — Specialized modules for AI analysis, composition, typography, accessibility
- **Components** — UI controllers for interaction, editing, tooltips, color picking

## License

Proprietary — KPMG Brand Composition Engine

## Development Roadmap

- [x] Phase 1: Foundation & Infrastructure
- [x] Phase 2: Typography & Accessibility
- [ ] Phase 3A: Global Brand Compliance Checklist
- [ ] Phase 3B: Manual Composition Adjustment Mode
- [ ] Phase 4: Integration, Optimization & Export Enforcement

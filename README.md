# KPMG Brand Composition Engine
## Phase 3 — Compliance & Manual Editing
### Vanilla JavaScript Edition | Zero Installation | Browser-Only

---

## Overview

The **KPMG Brand Composition Engine** is a browser-based brand asset creation tool that transforms uploaded images and text into on-brand compositions following KPMG's visual identity guidelines. It runs entirely in the browser with **zero backend, zero installation, and zero build step**.

### What it does

1. **Upload** an image and enter headline/subheading text
2. **Choose** dimensions from 25+ preset formats (social, web, print)
3. **Refine** the AI-generated composition with manual editing tools
4. **Export** in PNG, JPG, PDF, or MP4 — watermark-free and brand-safe

### Key Features

| Feature | Description |
|---------|-------------|
| AI-Powered Composition | Automatically analyzes images and places brand elements |
| Intelligent Typography | Auto-generates editorial-style headlines from 2 text inputs |
| Grid-Governed Layout | All elements snap to KPMG's 7:10/10:7 module grid system |
| Real-Time Compliance | 10-category checklist validates brand safety continuously |
| Manual Editing Mode | Grab-and-drag elements with elastic snapping and soft constraints |
| Overlay Color Changer | Live preview of color treatments with blend mode controls |
| Accessibility Engine | WCAG contrast validation with auto-correction |
| Export Gate | Blocks export until all brand compliance checks pass |

---

## Quick Start

### Option 1: Open Directly (No Installation)

Simply open `index.html` in any modern browser:

```bash
# macOS
open index.html

# Windows
start index.html

# Linux
xdg-open index.html
```

### Option 2: Serve Locally (Recommended)

For full functionality (image uploads work better with a local server):

```bash
# Python 3
python -m http.server 8000

# Node.js (if you have npx)
npx serve .

# PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

---

## System Requirements

| Requirement | Specification |
|-------------|---------------|
| Browser | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| JavaScript | ES6+ (classes, arrow functions, async/await) |
| Screen | 1280×720 minimum recommended |
| No installation | Zero dependencies, zero build step |

### External CDN Dependencies

These are loaded automatically via CDN in `index.html`:

- **Fabric.js** 5.3.1 — Canvas rendering engine
- **jsPDF** 2.5.1 — PDF export functionality

For offline use, download these files and update the `<script>` tags in `index.html` to point to local copies.

---

## Project Structure

```
brand-composition-engine/
├── index.html                          # Main application entry point
├── app.js                              # Main application controller
│
├── app/
│   ├── styles/
│   │   └── styles.css                  # Dark premium UI styles
│   │
│   ├── presets/
│   │   └── asset-presets.js            # 25+ dimension presets
│   │
│   ├── engine/                         # Core business logic (18 modules)
│   │   ├── state-manager.js            # Observable reactive state system
│   │   ├── grid-system.js              # KPMG grid with baseline snapping
│   │   ├── ai-analysis.js              # Image analysis & saliency detection
│   │   ├── composition-engine.js       # Auto-composition placement
│   │   ├── typography-composition-engine.js  # Intelligent typography
│   │   ├── accessibility-engine.js     # WCAG validation & auto-correction
│   │   ├── compliance-engine.js        # 10-category brand checklist ⭐ NEW
│   │   ├── constraint-engine.js        # Soft constraints & elastic snapping ⭐ NEW
│   │   ├── validation-rules.js         # Brand validation rules
│   │   ├── export-system.js            # Multi-format export
│   │   └── orchestration-engine.js     # Pipeline orchestration
│   │
│   └── components/                     # UI components (10 modules)
│       ├── canvas-manager.js           # Fabric.js canvas management
│       ├── ui-controls.js              # UI interactions & state binding
│       ├── edit-mode-controller.js     # Manual editing mode ⭐ ENHANCED
│       ├── typography-renderer.js      # Canvas text rendering
│       ├── interaction-manager.js      # Pointer events & gestures
│       ├── contextual-tooltip.js       # Element tooltips ⭐ NEW
│       ├── color-picker.js             # Overlay color changer ⭐ ENHANCED
│       └── layers-panel.js             # Layer management
│
└── assets/                             # Optional static assets
    ├── fonts/                          # KPMG Bold, Univers (if licensed)
    └── icons/                          # UI icons
```

---

## Architecture

### State Management

The application uses a lightweight **Observable State Manager** (~2KB) with:

- Path-based state access: `state.get('typography.headline.text')`
- Reactive subscriptions: `state.subscribe('brandScore', callback)`
- Batch updates for 60fps performance
- Automatic localStorage persistence

### Grid System

Based on KPMG's brand guidelines (Pages 47-49):

- **Module ratio**: 7:10 (portrait) or 10:7 (landscape)
- **Margin**: 5% of canvas width/height
- **Baseline unit**: Cell height ÷ 4
- All brand elements align to grid — no free-floating elements

### Compliance Engine (Phase 3)

10-category real-time validation:

| Category | Checks |
|----------|--------|
| Grid | Alignment, rhythm, margins, snapping |
| Logo | Locked position, safe zone, contrast |
| Typography | Fonts, hierarchy, orphans, line balancing |
| Motif | 7:10 or 10:7 ratio, minimum 20% canvas area |
| Swoosh | Attachment, dimensions, blur, opacity |
| Image | No distortion, focal clarity, brand compatibility |
| Treatment | Approved colors (#1E49E2, #00338D), blend modes |
| Accessibility | WCAG contrast, font size, color blindness safety |
| Composition | Negative space balance, visual weight, rhythm |
| Export | Quality settings, DPI, dimension validation |

**Export Gate**: Any FAIL status blocks export until resolved.

### Manual Editing Mode (Phase 3)

Constrained intelligent art-direction:

- **Soft Constraints**: Elastic resistance, magnetic grid snap, margin enforcement
- **Live Validation**: 60fps violation detection during drag
- **Contextual Tooltips**: Element-specific actions (portrait/landscape, font size, overlay color)
- **Auto-Correction**: One-click fix for compliance violations
- **Live Scoring**: Real-time brand score updates during editing

---

## Usage Guide

### Step 1: Explore (Upload & Text)

1. Drag & drop or click to upload an image (JPG/PNG, max 50MB)
2. Enter a **Headline** (max 60 chars) — uses KPMG Bold
3. Enter a **Subheading** (max 120 chars) — uses Univers
4. Click **Continue**

### Step 2: Compose (Choose Dimensions)

Select from 25+ presets across three categories:

| Category | Formats |
|----------|---------|
| Social Media | Instagram Portrait/Square/Story, LinkedIn, Facebook, YouTube, TikTok |
| Web Banners | Hero, Email, Landing, Full Width |
| Presentation/Print | 16:9 Slide, 4:3 Slide, A4 Portrait/Landscape, Custom |

Click **Continue** after selecting.

### Step 3: Refine (Edit & Validate)

The AI automatically generates a composition. You can:

#### View Brand Check
The right panel shows real-time compliance status:
- 🟢 **Pass** — Meets brand guidelines
- 🟡 **Warning** — Needs attention but won't block export
- 🔴 **Fail** — Must be fixed before export

#### Enter Manual Edit Mode
Click the **✎** button in the canvas toolbar:
- **Drag** elements to reposition
- **Click** elements to see contextual tooltips
- **Elastic snapping** pulls elements toward grid lines
- **Red glow** = hard constraint violation (can't place there)
- **Amber glow** = warning (allowed but not ideal)

#### Available Actions by Element

| Element | Tooltip Actions |
|---------|----------------|
| Motif Window | Portrait/Landscape toggle, Scale Up/Down |
| Headline | Font Size +/−, Align Left/Right |
| Subheading | Font Size +/−, Align Left/Center |
| Background | Scale Up/Down, **Overlay Color**, Reset Position |
| Swoosh | Move Left/Right, Opacity controls |

#### Change Overlay Color
1. Select background image in edit mode
2. Click **🎨 Overlay Color** in tooltip
3. Choose a preset or custom color
4. Select blend mode (Multiply, Linear Light, Hard Light, Color, Overlay)
5. Adjust opacity slider
6. Click **Apply** — live preview updates the canvas

#### Auto-Correction
If violations appear, a toast notification appears bottom-right:
- Click **Auto-fix** to apply corrections automatically
- Or **Dismiss** to keep manual control

### Step 4: Export

1. Choose format: **PNG** (high quality), **JPG** (smaller file), **PDF** (print ready), **MP4** (video)
2. Adjust quality slider (50-100%)
3. Select DPI: 72 (web), 150 (digital), 300 (print), 600 (high print)
4. Click **Export Composition**

> **Note**: Export is blocked if any compliance check shows **FAIL**. Fix issues in the Refine step first.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Close tooltip / color picker / modal |
| `+` / `-` | Zoom in / out (when canvas focused) |
| `G` | Toggle grid visibility |
| `S` | Toggle snap to grid |
| `E` | Toggle edit mode |
| `F` | Fit canvas to screen |

---

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Full support |
| Firefox | 88+ | ✅ Full support |
| Safari | 14+ | ✅ Full support |
| Edge | 90+ | ✅ Full support |
| Internet Explorer | Any | ❌ Not supported |

---

## Development

### No Build Step Required

This is a **vanilla JavaScript** application. No webpack, no npm, no transpilation.

1. Edit any `.js` file
2. Refresh the browser
3. Changes apply immediately

### File Load Order

Scripts in `index.html` must load in this order:

```html
<!-- 1. Presets & Utilities -->
<script src="app/presets/asset-presets.js"></script>

<!-- 2. State & Grid -->
<script src="app/engine/state-manager.js"></script>
<script src="app/engine/grid-system.js"></script>

<!-- 3. AI & Composition Engines -->
<script src="app/engine/ai-analysis.js"></script>
<script src="app/engine/composition-engine.js"></script>
<script src="app/engine/typography-composition-engine.js"></script>
<script src="app/engine/accessibility-engine.js"></script>

<!-- 4. Phase 3: Compliance & Constraints -->
<script src="app/engine/compliance-engine.js"></script>
<script src="app/engine/constraint-engine.js"></script>

<!-- 5. Validation & Export -->
<script src="app/engine/validation-rules.js"></script>
<script src="app/engine/export-system.js"></script>
<script src="app/engine/orchestration-engine.js"></script>

<!-- 6. UI Components -->
<script src="app/components/canvas-manager.js"></script>
<script src="app/components/typography-renderer.js"></script>
<script src="app/components/interaction-manager.js"></script>
<script src="app/components/edit-mode-controller.js"></script>
<script src="app/components/contextual-tooltip.js"></script>
<script src="app/components/color-picker.js"></script>
<script src="app/components/layers-panel.js"></script>
<script src="app/components/ui-controls.js"></script>

<!-- 7. Main Application -->
<script src="app.js"></script>
```

### Adding a New Preset

Edit `app/presets/asset-presets.js`:

```javascript
{
  id: 'my-custom-format',
  name: 'My Custom Format',
  category: 'social',
  width: 1080,
  height: 1350,
  description: 'Custom social media format',
  tags: ['custom', 'social']
}
```

### Adding a New Compliance Check

Edit `app/engine/compliance-engine.js`:

```javascript
class MyCustomChecklist {
  validate(state, canvasManager) {
    const issues = [];
    // Your validation logic here
    return {
      status: issues.length === 0 ? 'PASS' : 'WARNING',
      issues
    };
  }
}

// Register in ComplianceEngine constructor:
this.checklists.custom = new MyCustomChecklist();
```

---

## Troubleshooting

### Image upload doesn't work
- Ensure the file is JPG or PNG
- File must be under 50MB
- Try using a local server instead of opening `file://`

### Canvas appears blank
- Check browser console for JavaScript errors
- Verify all script files loaded in correct order
- Ensure Fabric.js CDN is accessible

### Export fails
- Check compliance status — FAIL blocks export
- Verify jsPDF loaded correctly (check Network tab)
- Try a different format (PNG is most reliable)

### Grid not visible
- Click the **#** button in the canvas toolbar
- Grid may be subtle on dark images — try toggling treatment visibility

### Edit mode not working
- Ensure you're on the **Refine** step
- Click the **✎** button to activate edit mode
- Only editable elements (motif, headline, subheading, swoosh, background) can be selected

---

## Brand Guidelines Reference

This engine implements rules from the **KPMG Make the Difference playbook** (Pages 47-49):

| Rule | Implementation |
|------|---------------|
| Module ratio 7:10 or 10:7 | Motif window enforces aspect ratio |
| 5% margin | Grid system calculates safe zones |
| Logo top-left, locked | Logo placement is non-editable |
| "Make the Difference" bottom-left | Tagline is non-editable |
| Typography safe zones | 1 grid unit from motif, 2 from logo |
| Baseline grid alignment | Text snaps to cellHeight/4 intervals |
| Blue treatment (#1E49E2) | Color picker defaults to approved palette |

---

## Changelog

### Phase 3 (Current)
- ✅ Global Brand Compliance Checklist Engine (10 categories)
- ✅ Manual Composition Adjustment Mode
- ✅ Soft Constraint Engine with elastic snapping
- ✅ Live validation at 60fps during editing
- ✅ Contextual tooltip system
- ✅ Overlay color changer with live preview
- ✅ Export gate enforcement
- ✅ Auto-correction toast notifications
- ✅ Live composition scoring

### Phase 2
- Intelligent typography composition engine
- Accessibility validation & auto-correction
- Typography safety heatmaps
- WCAG-compliant contrast calculations

### Phase 1
- Observable state manager
- Grid system with baseline snapping
- AI image analysis
- Auto-composition engine
- Canvas manager with Fabric.js
- Dark premium UI

---

## License

© 2026 KPMG. All rights reserved.

This is proprietary software for internal KPMG brand asset creation.

---

## Support

For issues or questions:
1. Check the **Browser Console** (F12) for error messages
2. Review the **Integration Guide** (`INTEGRATION_GUIDE.md`)
3. Check the **Build Summary** (`BUILD_SUMMARY.md`)

---

*Version: 2.1 | Phase 3 | Vanilla JavaScript Edition*
*Last Updated: 2026-05-22*

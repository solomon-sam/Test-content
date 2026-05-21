# Intelligent Brand Composition Engine
## Complete Production-Ready Build

### Architecture Overview
A fully offline, client-side Intelligent Brand Composition Engine with a unified 17-stage orchestration pipeline.

### 17-Stage Orchestration Pipeline

| Stage | Name | System | Description |
|-------|------|--------|-------------|
| 1 | Asset Type Selection | OrchestrationEngine | User selects canvas dimensions |
| 2 | Canvas Generation | OrchestrationEngine | Creates canvas with exact dimensions |
| 3 | Adaptive Grid Generation | GridSystem | Mathematical grid based on aspect ratio |
| 4 | Protection Zone Generation | OrchestrationEngine | Logo/typography safe zones |
| 5 | Image Analysis | AIAnalysisEngine | Scene classification, object detection, saliency |
| 6 | Focal Emphasis Detection | OrchestrationEngine | Identifies visual focal points |
| 7 | Safe Expansion Analysis | OrchestrationEngine | Finds safe regions for image extension |
| 8 | Image Fit Evaluation | OrchestrationEngine | Determines if image fits canvas |
| 9 | Image Reconstruction | ImageExtensionEngine | Extends image using texture synthesis/AI |
| 10 | Color Treatment Selection | ColorTreatmentEngine | Auto-selects Blue Multiply/Cobalt Linear Light/Pacific Gradient |
| 11 | Window Motif Generation | WindowMotifEngine | Generates candidates with 7:10 or 10:7 ratios |
| 12 | Window Motif Scoring | WindowMotifEngine | Weighted scoring (focal 30%, balance 20%, etc.) |
| 13 | Final Motif Placement | WindowMotifEngine | Selects highest-scoring valid candidate |
| 14 | Typography Placement | TypographyEngine | Grid-aligned logo, tagline, metadata |
| 15 | Accessibility Validation | AccessibilityValidator | WCAG contrast, readability, hierarchy |
| 16 | Composition Balance | OrchestrationEngine | Validates no overlaps, minimum areas |
| 17 | Final Render Export | ExportSystem | High-res PNG/JPG/PDF with DPI scaling |

### Core Systems

#### 1. Orchestration Engine (`app/engine/orchestration-engine.js`)
- Centralized pipeline controller
- Constraint propagation between stages
- Automatic regeneration on validation failure
- Progress tracking across all 17 stages

#### 2. Window Motif Engine (`app/engine/window-motif-engine.js`)
- **Fixed ratios**: Portrait 7:10, Landscape 10:7
- **Minimum area**: 20% of composition
- **Grid alignment**: Snaps to whole/half grid modules
- **Protection zones**: Never overlaps logo/typography areas
- **Scoring weights**:
  - Focal Emphasis: 30%
  - Visual Balance: 20%
  - Typography Compatibility: 15%
  - Grid Harmony: 15%
  - Negative Space Preservation: 10%
  - Narrative Emphasis: 5%
  - Brand Hierarchy: 5%

#### 3. Image Extension Engine (`app/engine/image-extension-engine.js`)
- **Solution hierarchy** (least destructive first):
  1. Intelligent Repositioning
  2. Smart Cropping
  3. Safe Edge Extension (texture synthesis)
  4. LaMa ONNX Outpainting
  5. Stable Diffusion Inpainting ONNX
- **Safe region analysis**: sky, water, gradients = very safe; faces, hands = unsafe
- **Edge-aware fill** for texture synthesis

#### 4. Color Treatment Engine (`app/engine/color-treatment-engine.js`)
- **Blue Multiply**: brightness < 40%, cinematic, multiply blend, #1E49E2
- **Cobalt Blue Linear Light**: brightness 40-70%, people imagery, linear light blend, #1E49E2
- **Pacific Blue Gradient Map**: brightness > 70%, open environments, #1E49E2 to #5FD7FF
- Auto-selection based on brightness histogram, contrast, dominant tones

#### 5. Typography Engine (`app/engine/typography-engine.js`)
- **Left protection**: 3 grid modules for logo
- **Top protection**: 2 grid modules
- **Bottom typography zone**: 2 grid modules
- **Minimum padding**: 1 grid module from motif edges
- **Baseline alignment**: To grid rows

#### 6. Accessibility Validator (`app/engine/accessibility-validator.js`)
- WCAG AA/AAA contrast ratios
- Typography size validation
- Motif visibility scoring
- Focal clarity assessment
- Hierarchy validation

#### 7. Adaptive Grid System (`app/engine/grid-system.js`)
- **Ultra Wide** (>2.0 ratio): 16×6
- **Landscape** (1.3-2.0): 14×8
- **Square** (0.9-1.1): 12×12
- **Portrait** (<0.9): 8×14
- Safe margin: min(width, height) × 0.05

#### 8. AI Analysis Engine (`app/engine/ai-analysis.js`)
- Scene classification (people-motion, architecture, nature-motion)
- Object detection simulation
- Pose detection with direction inference
- Saliency detection for focal points
- Negative space analysis
- Composition scoring

### File Structure (20 files, ~285 KB)
```
brand-composition-engine/
├── index.html                          # Main application
├── app.js                              # Application controller
├── test.html                           # Unit tests
├── README.md                           # Documentation
├── app/
│   ├── styles/
│   │   └── styles.css                  # Dark premium UI
│   ├── presets/
│   │   └── asset-presets.js            # 25+ asset types
│   ├── engine/
│   │   ├── orchestration-engine.js     # 17-stage pipeline
│   │   ├── window-motif-engine.js      # Constrained motif system
│   │   ├── image-extension-engine.js   # AI reconstruction
│   │   ├── color-treatment-engine.js   # 3-brand-color system
│   │   ├── typography-engine.js        # Grid-aligned typography
│   │   ├── accessibility-validator.js  # WCAG validation
│   │   ├── grid-system.js              # Adaptive grids
│   │   ├── ai-analysis.js              # Image analysis
│   │   ├── composition-engine.js       # Smart composition
│   │   ├── validation-rules.js         # Brand validation
│   │   └── export-system.js            # High-res export
│   └── components/
│       ├── canvas-manager.js           # Fabric.js canvas
│       ├── ui-controls.js              # UI interactions
│       ├── layers-panel.js             # Layer management
│       └── demo-helper.js              # Test image generation
```

### Usage
1. Open `index.html` in a modern browser
2. Select asset type or enter custom dimensions
3. Upload image or click demo button (🏃 Runner, 🏢 Building, 🌊 Ocean)
4. Upload logo (optional)
5. Click **Analyze** — the system automatically runs all 17 stages
6. Export in desired format

### Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Fabric.js 5.3.1
- **AI Runtime**: ONNX Runtime Web (with WebGPU/WebGL/WASM fallback)
- **Export**: Canvas API, jsPDF 2.5.1
- **Storage**: localStorage (settings), IndexedDB-ready
- **Zero backend, zero cloud APIs, zero server rendering**

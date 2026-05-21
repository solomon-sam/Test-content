# Intelligent Brand Composition Engine

A fully functional enterprise-grade offline Intelligent Brand Composition Engine that runs entirely in the browser without any backend or server.

## Features

- **AI-powered image analysis** using ONNX Runtime Web
- **Adaptive grid systems** with mathematical precision
- **Automated brand composition** with rule-based placement
- **Smart focal point detection** and negative space analysis
- **Directional flow analysis** for dynamic compositions
- **Export-ready design rendering** in PNG, JPG, and PDF

## Technology Stack

- HTML5 / CSS3 / Vanilla JavaScript
- Fabric.js for canvas rendering
- ONNX Runtime Web for AI inference
- jsPDF for PDF export
- IndexedDB for local storage

## File Structure

```
/
├── index.html              # Main application entry point
├── app.js                  # Application controller
├── app/
│   ├── styles/
│   │   └── styles.css      # Complete UI styling
│   ├── presets/
│   │   └── asset-presets.js # Asset dimension presets
│   ├── engine/
│   │   ├── grid-system.js      # Adaptive grid generation
│   │   ├── ai-analysis.js      # AI analysis pipeline
│   │   ├── composition-engine.js # Smart composition rules
│   │   ├── validation-rules.js   # Brand validation engine
│   │   └── export-system.js      # Export system
│   └── components/
│       ├── canvas-manager.js  # Fabric.js canvas management
│       ├── layers-panel.js    # Layer management UI
│       └── ui-controls.js    # UI interaction handlers
```

## Usage

1. Open `index.html` in a modern web browser
2. Select an asset type or enter custom dimensions
3. Upload a background image
4. Upload a brand logo (optional)
5. Click "Analyze" to run AI analysis
6. Adjust brand elements as needed
7. Export in desired format

## AI Pipeline

1. Scene Classification (MobileNet)
2. Object Detection (YOLOv8n)
3. Pose Detection (MoveNet)
4. Saliency Detection (U2Net)
5. Semantic Segmentation (DeepLab)
6. Negative Space Analysis
7. Composition Scoring
8. Brand Compatibility Check

## Browser Requirements

- Chrome 90+ / Firefox 88+ / Safari 14+ / Edge 90+
- WebGL support recommended
- 4GB+ RAM recommended for large images

## License

Enterprise License - All rights reserved.

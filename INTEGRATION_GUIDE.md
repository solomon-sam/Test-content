# KPMG Brand Composition Engine — Phase 3 Integration Guide

## Quick Start

### 1. File Placement

Copy all generated files into your existing project structure:

```
Your-Project/
├── index.html                          ← REPLACE with new version
├── app.js                              ← REPLACE with new version
├── app/
│   ├── styles/
│   │   └── styles.css                  ← MERGE Phase 3 additions
│   ├── engine/
│   │   ├── compliance-engine.js        ← NEW (Phase 3A)
│   │   ├── constraint-engine.js        ← NEW (Phase 3B)
│   │   └── ... (existing engines)
│   └── components/
│       ├── edit-mode-controller.js     ← REPLACE (Phase 3B enhanced)
│       ├── contextual-tooltip.js       ← NEW (Phase 3B)
│       ├── color-picker.js             ← REPLACE (Phase 3B enhanced)
│       ├── ui-controls.js              ← REPLACE (Phase 3 enhanced)
│       └── ... (existing components)
```

### 2. HTML Changes

The new `index.html` includes:
- **Compliance Status Bar** in the refine sidebar
- **Expanded Checklist** (10 categories instead of 5)
- **Live Score Display** in the canvas toolbar
- **Edit Mode Toggle** button in the toolbar
- **Correction Toast Container** (fixed position bottom-right)
- **Color Picker Popup** with live preview
- Script loading for new engines: `compliance-engine.js`, `constraint-engine.js`

### 3. CSS Integration

Add the Phase 3 CSS to your existing `styles.css` or include as separate file:

```css
/* Add to end of styles.css or include: */
@import url('styles-phase3.css');
```

Key additions:
- `.status-pass`, `.status-warning`, `.status-fail` for compliance bar
- `.disabled` button states for export gate
- `.edit-mode-active` canvas cursor states
- `.correction-toast` animations
- Constraint violation visual feedback

### 4. JavaScript Integration

The new `app.js` automatically initializes:

```javascript
// In BrandCompositionApp constructor:
this.complianceEngine = new ComplianceEngine(stateManager, canvasManager, gridSystem);
this.constraintEngine = new ConstraintEngine(gridSystem);

// In EditModeController:
this.editModeController = new EditModeController(
  canvasManager,
  stateManager,
  interactionManager,
  complianceEngine,      // NEW: for live validation
  constraintEngine       // NEW: for soft constraints
);
```

### 5. Usage

#### Enter Manual Edit Mode
Click the **✎ Edit Mode** button in the canvas toolbar:
- Editable elements become selectable (motif, headline, subheading, swoosh, background)
- Locked elements (logo, tagline, metadata) remain unselectable
- Canvas cursor changes to `grab`

#### Drag Elements
- Click and drag any editable element
- **Live validation** runs at 60fps during drag
- **Elastic snapping** pulls elements toward grid lines
- **Soft constraints** prevent hard violations (red glow = stop, amber = warning)

#### Contextual Tooltips
- Click any editable element to select it
- Tooltip appears with element-specific actions:
  - **Motif**: Portrait/Landscape toggle, Scale Up/Down
  - **Headline**: Font Size +/−, Align Left/Right
  - **Background**: Scale Up/Down, **Overlay Color**, Reset Position
  - **Swoosh**: Move Left/Right, Opacity controls

#### Change Overlay Color
1. Select background image in edit mode
2. Click "🎨 Overlay Color" in tooltip
3. Choose preset or custom color
4. Adjust blend mode and opacity
5. Click **Apply** — treatment validates automatically

#### Brand Compliance
- Compliance validates automatically on every change
- Status bar shows: 🟢 Brand Safe / 🟡 Warning / 🔴 Invalid
- **Export is blocked** when status is FAIL
- Click refresh icon in Overall Score card to re-validate

#### Auto-Correction
- If violations are detected, a toast appears bottom-right
- Click **Auto-fix** to apply corrections automatically
- Or click **Dismiss** to keep manual control

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ Step Nav    │  │ Canvas      │  │ Brand Check     │   │
│  │             │  │ + Toolbar   │  │ + Compliance    │   │
│  └─────────────┘  └─────────────┘  │   Status Bar     │   │
│                                    └─────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Component Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ CanvasMgr   │  │ EditModeCtrl│  │ UIControls      │   │
│  │             │  │ + Tooltips  │  │ + Compliance UI │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ ColorPicker │  │ TypoRender  │  │ InteractionMgr  │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                     Engine Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ Compliance  │  │ Constraint  │  │ TypographyComp  │   │
│  │ Engine      │  │ Engine      │  │ Engine          │   │
│  │ (10 checks) │  │ (elastic)   │  │ (auto-compose)  │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ GridSystem  │  │ AI Analysis │  │ Accessibility   │   │
│  │             │  │             │  │ Engine          │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                     State Layer                               │
│              StateManager (Observable, localStorage)            │
└─────────────────────────────────────────────────────────────┘
```

---

## API Reference

### ComplianceEngine

```javascript
const compliance = new ComplianceEngine(stateManager, canvasManager, gridSystem);

// Validate all categories
const report = compliance.validateAll();
// Returns: { overall: 'PASS'|'WARNING'|'FAIL', categories: {...}, score: 0-100 }

// Validate single category
const gridResult = compliance.validate('grid', state);

// Check if export allowed
const canExport = compliance.canExport(); // boolean

// Get detailed report
const report = compliance.getReport();

// Get all issues
const issues = compliance.getAllIssues();
// Returns: [{ message, severity, category, element }]
```

### ConstraintEngine

```javascript
const constraint = new ConstraintEngine(gridSystem);

// Snap to grid with easing
const snapped = constraint.snapToGrid(x, y, 'motif');

// Constrain to margins with elastic resistance
const constrained = constraint.constrainToMargins(x, y, w, h);

// Constrain motif (respects logo zone)
const motifPos = constraint.constrainMotif(x, y, w, h, logoZone);

// Constrain typography (respects motif and logo)
const typoPos = constraint.constrainTypography(x, y, w, h, motif, logoZone);

// Validate position
const violations = constraint.validatePosition('headline', x, y, w, h, { motif, logo });
```

### EditModeController

```javascript
const editMode = new EditModeController(canvasManager, stateManager, interactionManager, complianceEngine, constraintEngine);

// Toggle mode
const mode = editMode.toggleEditMode(); // returns 'auto' or 'manual'

// Select element
editMode.selectElement(element);

// Execute tooltip action
editMode.executeAction('portrait', motifElement);

// Auto-correct all issues
editMode.autoCorrect();
```

---

## Testing Checklist

- [ ] Upload image and enter headline → auto-typography generates
- [ ] Go to Refine step → canvas renders with grid
- [ ] Click ✎ Edit Mode → elements become selectable
- [ ] Drag motif → elastic snapping to grid, no logo overlap
- [ ] Drag headline → baseline snap, no motif overlap
- [ ] Click element → contextual tooltip appears
- [ ] Click "Overlay Color" → color picker opens
- [ ] Change color → live preview updates, canvas updates
- [ ] Click Apply → treatment validates, compliance updates
- [ ] Check Brand Check panel → all 10 categories show status
- [ ] Check compliance status bar → shows PASS/WARNING/FAIL
- [ ] Trigger FAIL (e.g., move motif over logo) → export blocked
- [ ] Click Auto-fix → violations corrected automatically
- [ ] Brand Score updates in real-time during edits
- [ ] Export button enabled only when compliance !== FAIL

---

*Integration Guide Version: 3.0*
*Date: 2026-05-22*

# Workspace Components Architecture

Issue: #108

This document explains the workspace region components used for line-by-line manuscript transcription in TPEN interfaces.

## Purpose

Provide specialized components that work together to display manuscript lines, capture transcriptions, and maintain context during the annotation workflow.

## Scope

In scope:

1. Core workspace components and their responsibilities
2. Line-by-line navigation and focus behavior
3. Transcription input, autosave, and draft persistence
4. Image display and region coordination
5. Component communication via events and attributes
6. Data flow between workspace and interface shell

Out of scope:

1. Header/navigation components (covered in main architecture doc)
2. Split-screen tools (covered in splitscreen tools architecture)
3. Backend storage implementation
4. IIIF manifest structure details

## Component Inventory

### 1. tpen-transcription-block

**Purpose**: Main transcription input interface with line editing, autosave, and navigation.

**Responsibilities**:
- Display current line's transcription text
- Handle text input and editing
- Auto-save changes with debouncing
- Persist drafts to localStorage
- Provide previous/next line navigation
- Dispatch line change events

**Key features**:
- Draft persistence across sessions
- Baseline tracking for unsaved changes indicator
- Debounced save with fixed 2s delay
- Keyboard shortcuts for navigation
- Column-aware line ordering

**Permissions**: Requires ANY CONTENT view access

**Reference**: [components/transcription-block/index.js](../transcription-block/index.js)

### 2. tpen-line-image

**Purpose**: Display the focused line image region from a IIIF canvas.

**Responsibilities**:
- Render IIIF canvas with region cropping
- Update displayed region when line changes
- Respond to manifest/canvas/region attribute changes
- Use canvas-panel web component for IIIF rendering

**Key features**:
- IIIF Presentation API 2.x and 3.x support
- Responsive image scaling
- Region-based cropping via xywh selector
- Smooth transitions between regions (optional)

**DOM API**:
- Attributes: `tpen-line-id`, `region`
- Setters: `manifest`, `canvas`, `line`

**Reference**: [components/line-image/index.js](../line-image/index.js)

### 3. tpen-image-fragment

**Purpose**: Display the remaining image context below the focused line.

**Responsibilities**:
- Show canvas area outside the focused line region
- Update position as focused line changes
- Provide visual continuity of the manuscript page
- Support smooth transitions during navigation

**Key features**:
- Dynamic region calculation
- Smooth position transitions
- Responsive to window resize
- Z-index coordination with line-image

**Reference**: [components/line-image/index.js](../line-image/index.js) (TpenImageFragment class)

### 4. tpen-workspace-tools

**Purpose**: Toolbar for activating transcription tools.

**Responsibilities**:
- Render tool activation buttons
- Launch quicktype, magnifier, page tool, etc.
- Host tpen-splitscreen-tool, which dispatches splitscreen-toggle events
- Filter tools by permission and configuration

**Key features**:
- Permission-aware tool display
- Project-specific tool configuration
- Event-driven tool activation
- Responsive toolbar layout

**Permissions**: Requires TOOLS ANY view access

**Reference**: [components/workspace-tools/index.js](../workspace-tools/index.js)

## Visual Layout

```
┌─────────────────────────────────────┐
│  tpen-line-image                    │  ← Focused line region
│  (IIIF canvas cropped to line)     │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  tpen-transcription-block           │  ← Text input area
│  [Prev] [text input...] [Next]     │
├─────────────────────────────────────┤
│  tpen-workspace-tools               │  ← Tool buttons
│  [QT] [Mag] [Page] [Splitscreen▼]  │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  tpen-image-fragment                │  ← Remaining page context
│  (canvas area below focused line)  │
└─────────────────────────────────────┘
```

## Data Flow

### Line Navigation

1. User clicks Next/Previous or uses keyboard shortcut
2. transcription-block updates `TPEN.activeLineIndex`
3. transcription-block dispatches `tpen-transcription-next-line` or `tpen-transcription-previous-line`
4. Interface shell receives event and calls its own line update logic
5. Interface updates line-image and image-fragment attributes
6. transcription-block updates input field with new line's text

### Transcription Editing

1. User types in transcription input field
2. Input event triggers debounced save handler
3. Draft saved to localStorage immediately
4. After debounce delay, API save request sent
5. On success, baseline updated and draft cleared
6. Unsaved changes indicator updated

### Tool Activation

1. User clicks tool button in workspace-tools
2. workspace-tools dispatches tool-specific event or splitscreen-toggle
3. Interface shell receives event and updates layout state
4. Tool component renders in appropriate location

## Event Contracts

Primary workspace events:

| Event | Source | Target | Detail | Purpose |
|-------|--------|--------|--------|---------|
| `tpen-transcription-previous-line` | transcription-block | Interface | none | Navigate to previous line |
| `tpen-transcription-next-line` | transcription-block | Interface | none | Navigate to next line |
| `tpen-active-line-updated` | Interface | transcription-block | line data | Line has changed, update UI |
| `splitscreen-toggle` | splitscreen-tool (child of workspace-tools) | Interface | `{ selectedTool }` | Activate split-screen tool |
| `canvas-change` | line-image | Document | `{ canvasId, canvas? }` | Canvas has changed |

### Save Lifecycle Events

Dispatched by `transcription-block` via `TPEN.eventDispatcher`:

| Event | Detail | Purpose |
|-------|--------|---------|
| `tpen-transcription-line-dirty` | `{ index }` | Line has unsaved changes |
| `tpen-transcription-line-clean` | `{ index }` | Line changes saved or reverted |
| `tpen-transcription-line-save-scheduled` | `{ index }` | Debounced save queued |
| `tpen-transcription-line-save-start` | `{ index }` | API save request in flight |
| `tpen-transcription-line-save-success` | `{ index, text }` | Line saved successfully |
| `tpen-transcription-line-save-fail` | `{ index, error }` | Line save failed |
| `tpen-transcription-drafts-recovered` | `{ count }` | Drafts loaded from localStorage |

Consumed by `transcription-block` from external sources:

| Event | Source | Purpose |
|-------|--------|---------|
| `tpen-transcription-flush-all` | External | Request immediate save of all dirty lines |

## Data Ownership

| Data | Source of Truth | Primary Readers | Mutation Path |
|------|----------------|-----------------|---------------|
| Active line index | TPEN.activeLineIndex | transcription-block, interface shell | Line navigation logic |
| Line transcription text | Annotation body in vault/API | transcription-block | User input → API save |
| Unsaved draft text | localStorage + transcription-block state | transcription-block | User input → localStorage |
| Page items (ordered) | vault annotation page + column ordering | transcription-block, interface | vault fetch + orderPageItemsByColumns() |
| Focused line region | Annotation target selector | line-image, image-fragment | Vault/manifest data |
| Available tools | TPEN.activeProject.tools | workspace-tools | Project configuration |

## Minimal Knowledge Boundaries

### transcription-block

**Knows**:
- Current line index and navigation logic
- Text input state and save status
- Draft persistence mechanism
- Line ordering (via utility)

**Does not know**:
- Image display mechanics
- Split-screen layout state
- Other components' internal state

### line-image / image-fragment

**Know**:
- IIIF canvas and region rendering
- Attribute-driven display updates
- Canvas-panel integration

**Do not know**:
- Transcription text content
- Navigation logic
- Line ordering or column structure

### workspace-tools

**Knows**:
- Available tools from project configuration
- Tool activation events
- Permission filtering

**Does not know**:
- Split-screen layout mechanics
- Individual tool implementations
- Transcription or image state

## Component Communication Patterns

### Attribute-Based (Declarative)

Used by line-image and image-fragment:

```javascript
// Interface sets attributes when line changes
lineImage.setAttribute('tpen-line-id', lineId)
lineImage.setAttribute('region', regionSelector)
```

### Event-Based (Reactive)

Used by transcription-block and workspace-tools:

```javascript
// Component dispatches event
TPEN.eventDispatcher.dispatch('tpen-transcription-next-line')

// Interface or other components listen
TPEN.eventDispatcher.on('tpen-transcription-next-line', handler)
```

### Setter-Based (Imperative)

Alternative line-image API:

```javascript
lineImage.manifest = manifestUrl
lineImage.canvas = canvasId
lineImage.line = annotationObject
```

### PostMessage-Based (External Tools)

Used by `transcription-block` to communicate with iframe tools and external callers:

```javascript
// Receiving from external tool (window.message)
// Supported message types:
// { type: 'RETURN_LINE_ID', lineId } — navigate to specific line
// { type: 'UPDATE_LINE_TEXT', lineIndex, text } — update a line's transcription text
window.addEventListener('message', (event) => { /* handled internally */ })
```

This channel allows iframe tools (e.g., legacy TPEN 2.8 tools) to read and update transcription state without direct JavaScript access to TPEN internals.

## Performance Considerations

1. **Autosave Debouncing**
   - Default: 2-3 second delay after last keystroke
   - Prevents excessive API calls during typing
   - Draft saved to localStorage immediately (no delay)

2. **Image Loading**
   - IIIF images loaded on demand
   - Canvas-panel handles progressive loading
   - Region cropping reduces data transfer

3. **Event Listener Management**
   - CleanupRegistry pattern ensures proper cleanup
   - renderCleanup for re-rendered elements
   - cleanup for persistent listeners

4. **Draft Storage**
   - localStorage used for persistence
   - Storage key format: `tpen-drafts:{projectID}:{pageID}:{userID}`
   - Drafts cleared after successful save

## Accessibility

1. **Keyboard Navigation**
   - **Tab** / **Enter** → next line; **Shift+Tab** / **Shift+Enter** → previous line
   - **Enter** also splits text at cursor position and moves remainder to the next line
   - **Ctrl+Home** → first line; **Ctrl+End** → last line
   - **Ctrl+0–9** / **Ctrl+Shift+0–9** → QuickType character insertion
   - Focus management between input and buttons
   - Escape key to dismiss tools/overlays

2. **Screen Readers**
   - Transcription input has proper labels
   - Line indicator announces current position
   - Tool buttons have descriptive text

3. **Focus Management**
   - Input field receives focus on line change
   - Focus preserved during tool activation
   - Focus returns to input after tool dismissal

## Error Handling

1. **Save Failures**
   - Draft preserved in localStorage
   - User notified via toast message
   - Retry mechanism for transient failures

2. **Image Loading Failures**
   - Placeholder or error message displayed
   - Graceful degradation if canvas-panel unavailable
   - Fallback to static image if region rendering fails

3. **Navigation Edge Cases**
   - Previous at first line: no action or wrap
   - Next at last line: no action or wrap
   - Empty pages: graceful message display

## Integration Points

### With Interface Shell

- Interface manages page data and active line
- Interface orchestrates component updates
- Interface handles URL-based navigation

### With Header

- Header line indicator displays current position
- Header navigation affects workspace state
- Column selection affects line ordering

### With Split-Screen Tools

- Tools activated via workspace-tools
- Tools may communicate back via events
- Tools receive line change notifications

## Related Documentation

- [Transcription Interface Architecture](../simple-transcription/ARCHITECTURE.md)
- [Splitscreen Tools Architecture](../workspace-tools/SPLITSCREEN_TOOLS_ARCHITECTURE.md)
- [Transcription Interface Diagrams](../simple-transcription/DIAGRAMS.md)

## Change Log

- 2026-03-09: Initial workspace components architecture document created from issue #108 scope.

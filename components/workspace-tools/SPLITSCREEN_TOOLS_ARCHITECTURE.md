# Splitscreen Tools Architecture

Issue: #107

This document explains the splitscreen tools system in TPEN transcription interfaces: tool types, lifecycle, event communication, and integration patterns.

## Purpose

Provide a pluggable system for transcription-adjacent tools that appear alongside the main workspace without disrupting the core workflow.

## Scope

In scope:

1. Tool types and their visual/behavioral characteristics
2. Tool activation and dismissal lifecycle
3. Event communication between tools and interface
4. Tool configuration via TPEN.activeProject.tools
5. Integration points with the transcription interface shell

Out of scope:

1. Individual tool implementation details (covered in component-specific docs)
2. Tool authentication/authorization beyond project-level permissions
3. Non-transcription interface tool usage patterns

## Tool Types

The system supports four distinct tool presentation modes:

### 1. Split Pane Tools

**Visual behavior**: Appear to the right of the main interface, creating a resizable horizontal division.

**Use cases**: Full-featured tools that need substantial space (dictionaries, references, image viewers).

**Current implementation**: 
- Managed by tpen-simple-transcription interface state
- Activated via splitscreen-toggle event
- Location identifier: `"pane"`

**References**:
- [components/simple-transcription/index.js](../simple-transcription/index.js) (interface orchestration)
- [components/splitscreen-tool/index.js](../splitscreen-tool/index.js) (tool selector dropdown)

### 2. Sidebar Tools

**Visual behavior**: Fixed-width panel that slides in from the right, non-resizable.

**Use cases**: Compact tools, configuration panels, quick reference materials.

**Current implementation**:
- Location identifier: `"sidebar"`
- Shares activation mechanism with pane tools

### 3. Drawer Tools

**Visual behavior**: Floating tray that slides over content, dismissible without losing context.

**Use cases**: Magnifier, inspector, temporary overlays.

**Current implementation**:
- [components/magnifier-tool/index.js](../magnifier-tool/index.js)
- Activated via specific tool buttons or shortcuts
- Does not use split-screen layout

### 4. Dialog Tools

**Visual behavior**: Modal overlay that interrupts workflow until dismissed.

**Use cases**: Critical actions requiring full attention, configuration wizards.

**Current implementation**:
- Uses GUI confirm/alert system
- Not directly tied to project.tools array

## Tool Configuration

Tools are defined in `TPEN.activeProject.tools` array with this structure:

```javascript
{
  toolName: "dictionary",        // Unique identifier
  label: "Dictionary",            // Display name
  location: "pane",               // Type: "pane" | "sidebar" | "drawer" | "dialog"
  url: "https://example.com/tool.js", // Optional: URL for module script or iframe src
  custom: {
    enabled: true,                // Optional: defaults to true if omitted
    tagName: "tpen-dictionary",   // Optional: custom element tag name (requires url)
    // Tool-specific configuration
  }
}
```

The rendering path is determined by these two properties:

1. If `custom.tagName` AND `url` → load `url` as a module script, then render `<tagName>`
2. If `url` AND no `tagName` AND `location === 'pane'` → render as `<iframe src="url">`
3. Otherwise → fallback message

**Filtering rules**:
- Tools with `custom.enabled === false` are excluded
- Only tools with `location === "pane"` or `location === "sidebar"` appear in splitscreen selector
- Drawer and dialog tools use separate activation mechanisms

## Component Inventory

Primary components:

1. **tpen-workspace-tools** - Toolbar that provides tool activation buttons
   - Renders quicktype, magnifier, page tool, splitscreen selector
   - Requires TOOLS ANY view access
   - Reference: [components/workspace-tools/index.js](index.js)

2. **tpen-splitscreen-tool** - Dropdown selector for pane/sidebar tools
   - Filters project.tools by location and enabled state
   - Dispatches splitscreen-toggle event on selection
   - Reference: [components/splitscreen-tool/index.js](../splitscreen-tool/index.js)

3. **tpen-magnifier-tool** - Drawer-style image magnification overlay
   - Activated via toolbar button
   - Dismissible via Escape key or close button
   - Reference: [components/magnifier-tool/index.js](../magnifier-tool/index.js)

4. **Individual tool implementations** (e.g., tpen-page-tool, tpen-quicktype-tool)
   - Each tool is responsible for its own rendering and behavior
   - Reference: [components/page-tool/index.js](../page-tool/index.js)

## Tool Lifecycle

### Activation

1. User selects tool from splitscreen dropdown or clicks toolbar button
2. `tpen-splitscreen-tool` dispatches `splitscreen-toggle` DOM event (bubbles) with `{ selectedTool: toolName }`
3. `tpen-splitscreen-tool` dispatches `tpen-${previousTool}-hide` (if switching) and `tpen-${toolName}-show` via `TPEN.eventDispatcher` — these happen synchronously in the same handler as step 2
4. Interface shell (`tpen-simple-transcription`) receives the bubbled `splitscreen-toggle` event
5. Interface updates state, toggles split-screen layout, and loads tool content

### Dismissal

1. User clicks close button, presses Escape key, or an external component dispatches `tools-dismiss` via `TPEN.eventDispatcher`
2. Interface shell calls `closeSplitscreen()` directly — sets `isSplitscreenActive = false` and collapses layout
3. **Note**: No `tpen-{toolName}-hide` event is dispatched on panel close (only on tool switch). Tools that need cleanup on dismiss should listen for the `tools-dismiss` eventDispatcher event.

### Tool Switching

1. When changing tools, previous tool receives hide event
2. New tool receives show event
3. Split-screen layout remains active

## Event Contracts

Primary events:

| Event | Direction | Detail | Purpose |
|-------|-----------|--------|---------|
| `splitscreen-toggle` | Selector → Interface (DOM, bubbles) | `{ selectedTool: string }` | Activate/switch split-screen tool |
| `tools-dismiss` | External → Interface (eventDispatcher) | none | Request interface to close split-screen panel |
| `tpen-{toolName}-show` | Selector → Tool (eventDispatcher) | none | Notify tool it’s visible (on tool switch) |
| `tpen-{toolName}-hide` | Selector → Tool (eventDispatcher) | none | Notify previous tool it’s hidden (on tool switch only) |

## Data Ownership

| Data | Owner | Readers | Mutation |
|------|-------|---------|----------|
| Available tools list | TPEN.activeProject.tools | workspace-tools, splitscreen-tool | Project load/update |
| Active tool selection | tpen-simple-transcription state | Interface shell | splitscreen-toggle event |
| Split-screen open/closed | tpen-simple-transcription state | Interface shell, CSS classes | UI interactions |
| Tool-specific state | Individual tool components | Tool component only | Tool-internal logic |

## Minimal Knowledge Boundaries

### Interface Shell

- Knows: split-screen layout state, active tool name
- Does not know: tool-specific rendering logic or internal state

### Workspace Tools

- Knows: available tools from project configuration
- Does not know: split-screen layout mechanics

### Splitscreen Tool Selector

- Knows: how to filter and display tool options
- Does not know: tool implementation details or split-screen layout

### Individual Tools

- Know: their own rendering and behavior
- Do not know: interface layout mechanics or other tools' state

## Integration with Legacy Tools

### iframe Tools (TPEN 2.8 Pattern)

Legacy iframe tools are split-pane tools using bidirectional `postMessage` communication:

- Interface → Tool: sends `MANIFEST_CANVAS_ANNOTATIONPAGE_ANNOTATION`, `CANVASES`, `CURRENT_LINE_INDEX`, and `SELECT_ANNOTATION` messages on load and line changes
- Tool → Interface: sends `CURRENT_LINE_INDEX`, `RETURN_LINE_ID`, `SELECT_ANNOTATION`, and `NAVIGATE_TO_LINE` messages to request line navigation
- Origin validation is enforced for incoming messages

See the workspace components architecture for the full postMessage protocol.

**Migration path**: Consider replacing with native components that can use TPEN.eventDispatcher for direct communication.

### Page Options Pattern

Legacy sidebar-like collection of multiple sub-tools:

- Current pattern: separate tools for each option
- Alternative pattern: composite tool component with internal sub-tool management

## Performance Considerations

1. **Lazy loading**: Tools should only render when activated
2. **Cleanup**: Tools must clean up event listeners and resources on dismissal
3. **Caching**: Tools may cache data but must handle project/page changes
4. **Resizing**: Split-pane resizing should use requestAnimationFrame for smooth dragging

## Accessibility

1. Keyboard shortcuts for common tools (magnifier, quicktype)
2. Escape key dismisses active tools
3. Focus management when tools open/close
4. ARIA labels on tool activation buttons

## Future Enhancements

Potential improvements tracked separately:

1. Standardized tool plugin API for third-party tools
2. Tool state persistence across sessions
3. Multi-tool layouts (multiple tools visible simultaneously)
4. Tool keyboard shortcut customization
5. Tool marketplace or registry system

## Integration Points

**Note**: The splitscreen patterns documented here are implemented in both `tpen-simple-transcription` (`components/simple-transcription/index.js`) and the standalone transcription interface (`interfaces/transcription/index.js`). Both follow the same event contracts and lifecycle.

## Related Documentation

- [Transcription Interface Architecture](../simple-transcription/ARCHITECTURE.md)
- [Transcription Interface Diagrams](../simple-transcription/DIAGRAMS.md)
- [Design Epic](../simple-transcription/DESIGN_EPIC.md)

## Change Log

- 2026-03-09: Initial splitscreen tools architecture document created from issue #107 scope.

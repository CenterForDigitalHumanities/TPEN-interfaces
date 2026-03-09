# Transcription Interface Architecture

This document explains the current TPEN transcription interface structure, ownership boundaries, and data/event flow.

## Scope

This describes the interface loaded from:

- interfaces/transcription/index.html
- components/simple-transcription/index.js
- components/projects/project-header.js

## Component Inventory

Top-level composition:

1. tpen-simple-transcription
2. tpen-project-header
3. tpen-line-image
4. tpen-transcription-block
5. tpen-workspace-tools
6. tpen-image-fragment

Header composition:

1. project title display
2. canvas selector (select)
3. tpen-layer-selector
4. tpen-column-selector
5. line indicator
6. navigation controls (home, manage project, profile)

Workspace composition:

1. focused line image viewport
2. transcription input workspace
3. workspace tools launcher/controls
4. remaining image fragment panel

## Visual Regions

The interface is intentionally split into 3 regions:

1. Header: navigation and context controls
2. Workspace: line-focused transcription work area
3. Split-screen tools panel: optional right-pane tools

See the diagram reference in DIAGRAMS.md for detailed flow diagrams.

## Data Truth Locations

The table below defines ownership for key state.

| Data | Source of truth | Primary readers | Mutated by |
| --- | --- | --- | --- |
| Active project graph (layers/pages/columns) | TPEN.activeProject | header, selectors, interface shell | project load/update flows |
| Current page selection | URL query pageID and TPEN.screen.pageInQuery | header, interface, selectors | header canvas selector, page navigation |
| Active line index | TPEN.activeLineIndex | header line indicator, interface, tools | line navigation events |
| Interface UI mode (split-screen/tool selection) | tpen-simple-transcription local state | interface shell and tool pane | splitscreen events and UI interactions |
| Annotation page items for column ordering | component-local cached page object | column selector, transcription logic | vault fetch + ordering utility |

## Minimal Knowledge Boundaries

### Page Shell

- Knows which top-level interface element to mount.
- Does not own transcription state.

### Interface Shell (tpen-simple-transcription)

- Owns orchestration state: active page data, active line, split-screen status.
- Coordinates events among header, workspace, and tools.
- Does not implement selector internals or tool internals.

### Header (tpen-project-header)

- Owns navigation controls and contextual display (project title, line indicator).
- Emits navigation changes through URL/event interactions.
- Does not render transcription content.

### Selectors (layer, column, page/canvas)

- Convert user input into selection events.
- Do not manage rendering of line content.

### Workspace Components

- tpen-transcription-block handles line transcription interactions.
- tpen-line-image and tpen-image-fragment handle image display logic.
- tpen-workspace-tools handles tool launch and workspace actions.
- These components should not own global routing.

## Event Contracts (Core)

Common orchestration events in the current implementation:

- tpen-layer-changed
- tpen-column-selected
- tpen-transcription-previous-line
- tpen-transcription-next-line
- tpen-active-line-updated
- tools-dismiss
- splitscreen-toggle

## Notes

- Current header implementation includes layer and column selectors plus a canvas selector.
- The standalone tpen-page-selector exists as a reusable component but is not the primary selector in this specific header implementation.

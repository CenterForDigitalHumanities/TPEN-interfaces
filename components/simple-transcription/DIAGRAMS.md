# Transcription Interface Diagrams

This file contains diagram-first references for external linking.

## Composition Diagram

```mermaid
flowchart TD
    A[interfaces/transcription/index.html] --> B[tpen-simple-transcription]

    B --> C[tpen-project-header]
    B --> D[Workspace Left Pane]
    B --> E[Split-screen Right Pane]

    C --> C1[tpen-layer-selector]
    C --> C2[tpen-column-selector]
    C --> C3[Canvas selector]
    C --> C4[Line indicator]

    D --> D1[tpen-line-image]
    D --> D2[tpen-transcription-block]
    D --> D3[tpen-workspace-tools]
    D --> D4[tpen-image-fragment]
```

## Data Ownership Diagram

```mermaid
flowchart LR
    P[TPEN.activeProject] --> H[tpen-project-header]
    P --> L[tpen-layer-selector]
    P --> C[tpen-column-selector]
    P --> S[tpen-simple-transcription]

    U[URL pageID and TPEN.screen.pageInQuery] --> H
    U --> S
    U --> C

    A[TPEN.activeLineIndex] --> H
    A --> S

    SSTATE[Interface local state: split-screen and active tool] --> S

    V[vault annotation/page cache] --> C
    V --> S
```

## Event Flow Diagram

```mermaid
flowchart TD
    L[tpen-layer-selector] -- tpen-layer-changed --> S[tpen-simple-transcription]
    C[tpen-column-selector] -- tpen-column-selected --> S
    W[tpen-workspace-tools] -- splitscreen-toggle --> S
    W -- tools-dismiss --> S

    S -- tpen-active-line-updated --> H[tpen-project-header]
    S -- tpen-transcription-next-line / previous-line --> H
    H -- URL pageID updates --> U[Browser URL]
```

## External Link Target

Recommended issue link target:

- components/simple-transcription/ARCHITECTURE.md

Secondary diagram-only link:

- components/simple-transcription/DIAGRAMS.md

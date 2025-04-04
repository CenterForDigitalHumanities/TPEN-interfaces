import TPEN from "../../api/TPEN.js"

export default class WorkspaceContainer extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback() {
    this.render()
    this.setupListeners()
  }

  setupListeners() {
    // Listen for the active line event via TPEN.eventDispatcher
    TPEN.eventDispatcher.on("tpen-active-line", () => {
      this.updateSubcomponents()
    })

    // Listen for a reset event to reset workspace
    TPEN.eventDispatcher.on("tpen-reset-workspace", () => {
      this.resetWorkspace()
    })

    // Global keydown listener for ESC key that dispatches a reset event
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        TPEN.eventDispatcher.dispatch("tpen-reset-workspace")
      }
    })
  }

  updateSubcomponents() {
    // Update the line indicator component by rendering TPEN.activeLine.label as its content
    const lineIndicator = this.shadowRoot.querySelector("tpen-line-indicator")
    if (lineIndicator && TPEN.activeLine) {
      lineIndicator.innerHTML = TPEN.activeLine.label || ""
    }
    // Additional subcomponent updates can be added here as needed
  }

  resetWorkspace() {
    console.log("Resetting workspace")
    // Implement reset logic here:
    // e.g., hide optional tools, clear temporary state, etc.
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block
          width: 100%
        }
        .workspace-container {
          display: flex
          flex-direction: column
          gap: 1em
        }
        .line-area {
          display: flex
          flex-direction: column
          border: 1px solid #ccc
          padding: 1em
          box-sizing: border-box
        }
        @container (max-width: 600px) {
          .line-area {
            padding: 0.5em
          }
        }
      </style>
      <div class="workspace-container">
        <!-- Previous Line Component -->
        <div class="previous-line">
          <tpen-previous-line></tpen-previous-line>
        </div>
        <!-- Main Active Line Area -->
        <div class="line-area">
          <!-- History Report Component -->
          <tpen-history-report></tpen-history-report>
          <!-- Line Navigation Component -->
          <tpen-line-navigation></tpen-line-navigation>
          <!-- Line Indicator Component -->
          <tpen-line-indicator></tpen-line-indicator>
          <!-- Text Entry Component -->
          <tpen-text-entry></tpen-text-entry>
          <!-- Optional Tools Component -->
          <tpen-optional-tools></tpen-optional-tools>
        </div>
      </div>
    `
  }
}

customElements.define("tpen-workspace-container", WorkspaceContainer)

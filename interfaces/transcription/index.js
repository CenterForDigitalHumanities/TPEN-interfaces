export default class TranscriptionInterface extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
    // Start with splitscreen off by default.
    this.state = {
      isSplitscreenActive: false,
    }
  }

  connectedCallback() {
    this.render()
    this.addEventListeners()
  }

  addEventListeners() {
    // Listen for splitscreen toggle events from children.
    this.shadowRoot.addEventListener("splitscreen-toggle", () => this.toggleSplitscreen())
  }

  toggleSplitscreen() {
    this.state.isSplitscreenActive = !this.state.isSplitscreenActive
    this.render()
  }

  render() {
    if (this.state.isSplitscreenActive) {
      this.shadowRoot.innerHTML = `
        <style>
          .split-screen-right {
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .header {
            display: flex;
            justify-content: flex-end;
            padding: 5px;
          }
          .close-splitscreen-button {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
          }
          .split-option {
            margin: 10px;
            padding: 5px;
          }
          .content-display {
            flex: 1;
            overflow: auto;
            border: 1px solid #ccc;
            padding: 10px;
          }
        </style>
        <tpen-project-navigation></tpen-project-navigation>
        <tpen-split-screen>
          <div slot="left">
            <section class="transcription-section">
              <tpen-transcription-block></tpen-transcription-block>
              <tpen-workspace-tools></tpen-workspace-tools>
            </section>
          </div>
          <div slot="right">
            <div class="split-screen-right">
              <div class="header">
                <button class="close-splitscreen-button">×</button>
              </div>
              <select class="split-option">
                <option value="progress">Transcription Progress</option>
                <option value="dictionary">Greek Dictionary</option>
                <option value="nextpage">Next Page Preview</option>
              </select>
              <div class="content-display">
                <div data-option="progress">Transcription Progress Preview Will be Rendered Here</div>
                <div data-option="dictionary" style="display: none;">Greek Dictionary Will be Rendered Here</div>
                <div data-option="nextpage" style="display: none;">Next Page Preview Will be Rendered Here</div>
              </div>
            </div>
          </div>
        </tpen-split-screen>
      `

      // Update the right pane's content based on the selected option.
      const splitSelect = this.shadowRoot.querySelector(".split-option")
      if (splitSelect) {
        splitSelect.addEventListener("change", (e) => {
          const selectedOption = e.target.value
          const contentDivs = this.shadowRoot.querySelectorAll(".content-display > div")
          contentDivs.forEach((div) => {
            div.style.display = (div.getAttribute("data-option") === selectedOption) ? "block" : "none"
          })
        })
      }

      // Close button toggles splitscreen mode and dispatches a toggle event.
      const closeButton = this.shadowRoot.querySelector(".close-splitscreen-button")
      if (closeButton) {
        closeButton.addEventListener("click", () => {
          this.dispatchEvent(new CustomEvent("tpen-splitscreen-toggle", {
            bubbles: true,
            composed: true,
          }))
          this.toggleSplitscreen()
        })
      }
    } else {
      // Render the interface without splitscreen (full width).
      this.shadowRoot.innerHTML = `
        <tpen-project-navigation></tpen-project-navigation>
        <section class="transcription-section">
          <tpen-transcription-block></tpen-transcription-block>
          <tpen-workspace-tools></tpen-workspace-tools>
        </section>
      `
    }
  }
}

customElements.define("tpen-transcription-interface", TranscriptionInterface)

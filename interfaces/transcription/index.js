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
          .container {
            display: flex;
            height: 90vh;
            overflow: hidden;
          }
          .transcription-section {
            flex: 1;
            overflow: auto;
          }
          .placeholder {
            width: 40%;
            border-left: 1px solid #ccc;
            padding: 10px;
            display: flex;
            flex-direction: column;
          }
          .header {
            display: flex;
            justify-content: flex-end;
            padding: 5px;
          }
          .close-button {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
          }
          .tools {
            flex: 1;
            overflow: auto;
            border-top: 1px solid #ccc;
            margin-top: 10px;
            padding-top: 10px;
          }
          .tools p {
            margin: 5px 0;
            font-size: 0.9rem;
          }
        </style>
        <tpen-project-navigation></tpen-project-navigation>
        <div class="container">
          <section class="transcription-section">
            <tpen-transcription-block></tpen-transcription-block>
            <tpen-workspace-tools></tpen-workspace-tools>
          </section>
          <div class="placeholder">
            <div class="header">
              <button class="close-button">×</button>
            </div>
            <div class="tools">
              <p>Transcription Progress</p>
              <p>Greek Dictionary</p>
              <p>Next Page Preview</p>
            </div>
          </div>
        </div>
      `
      // Add event listener for the close button to toggle splitscreen off.
      const closeButton = this.shadowRoot.querySelector(".close-button")
      if (closeButton) {
        closeButton.addEventListener("click", () => {
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

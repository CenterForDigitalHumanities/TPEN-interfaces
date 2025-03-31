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
    // Listen for any splitscreen-toggle events from children (if any)
    this.shadowRoot.addEventListener("splitscreen-toggle", () => this.toggleSplitscreen())

    // Listen for clicks on the close button within the placeholder pane.
    this.shadowRoot.addEventListener("click", (e) => {
      if (e.target && e.target.classList.contains("close-button")) {
        this.toggleSplitscreen()
      }
    })
  }

  toggleSplitscreen() {
    this.state.isSplitscreenActive = !this.state.isSplitscreenActive
    const container = this.shadowRoot.querySelector(".container")
    if (container) {
      if (this.state.isSplitscreenActive) {
        container.classList.remove("no-splitscreen")
        container.classList.add("active-splitscreen")
      } else {
        container.classList.remove("active-splitscreen")
        container.classList.add("no-splitscreen")
      }
    }
  }

  render() {
    // Render the complete layout only once.
    this.shadowRoot.innerHTML = `
      <style>
        .container {
          display: flex;
          height: 90vh;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        /* In inactive splitscreen, left pane takes full width, right pane is hidden */
        .container.no-splitscreen .left-pane {
          width: 100%;
        }
        .container.no-splitscreen .right-pane {
          display: none;
        }
        /* In active splitscreen, left pane takes 60% and right pane 40% */
        .container.active-splitscreen .left-pane {
          width: 60%;
        }
        .container.active-splitscreen .right-pane {
          display: block;
          width: 40%;
          border-left: 1px solid #ccc;
          padding: 10px;
          box-sizing: border-box;
        }
        .left-pane, .right-pane {
          overflow: auto;
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
      <div class="container no-splitscreen">
        <div class="left-pane">
          <section class="transcription-section">
            <tpen-transcription-block></tpen-transcription-block>
            <tpen-workspace-tools></tpen-workspace-tools>
          </section>
        </div>
        <div class="right-pane">
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
  }
}

customElements.define("tpen-transcription-interface", TranscriptionInterface)

export default class TranscriptionInterface extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
    // Start with splitscreen off by default.
    this.state = {
      isSplitscreenActive: false,
      activeTool: '',
    }
  }

  connectedCallback() {
    this.render()
    this.addEventListeners()
    this.setupResizableSplit()
  }

  addEventListeners() {
    // Listen for any splitscreen-toggle events from children (if any)
    this.shadowRoot.addEventListener('splitscreen-toggle', (e) => {
      this.state.activeTool = e.detail?.selectedTool || ''
      this.state.isSplitscreenActive = true
      this.toggleSplitscreen()
      this.loadRightPaneContent()
    })

    // Listen for clicks on the close button within the placeholder pane.
    this.shadowRoot.addEventListener("click", (e) => {
      if (e.target && e.target.classList.contains("close-button")) {
        this.state.isSplitscreenActive = false
        this.toggleSplitscreen()
      }
    })
  }

  toggleSplitscreen() {
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
    container.classList.toggle('active-splitscreen', this.state.isSplitscreenActive)
    container.classList.toggle('no-splitscreen', !this.state.isSplitscreenActive)
  }

  loadRightPaneContent() {
    const rightPane = this.shadowRoot.querySelector('.tools')
    const tool = this.state.activeTool
    rightPane.innerHTML = this.getToolHTML(tool)
  }

  getToolHTML(tool) {
    switch (tool) {
      case 'transcription':
        return `<p>Transcription Progress</p>`
      case 'dictionary':
        return `<p>Greek Dictionary</p>`
      case 'preview':
        return `<p>Next Page Preview</p>`
      case 'cappelli':
        return `<iframe src='https://centerfordigitalhumanities.github.io/cappelli/' style='width:100%;height:100%;border:none;'></iframe>`
      case 'enigma':
        return `<iframe src='http://enigma.huma-num.fr/' style='width:100%;height:100%;border:none;'></iframe>`
      case 'latin-dictionary':
        return `<iframe src='https://www.perseus.tufts.edu/hopper/resolveform?lang=latin' style='width:100%;height:100%;border:none;'></iframe>`
      case 'latin-vulgate':
        return `<iframe src='https://vulsearch.sourceforge.net/cgi-bin/vulsearch' style='width:100%;height:100%;border:none;'></iframe>`
      default:
        return `<p>No tool selected</p>`
    }
  }

  setupResizableSplit() {
    const container = this.shadowRoot.querySelector('.container')
    const leftPane = this.shadowRoot.querySelector('.left-pane')
    const rightPane = this.shadowRoot.querySelector('.right-pane')
    const splitter = this.shadowRoot.querySelector('.splitter')
    let isDragging = false

    const startDrag = () => {
      isDragging = true
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    }

    const stopDrag = () => {
      isDragging = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    const onDrag = (e) => {
      if (!isDragging) return;
      const containerRect = container.getBoundingClientRect()
      const offsetX = e.clientX - containerRect.left

      const min = containerRect.width * 0.2
      const max = containerRect.width * 0.8

      const leftWidth = Math.max(min, Math.min(offsetX, max))
      const rightWidth = containerRect.width - leftWidth - 5

      leftPane.style.width = `${leftWidth}px`
      rightPane.style.width = `${rightWidth}px`
    }

    splitter.addEventListener('mousedown', startDrag)
    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', stopDrag)
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
        .container.no-splitscreen .left-pane, 
        .container.no-splitscreen .right-pane {
          height: 100%;
          overflow: auto;
        }
        .splitter {
          width: 5px;
          background-color: #ccc;
          cursor: ew-resize;
        }
        .container.no-splitscreen .left-pane {
          width: 100% !important;
        }
        .container.no-splitscreen .right-pane,
        .container.no-splitscreen .splitter {
          display: none;
        }
        /* In active splitscreen, left pane takes 60% and right pane 40% */
        .container.active-splitscreen .left-pane {
          width: 60%;
        }
        .container.active-splitscreen .right-pane {
          width: 40%;
          border-left: 1px solid #ccc;
        }
        .right-pane {
          display: block;
          box-sizing: border-box;
        }
        .header {
          display: flex;
          justify-content: flex-end;
          padding: 5px;
          background-color: #f9f9f9;
        }
        .close-button {
          font-size: 16px;
          cursor: pointer;
        }
        .tools {
          padding: 10px;
          height: calc(100% - 40px);
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
      <tpen-project-header></tpen-project-header>
      <div class="container no-splitscreen">
        <div class="left-pane">
          <section class="transcription-section">
            <tpen-transcription-block></tpen-transcription-block>
            <tpen-workspace-tools></tpen-workspace-tools>
          </section>
        </div>
        <div class="splitter"></div>
        <div class="right-pane">
          <div class="header">
            <button class="close-button">Close ×</button>
          </div>
          <div class="tools">
          </div>
        </div>
      </div>
    `
  }
}

customElements.define("tpen-transcription-interface", TranscriptionInterface)

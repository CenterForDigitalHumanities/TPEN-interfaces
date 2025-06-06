import TPEN from "../../api/TPEN.js"

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
    TPEN.attachAuthentication(this)
    this.render()
    this.addEventListeners()
    this.setupResizableSplit()
    TPEN.eventDispatcher.on("tpen-project-loaded", ev => this.getImage(ev.detail))
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
        this.checkMagnifierVisibility()
      }
    })
  }

  checkMagnifierVisibility() {
    const magnifierTool = document.querySelector('tpen-transcription-interface').shadowRoot.querySelector('tpen-workspace-tools').shadowRoot.querySelector('tpen-magnifier-tool')
    if (magnifierTool.isMagnifierVisible) {
      magnifierTool.hideMagnifier()
      magnifierTool.showMagnifier()
    }
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
    this.checkMagnifierVisibility()
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
    window.addEventListener('mouseup', () => {
      if (!isDragging) return
      this.checkMagnifierVisibility()
      stopDrag()
    })
  }

  getImage(project) {
    const imageCanvas = this.shadowRoot.querySelector('.canvas-image')
    let canvasID
    let err = {}
    const allPages = project.layers.flatMap(layer => layer.pages)
    if (TPEN?.screen?.pageInQuery) {
      const matchingPage = allPages.find(
        page => page.id.split('/').pop() === TPEN.screen.pageInQuery
      )
      canvasID = matchingPage?.target
    } else {
      canvasID = allPages[0]?.target
    }

    fetch(canvasID)
    .then(response => {
      if (response.status === 404) {
        err = {"status":404, "statusText":"Canvas not found"}
        throw err
      }
      return response.json()
    })
    .then(canvas => {
      const imageId = canvas.items?.[0]?.items?.[0]?.body?.id
      if (imageId) {
        imageCanvas.src = imageId
      }
      else {
        err = {"status":500, "statusText":"Image could not be found in Canvas"}
        throw err
      }
    })
    .catch(error => {
      if(error?.status === 404) {
        imageCanvas.src = "../../assets/images/404_PageNotFound.jpeg"
      }
      else {
        imageCanvas.src = "../../assets/images/noimage.jpg"
      }
    })
  }

  render() {
    // Render the complete layout only once.
    this.shadowRoot.innerHTML = `
      <style>
        .container {
          display: flex;
          height: auto;
          overflow: hidden;
          width: 100%;
          background-color: #d0f7fb;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          padding: 0;
          margin: 0;
        }
        /* In inactive splitscreen, left pane takes full width, right pane is hidden */
        .container.no-splitscreen .left-pane, 
        .container.no-splitscreen .right-pane {
          height: 100%;
          overflow: auto;
        }
        .splitter {
          width: 6px;
          background-color: #ddd;
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
          border-left: 1px solid #ddd;
          background-color: #ffffff;
        }

        .splitter:hover {
          background-color: #bbb;
        }

        .header {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: 10px;
          background-color: rgb(166, 65, 41);
          border-bottom: 1px solid #ddd;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: white;
          transition: color 0.2s;
        }

        .tools {
          padding: 15px;
          height: calc(100% - 50px);
          overflow-y: auto;
        }

        .tools p {
          margin: 10px 0;
          font-size: 0.95rem;
          line-height: 1.5;
          color: #444;
        }

        .transcription-section {
          padding: 0 20px;
          box-sizing: border-box;

        }

        .canvas-image {
          max-width: 100%;
          border-radius: 12px;
          border: 1.5px solid rgb(254, 248, 228);
          box-shadow: 0 6px 12px rgba(0,0,0,0.1);
          user-select: none;
          display: block;
        }

        .workspace-tools {
          border: 1px solid rgb(254, 248, 228);
          margin: 0 0 20px 0;
          padding: 15px 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
          background: rgb(254, 248, 228);
          border-radius: 10px;
          box-shadow: 0 4px 6px -2px rgba(0, 0, 0, 0.1);
          position: relative;
          width: 100%;
          box-sizing: border-box;
          border-top: none;
        }

      </style>
      <tpen-project-header></tpen-project-header>
      <div class="container no-splitscreen">
        <div class="left-pane">
          <section class="transcription-section">
            <tpen-transcription-block></tpen-transcription-block>
            <tpen-workspace-tools></tpen-workspace-tools>
            <div class="workspace-tools" aria-label="Image Workspace" style="padding: 0">
              <img
                class="canvas-image"
                src="https://t-pen.org/TPEN/images/loading2.gif"
                draggable="false"
                alt="Canvas image"
                onerror="this.src='../../assets/images/404_PageNotFound.jpeg';"
              />
            </div>
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

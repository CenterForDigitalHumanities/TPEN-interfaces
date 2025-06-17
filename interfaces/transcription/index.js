import TPEN from "../../api/TPEN.js"
import '../../components/projects/project-header.js'
import '../../components/workspace-tools/index.js'
import '../../components/transcription-block/index.js'
import vault from '../../js/vault.js'
import '../../components/line-image/index.js'
export default class TranscriptionInterface extends HTMLElement {
  #page
  #canvas

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
    TPEN.eventDispatcher.on('tpen-project-loaded', async () => {
      const pageID = TPEN.screen?.pageInQuery
      this.render()
      const topImage = this.shadowRoot.querySelector('#topImage')
      const bottomImage = this.shadowRoot.querySelector('#bottomImage')
      topImage.manifest = bottomImage.manifest = TPEN.activeProject?.manifest[0]
      const page = this.#page ?? await vault.get(pageID, 'annotationpage')
      let thisLine = page.items?.[0]
      let targetString, canvasID, region
      if (thisLine) {
        thisLine = await vault.get(thisLine, 'annotation')
        targetString = thisLine?.target?.id ?? thisLine.target?.['@id'] ?? thisLine.target
          ;[canvasID, region] = targetString.split('#xywh=')
        topImage.line = thisLine.id
      } else {
        targetString = page?.target?.id ?? page?.target?.['@id'] ?? page?.target
          ;[canvasID, region] = targetString.split('#xywh=')
      }
      const canvas = this.#canvas = await vault.get(canvasID, 'canvas')
      region ??= `0,0,${canvas.width ?? 'full'},${(canvas.height && canvas.height / 10) ?? 120}`

      topImage.canvas = bottomImage.canvas = canvasID
      if (region) {
        topImage.setAttribute('region', region)
      }
      this.slideBottomImage((canvas.height && canvas.height / 10) ?? 120)
    })
    TPEN.eventDispatcher.on('tpen-transcription-previous-line', ev => {
      const newIndex = ev.detail?.currentLineIndex
      if (typeof newIndex === 'number') this.updateLines(newIndex)
    })

    TPEN.eventDispatcher.on('tpen-transcription-next-line', ev => {
      const newIndex = ev.detail?.currentLineIndex
      if (typeof newIndex === 'number') this.updateLines(newIndex)
    })

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

  updateLines(newIndex) {
    const topImage = this.shadowRoot.querySelector('#topImage')

    // fake moving for now
    const segmentHeight = (this.#canvas?.height ?? 1200) / 10
    const lineTop = segmentHeight * (newIndex % 10)

    topImage.moveTo(0, lineTop, this.#canvas?.width ?? 'full', segmentHeight)
    console.log(`Moving topImage to: 0, ${lineTop}, ${this.#canvas?.width ?? 'full'}, ${segmentHeight}`)
    this.slideBottomImage(segmentHeight * (newIndex % 10) + segmentHeight)
  }

  slideBottomImage(offset) {
    const bottomImage = this.shadowRoot.querySelector('#bottomImage')
    if (!bottomImage || !this.#canvas) return
    const scale = bottomImage.clientHeight / (this.#canvas.height ?? 1)
    bottomImage.style.transform = `translateY(-${offset * scale}px)`
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
          err = { "status": 404, "statusText": "Canvas not found" }
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
          err = { "status": 500, "statusText": "Image could not be found in Canvas" }
          throw err
        }
      })
      .catch(error => {
        if (error?.status === 404) {
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
          box-sizing: border-box;
          z-index: 2;
          position: relative;}

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

        tpen-line-image {
          display: block;
          width: 100%;
          height: auto;
          transition: all 1.5s cubic-bezier(0.04, 1, 0.68, 1);
          position: relative;
          z-index: 1;
        }

        #bottomImage {
          z-index: 0;
          transform: translateY(0px);
        }

      </style>
      <tpen-project-header></tpen-project-header>
      <div class="container no-splitscreen">
        <div class="left-pane">
          <tpen-line-image id="topImage"></tpen-line-image>
          <section class="transcription-section">
            <tpen-transcription-block></tpen-transcription-block>
            <tpen-workspace-tools></tpen-workspace-tools>
            <div class="workspace-tools" aria-label="Image Workspace" style="padding: 0">
              <img style="display:none;"
                class="canvas-image"
                src="https://t-pen.org/TPEN/images/loading2.gif"
                draggable="false"
                alt="Canvas image"
                onerror="this.src='../../assets/images/404_PageNotFound.jpeg';"
              />
            </div>
          </section>
          <tpen-line-image id="bottomImage"></tpen-line-image>
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

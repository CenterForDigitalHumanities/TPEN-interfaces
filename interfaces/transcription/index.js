import TPEN from "../../api/TPEN.js"
import '../../components/projects/project-header.js'
import '../../components/workspace-tools/index.js'
import '../../components/transcription-block/index.js'
import vault from '../../js/vault.js'
import '../../components/line-image/index.js'
import CheckPermissions from "../../components/check-permissions/checkPermissions.js"
import { orderPageItemsByColumns } from "../../utilities/columnOrdering.js"
import { renderPermissionError } from "../../utilities/renderPermissionError.js"
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
    if (TPEN.activeProject?._createdAt) {
      this.authgate()
    }
    TPEN.eventDispatcher.on('tpen-project-loaded', this.authgate.bind(this))
    TPEN.eventDispatcher.on('tpen-transcription-previous-line', this.updateLines.bind(this))
    TPEN.eventDispatcher.on('tpen-transcription-next-line', this.updateLines.bind(this))
  }

  async authgate() {
    if (!CheckPermissions.checkViewAccess("ANY", "CONTENT")) {
      this.renderPermissionError()
      return
    }
    this.render()
    this.addEventListeners()
    this.setupResizableSplit()
    const pageID = TPEN.screen?.pageInQuery
    await this.updateTranscriptionImages(pageID)
    this.updateLines()
  }

  renderPermissionError() {
    renderPermissionError(this.shadowRoot, TPEN.screen?.projectInQuery ?? '')
  }

  render() {
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
        .container.no-splitscreen .left-pane, 
        .container.no-splitscreen .right-pane {
          height: 100%;
          overflow: auto;
          z-index: 0;
        }
        .splitter {
          width: 6px;
          background-color: #ddd;
          cursor: ew-resize;
          z-index: 1;
        }
        .container.no-splitscreen .left-pane {
          width: 100% !important;
        }
        .container.no-splitscreen .right-pane,
        .container.no-splitscreen .splitter {
          display: none;
        }
        .container.active-splitscreen .left-pane {
          width: 60%;
          position: relative;
          z-index: 1;
        }
        .container.active-splitscreen .right-pane {
          width: 40%;
          border-left: 1px solid #ddd;
          background-color: #ffffff;
          position: relative;
          z-index: 5;
          box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
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
        .container.active-splitscreen {
          position: relative;
          z-index: 2;
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
          height: calc(100vh - 85px);
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
          position: relative;
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
        iframe {
          display: block;
          width: 100%;
          height: 100%;
          border: none;
          position: relative;
          z-index: 0;
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
          <tpen-image-fragment id="bottomImage"></tpen-image-fragment>
        </div>
        <div class="splitter"></div>
        <div class="right-pane">
          <div class="header">
            <button class="close-button">Close ×</button>
          </div>
          <div class="tools">
            <p>
              You do not have any tools loaded. To add a tool, please 
              <a href="/project/manage?projectId=${TPEN.screen.projectInQuery}">manage your project</a>.
            </p>
          </div>
        </div>
      </div>
    `
  }

  addEventListeners() {
    const closeSplitscreen = () => {
      if (!this.state.isSplitscreenActive) return
      this.state.isSplitscreenActive = false
      this.toggleSplitscreen()
      this.checkMagnifierVisibility()
      this.updateLines()
    }

    const openSplitscreen = (selectedTool = '') => {
      this.state.activeTool = selectedTool
      this.state.isSplitscreenActive = true
      this.toggleSplitscreen()
      this.loadRightPaneContent()
      this.updateLines()
    }

    this.shadowRoot.addEventListener('splitscreen-toggle', e => openSplitscreen(e.detail?.selectedTool))

    this.shadowRoot.addEventListener('click', e => {
      if (e.target?.classList.contains('close-button')) closeSplitscreen()
    })

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSplitscreen()
    })

    TPEN.eventDispatcher.on('tools-dismiss', closeSplitscreen)
  }

  checkMagnifierVisibility() {
    const magnifierTool = document.querySelector('tpen-transcription-interface').shadowRoot.querySelector('tpen-workspace-tools').shadowRoot.querySelector('tpen-magnifier-tool')
    if (magnifierTool?.isMagnifierVisible) {
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

  fetchCurrentPageId() {
    for (const layer of TPEN.activeProject?.layers) {
      const page = layer.pages.find(
        p => p.id.split('/').pop() === TPEN.screen.pageInQuery
      )
      if (page) return page.id
    }
  }

  fetchCanvasesFromCurrentLayer() {
    const currentLayer = TPEN.activeProject?.layers.find(layer => layer.pages.some(page => page.id.split('/').pop() === TPEN.screen.pageInQuery))
    const canvases = currentLayer?.pages.flatMap(page => {
      return {
        id: page.target,
        label: page.label
      }
    })
    return canvases
  }

  loadRightPaneContent() {
    const rightPane = this.shadowRoot.querySelector('.tools')
    const tool = this.getToolByName(this.state.activeTool)
    if (!tool) {
      rightPane.innerHTML = `
      <p>
        You do not have any tools loaded. To add a tool, please 
        <a href="/project/manage?projectId=${TPEN.screen?.projectInQuery ?? ''}">manage your project</a>.
      </p>
      `
      return
    }

    const tagName = tool.custom?.tagName
    if (tagName && tool.url) {
      // Dynamically load the script if not already loaded
      if (customElements.get(tagName)) {
        rightPane.innerHTML = `<${tagName}></${tagName}>`
        return
      }
      const script = document.createElement('script')
      script.type = 'module'
      script.src = tool.url
      script.onload = () => {
        rightPane.innerHTML = `<${tagName}></${tagName}>`
      }
      script.onerror = () => {
        rightPane.innerHTML = `<p>Failed to load tool: ${tagName}</p>`
      }
      document.head.appendChild(script)
      return
    }

    if (tool.url && !tagName && tool.location === 'pane') {
      const iframe = document.createElement('iframe')
      iframe.id = tool.toolName
      iframe.addEventListener('load', () => {
        iframe.contentWindow?.postMessage(
          {
            type: "MANIFEST_CANVAS_ANNOTATIONPAGE_ANNOTATION",
            manifest: TPEN.activeProject?.manifest?.[0] ?? '',
            canvas: this.#canvas?.id ?? this.#canvas?.['@id'] ?? this.#canvas ?? '',
            annotationPage: this.fetchCurrentPageId() ?? this.#page ?? '',
            annotation: TPEN.activeLineIndex >= 0 ? this.#page?.items?.[TPEN.activeLineIndex]?.id ?? null : null,
            columns: TPEN.activeProject?.layers.flatMap(layer => layer.pages || []).find(p => p.id.split('/').pop() === TPEN.screen.pageInQuery)?.columns || []
          },
          '*'
        )

        iframe.contentWindow?.postMessage(
          { type: "CANVASES",
            canvases: this.fetchCanvasesFromCurrentLayer()
          },
          '*'
        )

        iframe.contentWindow?.postMessage(
          { type: "CURRENT_LINE_INDEX",
            lineId: this.#page?.items?.[TPEN.activeLineIndex]?.id
          },
          "*"
        )
      })
      TPEN.eventDispatcher.on('tpen-transcription-previous-line', () => {
        iframe.contentWindow?.postMessage(
          { type: "SELECT_ANNOTATION", lineId: this.#page?.items?.[TPEN.activeLineIndex]?.id },
          "*"
        )
      })
      TPEN.eventDispatcher.on('tpen-transcription-next-line', () => {
        iframe.contentWindow?.postMessage(
          { type: "SELECT_ANNOTATION", lineId: this.#page?.items?.[TPEN.activeLineIndex]?.id },
          "*"
        )
      })
      iframe.src = tool.url
      rightPane.innerHTML = ''
      rightPane.appendChild(iframe)
      return
    }

    rightPane.innerHTML = `<p>${tool.label ?? tool.custom?.tagName ?? 'Tool'} - functionality coming soon...</p>`
    this.checkMagnifierVisibility()
  }

  getToolByName(toolName) {
    const tools = TPEN.activeProject?.tools || []
    return tools.find(tool => tool.toolName === toolName)
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

  updateLines() {
    if (TPEN.activeLineIndex < 0 || !this.#page) return
    const topImage = this.shadowRoot.querySelector('#topImage')
    if (!topImage) return
    const thisLine = this.#page.items?.[TPEN.activeLineIndex]
    if (!thisLine) return
    TPEN.activeLine = thisLine
    // Dispatch event for line history tool
    TPEN.eventDispatcher.dispatch('tpen-active-line-updated', thisLine)

    const page = TPEN.activeProject.layers.flatMap(layer => layer.pages || []).find(p => p.id.split('/').pop() === this.#page.id.split('/').pop())
    if (!page) return
    const { columnsInPage } = orderPageItemsByColumns(page, this.#page)

    const columnSelector = document.querySelector('tpen-transcription-interface')?.shadowRoot?.querySelector('tpen-project-header')?.shadowRoot?.querySelector('tpen-column-selector')
    if (columnSelector && columnSelector.shadowRoot) {
      const activeLineId = TPEN.activeLine?.id || TPEN.activeLine?.['@id']
      if (!activeLineId) return
      const activeColumn = columnsInPage.find(column => column.lines.includes(activeLineId))
      if (activeColumn) {
        const selectEl = columnSelector.shadowRoot.querySelector('select')
        if (selectEl) {
          selectEl.title = activeColumn.label
          selectEl.value = activeColumn.id
        }
      }
    }

    const { region } = this.setCanvasAndSelector(thisLine, this.#page)
    if (!region) return
    const [x, y, width, height] = region.split(',').map(Number)
    if ([x, y, width, height].some(isNaN)) return
    topImage.moveTo(x, y, width, height)
    const bottomImage = this.shadowRoot.querySelector('#bottomImage')
    if (bottomImage) bottomImage.moveUnder(x, y, width, height, topImage)
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

  setCanvasAndSelector(thisLine, page) {
    let targetString, canvasID, region
    targetString = thisLine?.target?.id ?? thisLine?.target?.['@id']
    targetString ??= thisLine?.target?.selector?.value ? `${thisLine.target?.source}#${thisLine.target.selector.value}` : null
    targetString ??= thisLine?.target
    targetString ??= page?.target?.id ?? page?.target?.['@id'] ?? page?.target
      ;[canvasID, region] = targetString?.split?.('#xywh=')
    return { canvasID, region: region?.split?.(':')?.pop() }
  }

  async updateTranscriptionImages(pageID) {
    const topImage = this.shadowRoot.querySelector('#topImage')
    const bottomImage = this.shadowRoot.querySelector('#bottomImage')
    topImage.manifest = bottomImage.manifest = TPEN.activeProject?.manifest[0]
    this.#page = await vault.get(pageID, 'annotationpage', true)
    const projectPage = TPEN.activeProject.layers.flatMap(layer => layer.pages || []).find(p => p.id.split('/').pop() === pageID.split('/').pop())
    if (!this.#page || !projectPage) return
    const { orderedItems, columnsInPage } = orderPageItemsByColumns(projectPage, this.#page)
    this.#page.items = orderedItems
    let thisLine = this.#page.items?.[0]
    if (!thisLine) return
    if (!(thisLine?.body)) thisLine = await vault.get(thisLine, 'annotation', true)
    const { canvasID, region } = this.setCanvasAndSelector(thisLine, this.#page)
    const canvas = this.#canvas = await vault.get(canvasID, 'canvas')
    const regionValue = region ?? `0,0,${canvas?.width ?? 'full'},${(canvas?.height && canvas?.height / 10) ?? 120}`
    topImage.canvas = canvasID
    bottomImage.canvas = canvas
    if (regionValue) {
      topImage.setAttribute('region', regionValue)
    }
    const columnSelector = document.querySelector('tpen-transcription-interface')?.shadowRoot?.querySelector('tpen-project-header')?.shadowRoot?.querySelector('tpen-column-selector')
    if (columnSelector && columnSelector.shadowRoot) {
      const activeLineId = thisLine?.id || thisLine?.['@id']
      if (!activeLineId) return
      const activeColumn = columnsInPage.find(column => column.lines.includes(activeLineId))
      if (activeColumn) {
        const selectEl = columnSelector.shadowRoot.querySelector('select')
        if (selectEl) {
          selectEl.title = activeColumn.label
          selectEl.value = activeColumn.id
        }
      }
    }
  }
}

customElements.define('tpen-transcription-interface', TranscriptionInterface)

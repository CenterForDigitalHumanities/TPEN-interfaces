import TPEN from "../../api/TPEN.js"
import '../../components/projects/project-header.js'
import '../../components/workspace-tools/index.js'
import '../../components/transcription-block/index.js'
import vault from '../../js/vault.js'
import CheckPermissions from "../../components/check-permissions/checkPermissions.js"

export default class SimpleTranscriptionInterface extends HTMLElement {
  #page
  #canvas
  #activeLine = null
  #imgTopOriginalHeight = 0
  #imgTopOriginalWidth = 0
  #imgBottomPositionRatio = 1
  #imgTopPositionRatio = 1

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
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
    TPEN.eventDispatcher.on('tpen-transcription-previous-line', () => this.updateLines())
    TPEN.eventDispatcher.on('tpen-transcription-next-line', () => this.updateLines())
    
    // Handle window resize
    this.resizeHandler = this.handleResize.bind(this)
    window.addEventListener('resize', this.resizeHandler)
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.resizeHandler)
  }

  handleResize() {
    // Recalculate image positions on resize
    if (this.#activeLine) {
      this.adjustImages(this.#activeLine)
    }
  }

  async authgate() {
    if (!CheckPermissions.checkViewAccess("ANY", "CONTENT")) {
      this.remove()
      return
    }
    this.render()
    this.addEventListeners()
    this.setupResizableSplit()
    const pageID = TPEN.screen?.pageInQuery
    await this.updateTranscriptionImages(pageID)
    
    // Initialize activeLineIndex if not set
    if (typeof TPEN.activeLineIndex === 'undefined') {
      TPEN.activeLineIndex = 0
    }
    
    this.updateLines()
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        .container {
          display: flex;
          height: auto;
          overflow: hidden;
          width: 100%;
          background-color: #d0f7fb;
          transition: all 0.3s ease;
        }
        
        .container.no-splitscreen .left-pane, 
        .container.no-splitscreen .right-pane {
          height: 100%;
          overflow: auto;
        }
        
        .splitter {
          width: 6px;
          background-color: #ddd;
          cursor: ew-resize;
          z-index: 1;
          display: none;
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
        
        .container.active-splitscreen .splitter {
          display: block;
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
          color: white;
          font-weight: bold;
          font-size: 16px;
        }
        
        .close-button {
          background-color: transparent;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0 10px;
        }
        
        .close-button:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        
        .tools {
          height: calc(100vh - 56px);
          overflow: auto;
          padding: 20px;
        }
        
        /* Image Container Styles */
        .image-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100%;
          position: relative;
          background-color: #000;
        }
        
        #imgTop {
          position: relative;
          height: 0px;
          width: 100%;
          overflow: hidden;
          transition: height 0.5s ease-in-out;
          background-color: #1a1a1a;
        }
        
        #imgTop img {
          position: absolute;
          top: 0px;
          left: 0;
          width: 100%;
          height: auto;
          transition: top 0.5s ease-in-out;
          display: block;
        }
        
        #transWorkspace {
          position: relative;
          z-index: 100;
          background-color: #f5f5f5;
          border-top: 2px solid #ccc;
          border-bottom: 2px solid #ccc;
          min-height: 100px;
        }
        
        #imgBottom {
          position: relative;
          flex: 1;
          width: 100%;
          overflow: hidden;
          background-color: #1a1a1a;
        }
        
        #imgBottom img {
          position: absolute;
          top: 0px;
          left: 0;
          width: 100%;
          height: auto;
          transition: top 0.5s ease-in-out;
          display: block;
        }
        
        .transcription-image {
          width: 100%;
          height: auto;
          display: block;
        }
        
        /* Line Overlay Styles */
        .line-overlay {
          position: absolute;
          border: 2px solid rgba(255, 255, 0, 0.6);
          box-sizing: border-box;
          pointer-events: none;
          z-index: 10;
        }
        
        .line-overlay.active {
          border-color: rgba(255, 0, 0, 0.8);
          box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
          z-index: 20;
        }
      </style>

      <div class="container no-splitscreen">
        <div class="left-pane">
          <div class="image-container">
            <div id="imgTop">
              <img class="transcription-image" alt="Top image section">
            </div>
            <div id="transWorkspace">
              <tpen-workspace-tools></tpen-workspace-tools>
              <tpen-transcription-block></tpen-transcription-block>
            </div>
            <div id="imgBottom">
              <img class="transcription-image" alt="Bottom image section">
            </div>
          </div>
        </div>

        <div class="splitter"></div>

        <div class="right-pane">
          <div class="header">
            <button class="close-button" title="Close Split Screen">×</button>
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

  toggleSplitscreen() {
    const container = this.shadowRoot.querySelector(".container")
    if (!container) return

    if (this.state.isSplitscreenActive) {
      container.classList.remove("no-splitscreen")
      container.classList.add("active-splitscreen")
    } else {
      container.classList.remove("active-splitscreen")
      container.classList.add("no-splitscreen")
    }
  }

  setupResizableSplit() {
    const splitter = this.shadowRoot.querySelector('.splitter')
    const leftPane = this.shadowRoot.querySelector('.left-pane')
    const rightPane = this.shadowRoot.querySelector('.right-pane')
    
    let isDragging = false
    let startX = 0
    let startLeftWidth = 0

    splitter?.addEventListener('mousedown', (e) => {
      isDragging = true
      startX = e.clientX
      startLeftWidth = leftPane.getBoundingClientRect().width
      document.body.style.cursor = 'ew-resize'
      e.preventDefault()
    })

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return
      
      const container = this.shadowRoot.querySelector('.container')
      const containerWidth = container.getBoundingClientRect().width
      const delta = e.clientX - startX
      const newLeftWidth = startLeftWidth + delta
      const leftPercent = (newLeftWidth / containerWidth) * 100
      
      if (leftPercent >= 30 && leftPercent <= 80) {
        leftPane.style.width = `${leftPercent}%`
        rightPane.style.width = `${100 - leftPercent}%`
        this.updateLines()
      }
    })

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false
        document.body.style.cursor = ''
      }
    })
  }

  async updateTranscriptionImages(pageID) {
    try {
      if (!pageID && TPEN.screen?.pageInQuery) {
        pageID = TPEN.screen.pageInQuery
      }

      // Use vault.get to fetch the page properly
      const fetchedPage = await vault.get(pageID, 'annotationpage', true)
      if (!fetchedPage) return

      this.#page = fetchedPage

      // Get the first line to extract canvas info
      let firstLine = fetchedPage.items?.[0]
      if (!firstLine) return

      // Get the full line annotation
      firstLine = await vault.get(firstLine, 'annotation')
      if (!(firstLine?.body)) {
        firstLine = await vault.get(firstLine, 'annotation', true)
      }

      // Extract canvas ID from the line's target
      const target = firstLine.target
      let canvasID = target
      if (typeof target === 'string') {
        canvasID = target.split('#')[0]
      } else if (target?.source) {
        canvasID = target.source
      }

      const fetchedCanvas = await vault.get(canvasID, 'canvas')
      if (!fetchedCanvas) return

      this.#canvas = fetchedCanvas
      
      // Get canvas dimensions (these are the authoritative dimensions for XYWH calculations)
      this.#imgTopOriginalHeight = fetchedCanvas.height ?? 1000
      this.#imgTopOriginalWidth = fetchedCanvas.width ?? 1000
      
      // Get the image resource from the canvas
      const imageResource = fetchedCanvas.items?.[0]?.items?.[0]?.body?.id
      
      if (!imageResource) return

      // Load image to both top and bottom containers
      const imgTop = this.shadowRoot.querySelector('#imgTop img')
      const imgBottom = this.shadowRoot.querySelector('#imgBottom img')
      
      if (imgTop && imgBottom) {
        const onLoad = () => {
          // Update lines once image is loaded
          this.updateLines()
        }
        
        imgTop.addEventListener('load', onLoad, { once: true })
        imgTop.src = imageResource
        imgBottom.src = imageResource
      }
    } catch (err) {
      console.error("Failed to load transcription images:", err)
    }
  }

  async updateLines() {
    console.log('updateLines called, activeLineIndex:', TPEN.activeLineIndex)
    const page = this.#page
    const activeLineIndex = TPEN.activeLineIndex ?? 0

    if (!page?.items || page.items.length === 0) {
      console.warn('No page items available')
      this.#activeLine = null
      this.resetImagePositions()
      return
    }

    let line = page.items[activeLineIndex]
    if (!line) {
      console.warn('No line found at index:', activeLineIndex)
      this.#activeLine = null
      this.resetImagePositions()
      return
    }

    console.log('Line before fetch:', line)

    // If line is just a reference (string/ID), fetch the full annotation
    if (typeof line === 'string' || !line.target) {
      console.log('Fetching full annotation for line:', line)
      line = await vault.get(line, 'annotation')
      if (!(line?.body)) {
        line = await vault.get(line, 'annotation', true)
      }
      console.log('Fetched line:', line)
    }

    this.#activeLine = line
    this.adjustImages(line)
  }

  adjustImages(line) {
    const imgTop = this.shadowRoot.querySelector('#imgTop')
    const imgTopImg = this.shadowRoot.querySelector('#imgTop img')
    const imgBottom = this.shadowRoot.querySelector('#imgBottom')
    const imgBottomImg = this.shadowRoot.querySelector('#imgBottom img')
    const workspace = this.shadowRoot.querySelector('#transWorkspace')

    if (!imgTop || !imgTopImg || !imgBottom || !imgBottomImg || !workspace) {
      console.warn('Missing required elements:', { imgTop, imgTopImg, imgBottom, imgBottomImg, workspace })
      return
    }

    // Get the line's bounding box from the target selector
    let target = line.target
    
    console.log('Adjusting images for line:', line)
    console.log('Target:', target)
    console.log('Canvas dimensions:', this.#imgTopOriginalWidth, 'x', this.#imgTopOriginalHeight)
    
    // Get the actual rendered dimensions of the image (after scaling to width: 100%)
    const renderedWidth = imgTopImg.offsetWidth
    const renderedHeight = imgTopImg.offsetHeight
    
    console.log('Rendered image dimensions:', renderedWidth, 'x', renderedHeight)
    
    // Calculate the scale factor between canvas and rendered dimensions
    const scaleX = renderedWidth / this.#imgTopOriginalWidth
    const scaleY = renderedHeight / this.#imgTopOriginalHeight
    
    console.log('Scale factors:', { scaleX, scaleY })
    
    // Handle target being an object with source property
    if (typeof target === 'object' && target?.source) {
      console.log('Target is SpecificResource, selector:', target.selector)
      
      // For W3C Web Annotation format with selector
      const selector = target.selector
      
      if (selector?.value) {
        console.log('Selector has value:', selector.value)
        // SVG or fragment selector with value property
        const xywh = selector.value.split('#xywh=')[1]
        if (xywh) {
          target = `#xywh=${xywh}`
        } else if (selector.value.includes('xywh=')) {
          // Handle case where value is just "xywh=x,y,w,h"
          target = selector.value
        }
      } else if (selector?.type === 'FragmentSelector' && typeof selector === 'string') {
        // Fragment selector as string
        target = selector
      } else if (typeof selector === 'object') {
        // Check if selector itself has properties we need
        console.log('Selector object properties:', Object.keys(selector))
        
        // Try to find xywh in any property
        for (const key in selector) {
          const value = selector[key]
          if (typeof value === 'string' && value.includes('xywh=')) {
            const xywh = value.split('#xywh=')[1] || value.split('xywh=')[1]
            if (xywh) {
              target = `#xywh=${xywh}`
              break
            }
          }
        }
      }
    }
    
    console.log('Processed target:', target)
    
    // Extract xywh from target string
    // Handle both "xywh=x,y,w,h" and "xywh=pixel:x,y,w,h" formats
    const xywhMatch = typeof target === 'string' ? target.match(/xywh=(?:pixel:)?([^&]+)/) : null
    if (!xywhMatch) {
      console.error('Could not extract XYWH from target. Original:', line.target, 'Processed:', target)
      return
    }
    
    const [x, y, w, h] = xywhMatch[1].split(',').map(Number)
    console.log('XYWH coordinates:', { x, y, w, h })

    // Calculate scaled dimensions based on how the image is actually rendered
    // The image has width: 100%, so it scales proportionally
    const scaleFactor = renderedWidth / this.#imgTopOriginalWidth
    
    console.log('Scale factor:', scaleFactor)
    
    // Calculate scaled pixel positions
    const scaledY = y * scaleFactor
    const scaledH = h * scaleFactor
    const scaledX = x * scaleFactor
    const scaledW = w * scaleFactor
    
    console.log('Scaled pixel values:', { scaledX, scaledY, scaledW, scaledH })
    
    // Add margin around the active line (in scaled pixels)
    const marginTop = Math.max(20, scaledH * 0.2) // 20px or 20% of line height
    const marginBottom = Math.max(30, scaledH * 0.3) // 30px or 30% of line height
    
    // Calculate the viewport height for imgTop (line + margins)
    const imgTopHeight = scaledH + marginTop + marginBottom
    let topPosition = scaledY - marginTop

    // Ensure we don't go off the top of the image
    if (topPosition < 0) {
      topPosition = 0
    }

    // Calculate the bottom image position (start showing from where the line ends)
    const bottomPosition = scaledY + scaledH
    
    console.log('Applying pixel styles:', {
      imgTopHeight: `${imgTopHeight}px`,
      imgTopImgTop: `-${topPosition}px`,
      imgBottomImgTop: `-${bottomPosition}px`
    })
    
    // Store positions for resize handling
    this.#imgTopPositionRatio = topPosition / renderedHeight
    this.#imgBottomPositionRatio = bottomPosition / renderedHeight

    // Apply styles with smooth animation using pixel values
    imgTop.style.height = `${imgTopHeight}px`
    imgTopImg.style.top = `-${topPosition}px`
    imgBottomImg.style.top = `-${bottomPosition}px`

    // Add a visible indicator on imgTop to show the active line
    // Use pixel values for the overlay too
    this.highlightActiveLine(imgTop, scaledX, marginTop, scaledW, scaledH)
  }

  highlightActiveLine(container, leftPx, topPx, widthPx, heightPx) {
    // Remove existing overlays
    const existingOverlays = this.shadowRoot.querySelectorAll('.line-overlay')
    existingOverlays.forEach(el => el.remove())

    // Create new overlay for the active line
    const overlay = document.createElement('div')
    overlay.className = 'line-overlay active'
    
    overlay.style.left = `${leftPx}px`
    overlay.style.top = `${topPx}px`
    overlay.style.width = `${widthPx}px`
    overlay.style.height = `${heightPx}px`
    
    container.appendChild(overlay)
  }

  resetImagePositions() {
    const imgTop = this.shadowRoot.querySelector('#imgTop')
    const imgTopImg = this.shadowRoot.querySelector('#imgTop img')
    const imgBottomImg = this.shadowRoot.querySelector('#imgBottom img')

    if (imgTop && imgTopImg && imgBottomImg) {
      imgTop.style.height = '0%'
      imgTopImg.style.top = '0px'
      imgBottomImg.style.top = '0px'
    }
  }

  getToolByName(toolName) {
    return TPEN.activeProject?.tools?.find(tool => tool.toolName === toolName)
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
    const currentLayer = TPEN.activeProject?.layers.find(layer => 
      layer.pages.some(page => page.id.split('/').pop() === TPEN.screen.pageInQuery)
    )
    return currentLayer?.pages.flatMap(page => ({
      id: page.target,
      label: page.label
    })) ?? []
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
      iframe.style.width = '100%'
      iframe.style.height = '100%'
      iframe.style.border = 'none'
      
      iframe.addEventListener('load', () => {
        iframe.contentWindow?.postMessage(
          {
            type: "MANIFEST_CANVAS_ANNOTATIONPAGE_ANNOTATION",
            manifest: TPEN.activeProject?.manifest?.[0] ?? '',
            canvas: this.#canvas?.id ?? this.#canvas?.['@id'] ?? this.#canvas ?? '',
            annotationPage: this.fetchCurrentPageId() ?? this.#page ?? '',
            annotation: TPEN.activeLineIndex >= 0 ? this.#page?.items?.[TPEN.activeLineIndex]?.id ?? null : null
          },
          '*'
        )

        iframe.contentWindow?.postMessage(
          { 
            type: "CANVASES",
            canvases: this.fetchCanvasesFromCurrentLayer()
          },
          '*'
        )

        iframe.contentWindow?.postMessage(
          { 
            type: "CURRENT_LINE_INDEX",
            lineId: TPEN.activeLineIndex 
          },
          "*"
        )
      })
      
      TPEN.eventDispatcher.on('tpen-transcription-previous-line', () => {
        iframe.contentWindow?.postMessage(
          { type: "SELECT_ANNOTATION", lineId: TPEN.activeLineIndex },
          "*"
        )
      })
      
      TPEN.eventDispatcher.on('tpen-transcription-next-line', () => {
        iframe.contentWindow?.postMessage(
          { type: "SELECT_ANNOTATION", lineId: TPEN.activeLineIndex },
          "*"
        )
      })

      iframe.src = tool.url
      rightPane.innerHTML = ''
      rightPane.appendChild(iframe)
    }
  }
}

customElements.define('tpen-simple-transcription', SimpleTranscriptionInterface)

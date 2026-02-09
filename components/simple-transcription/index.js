import TPEN from "../../api/TPEN.js"
import '../../components/projects/project-header.js'
import '../../components/workspace-tools/index.js'
import '../../components/transcription-block/index.js'
import vault from '../../js/vault.js'
import CheckPermissions from "../../components/check-permissions/checkPermissions.js"
import { renderPermissionError } from "../../utilities/renderPermissionError.js"
import { orderPageItemsByColumns } from "../../utilities/columnOrdering.js"
import { onProjectReady } from "../../utilities/projectReady.js"
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

/**
 * SimpleTranscriptionInterface - The simplified transcription interface with split-pane image viewer.
 * Requires ANY CONTENT view access.
 * @element tpen-simple-transcription
 */
export default class SimpleTranscriptionInterface extends HTMLElement {
  #page
  #canvas
  #activeLine = null
  #imgTopOriginalHeight = 0
  #imgTopOriginalWidth = 0
  #imgBottomPositionRatio = 1
  #imgTopPositionRatio = 1
  #toolLineListeners = null
  /** @type {number|null} Timeout ID for drawer transition callbacks */
  #drawerTimeoutId = null
  /** @type {CleanupRegistry} Registry for cleanup handlers */
  cleanup = new CleanupRegistry()
  /** @type {CleanupRegistry} Registry for render-specific handlers */
  renderCleanup = new CleanupRegistry()
  /** @type {Function|null} Unsubscribe function for project ready listener */
  _unsubProject = null
  _iframeOrigin = null

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
    this.state = {
      isSplitscreenActive: false,
      activeTool: '',
    }
    // Track toast state to avoid repeated notifications on empty pages
    this._noLinesToastShownForPageId = null
  }

  connectedCallback() {
    this.setAttribute('data-interface-type', 'transcription')
    TPEN.attachAuthentication(this)
    this._unsubProject = onProjectReady(this, this.authgate)

    const activePageHandler = () => this.updateLines()
    this.cleanup.onEvent(TPEN.eventDispatcher, 'tpen-transcription-previous-line', activePageHandler)
    this.cleanup.onEvent(TPEN.eventDispatcher, 'tpen-transcription-next-line', activePageHandler)

    // Handle window resize
    this.cleanup.onWindow('resize', this.handleResize.bind(this))

    // Listen for navigation events from tools
    this.cleanup.onWindow('message', this.#handleToolMessages.bind(this))

    this.cleanup.onElement(this, 'drawer-opened', () => {
      // Wait for the 0.3s CSS transition to complete before recalculating
      if (this.#drawerTimeoutId) clearTimeout(this.#drawerTimeoutId)
      this.#drawerTimeoutId = setTimeout(() => {
        this.#drawerTimeoutId = null
        this.updateLines()
      }, 300)
    })

    this.cleanup.onElement(this, 'drawer-closed', () => {
      // Wait for the 0.3s CSS transition to complete before recalculating
      if (this.#drawerTimeoutId) clearTimeout(this.#drawerTimeoutId)
      this.#drawerTimeoutId = setTimeout(() => {
        this.#drawerTimeoutId = null
        this.updateLines()
      }, 300)
    })
  }

  disconnectedCallback() {
    try { this._unsubProject?.() } catch {}
    // Clear any pending drawer transition timeout
    if (this.#drawerTimeoutId) {
      clearTimeout(this.#drawerTimeoutId)
      this.#drawerTimeoutId = null
    }
    this.#cleanupToolLineListeners()
    this.renderCleanup.run()
    this.cleanup.run()
  }

  #cleanupToolLineListeners() {
    if (this.#toolLineListeners) {
      TPEN.eventDispatcher.off('tpen-transcription-previous-line', this.#toolLineListeners)
      TPEN.eventDispatcher.off('tpen-transcription-next-line', this.#toolLineListeners)
      this.#toolLineListeners = null
    }
  }

  disableTransitions() {
    const imgTopImg = this.shadowRoot.querySelector('#imgTop img')
    const imgBottomImg = this.shadowRoot.querySelector('#imgBottom img')
    const imgTop = this.shadowRoot.querySelector('#imgTop')

    if (imgTopImg) imgTopImg.style.transition = 'none'
    if (imgBottomImg) imgBottomImg.style.transition = 'none'
    if (imgTop) imgTop.style.transition = 'none'
  }

  enableTransitions() {
    const imgTopImg = this.shadowRoot.querySelector('#imgTop img')
    const imgBottomImg = this.shadowRoot.querySelector('#imgBottom img')
    const imgTop = this.shadowRoot.querySelector('#imgTop')

    if (imgTopImg) imgTopImg.style.transition = 'top 0.5s ease-in-out, left 0.5s ease-in-out, transform 0.5s ease-in-out'
    if (imgBottomImg) imgBottomImg.style.transition = 'top 0.5s ease-in-out, left 0.5s ease-in-out, transform 0.5s ease-in-out'
    if (imgTop) imgTop.style.transition = 'height 0.5s ease-in-out'
  }

  handleResize() {
    // Recalculate image positions on resize
    if (this.#activeLine) {
      this.adjustImages(this.#activeLine)
    }
  }

  authgate() {
    if (!CheckPermissions.checkViewAccess("ANY", "CONTENT")) {
      this.renderPermissionError()
      return
    }
    this.render()
    this.addEventListeners()
    this.setupResizableSplit()
    this.initializeAsync()
  }

  /**
   * Performs async initialization after authgate passes.
   */
  async initializeAsync() {
    const pageID = TPEN.screen?.pageInQuery
    await this.updateTranscriptionImages(pageID)

    // Initialize activeLineIndex if not set
    if (typeof TPEN.activeLineIndex === 'undefined') {
      TPEN.activeLineIndex = 0
    }

    this.updateLines()
  }

  renderPermissionError() {
    renderPermissionError(this.shadowRoot, TPEN.screen?.projectInQuery ?? '')
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
          left: 0px;
          width: 100%;
          height: auto;
          transition: top 0.5s ease-in-out, left 0.5s ease-in-out, transform 0.5s ease-in-out;
          display: block;
          transform-origin: top left;
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
          left: 0px;
          width: 100%;
          height: auto;
          transition: top 0.5s ease-in-out, left 0.5s ease-in-out, transform 0.5s ease-in-out;
          display: block;
          transform-origin: top left;
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
          border-color: #A64129;
          box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
          z-index: 20;
        }
      </style>

      <tpen-project-header></tpen-project-header>
      <div class="container no-splitscreen">
        <div class="left-pane">
          <div class="image-container">
            <div id="imgTop">
              <img class="transcription-image" alt="Top image section">
            </div>
            <div id="transWorkspace">
              <tpen-transcription-block></tpen-transcription-block>
              <tpen-workspace-tools></tpen-workspace-tools>
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
              <a href="/project/manage?projectID=${TPEN.screen.projectInQuery}">manage your project</a>.
            </p>
          </div>
        </div>
      </div>
    `
  }

  addEventListeners() {
    // Clear previous render-specific listeners
    this.renderCleanup.run()

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

    this.renderCleanup.onElement(this.shadowRoot, 'splitscreen-toggle', e => openSplitscreen(e.detail?.selectedTool))

    this.renderCleanup.onElement(this.shadowRoot, 'click', e => {
      if (e.target?.classList.contains('close-button')) closeSplitscreen()
    })

    this.renderCleanup.onWindow('keydown', (e) => {
      if (e.key === 'Escape') closeSplitscreen()
    })

    this.renderCleanup.onEvent(TPEN.eventDispatcher, 'tools-dismiss', closeSplitscreen)

    // Listen for layer changes from layer-selector
    this.renderCleanup.onEvent(TPEN.eventDispatcher, 'tpen-layer-changed', (event) => {
      if (this.#page?.items?.length > 0) {
        TPEN.activeLineIndex = 0
      }
      this.updateLines()
    })

    // Listen for column selection changes
    this.renderCleanup.onEvent(TPEN.eventDispatcher, 'tpen-column-selected', (ev) => {
      const columnData = ev.detail
      if (typeof columnData.lineIndex === 'number') {
        TPEN.activeLineIndex = columnData.lineIndex
        this.updateLines()
      }
    })
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

    // Ensure layout has applied before recalculating image positions
    requestAnimationFrame(() => {
      // Some layouts need an extra frame to settle widths
      requestAnimationFrame(() => this.updateLines())
    })
  }

  setupResizableSplit() {
    const splitter = this.shadowRoot.querySelector('.splitter')
    const leftPane = this.shadowRoot.querySelector('.left-pane')
    const rightPane = this.shadowRoot.querySelector('.right-pane')

    let isDragging = false
    let startX = 0
    let startLeftWidth = 0

    this.renderCleanup.onElement(splitter, 'mousedown', (e) => {
      isDragging = true
      startX = e.clientX
      startLeftWidth = leftPane.getBoundingClientRect().width
      document.body.style.cursor = 'ew-resize'
      this.disableTransitions()
      e.preventDefault()
    })

    this.renderCleanup.onDocument('mousemove', (e) => {
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

    this.renderCleanup.onDocument('mouseup', () => {
      if (isDragging) {
        isDragging = false
        document.body.style.cursor = ''
        this.enableTransitions()
      }
    })
  }

  async updateTranscriptionImages(pageID) {
    try {
      if (!pageID && TPEN.screen?.pageInQuery) {
        pageID = TPEN.screen.pageInQuery
      }

      // Use vault.get to fetch the page properly
      let fetchedPage = await vault.getWithFallback(pageID, 'annotationpage', TPEN.activeProject?.manifest, true)
      if (!fetchedPage) {
        TPEN.eventDispatcher.dispatch("tpen-toast", {
          message: "Failed to load page. Please try again.",
          status: "error"
        })
        return
      }

      // Apply column ordering if project has columns
      const projectPage = TPEN.activeProject?.layers?.flatMap(layer => layer.pages || []).find(p => p.id.split('/').pop() === pageID.split('/').pop())
      this.#page = projectPage && fetchedPage.items?.length > 0
        ? { ...fetchedPage, items: orderPageItemsByColumns(projectPage, fetchedPage).orderedItems }
        : fetchedPage

      // Get the first line to extract canvas info
      let firstLine = this.#page.items?.[0]
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

      let fetchedCanvas = await vault.getWithFallback(canvasID, 'canvas', TPEN.activeProject?.manifest)
      if (!fetchedCanvas) {
        TPEN.eventDispatcher.dispatch("tpen-toast", {
          message: "Could not load canvas. Please try again.",
          status: "error"
        })
        return
      }
      this.#canvas = fetchedCanvas
      this.#imgTopOriginalHeight = this.#canvas.height ?? 1000
      this.#imgTopOriginalWidth = this.#canvas.width ?? 1000

      // Get the image resource from the canvas
      // Handle both Presentation API v3 (items) and v2 (images) formats
      const imageResource = fetchedCanvas.items?.[0]?.items?.[0]?.body?.id ?? fetchedCanvas.images?.[0]?.resource?.["@id"]

      if (!imageResource) {
        TPEN.eventDispatcher.dispatch("tpen-toast", {
          message: "Could not find image. Please check the canvas configuration.",
          status: "error"
        })
        return
      }

      // Load image to both top and bottom containers
      const imgTop = this.shadowRoot.querySelector('#imgTop img')
      const imgBottom = this.shadowRoot.querySelector('#imgBottom img')

      if (imgTop && imgBottom) {
        // Use cleanup registry for consistency, even for one-time listeners
        this.cleanup.onElement(imgTop, 'load', () => this.updateLines(), { once: true })
        imgTop.src = imageResource
        imgBottom.src = imageResource
      }
    } catch (err) {
      console.error("Failed to load transcription images:", err)
      TPEN.eventDispatcher.dispatch("tpen-toast", {
        message: "Error loading transcription interface. Please refresh and try again.",
        status: "error"
      })
    }
  }

  async updateLines() {
    const page = this.#page
    const activeLineIndex = TPEN.activeLineIndex ?? 0

    // If the page hasn't loaded yet, quietly bail without a toast
    if (!page) {
      this.#activeLine = null
      this.resetImagePositions()
      return
    }

    // Only show the toast when a page is loaded and has zero items
    if (!Array.isArray(page.items) || page.items.length === 0) {
      this.#activeLine = null
      this.resetImagePositions()
      // Avoid firing the same toast repeatedly for the same page
      if (this._noLinesToastShownForPageId !== (page?.id ?? TPEN.screen?.pageInQuery ?? 'unknown')) {
        TPEN.eventDispatcher.dispatch("tpen-toast", {
          message: "This page has no line annotations. Visit the annotation interface to add lines.",
          status: "info"
        })
        this._noLinesToastShownForPageId = page?.id ?? TPEN.screen?.pageInQuery ?? 'unknown'
      }
      return
    }

    // Clear toast state once page has items
    this._noLinesToastShownForPageId = null

    let line = page.items[activeLineIndex]
    if (!line) {
      this.#activeLine = null
      this.resetImagePositions()
      return
    }

    // If line is just a reference (string/ID), fetch the full annotation
    if (typeof line === 'string' || !line.target) {
      line = await vault.get(line, 'annotation')
      if (!(line?.body)) {
        line = await vault.get(line, 'annotation', true)
      }
    }

    this.#activeLine = line
    // Notify TPEN ecosystem (e.g., history tool) of active line changes
    try { TPEN.activeLine = line } catch { }
    // Dispatch event for line history tool
    TPEN.eventDispatcher.dispatch('tpen-active-line-updated', line)
    this.adjustImages(line)
  }

  adjustImages(line) {
    const imgTop = this.shadowRoot.querySelector('#imgTop')
    const imgTopImg = this.shadowRoot.querySelector('#imgTop img')
    const imgBottom = this.shadowRoot.querySelector('#imgBottom')
    const imgBottomImg = this.shadowRoot.querySelector('#imgBottom img')
    const workspace = this.shadowRoot.querySelector('#transWorkspace')

    if (!imgTop || !imgTopImg || !imgBottom || !imgBottomImg || !workspace) {
      return
    }

    // Get the line's bounding box from the target selector
    let target = line.target

    // Get the actual rendered dimensions of the image (after scaling to width: 100%)
    // If not yet rendered, calculate based on container width and aspect ratio
    let renderedWidth = imgBottomImg.offsetWidth || imgBottom.offsetWidth
    let renderedHeight = imgBottomImg.offsetHeight

    // If height is still 0, calculate it based on aspect ratio
    if (!renderedHeight && renderedWidth && this.#imgTopOriginalWidth && this.#imgTopOriginalHeight) {
      const aspectRatio = this.#imgTopOriginalHeight / this.#imgTopOriginalWidth
      renderedHeight = renderedWidth * aspectRatio
    }

    // Handle target being an object with source property
    if (typeof target === 'object' && target?.source) {

      // For W3C Web Annotation format with selector
      const selector = target.selector

      if (selector?.value) {
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

    // Extract xywh from target string
    // Handle both "xywh=x,y,w,h" and "xywh=pixel:x,y,w,h" formats
    const xywhMatch = typeof target === 'string' ? target.match(/xywh=(?:pixel:)?([^&]+)/) : null
    if (!xywhMatch) {
      console.error('Could not extract XYWH from target. Original:', line.target, 'Processed:', target)
      return
    }

    const [x, y, w, h] = xywhMatch[1].split(',').map(Number)

    // Calculate scaled dimensions based on how the image is actually rendered
    // The image has width: 100%, so it scales proportionally
    const scaleFactor = renderedWidth / this.#imgTopOriginalWidth

    // Calculate scaled pixel positions (where the line is on the rendered image)
    const scaledY = y * scaleFactor
    const scaledH = h * scaleFactor
    const scaledX = x * scaleFactor
    const scaledW = w * scaleFactor

    // Add margin around the active line (in scaled pixels)
    const marginTop = Math.min(10, scaledH * 0.3) // 30% of line height or 20px
    const marginBottom = Math.min(10, scaledH * 0.3) // 40% of line height or 30px
    const marginLeft = Math.min(15, scaledW * 0.15) // 15% of line width or 30px
    const marginRight = Math.min(15, scaledW * 0.15) // 15% of line width or 30px

    // Calculate what we want to show in the top viewport (line + margins)
    const viewportContentHeight = scaledH + marginTop + marginBottom
    const viewportContentWidth = scaledW + marginLeft + marginRight

    // Calculate the top-left corner of what we want to show
    let cropTop = scaledY - marginTop
    let cropLeft = scaledX - marginLeft

    // Ensure we don't go off the edges of the image
    if (cropTop < 0) {
      cropTop = 0
    }
    if (cropLeft < 0) {
      cropLeft = 0
    }

    // Get container width to determine how much to zoom
    // Use the actual left-pane/top container width to determine zoom
    const containerWidth = imgTop.clientWidth || imgTop.getBoundingClientRect().width || renderedWidth

    // Calculate zoom: we want the cropped width to fill the container
    const zoom = containerWidth / viewportContentWidth

    // The viewport height is the content height times the zoom
    const viewportHeight = viewportContentHeight * zoom

    // Calculate the bottom image start in pre-zoom pixels, then apply zoom for visual alignment
    const bottomPosition = cropTop + viewportContentHeight

    // Store positions for resize handling
    this.#imgTopPositionRatio = cropTop / renderedHeight
    this.#imgBottomPositionRatio = bottomPosition / renderedHeight

    // Apply styles with smooth animation
    // The container shows a viewport of specific height
    imgTop.style.height = `${viewportHeight}px`
    // Keep width responsive to the left pane; avoid pegging to a fixed pixel width
    imgTop.style.width = `100%`

    // The image is positioned and scaled
    imgTopImg.style.top = `-${cropTop * zoom}px`
    imgTopImg.style.left = `-${cropLeft * zoom}px`
    imgTopImg.style.transform = `scale(${zoom})`

    // Bottom image stays at 100% width, but we scale and offset so it visually matches the top zoom
    imgBottomImg.style.top = `-${bottomPosition * zoom}px`
    imgBottomImg.style.left = `-${cropLeft * zoom}px`
    imgBottomImg.style.transform = `scale(${zoom})`

    // Add a visible indicator on imgTop to show the active line
    // Position relative to the cropped/zoomed viewport
    const overlayLeft = (scaledX - cropLeft) * zoom
    const overlayTop = (scaledY - cropTop) * zoom
    const overlayWidth = scaledW * zoom
    const overlayHeight = scaledH * zoom

    this.highlightActiveLine(imgTop, overlayLeft, overlayTop, overlayWidth, overlayHeight)
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
      imgTop.style.height = '0px'
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
    let tool = this.getToolByName(this.state.activeTool)
    
    // If no active tool is selected, use the first available tool
    if (!tool && TPEN.activeProject?.tools?.length > 0) {
      tool = TPEN.activeProject.tools[0]
      this.state.activeTool = tool.toolName
    }

    if (!tool) {
      rightPane.innerHTML = `
        <p>
          You do not have any tools loaded. To add a tool, please 
          <a href="/project/manage?projectID=${TPEN.screen?.projectInQuery ?? ''}">manage your project</a>.
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

      const scriptId = `tool-script-${tool.toolName}`
      const existingScript = document.getElementById(scriptId)
      if (existingScript) {
        return
      }
      const script = document.createElement('script')
      script.type = 'module'
      script.src = tool.url
      script.id = scriptId
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
      
  // Extract and store iframe origin for secure postMessage
  this._iframeOrigin = new URL(tool.url).origin

      iframe.addEventListener('load', () => {
        // Get the current page configuration for columns
        const currentPageId = TPEN.screen?.pageInQuery
        const projectPage = TPEN.activeProject?.layers
          ?.flatMap(layer => layer.pages || [])
          .find(p => p.id.split('/').pop() === currentPageId)
        
        iframe.contentWindow?.postMessage(
          {
            type: "MANIFEST_CANVAS_ANNOTATIONPAGE_ANNOTATION",
            manifest: TPEN.activeProject?.manifest?.[0] ?? '',
            canvas: this.#canvas?.id ?? this.#canvas?.['@id'] ?? this.#canvas ?? '',
            annotationPage: this.fetchCurrentPageId() ?? this.#page?.id ?? '',
            annotation: TPEN.activeLineIndex >= 0 ? this.#page?.items?.[TPEN.activeLineIndex]?.id ?? null : null,
            columns: projectPage?.columns || []
          },
          this._iframeOrigin
        )

        iframe.contentWindow?.postMessage(
          {
            type: "CANVASES",
            canvases: this.fetchCanvasesFromCurrentLayer()
          },
          this._iframeOrigin
        )

        iframe.contentWindow?.postMessage(
          {
            type: "CURRENT_LINE_INDEX",
            lineId: this.#page?.items?.[TPEN.activeLineIndex]?.id ?? null
          },
          this._iframeOrigin
        )
      })

      // Clean up old listeners before adding new ones
      this.#cleanupToolLineListeners()

      const sendLineSelection = () => {
        const activeLineId = this.#page?.items?.[TPEN.activeLineIndex]?.id ?? null
        iframe.contentWindow?.postMessage(
          { type: "SELECT_ANNOTATION", lineId: activeLineId },
          this._iframeOrigin
        )
      }

      // Store the listener reference so we can clean it up later
      this.#toolLineListeners = sendLineSelection
      TPEN.eventDispatcher.on('tpen-transcription-previous-line', sendLineSelection)
      TPEN.eventDispatcher.on('tpen-transcription-next-line', sendLineSelection)

      iframe.src = tool.url
      rightPane.innerHTML = ''
      rightPane.appendChild(iframe)
      return
    }

    // Fallback message for tools that don't have proper configuration
    rightPane.innerHTML = `<p>${tool.label ?? tool.custom?.tagName ?? 'Tool'} - functionality coming soon...</p>`
    this.checkMagnifierVisibility?.()
  }

  #handleToolMessages(event) {
        // Validate message origin if iframe origin is set
        if (this._iframeOrigin && event.origin !== this._iframeOrigin) {
          return
        }
    
    // Handle incoming messages from tools
    const lineId = event.data?.lineId ?? event.data?.lineid ?? event.data?.annotation // handle different casing and properties

    if (!lineId) return

    // Handle all line navigation message types
    if (event.data?.type === "CURRENT_LINE_INDEX" || 
        event.data?.type === "RETURN_LINE_ID" || 
        event.data?.type === "SELECT_ANNOTATION" ||
        event.data?.type === "NAVIGATE_TO_LINE") {
      // Tool is telling us to navigate to a specific line
      // Line ID might be full URI or just the ID part
      const lineIndex = this.#page?.items?.findIndex(item => {
        const itemId = item.id ?? item['@id']
        // Match either full ID or just the last part after the last slash
        return itemId === lineId || itemId?.endsWith?.(`/${lineId}`) || itemId?.split?.('/').pop() === lineId
      })
      
      if (lineIndex !== undefined && lineIndex !== -1) {
        TPEN.activeLineIndex = lineIndex
        this.updateLines()
      }
    }
  }
}

customElements.define('tpen-simple-transcription', SimpleTranscriptionInterface)

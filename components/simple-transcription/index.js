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
import { getHigherResolutionImageCandidates } from '../../utilities/imageUpgradeUrl.js'
import '../../components/no-lines-prompt/index.js'

/**
 * SimpleTranscriptionInterface - The simplified transcription interface with split-pane image viewer.
 * Requires ANY CONTENT view access.
 * @element tpen-simple-transcription
 */
export default class SimpleTranscriptionInterface extends HTMLElement {
  #page
  #canvas
  #activeLine = null
  #activeToolIframe = null
  #imageService = null
  #currentImageSrc = null
  #attemptedUpgradeSources = new Set()
  #isAttemptingImageUpgrade = false
  #loadEpoch = 0
  #imgTopOriginalHeight = 0
  #imgTopOriginalWidth = 0
  #imgBottomPositionRatio = 1
  #imgTopPositionRatio = 1
  /** @type {number|null} Timeout ID for drawer transition callbacks */
  #drawerTimeoutId = null
  /** @type {CleanupRegistry} Registry for cleanup handlers */
  cleanup = new CleanupRegistry()
  /** @type {CleanupRegistry} Registry for render-specific handlers */
  renderCleanup = new CleanupRegistry()
  /** @type {CleanupRegistry} Registry scoped to the currently-loaded tool iframe */
  #toolCleanup = new CleanupRegistry()
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
    this.#toolCleanup.run()
    this.renderCleanup.run()
    this.cleanup.run()
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

    // When a page has no lines the no-lines-prompt component dispatches this event.
    // Open the right pane so the full canvas is visible.
    this.renderCleanup.onEvent(TPEN.eventDispatcher, 'tpen-load-full-page-view', () => this.#showFullPageView())

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

  /**
   * Replace the left pane with the no-lines prompt component.
   */
  #showNoLinesPrompt() {
    const leftPane = this.shadowRoot.querySelector('.left-pane')
    if (!leftPane) return
    leftPane.replaceChildren(document.createElement('tpen-no-lines-prompt'))
  }

  /**
   * Open the right pane (splitscreen) and display the full canvas image so the
   * user can see the page even though no line annotations are defined yet.
   */
  #showFullPageView() {
    if (!this.#currentImageSrc) return

    // Open the splitscreen pane
    this.state.isSplitscreenActive = true
    this.toggleSplitscreen()

    // Populate the right pane with the full canvas image
    const rightPaneTools = this.shadowRoot.querySelector('.tools')
    if (!rightPaneTools) return

    const img = document.createElement('img')
    img.src = this.#currentImageSrc
    img.alt = 'Full page view'
    img.style.cssText = 'width:100%;height:auto;display:block;'
    rightPaneTools.replaceChildren(img)
  }

  /**
   * Normalize a W3C/IIIF target value to a canvas URI.
   * Accepts a string URI, `{ source }` (string or SpecificResource object),
   * `{ id }`, or `{ "@id" }` shapes — including arrays of any of these — and
   * strips any IIIF media fragment (`#xywh=...`). Returns null for shapes
   * that do not yield a string URI.
   * @param {string|object|Array|null|undefined} target
   * @returns {string|null}
   */
  #extractCanvasID(target) {
    if (!target) return null
    if (Array.isArray(target)) target = target[0]
    let id = null
    if (typeof target === 'string') {
      id = target
    } else if (typeof target === 'object') {
      const source = target.source
      const fromSource = typeof source === 'string'
        ? source
        : source?.id ?? source?.['@id']
      id = fromSource ?? target.id ?? target['@id'] ?? null
    }
    if (typeof id !== 'string' || !id) return null
    return id.split('#')[0]
  }

  async updateTranscriptionImages(pageID) {
    try {
      // Invalidate in-flight upgrade attempts from a previous page/canvas.
      this.#loadEpoch += 1

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

      // Resolve the canvas ID from page metadata so the image loads even when
      // the page has zero line annotations. Prefer the AnnotationPage's own
      // target, fall back to the project layer's page target, and only use
      // the first line's target as a last resort.
      let canvasID = this.#extractCanvasID(fetchedPage.target)
        ?? this.#extractCanvasID(projectPage?.target)

      if (!canvasID) {
        let firstLine = this.#page.items?.[0]
        if (firstLine) {
          firstLine = await vault.get(firstLine, 'annotation')
          if (!(firstLine?.body)) {
            firstLine = await vault.get(firstLine, 'annotation', true)
          }
          canvasID = this.#extractCanvasID(firstLine?.target)
        }
      }

      if (!canvasID) {
        TPEN.eventDispatcher.dispatch("tpen-toast", {
          message: "Could not determine canvas for this page.",
          status: "error"
        })
        return
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
      const paintingBody = fetchedCanvas.items?.[0]?.items?.[0]?.body
      const imageResource = paintingBody?.id ?? fetchedCanvas.images?.[0]?.resource?.["@id"] ?? fetchedCanvas.images?.[0]?.resource?.id
      this.#imageService = paintingBody?.service?.[0] ?? paintingBody?.service ?? fetchedCanvas.images?.[0]?.resource?.service?.[0] ?? fetchedCanvas.images?.[0]?.resource?.service ?? null
      this.#currentImageSrc = imageResource ?? null
      this.#attemptedUpgradeSources = new Set()
      this.#isAttemptingImageUpgrade = false

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

      // If the page has no line annotations, replace the left pane with the
      // instructive no-lines prompt.  The prompt dispatches
      // 'tpen-load-full-page-view' on connect which opens the full canvas view.
      if (!Array.isArray(this.#page?.items) || this.#page.items.length === 0) {
        this.#showNoLinesPrompt()
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

    // If the page has no line annotations, the no-lines-prompt is shown instead.
    // Quietly bail here so image positions are reset without redundant messaging.
    if (!Array.isArray(page.items) || page.items.length === 0) {
      this.#activeLine = null
      this.resetImagePositions()
      return
    }

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
    this.#maybeUpgradeImageResolution({
      lineWidthIIIF: w,
      lineWidthScreen: overlayWidth
    })
  }

  /**
   * Preload an image candidate and return its natural dimensions.
   * Expected misses resolve to null so upgrade probing stays quiet.
   * @param {string} src
   * @returns {Promise<{src: string, naturalWidth: number, naturalHeight: number} | null>}
   */
  #preloadImageSource(src) {
    return new Promise(resolve => {
      const testImg = new Image()
      testImg.onload = () => {
        resolve({
          src,
          naturalWidth: testImg.naturalWidth,
          naturalHeight: testImg.naturalHeight
        })
      }
      testImg.onerror = () => resolve(null)
      testImg.src = src
    })
  }

  /**
   * Swap both panes to a new source and refresh line positioning once loaded.
   * @param {string} src
   */
  #swapImageSource(src) {
    const imgTop = this.shadowRoot.querySelector('#imgTop img')
    const imgBottom = this.shadowRoot.querySelector('#imgBottom img')
    if (!imgTop || !imgBottom) return

    this.cleanup.onElement(imgTop, 'load', () => this.updateLines(), { once: true })
    imgTop.src = src
    imgBottom.src = src
    this.#currentImageSrc = src
  }

  /**
   * Attempt a higher-resolution image when the active line is under-resolved on screen.
   * @param {{lineWidthIIIF: number, lineWidthScreen: number}} dimensions
   */
  async #maybeUpgradeImageResolution(dimensions) {
    const lineWidthIIIF = dimensions?.lineWidthIIIF
    const lineWidthScreen = dimensions?.lineWidthScreen
    if (
      this.#isAttemptingImageUpgrade
      || !Number.isFinite(lineWidthIIIF)
      || lineWidthIIIF <= 0
      || !Number.isFinite(lineWidthScreen)
      || lineWidthScreen <= 0
    ) {
      return
    }

    const imgBottom = this.shadowRoot.querySelector('#imgBottom img')
    if (!imgBottom || !imgBottom.naturalWidth || !this.#imgTopOriginalWidth) return

    const devicePixelRatio = globalThis.devicePixelRatio || 1
    const currentNaturalWidth = imgBottom.naturalWidth
    const linePixelsAvailable = lineWidthIIIF * (currentNaturalWidth / this.#imgTopOriginalWidth)
    const linePixelsNeeded = lineWidthScreen * devicePixelRatio
    if (linePixelsAvailable >= linePixelsNeeded) return

    const naturalWidthNeeded = (linePixelsNeeded * this.#imgTopOriginalWidth) / lineWidthIIIF

    const requestedWidth = Math.max(
      Math.ceil(naturalWidthNeeded * 1.1),
      Math.ceil(currentNaturalWidth * 1.5),
      Math.ceil(this.#imgTopOriginalWidth || 0)
    )

    const candidates = getHigherResolutionImageCandidates({
      imageUrl: this.#currentImageSrc,
      imageService: this.#imageService,
      requestedWidth
    })

    if (candidates.length === 0) return

    const epoch = this.#loadEpoch
    this.#isAttemptingImageUpgrade = true
    try {
      let bestFallback = null
      for (const candidate of candidates) {
        if (epoch !== this.#loadEpoch) return

        if (!candidate || candidate === this.#currentImageSrc || this.#attemptedUpgradeSources.has(candidate)) {
          continue
        }
        this.#attemptedUpgradeSources.add(candidate)

        const loaded = await this.#preloadImageSource(candidate)
        if (epoch !== this.#loadEpoch) return
        if (!loaded || loaded.naturalWidth <= currentNaturalWidth) {
          continue
        }

        const upgradedLinePixelsAvailable = lineWidthIIIF * (loaded.naturalWidth / this.#imgTopOriginalWidth)
        if (upgradedLinePixelsAvailable >= linePixelsNeeded) {
          this.#swapImageSource(candidate)
          return
        }

        if (!bestFallback || loaded.naturalWidth > bestFallback.naturalWidth) {
          bestFallback = {
            src: candidate,
            naturalWidth: loaded.naturalWidth
          }
        }
      }

      if (epoch === this.#loadEpoch && bestFallback?.src) {
        this.#swapImageSource(bestFallback.src)
        return
      }
    } finally {
      this.#isAttemptingImageUpgrade = false
    }
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

  #getCurrentLineId() {
    return this.#page?.items?.[TPEN.activeLineIndex]?.id ?? null
  }

  /**
   * Resolve each item in `page.items` to a full Annotation via the vault.
   * Vault fetches for AnnotationPages return children as bare `{id, type}`
   * refs — downstream tools need hydrated targets/selectors/bodies. Returns
   * a shallow copy of the page with the items array replaced; errors on
   * individual items fall back to the original ref so partial hydration
   * still produces a usable payload.
   */
  async #hydratePageItems(page) {
    if (!Array.isArray(page?.items) || page.items.length === 0) return page
    const results = await Promise.allSettled(
      page.items.map(item => vault.get(item, 'annotation'))
    )
    const items = results.map((r, i) => r.status === 'fulfilled' ? r.value : page.items[i])
    return { ...page, items }
  }

  async #buildTPENContext() {
    return {
      type: 'TPEN_CONTEXT',
      project: TPEN.activeProject ?? null,
      page: await this.#hydratePageItems(this.#page),
      canvas: this.#canvas ?? null,
      currentLineId: this.#getCurrentLineId()
    }
  }

  #postToTool(message, targetWindow = this.#activeToolIframe?.contentWindow) {
    if (!this._iframeOrigin || !targetWindow) return
    targetWindow.postMessage(message, this._iframeOrigin)
  }

  async #sendTPENContextToTool(targetWindow = this.#activeToolIframe?.contentWindow) {
    this.#postToTool(await this.#buildTPENContext(), targetWindow)
  }

  #sendIdTokenToTool(targetWindow = this.#activeToolIframe?.contentWindow) {
    const idToken = TPEN.getAuthorization()

    if (!idToken) {
      TPEN.login()
      return
    }

    const tool = this.getToolByName(this.state.activeTool)
    const toolLabel = tool?.label ?? tool?.custom?.tagName ?? 'Tool'

    this.#postToTool(
      {
        type: 'TPEN_ID_TOKEN',
        idToken
      },
      targetWindow
    )

    TPEN.eventDispatcher.dispatch('tpen-toast', {
      message: `Authorized ${toolLabel} to act on your behalf`,
      status: 'info'
    })
  }

  loadRightPaneContent() {
    // Tear down any listeners/subscriptions tied to the previously-loaded tool
    // before wiring up the new one. Covers every branch below, not just `pane`.
    this.#toolCleanup.run()

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
        rightPane.replaceChildren(document.createElement(tagName))
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
        rightPane.replaceChildren(document.createElement(tagName))
      }
      script.onerror = () => {
        rightPane.replaceChildren()
        const message = document.createElement('p')
        message.textContent = `Failed to load tool: ${tagName ?? 'unknown tool'}`
        rightPane.appendChild(message)
      }
      document.head.appendChild(script)
      return
    }

    if (tool.url && !tagName && tool.location === 'pane') {
      const iframe = document.createElement('iframe')
      this.#activeToolIframe = iframe
      iframe.id = tool.toolName
      iframe.style.width = '100%'
      iframe.style.height = '100%'
      iframe.style.border = 'none'

      // Extract and store iframe origin for secure postMessage
      this._iframeOrigin = new URL(tool.url).origin

      iframe.addEventListener('load', () => {
        const target = iframe.contentWindow
        this.#sendTPENContextToTool(target)

        this.#postToTool({
          type: 'MANIFEST_CANVAS_ANNOTATIONPAGE_ANNOTATION',
          manifest: TPEN.activeProject?.manifest?.[0] ?? '',
          canvas: this.#canvas?.id ?? this.#canvas?.['@id'] ?? '',
          annotationPage: this.#page?.id ?? '',
          annotation: TPEN.activeLineIndex >= 0
            ? this.#page?.items?.[TPEN.activeLineIndex]?.id ?? null
            : null,
          columns: TPEN.activeProject?.layers
            ?.flatMap(layer => layer.pages || [])
            .find(p => p.id?.split('/').pop() === TPEN.screen?.pageInQuery)?.columns || []
        }, target)

        this.#postToTool({
          type: 'CANVASES',
          canvases: TPEN.activeProject?.layers
            ?.find(layer => layer.pages?.some(p => p.id?.split('/').pop() === TPEN.screen?.pageInQuery))
            ?.pages?.flatMap(p => ({ id: p.target, label: p.label })) ?? []
        }, target)

        this.#postToTool({ type: 'CURRENT_LINE_INDEX', lineId: this.#getCurrentLineId() }, target)
      })

      const sendLineSelection = () => {
        const currentLineId = this.#getCurrentLineId()
        this.#postToTool({ type: 'UPDATE_CURRENT_LINE', currentLineId })

        this.#postToTool({ type: 'CURRENT_LINE_INDEX', lineId: currentLineId })
      }
      this.#toolCleanup.onEvent(TPEN.eventDispatcher, 'tpen-transcription-previous-line', sendLineSelection)
      this.#toolCleanup.onEvent(TPEN.eventDispatcher, 'tpen-transcription-next-line', sendLineSelection)
      iframe.src = tool.url
      rightPane.innerHTML = ''
      rightPane.appendChild(iframe)
      return
    }

    // Fallback message for tools that don't have proper configuration
    rightPane.replaceChildren()
    const message = document.createElement('p')
    message.textContent = `${tool.label ?? tool.custom?.tagName ?? 'Tool'} - functionality coming soon...`
    rightPane.appendChild(message)
    this.checkMagnifierVisibility?.()
  }

  #handleToolMessages(event) {
    // Validate message origin if iframe origin is set
    if (this._iframeOrigin && event.origin !== this._iframeOrigin) {
      return
    }

    if (event.data?.type === 'REQUEST_TPEN_ID_TOKEN') {
      this.#sendIdTokenToTool(event.source)
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

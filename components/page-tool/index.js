import TPEN from '../../api/TPEN.js'
import CheckPermissions from "../check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

/**
 * PageTool - Provides image manipulation tools like contrast, brightness, grayscale, and invert.
 * Requires TOOL ANY view access.
 * @element tpen-page-tool
 */
export default class PageTool extends HTMLElement {
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()
    /** @type {CleanupRegistry} Registry for render-specific handlers */
    renderCleanup = new CleanupRegistry()
    #drawerContent
    #drawerToggleBtn

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.isDrawerOpen = false
        this.drawerPosition = 'right'
        this.contrast = 100
        this.brightness = 100
        this.grayscaleActive = false
        this.invertActive = false
    }

    // Helper to find the transcription interface (supports both standard and simple versions)
    getTranscriptionInterface() {
        let iface = document.querySelector('tpen-transcription-interface')
        if (!iface) iface = document.querySelector('tpen-simple-transcription')
        return iface
    }

    get drawerContent() {
        if (!this.#drawerContent) {
            this.#drawerContent = this.shadowRoot.querySelector('.drawer-content')
        }
        return this.#drawerContent
    }

    get drawerToggleBtn() {
        if (!this.#drawerToggleBtn) {
            this.#drawerToggleBtn = this.shadowRoot.querySelector('.drawer-toggle-btn')
        }
        return this.#drawerToggleBtn
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubProject = onProjectReady(this, this.authgate.bind(this))
    }

    authgate() {
        if (!CheckPermissions.checkViewAccess("TOOL", "ANY")) {
            this.remove()
            return
        }
        this.render()
        this.addEventListeners()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
        this.renderCleanup.run()
        this.cleanup.run()
    }

    addEventListeners() {
        // Clear previous render-specific listeners
        this.renderCleanup.run()

        this.renderCleanup.onElement(this.drawerToggleBtn, 'click', () => this.toggleDrawer())
        this.renderCleanup.onElement(this.shadowRoot.querySelector('.drawer-close-btn'), 'click', () => this.closeDrawer())

        // Image control listeners
        this.renderCleanup.onElement(this.shadowRoot.querySelector('.grayscale-btn'), 'click', () => this.toggleGrayscale())
        this.renderCleanup.onElement(this.shadowRoot.querySelector('.invert-btn'), 'click', () => this.toggleInvert())
        this.renderCleanup.onElement(this.shadowRoot.querySelector('.contrast-slider'), 'input', (e) => this.setContrast(e))
        this.renderCleanup.onElement(this.shadowRoot.querySelector('.brightness-slider'), 'input', (e) => this.setBrightness(e))
        this.renderCleanup.onElement(this.shadowRoot.querySelector('.reset-btn'), 'click', () => this.resetFilters())

        // Lines & Columns buttons (if user has permission)
        if (CheckPermissions.checkEditAccess("LINE", "SELECTOR")) {
            const linesBtn = this.shadowRoot.querySelector('.lines-btn')
            const columnsBtn = this.shadowRoot.querySelector('.columns-btn')
            this.shadowRoot.querySelector('.parsing-section').style.display = "block"
            linesBtn.style.display = "block"
            columnsBtn.style.display = "block"
            this.renderCleanup.onElement(linesBtn, 'click', () =>
                document.location.href = `/annotator?projectID=${TPEN.activeProject._id}&pageID=${TPEN.screen.pageInQuery}`)
            this.renderCleanup.onElement(columnsBtn, 'click', () =>
                document.location.href = `/manage-columns?projectID=${TPEN.activeProject._id}&pageID=${TPEN.screen.pageInQuery}`)
        }
    }

    toggleDrawer() {
        this.isDrawerOpen ? this.closeDrawer() : this.openDrawer()
    }

    openDrawer() {
        const drawer = this.shadowRoot.querySelector('.drawer')
        if (!drawer) return
        
        const iface = this.getTranscriptionInterface()
        if (!iface?.shadowRoot) return
        
        const container = iface.shadowRoot.querySelector('.container')
        if (!container) return
        
        if (iface.shadowRoot.querySelector('.container.active-splitscreen .right-pane')) { 
          container.classList.remove('active-splitscreen')
          container.classList.add('no-splitscreen')
        }
        
        // Dispatch event before changing width so interface can prepare
        iface.dispatchEvent(new CustomEvent('drawer-opening', { bubbles: true, composed: true }))
        
        container.style.width = 'calc(100% - 320px)'
        drawer.classList.add('open')
        this.isDrawerOpen = true
        this.drawerToggleBtn.focus()
        
        // Dispatch event after width change to trigger recalc
        setTimeout(() => {
            iface.dispatchEvent(new CustomEvent('drawer-opened', { bubbles: true, composed: true }))
        }, 0)
    }

    closeDrawer() {
        const drawer = this.shadowRoot.querySelector('.drawer')
        if (!drawer) return
        
        const iface = this.getTranscriptionInterface()
        if (!iface?.shadowRoot) return
        
        const container = iface.shadowRoot.querySelector('.container')
        if (!container) return
        
        // Dispatch event before changing width
        iface.dispatchEvent(new CustomEvent('drawer-closing', { bubbles: true, composed: true }))
        
        // Remove the inline width style to return to CSS defaults
        container.style.width = ''
        drawer.classList.remove('open')
        this.isDrawerOpen = false
        this.drawerToggleBtn.blur()
        
        // Dispatch event after width change
        setTimeout(() => {
            iface.dispatchEvent(new CustomEvent('drawer-closed', { bubbles: true, composed: true }))
        }, 0)
    }

    // Apply filters to standard transcription interface images (uses CSS classes on imageEl)
    updateMainImageFilters(imageEl) {
        if (!imageEl) return

        const filters = []
        if (imageEl.classList.contains('grayscale')) filters.push('grayscale(100%)')
        if (imageEl.classList.contains('invert')) filters.push('invert(100%)')
        filters.push(`contrast(${this.contrast}%)`)
        filters.push(`brightness(${this.brightness}%)`)

        imageEl.style.transition = 'filter 250ms ease'
        imageEl.style.filter = filters.join(' ')
    }

    // Apply filters to simple transcription interface images (uses component state)
    applyFiltersToImage(imageEl) {
        if (!imageEl) return

        const filters = []
        if (this.grayscaleActive) filters.push('grayscale(100%)')
        if (this.invertActive) filters.push('invert(100%)')
        filters.push(`contrast(${this.contrast}%)`)
        filters.push(`brightness(${this.brightness}%)`)

        imageEl.style.transition = 'filter 250ms ease'
        imageEl.style.filter = filters.join(' ')
    }

    applyFilters() {
        const iface = this.getTranscriptionInterface()
        const transcriptionInterface = iface?.shadowRoot
        if (!transcriptionInterface) return

        // Handle standard transcription interface with image fragments
        const imageEl = transcriptionInterface.querySelector('tpen-image-fragment')?.shadowRoot?.querySelector('img')
        if (imageEl) this.updateMainImageFilters(imageEl)

        // Handle simple transcription interface - apply filters to both top and bottom images
        const imgTopImg = transcriptionInterface.querySelector('#imgTop img')
        const imgBottomImg = transcriptionInterface.querySelector('#imgBottom img')
        
        this.applyFiltersToImage(imgTopImg)
        this.applyFiltersToImage(imgBottomImg)

        const canvasPanel = transcriptionInterface.querySelector('tpen-line-image')?.shadowRoot?.querySelector('canvas-panel')?.shadowRoot
        if (!canvasPanel) return

        let atlasStyle = canvasPanel.querySelector('#atlas-filters-style')
        if (!atlasStyle) {
            atlasStyle = document.createElement('style')
            atlasStyle.id = 'atlas-filters-style'
            canvasPanel.appendChild(atlasStyle)
        }

        const imageFilters = []
        if (imageEl?.classList.contains('grayscale')) imageFilters.push('grayscale(100%)')
        if (imageEl?.classList.contains('invert')) imageFilters.push('invert(100%)')
        imageFilters.push(`contrast(${this.contrast}%)`)
        imageFilters.push(`brightness(${this.brightness}%)`)

        atlasStyle.textContent = `
            .atlas-static-image {
                filter: ${imageFilters.join(' ')};
                transition: filter 250ms ease;
            }
        `
    }

    toggleFilter(type) {
        const iface = this.getTranscriptionInterface()
        const transcriptionInterface = iface?.shadowRoot
        if (!transcriptionInterface) return
        
        // Track filter state
        if (type === 'grayscale') {
            this.grayscaleActive = !this.grayscaleActive
        } else if (type === 'invert') {
            this.invertActive = !this.invertActive
        }
        
        // Standard interface with image fragments
        const imageFragment = transcriptionInterface.querySelector('tpen-image-fragment')?.shadowRoot
        const imageEl = imageFragment?.querySelector('img')

        if (imageEl) {
            imageEl.classList.toggle(type)
        }
        
        // Apply filters (handles both standard and simple interfaces)
        this.applyFilters()

        const btnClass = type === 'grayscale' ? '.grayscale-btn' : '.invert-btn'
        const btn = this.shadowRoot.querySelector(btnClass)
        if (btn) btn.classList.toggle('active')
    }

    toggleGrayscale() {
        this.toggleFilter('grayscale')
    }

    toggleInvert() {
        this.toggleFilter('invert')
    }

    setContrast(e) {
        this.contrast = e.target.value
        this.applyFilters()
    }

    setBrightness(e) {
        this.brightness = e.target.value
        this.applyFilters()
    }

    resetFilters() {
      this.contrast = 100
      this.brightness = 100
      const contrastSlider = this.shadowRoot.querySelector('.contrast-slider')
      const brightnessSlider = this.shadowRoot.querySelector('.brightness-slider')
      if (contrastSlider) contrastSlider.value = 100
      if (brightnessSlider) brightnessSlider.value = 100

      const iface = this.getTranscriptionInterface()
      const transcriptionInterface = iface?.shadowRoot
      const imageEl = transcriptionInterface
          ?.querySelector('tpen-image-fragment')?.shadowRoot?.querySelector('img')

      if (imageEl) {
          imageEl.classList.remove('grayscale', 'invert')
      }

      const grayscaleBtn = this.shadowRoot.querySelector('.grayscale-btn')
      const invertBtn = this.shadowRoot.querySelector('.invert-btn')
      grayscaleBtn?.classList.remove('active')
      invertBtn?.classList.remove('active')
      this.applyFilters()
  }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            .drawer-toggle-btn {
              padding: 8px 16px;
              border-radius: 25px;
              border: 2px solid rgb(0, 90, 140);
              background-color: rgb(0, 90, 140);
              color: white;
              font-weight: 600;
              font-size: 14px;
              cursor: pointer;
              user-select: none;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              gap: 8px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              z-index: 1000;
            }

            .drawer-toggle-btn:hover, .drawer-toggle-btn:focus {
              background-color: white;
              border-color: rgb(0, 90, 140);
              color: rgb(0, 90, 140);
            }

            .drawer {
              position: fixed;
              ${this.drawerPosition}: -350px;
              top: 0;
              width: 320px;
              height: 100vh;
              background-color: white;
              box-shadow: ${this.drawerPosition === 'right' ? '-4px' : '4px'} 0 12px rgba(0, 0, 0, 0.15);
              transition: ${this.drawerPosition} 0.3s ease;
              z-index: 1001;
              display: flex;
              flex-direction: column;
            }

            .drawer.open { 
              ${this.drawerPosition}: 0; 
            }

            .drawer-header {
              padding: 7px 10px;
              background-color: rgb(166, 65, 41);
              color: white;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 5px;
            }

            .drawer-header h3 {
              margin: 0;
              font-size: clamp(0.8rem, 1.2vw, 1rem);
              font-weight: 600;
            }

            .drawer-close-btn {
              background: none;
              border: none;
              color: white;
              font-size: 24px;
              cursor: pointer;
              padding: 0;
              width: 30px;
              height: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              transition: background-color 0.2s;
            }

            .drawer-close-btn:hover { 
              background-color: rgba(255, 255, 255, 0.2); 
            }

            .drawer-content { 
              flex: 1; 
              overflow-y: auto; 
            }

            .tool-section { 
              display: flex;
              flex-direction: column;
              gap: 16px;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
            }

            .parsing-section {
                display: none;
            }

            .tool-section-title {
              font-size: 0.95rem;
              font-weight: 700;
              color: white;
              background-color: rgb(0, 90, 140);
              margin: 0;
              padding: 5px 0;
              border-bottom: 2px solid rgb(0, 90, 140);
              width: 100%;
              text-align: center;
              margin-top: 10px;
            }

            .reset-btn {
              margin: 10px auto;
              display: block;
              width: fit-content;
            }

            .lines-btn, .columns-btn {
              margin: 10px auto;
              display: none;
              width: fit-content;
            }

            .grayscale-btn, .invert-btn, .reset-btn, .lines-btn, .columns-btn {
              min-width: 220px;
              padding: 10px 18px;
              border: 2px solid rgb(0, 90, 140);
              border-radius: 25px;
              background-color: white;
              color: rgb(0, 90, 140);
              font-weight: 600;
              cursor: pointer;
              transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
            }

            .grayscale-btn:hover, .invert-btn:hover, .reset-btn:hover, .lines-btn:hover, .columns-btn:hover,
            .grayscale-btn:focus, .invert-btn:focus, .reset-btn:focus, .lines-btn:focus, .columns-btn:focus {
              background-color: rgb(0, 90, 140);
              color: white;
            }

            .grayscale-btn.active, .invert-btn.active, .reset-btn.active {
              background-color: rgb(0, 90, 140);
              color: white;
              border-color: rgb(0, 90, 140);
            }

            .tool-sliders {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
            }

            .tool-sliders label {
              font-size: 0.92rem;
              font-weight: 700;
              color: rgb(0, 90, 140);
            }

            .contrast-slider, .brightness-slider {
              -webkit-appearance: none;
              appearance: none;
              width: 220px;
              height: 10px;
              background: linear-gradient(to right, #d3d3d3, #6f6f6f);
              border-radius: 10px;
              outline: none;
              cursor: pointer;
              transition: opacity 0.2s ease;
            }

            .contrast-slider:hover, .brightness-slider:hover {
              opacity: 0.9;
            }

            .contrast-slider::-webkit-slider-thumb,
            .brightness-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: rgb(0, 90, 140);
              cursor: pointer;
              transition: background 0.3s ease;
            }
        </style>
        <button class="drawer-toggle-btn" type="button" title="Open Tools" aria-label="Open Tools">Page Tools</button>
        <div class="drawer">
            <div class="drawer-header">
                <h3>Page Tools</h3>
                <button class="drawer-close-btn" type="button" title="Close" aria-label="Close">×</button>
            </div>
            <div class="drawer-content">
                <div class="tool-section">
                  <h4 class="tool-section-title">IMAGE CONTROLS</h4>
                  <button type="button" class="reset-btn">RESET TO DEFAULTS</button>
                  <button type="button" class="grayscale-btn">GRAYSCALE</button>
                  <button type="button" class="invert-btn">INVERT</button>
                  <div class="tool-sliders">
                    <label for="contrast-slider">CONTRAST</label>
                    <input type="range" class="contrast-slider" min="0" max="200" value="100">
                  </div>
                  <div class="tool-sliders">
                    <label for="brightness-slider">BRIGHTNESS</label>
                    <input type="range" class="brightness-slider" min="0" max="200" value="100">
                  </div>
                </div>
                <div class="tool-section parsing-section">
                    <h4 class="tool-section-title">LINES & COLUMNS</h4>
                    <button type="button" class="lines-btn">IDENTIFY LINES</button>
                    <button type="button" class="columns-btn">IDENTIFY COLUMNS</button>
                </div>
            </div>
        </div>
        `
    }
}

customElements.define('tpen-page-tool', PageTool)

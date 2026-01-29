import CheckPermissions from "../check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

/**
 * MagnifierTool - Provides a magnifying glass overlay for image inspection.
 * Requires TOOL ANY view access.
 * @element tpen-magnifier-tool
 */
export class MagnifierTool extends HTMLElement {
    #imageElem = null
    #magnifier
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()
    /** @type {CleanupRegistry} Registry for render-specific handlers */
    renderCleanup = new CleanupRegistry()
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.isMagnifierVisible = false
        this.dragOffset = { x: 0, y: 0 }
        this.isDragging = false
        this.zoomLevel = 2 // Default zoom
        this.boundsOffset = 0
    }

    set imageElem(el) {
        this.#imageElem = el
    }

    get imageElem() {
        return this.#imageElem
    }

    get magnifier() {
        if (!this.#magnifier) {
            this.#magnifier = this.shadowRoot.querySelector('.magnifier')
        }
        return this.#magnifier
    }

    connectedCallback() {
    this._unsubProject = onProjectReady(this, this.authgate)
    }

    authgate() {
        if(!CheckPermissions.checkViewAccess("TOOL", "ANY")) {
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

    setMagnifierView(centerX, centerY, zoomLevel = this.zoomLevel) {
        const magnifier = this.magnifier
        const img = this.imageElem
        if (!magnifier || !img) return
        const magnifierSize = magnifier.offsetWidth || 200
        const halfSize = magnifierSize / 2
        // Use actual on-screen size (accounts for CSS transforms like scale)
        const imgRect = img.getBoundingClientRect()
        magnifier.style.backgroundSize = `${imgRect.width * zoomLevel}px ${imgRect.height * zoomLevel}px`
        magnifier.style.backgroundPosition = `${-centerX * zoomLevel + halfSize}px ${-centerY * zoomLevel + halfSize}px`
    }

    addEventListeners() {
        // Clear previous render-specific listeners
        this.renderCleanup.run()

        const magnifier = this.magnifier

        const mousedownHandler = (e) => {
            e.preventDefault()
            this.isDragging = true

            const rect = magnifier.getBoundingClientRect()
            this.dragOffset.x = e.clientX - rect.left
            this.dragOffset.y = e.clientY - rect.top

            magnifier.style.cursor = 'grabbing'
        }
        this.renderCleanup.onElement(magnifier, 'mousedown', mousedownHandler)

        const wheelHandler = (e) => {
            if (!this.isMagnifierVisible) return
            e.preventDefault()
            const delta = Math.sign(e.deltaY)
            // Zoom out if delta > 0, in if < 0
            this.zoomLevel = Math.min(6, Math.max(1.5, this.zoomLevel - delta * 0.1))
            this.updateMagnifier()
        }
        this.renderCleanup.onElement(magnifier, 'wheel', wheelHandler)

        const mousemoveHandler = (e) => {
            if (!this.isDragging || !this.isMagnifierVisible) return
            e.preventDefault()
            const img = this.imageElem
            const magnifier = this.magnifier
            if (!img || !magnifier) return
            const imgRect = img.getBoundingClientRect()
            const magnifierSize = magnifier.offsetWidth || 200
            const halfSize = magnifierSize / 2
            const headerHeight = -60
            let x = e.clientX - imgRect.left
            let y = e.clientY - imgRect.top
            x = Math.max(-this.boundsOffset + halfSize, Math.min(x, imgRect.width + this.boundsOffset - halfSize))
            let minY = -this.boundsOffset + halfSize
            if (imgRect.top < headerHeight) {
                const requiredTopOffset = headerHeight - imgRect.top
                minY = Math.max(-this.boundsOffset + halfSize, requiredTopOffset + halfSize)
            }
            y = Math.max(minY, Math.min(y, imgRect.height + this.boundsOffset - halfSize))

            let rightPane = null
            const iface = document.querySelector('[data-interface-type="transcription"]')
            if (iface?.shadowRoot) {
                rightPane = iface.shadowRoot.querySelector('.right-pane')
            }

            if (rightPane && rightPane.offsetParent !== null) {
                const rightRect = rightPane.getBoundingClientRect()
                const overlapX = rightRect.left - imgRect.left - halfSize + 100
                if (x > overlapX) x = overlapX
            }

            magnifier.style.left = `${x + imgRect.left - halfSize}px`
            magnifier.style.top = `${y + imgRect.top - halfSize}px`

            this.setMagnifierView(x, y)
        }
        this.renderCleanup.onWindow('mousemove', mousemoveHandler)

        const mouseupHandler = () => {
            if (this.isDragging) {
                this.isDragging = false
                magnifier.style.cursor = 'grab'
            }
        }
        this.renderCleanup.onWindow('mouseup', mouseupHandler)

        const keydownHandler = (e) => {
            if (e.key === 'Escape' && this.isMagnifierVisible) {
                this.hideMagnifier()
            }
        }
        this.renderCleanup.onWindow('keydown', keydownHandler)
    }

    showMagnifier() {
        const magnifier = this.magnifier
        const img = this.imageElem
        if (!magnifier || !img) return

    const baseSize = parseFloat(getComputedStyle(magnifier).width) || 200
    magnifier.style.width = `${Math.round(baseSize)}px`
    magnifier.style.height = `${Math.round(baseSize)}px`

        magnifier.style.display = 'block'
        magnifier.style.backgroundImage = `url(${img.src})`
        magnifier.style.backgroundRepeat = 'no-repeat'
        // Use on-screen size for background sizing to match visual scale
        const imgRect = img.getBoundingClientRect()
        magnifier.style.backgroundSize = `${imgRect.width * this.zoomLevel}px ${imgRect.height * this.zoomLevel}px`
    const halfSize = (parseFloat(getComputedStyle(magnifier).width) || baseSize) / 2

        // Determine a visible anchor area to place the magnifier initially
        // Prefer the visible container around the image (e.g., #imgTop), fall back to the image rect
        let anchorRect = imgRect
        const hostContainer = img.closest('#imgTop, #imgBottom')
        if (hostContainer) {
            const rc = hostContainer.getBoundingClientRect()
            // If container has no area (hidden), fallback to imgRect
            if (rc.width > 0 && rc.height > 0) anchorRect = rc
        }

        // Clear conflicting positioning
        magnifier.style.removeProperty('right')

        // Center the magnifier within the visible container
        const initLeft = anchorRect.left + (anchorRect.width / 2) - halfSize
        const initTop = anchorRect.top + (anchorRect.height / 2) - halfSize
        magnifier.style.left = `${Math.round(initLeft)}px`
        magnifier.style.top = `${Math.round(initTop)}px`

        this.updateMagnifier()
        this.isMagnifierVisible = true
    }

    updateMagnifier() {
        const magnifier = this.magnifier
        const img = this.imageElem
        if (!magnifier || !img) return
        const magnifierRect = magnifier.getBoundingClientRect()
        const imgRect = img.getBoundingClientRect()
        const magnifierSize = magnifierRect.width ?? 200
        const halfSize = magnifierSize / 2
        const centerX = (magnifierRect.left + halfSize) - imgRect.left
        const centerY = (magnifierRect.top + halfSize) - imgRect.top
        this.setMagnifierView(centerX, centerY)
    }

    hideMagnifier() {
        const magnifier = this.magnifier
        if (!magnifier) return
        magnifier.style.display = 'none'
        this.isMagnifierVisible = false
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            .magnifier {
                display: none;
                position: absolute;
                border: 3px solid #333;
                border-radius: 50%;
                cursor: grab;
                width: 200px;
                height: 200px;
                background-repeat: no-repeat;
                background-size: calc(100% * 3) calc(100% * 3);
                pointer-events: all;
                box-shadow: 0 0 12px rgba(0,0,0,0.3);
                user-select: none;
                z-index: 10000;
                top: 60px;
                right: 20px;
            }
        </style>
        <div class="magnifier"></div>
        `
    }
}

export const showMagnifier = (instance) => instance.showMagnifier()
export const hideMagnifier = (instance) => instance.hideMagnifier()
export const updateMagnifier = (instance) => instance.updateMagnifier()
export const setMagnifierView = (instance, x, y, zoom) => instance.setMagnifierView(x, y, zoom)

customElements.define('tpen-magnifier-tool', MagnifierTool)

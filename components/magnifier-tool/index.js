import CheckPermissions from "../check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"

export class MagnifierTool extends HTMLElement {
    #imageElem = null
    #magnifier

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.isMagnifierVisible = false
        this.dragOffset = { x: 0, y: 0 }
        this.isDragging = false
        this.zoomLevel = 2 // Default zoom
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
        try { this._unsubProject?.() } catch { }
    }

    setMagnifierView(centerX, centerY, zoomLevel = this.zoomLevel) {
        const magnifier = this.magnifier
        const img = this.imageElem
        if (!magnifier || !img) return
        const magnifierSize = magnifier.offsetWidth || 200
        const halfSize = magnifierSize / 2
        magnifier.style.backgroundSize = `${img.width * zoomLevel}px ${img.height * zoomLevel}px`
        magnifier.style.backgroundPosition = `${-centerX * zoomLevel + halfSize}px ${-centerY * zoomLevel + halfSize}px`
    }

    addEventListeners() {
        const magnifier = this.magnifier

        magnifier.addEventListener('mousedown', (e) => {
            e.preventDefault()
            this.isDragging = true

            const rect = magnifier.getBoundingClientRect()
            this.dragOffset.x = e.clientX - rect.left
            this.dragOffset.y = e.clientY - rect.top

            magnifier.style.cursor = 'grabbing'
        })

        magnifier.addEventListener('wheel', (e) => {
            if (!this.isMagnifierVisible) return
            e.preventDefault()
            const delta = Math.sign(e.deltaY)
            // Zoom out if delta > 0, in if < 0
            this.zoomLevel = Math.min(6, Math.max(1.5, this.zoomLevel - delta * 0.1))
            this.updateMagnifier()
        })

        window.addEventListener('mousemove', (e) => {
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
            x = Math.max(halfSize, Math.min(x, imgRect.width - halfSize))
            let minY = halfSize
            if (imgRect.top < headerHeight) {
                const requiredTopOffset = headerHeight - imgRect.top
                minY = Math.max(halfSize, requiredTopOffset + halfSize)
            }
            y = Math.max(minY, Math.min(y, imgRect.height - halfSize))
            magnifier.style.left = `${x + imgRect.left - halfSize}px`
            magnifier.style.top = `${y + imgRect.top - halfSize}px`

            this.setMagnifierView(x, y)
        })

        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false
                magnifier.style.cursor = 'grab'
            }
        })

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMagnifierVisible) {
                this.hideMagnifier()
            }
        })
    }

    showMagnifier() {
        const magnifier = this.magnifier
        const img = this.imageElem
        if (!magnifier || !img) return

        const magnifierSize = magnifier.offsetWidth || 200
        magnifier.style.width = `${magnifierSize}px`
        magnifier.style.height = `${magnifierSize}px`

        magnifier.style.display = 'block'
        magnifier.style.backgroundImage = `url(${img.src})`
        magnifier.style.backgroundRepeat = 'no-repeat'
        magnifier.style.backgroundSize = `${img.width * this.zoomLevel}px ${img.height * this.zoomLevel}px`
        const halfSize = magnifierSize / 2

        magnifier.style.left = `${img.offsetLeft}px`
        magnifier.style.top = `${img.offsetTop}px`
        magnifier.style.backgroundPosition = `-${halfSize * this.zoomLevel * img.width}px -${halfSize * this.zoomLevel}px`

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
                width: 320px;
                height: 320px;
                background-repeat: no-repeat;
                background-size: calc(100% * 3) calc(100% * 3);
                pointer-events: all;
                box-shadow: 0 0 12px rgba(0,0,0,0.3);
                user-select: none;
                z-index: 20;
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

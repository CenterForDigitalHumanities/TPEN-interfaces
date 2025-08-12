import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"

export default class MagnifierTool extends HTMLElement {
    #imageElem
    #magnifier
    #magnifierBtn

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.isMagnifierVisible = false
        this.dragOffset = { x: 0, y: 0 }
        this.isDragging = false
        this.zoomLevel = 2 // Default zoom
    }

    get imageElem() {
        if (!this.#imageElem) {
            this.#imageElem = document.querySelector('tpen-transcription-interface')?.shadowRoot?.querySelector('tpen-image-fragment')?.shadowRoot?.querySelector('img')
        }
        return this.#imageElem
    }

    get magnifier() {
        if (!this.#magnifier) {
            this.#magnifier = this.shadowRoot.querySelector('.magnifier')
        }
        return this.#magnifier
    }

    get magnifierBtn() {
        if (!this.#magnifierBtn) {
            this.#magnifierBtn = this.shadowRoot.querySelector('.magnifier-btn')
        }
        return this.#magnifierBtn
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
        const imgRect = img.getBoundingClientRect()
        const magnifierSize = magnifier.offsetWidth || 200
        const halfSize = magnifierSize / 2
        magnifier.style.backgroundSize = `${img.width * zoomLevel}px ${img.height * zoomLevel}px`
        magnifier.style.backgroundPositionX = `${-((centerX / imgRect.width) * img.width * zoomLevel - halfSize)}px`
        magnifier.style.backgroundPositionY = `${-((centerY / imgRect.height) * img.height * zoomLevel - halfSize)}px`
    }

    addEventListeners() {
        const magnifierBtn = this.magnifierBtn
        const magnifier = this.magnifier

        magnifierBtn.addEventListener('click', () => {
            if (this.isMagnifierVisible) {
                this.hideMagnifier()
            } else {
                this.showMagnifier()
            }
        })

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
            if (!this.isDragging) return
            e.preventDefault()
            const shadowRootRect = document.querySelector('tpen-transcription-interface').shadowRoot.querySelector('tpen-workspace-tools').getBoundingClientRect()
            const imgRect = this.imageElem.getBoundingClientRect()
            const magnifier = this.magnifier
            const magnifierSize = 200
            const halfSize = magnifierSize / 2
            const maxOffsetX = imgRect.width - halfSize
            const maxOffsetY = imgRect.height - halfSize
            let newX = e.clientX - this.dragOffset.x
            let newY = e.clientY - this.dragOffset.y
            let centerXInImage = Math.min(Math.max(newX + halfSize - imgRect.left, halfSize / 2), maxOffsetX + halfSize / 2)
            let centerYInImage = Math.min(Math.max(newY + halfSize - imgRect.top, halfSize / 2), maxOffsetY + halfSize / 2)
            newX = centerXInImage + imgRect.left - halfSize
            newY = centerYInImage + imgRect.top - halfSize
            magnifier.style.left = `${newX - shadowRootRect.left}px`
            magnifier.style.top = `${newY - shadowRootRect.top}px`
            this.setMagnifierView(centerXInImage, centerYInImage)
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

        const magnifierSize = 200
        magnifier.style.width = `${magnifierSize}px`
        magnifier.style.height = `${magnifierSize}px`

        magnifier.style.display = 'block'
        magnifier.style.backgroundImage = `url(${img.src})`
        magnifier.style.backgroundSize = `${img.width * this.zoomLevel}px ${img.height * this.zoomLevel}px`

        magnifier.style.left = `${img.offsetLeft}px`
        magnifier.style.top = `${img.offsetTop}px`
        magnifier.style.backgroundPosition = `0px 0px`

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
            .tools-btn {
                padding: 8px 16px;
                border-radius: 25px;
                border: 1.5px solid rgb(0, 90, 140);
                background-color: rgb(0, 90, 140);
                color: white;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                user-select: none;
                transition: background-color 0.3s ease, border-color 0.3s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;
            }
            
            .tools-btn:hover, .tools-btn:focus {
                background-color: white;
                border-color: rgb(0, 90, 140);
                color: rgb(0, 90, 140);
                outline: none;
            }

            .magnifier-btn {
                user-select: none;
            }

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
        <button class="magnifier-btn tools-btn" type="button" title="Toggle Magnifier" aria-label="Toggle Magnifier">Inspect 🔍</button>
        <div class="magnifier"></div>
        `
    }
}

customElements.define('tpen-magnifier-tool', MagnifierTool)

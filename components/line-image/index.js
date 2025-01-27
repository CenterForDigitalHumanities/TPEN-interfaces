import { decodeContentState } from '../iiif-tools/index.mjs'

const CANVAS_PANEL_SCRIPT = document.createElement('script')
CANVAS_PANEL_SCRIPT.src = "https://cdn.jsdelivr.net/npm/@digirati/canvas-panel-web-components@latest"
document.head.appendChild(CANVAS_PANEL_SCRIPT)

const LINE_IMG = () => document.createElement('canvas-panel')

class TpenLineImage extends HTMLElement {
    static get observedAttributes() {
        return ['tpen-line-id','region']
    }
    #canvasPanel = LINE_IMG()
    #manifest
    #canvas
    #line

    async attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'tpen-line-id' && oldValue !== newValue) {
            this.lineId = newValue
        }
        if (name === 'region' && oldValue !== newValue) {
            this.#canvasPanel.setAttribute('region', newValue.split('=').pop())
        }
    }

    set manifest(value) {
        this.setManifest(value)
    }

    set canvas(value) {
        this.setCanvas(value)
    }

    set line(value) {
        this.#canvasPanel.createAnnotationDisplay(value)
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.#canvasPanel.setAttribute("preset", "responsive")
        this.shadowRoot.append(this.#canvasPanel)
    }

    connectedCallback() {
        const localIiifContent = this.#canvasPanel.closest('[iiif-content]')?.getAttribute('iiif-content') ?? this.closest('[iiif-content]')?.getAttribute('iiif-content')
        const localIiifCanvas = this.#canvasPanel.closest('[iiif-canvas]')?.getAttribute('iiif-canvas') ?? this.closest('[iiif-canvas]')?.getAttribute('iiif-canvas')
        const localIiifManifest = this.#canvasPanel.closest('[iiif-manifest]')?.getAttribute('iiif-manifest') ?? this.closest('[iiif-manifest]')?.getAttribute('iiif-manifest')
        if (localIiifContent) {
            this.line = decodeContentState(localIiifContent)
            console.log(localIiifContent)
        }
        if (localIiifManifest) {
            this.manifest = localIiifManifest
        }
        if (localIiifCanvas) {
            this.canvas = localIiifCanvas
        }
    }

    loadContent() {
        try {
            const TEXT_CONTENT = JSON.parse(decodeContentState(this.content))
            this.innerText = this.validateContent(TEXT_CONTENT)
        } catch (error) {
            console.error(error)
            return this.validateContent(null, "Decoding Error")
        }
    }

    moveTo(x, y, width, height, duration = 1500) {
        if (typeof x === 'string') {
            const [x, y, w, h] = x.split(',')
            x = parseInt(x)
            y = parseInt(y)
            width = parseInt(w)
            height = parseInt(h)
        }
        this.#canvasPanel.transition(tm => {
            tm.goToRegion({ height, width, x, y }, {
                transition: {
                    easing: this.#canvasPanel.easingFunctions().easeOutExpo,
                    duration,
                },
            })
        })
    }

    setManifest(value) {
        this.#canvasPanel.setAttribute("manifest-id", value)
    }

    setCanvas(value) {
        this.#canvasPanel.setAttribute("canvas-id", value)
    }
    validateContent(content, elem, msg) {
        if (content == null) {
            elem.setAttribute('aria-invalid', true)
            elem.setAttribute('title', msg ?? 'Invalid content')
        }
        return content
    }
}

customElements.define('tpen-line-image', TpenLineImage)

export default {
    TpenLineImage
}

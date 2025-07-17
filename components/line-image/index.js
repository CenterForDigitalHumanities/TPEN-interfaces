import { decodeContentState } from '../iiif-tools/index.js'

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
        document.dispatchEvent?.(new CustomEvent('canvas-change', {
            detail: { canvasId: value },
        }))
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

class TpenImageFragment extends HTMLElement {
    #lineImage = new Image()
    #canvas

    get lineImage() {
        return this.#lineImage
    }
    set lineImage(value) {
        this.#lineImage = value
        this.render()
    }

    set region(value) {
        if (typeof value !== 'string') {
            this.boundingBox = null
            return
        }
        const [x, y, w, h, scale] = value.split(',').map(Number)
        this.boundingBox = { x, y, w, h }
        this.moveUnder(x, y, w, h, scale)
    }

    set canvas(value) {
        this.#canvas = value
        this.setContainerStyle()
    }
    
    set line(annotation) {
        if (!annotation?.target?.startsWith(this.#canvas?.id ?? '')) return

        const target = annotation.target
        const xywhMatch = target.match(/\?xywh=(\d+,\d+,\d+,\d+)/) ?? annotation.selector?.value?.match(/xywh=(?:pixel:|pct:)?(\d+,\d+,\d+,\d+)/)
        if (xywhMatch) {
            this.region = xywhMatch[1]
        }
    }

    static get observedAttributes() {
        return ['tpen-line-id', 'region']
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'tpen-line-id' && oldValue !== newValue) {
            this.lineId = newValue
        }
        if (name === 'region' && oldValue !== newValue) {
            this.region = newValue
        }
    }
    
    setContainerStyle() {
        this.style.position = 'relative'
        this.style.left = `0px`
        this.style.top = `0px`
        this.style.width = `100%`
        this.style.height = `auto`
        this.style.display = 'block'
        this.style.overflow = 'visible'
    }
    
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.#lineImage.onload = this.render.bind(this)
        document.addEventListener('canvas-change', (event) => {
            fetch(event.detail.canvasId)
            .then(res => res.json())
            .then(canvas => {
                this.#canvas = canvas
                this.setContainerStyle()
                const imageResource = canvas?.items?.[0]?.items?.[0]?.body?.id ?? canvas?.images?.[0]?.resource?.id
                    if (imageResource) {
                        this.#lineImage.src = imageResource
                    }
                })
                .catch(console.error)
        })
    }

    moveUnder(x, y, width, height, scale = 1) {
        if (!this.#lineImage.complete) {
            this.#lineImage.onload = () => {
                this.moveUnder(x, y, width, height)
            }
            return
        }
        const canvasHeight = (this.#canvas?.height ?? 2000)
        const canvasWidth = (this.#canvas?.width ?? 1250)

        this.#lineImage.style.transition = `transform 1.5s cubic-bezier(0.19, 1, 0.22, 1)`
        const centerX = x + width / 2
        const elemWidth = this.#lineImage.offsetWidth
        const offsetX = (canvasWidth / 2 - centerX) / scale + (elemWidth / 2)
        const offsetY = (y + height) / scale
        this.#lineImage.style.transform = `translate(-${offsetX}px, -${offsetY}px)`
        this.#lineImage.style.width = `${canvasWidth / scale}px`
        this.#lineImage.style.height = `${canvasHeight / scale}px`
    }

    render() {
        this.shadowRoot.innerHTML = '' // Clear previous content
        this.shadowRoot.append(this.#lineImage)
    }
}

customElements.define('tpen-image-fragment', TpenImageFragment)

export default {
    TpenLineImage,
    TpenImageFragment
}

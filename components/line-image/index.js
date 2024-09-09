import {decodeContentState} from '../iiif-tools/index.mjs'

const CANVAS_PANEL_SCRIPT = document.createElement('script')
CANVAS_PANEL_SCRIPT.src = "https://cdn.jsdelivr.net/npm/@digirati/canvas-panel-web-components@latest"
document.head.appendChild(CANVAS_PANEL_SCRIPT)

const LINE_IMG = () => document.createElement('canvas-panel')

class TpenLineImage extends HTMLElement {
    #manifestId = this.closest('[iiif-manifest]')?.getAttribute('iiif-manifest') 
    #canvasId = this.closest('[iiif-canvas]')?.getAttribute('iiif-canvas')
    #canvasPanel = LINE_IMG()

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this._id = this.getAttribute('tpen-line-id')
        if ("null" === this._id) {
            const ERR = new Event('tpen-error', { detail: 'Line ID is required' })
            validateContent(null,this,"Line ID is required")
            return
        }
        this.shadowRoot.append(this.#canvasPanel)
        this.#canvasPanel.setAttribute("preset","responsive")
        this.#canvasPanel.setAttribute("manifest-id",this.#manifestId)
        this.#canvasPanel.setAttribute("canvas-id",this.#canvasId)
        fetch(this._id).then(res=>res.json()).then(anno=>{
            const TARGET = (anno.target ?? anno.on)?.split('#xywh=')
            // this.#canvasPanel.setAttribute("canvas-id",TARGET[0])
            this.#canvasPanel.setAttribute("region",TARGET[1])
            this.#canvasPanel.createAnnotationDisplay(anno)
        })
        this.addEventListener('canvas-change',ev=>{
            this.#canvasId = this.#canvasPanel.closest('[iiif-canvas]') ?? this.closest('[iiif-canvas]')
            this.#canvasPanel.setCanvas(this.#canvasId)
        })
    }

    connectedCallback() {   
        if(!this.#canvasPanel.vault) return

    }

    async selectImage(){
        try {
            new URL(this._id)
            const TEXT_CONTENT = await loadAnnotation(lineId)
            this.#canvasPanel.innerText = validateContent(TEXT_CONTENT,this)
        } catch (error) {
            console.error(error)
            return validateContent(null,this,"Fetching Error")
        }
    }
    
    loadContent(){
        try {
            const TEXT_CONTENT = JSON.parse(decodeContentState(this.content))
            this.innerText = validateContent(TEXT_CONTENT,this)
        } catch (error) {
            console.error(error)
            return validateContent(null,this,"Decoding Error")
        }
    }

    moveTo(x,y,width,height) {
        this.#canvasPanel.transition(tm => {
            tm.goToRegion({ height, width, x, y }, {
                transition: {
                easing: this.#canvasPanel.easingFunctions().easeOutExpo,
                duration: 1000,
                },
            })
        })
    }
}

customElements.define('tpen-line-image', TpenLineImage)

export default {
    TpenLineImage
}


function loadAnnotation(url){   
    return fetch(url)
        .then(response => {
            if(!response.ok) throw new Error("failed to fetch")
            return response.json()
        })        
        .catch(error => console.error(error))
}

function validateContent(content,elem,msg) {
    if(content==null){
        elem.setAttribute('aria-invalid',true)
        elem.setAttribute('title',msg ?? 'Invalid content')
    }
    return content
}

import { decodeContentState } from '../iiif-tools/index.mjs'
import TPEN from '../../api/TPEN.mjs'
import { eventDispatcher } from '../../api/events.mjs'
import "https://cdn.jsdelivr.net/npm/manifesto.js"


const CANVAS_PANEL_SCRIPT = document.createElement('script')
CANVAS_PANEL_SCRIPT.src = "https://cdn.jsdelivr.net/npm/@digirati/canvas-panel-web-components@latest"
document.head.appendChild(CANVAS_PANEL_SCRIPT)

const LINE_IMG = () => document.createElement('canvas-panel')

class TpenLineImage extends HTMLElement {
    static get observedAttributes() {
        return ['tpen-line-id']
    }

    #canvasPanel = LINE_IMG()
    #manifest = TPEN.manifest ?? manifesto.loadManifest(this.closest('[iiif-manifest]'))
        .then(manifest=> TPEN.manifest = new manifesto.Manifest(manifest))
    #canvas = TPEN.activeCanvas ?? manifesto.loadCanvas(this.closest('[iiif-canvas]'))
        .then(canvas=> TPEN.activeCanvas = new manifesto.Canvas(canvas))
    #line = TPEN.activeLine

    async attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'tpen-line-id' && oldValue !== newValue) {
            this.#line = this.findLine(newValue)
        }
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.#canvasPanel.setAttribute("preset","responsive")
        this.shadowRoot.append(this.#canvasPanel)
        eventDispatcher.on('change-page', ev => {
            this.#canvasPanel.setManifest(TPEN.manifest)
            this.#canvasPanel.setCanvas(ev.detail)
        })
        eventDispatcher.on('change-line', ev => {
            this.#canvasPanel.setManifest(TPEN.manifest)
            this.#canvasPanel.setCanvas(TPEN.activeCanvas)
            try {
                let anno = TPEN.activeLine
                const TARGET = ((anno.type ?? anno['@type']).match(/Annotation\b/)) ? (anno.target ?? anno.on)?.split('#xywh=') : (anno.items[0]?.target ?? anno.resources[0]?.on)?.split('#xywh=')
                this.#canvasPanel.setAttribute("region", TARGET[1])
                this.#canvasPanel.createAnnotationDisplay(anno)
                return
            } catch (e) { }
        })
    }
    
    connectedCallback() {  
        return
        // this.#canvasPanel.setAttribute("manifest-id",this.#manifestId())
        // this.#canvasPanel.setAttribute("canvas-id",this.#canvasId())
        TPEN.activeLine = decodeContentState((this.#canvasPanel.closest('[iiif-content]') ?? this.closest('[iiif-content]'))?.getAttribute('iiif-content'))

        if (TPEN.activeLine) {
            try {
                let anno = JSON.parse(TPEN.activeLine)
                const TARGET = ((anno.type ?? anno['@type']).match(/Annotation\b/)) ? (anno.target ?? anno.on)?.split('#xywh=') : (anno.items[0]?.target ?? anno.resources[0]?.on)?.split('#xywh=')
                this.#canvasPanel.setAttribute("region",TARGET[1])
                this.#canvasPanel.createAnnotationDisplay(anno)
                return
            }catch(e){}
        }

        // this.#id = (this.#canvasPanel.closest('[tpen-line-id]') ?? this.closest('[tpen-line-id]'))?.getAttribute('tpen-line-id')

        // if (!this.#id || ("null" === this.#id)) {
        //     const ERR = new Event('tpen-error', { detail: 'Line ID is required' })
        //     validateContent(null,this,"Line ID is required")
        //     return
        // }

        // fetch(this.#id).then(res=>res.json()).then(anno=>{
        //     const TARGET = ((anno.type ?? anno['@type']).match(/Annotation\b/)) ? (anno.target ?? anno.on)?.split('#xywh=') : (anno.items[0]?.target ?? anno.resources[0]?.on)
        //     // this.#canvasPanel.setAttribute("canvas-id",TARGET[0])
        //     this.#canvasPanel.setAttribute("region",TARGET[1])
        //     this.#canvasPanel.createAnnotationDisplay(anno)
        // })
        // this.addEventListener('canvas-change',ev=>{
        //     this.#canvasId = this.#canvasPanel.closest('[iiif-canvas]') ?? this.closest('[iiif-canvas]')
        //     this.#canvasPanel.setCanvas(this.#canvasId)
        // })
    }

    async selectImage(){
        // if(!this.#id) return
        // try {
        //     new URL(this.#id)
        //     // Annotation may not be only embedded for now.
        //     const TEXT_CONTENT = await loadAnnotation(this.#id)
        //     this.#canvasPanel.innerText = validateContent(TEXT_CONTENT,this)
        // } catch (error) {
        //     console.error(error)
        //     return validateContent(null,this,"Fetching Error")
        // }
    }

    findLine(id){
        if(this.#canvas) {
            console.log(this.#canvas)
        }
        return this.#canvasPanel.findLine(id)
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

import {decodeContentState} from '../iiif-tools/index.mjs'

const LINE_IMAGE_HTML = `<canvas-panel preset='static' manifest-id="https://iiif.wellcomecollection.org/presentation/b28929780"></canvas-panel>`

class TpenLineImage extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.id = this.getAttribute('tpen-line-id')
        this.content = this.getAttribute('iiif-content')
    }

    connectedCallback() {
        this.innerHTML = LINE_IMAGE_HTML
        this.shadowRoot.innerHTML = LINE_IMAGE_HTML
        const CANVAS = this.shadowRoot.querySelector('canvas-panel')
        CANVAS.addEventListener('ready',a=>alert(a.detail))

        
        if (!this.id && !this.content) {
            const ERR = new Event('tpen-error', { detail: 'Line ID is required' })
            validateContent(null,SPAN,"Line ID is required")
        }
        
        // this.content ? loadContent(this.content,CANVAS) : loadImageFragment(this.id,CANVAS)
    }
}

customElements.define('tpen-line-image', TpenLineImage)

export default {
    TpenLineImage
}

async function loadImageFragment(lineId,elem){
    try {
        new URL(lineId)
        const TEXT_CONTENT = await loadAnnotation(lineId)
        elem.innerText = validateContent(TEXT_CONTENT,elem)
    } catch (error) {
        console.error(error)
        return validateContent(null,elem,"Fetching Error")
    }
}

function loadContent(b64,elem){
    try {
        const TEXT_CONTENT = getText(JSON.parse(decodeContentState(b64)))
        elem.innerText = validateContent(TEXT_CONTENT,elem)
    } catch (error) {
        console.error(error)
        return validateContent(null,elem,"Decoding Error")
    }
}

function loadAnnotation(url){   
    return fetch(url)
        .then(response => {
            if(!response.ok) throw new Error("failed to fetch")
            return response.json()
        })        
        .then(anno => getText(anno))
        .catch(error => console.error(error))
}

function getText(annotation){
    // TODO: currently this is a fragile mess
    let textContent = annotation.body?.value
    if(annotation.resource) textContent = annotation.resource["cnt:chars"]
    if(typeof annotation.body === "string") textContent = annotation.body
    return textContent ?? "weird value"
}

function validateContent(content,elem,msg) {
    if(content==null){
        elem.setAttribute('aria-invalid',true)
        elem.setAttribute('title',msg ?? 'Invalid content')
    }
    return content
}

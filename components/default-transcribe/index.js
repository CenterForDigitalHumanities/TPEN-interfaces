// custom element named 'tpen-transcription' with a custom template built from the querystring 'projectID' parameter
import { userMessage, encodeContentState } from "../iiif-tools/index.mjs"
import "../line-image/index.js"
import "../line-text/index.js"
import { Vault } from 'https://cdn.jsdelivr.net/npm/@iiif/helpers/+esm'

const vault = new Vault()
class TpenTranscriptionElement extends HTMLElement {
    #transcriptionContainer
    #activeLine
    #activeCanvas
    #manifest
    userToken

    static get observedAttributes() {
        return ['tpen-page', 'iiif-manifest']
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if(name === 'tpen-page' ){
                this.#loadPage(newValue)
            }
        }
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.#transcriptionContainer = document.createElement('div')
        this.#transcriptionContainer.setAttribute('id', 'transcriptionContainer')
        this.shadowRoot.append(this.#transcriptionContainer)
    }
    
    connectedCallback() {}

    set activeCanvas(canvas) {
        this.#activeCanvas = canvas
        // this.querySelectorAll('iiif-canvas').forEach(el=>el.setAttribute('iiif-canvas',canvas.id))
    }

    get activeCanvas() {
        return this.#activeCanvas ?? {}
    }

    set activeLine(line) {
        this.#activeLine = line
    }

    get activeLine() {
        return this.#activeLine ?? {}
    }

    set manifest(manifest) {
        this.#manifest = manifest
    }

    get manifest() {
        return this.#manifest ?? this.closest('[iiif-manifest]')?.getAttribute('iiif-manifest') ?? {}
    }

    set activeLine(line) {
        if (line === this.#activeLine) return
        this.#activeLine = line
        this.#transcriptionContainer.dispatchEvent(new CustomEvent('tpen-set-line', { detail: line }))
    }

    async #loadPage(annotationPageID) {
        let page = { id: annotationPageID }
        try {
            page = vault.get({id:annotationPageID,type:"AnnotationPage"}) ?? await vault.load(annotationPageID)
        } catch (err) {
            switch (err.status ?? err.code) {
                case 401:
                    return userMessage('Unauthorized')
                case 403:
                    return userMessage('Forbidden')
                case 404:
                    return userMessage('Project not found')
                default:
                    return userMessage(err.message ?? err.statusText ?? err.text ?? 'Unknown error')
            }
        }
        let lines = await Promise.all(page.items.flatMap(async l => {
            const lineElem = document.createElement('tpen-line-text')
            const lineImg = document.createElement('tpen-line-image')
            lineElem.line = vault.get({id:l.id,type:"Annotation"}) ?? await vault.load(l.id)
            lineElem.line.body[0] = vault.get({id:lineElem.line.body[0].id,type:"ContentResource"})
            lineElem.setAttribute('tpen-line-id', l.id)
            lineImg.setAttribute('tpen-line-id', l.id)
            lineImg.setAttribute('iiif-canvas', lineElem.line.target.source.id)
            lineImg.setAttribute('region', lineElem.line.target.selector.value)
            lineImg.setAttribute('iiif-manifest', this.manifest)
            return [lineElem, lineImg]
        })).then(results => results.flat())
        this.#transcriptionContainer.append(...lines)
        this.activeLine = lines[0].line
    }

    getAllLines(canvas = TPEN.activeCanvas) {
        return canvas?.__jsonld.annotations?.[0]?.items ?? canvas?.__jsonld.annotations?.[0] ?? canvas?.getContent()
    }

    getLineByIndex(index, canvas = TPEN.activeCanvas) {
        return this.getAllLines(canvas)[index]
    }

    getLineByID(id, canvas = TPEN.activeCanvas) {
        return this.getAllLines(canvas).find(line => line.id === id ?? line['@id'] === id)
    }

    getFirstLine(canvas = TPEN.activeCanvas) {
        return this.getAllLines(canvas)[0]
    }

    getLastModifiedLine(canvas) {
        return this.getAllLines(canvas).sort((a, b) => new Date(b.modified) - new Date(a.modified))[0]
    }
}

customElements.define('tpen-transcription', TpenTranscriptionElement)

class TpenPaginationElement extends HTMLElement {
    #paginationContainer
    activeCanvas = {}
    activeLine = {}
    userToken

    static get observedAttributes() {
        return ['tpen-project']
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (name === 'tpen-project' && newValue !== TPEN.activeProject._id) {
                this.#loadPages(newValue)
            }
        }
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.#paginationContainer = document.createElement('div')
        this.#paginationContainer.setAttribute('id', 'paginationContainer')
        this.shadowRoot.append(this.#paginationContainer)
    }
    
    connectedCallback() {
        if (!TPEN.activeProject?._id) {
            return
        }
        this.setAttribute('tpen-project', TPEN.activeProject._id)
    }

    async #loadPages(manifest) {
        try {
            // const project = TPEN.activeProject ?? await new Project(projectID).fetch()
            // if(!project) return userMessage('Project not found')
            // if (!TPEN.manifest?.getSequenceByIndex) {
            //     let manifest = await manifesto.loadManifest(project.manifest)
            //     TPEN.manifest = new manifesto.Manifest(manifest)   
            // }
            // let pages = TPEN.manifest?.getSequenceByIndex(0)?.getCanvases()
            // const select = document.createElement('select')
            // select.setAttribute('id', 'pageSelect')
            // pages.forEach(page => {
            //     const option = document.createElement('option')
            //     option.value = page.id
            //     option.textContent = page.getLabel().getValue(navigator.language)
            //     select.appendChild(option)
            // })
            // this.#paginationContainer.appendChild(select)
            // select.addEventListener('change', () => {
            //     TPEN.activeCanvas = TPEN.manifest?.getSequenceByIndex(0)?.getCanvasById(select.value)
            //     eventDispatcher.dispatch('change-page')
            // })
        }
        catch (err) {
            switch (err.status ?? err.code) {
                case 401:
                    return userMessage('Unauthorized')
                case 403:   
                    return userMessage('Forbidden')
                case 404:
                    return userMessage('Project not found') 
                default:
                    return userMessage(err.message ?? err.statusText ?? err.text ?? 'Unknown error')
            }
        }
    }
}

customElements.define('tpen-pagination', TpenPaginationElement)

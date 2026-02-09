/**
 * TpenTranscriptionElement - Default transcription view component.
 * Displays line text and images for an annotation page.
 * @element tpen-transcription
 *
 * @deprecated in favor of tpen-simple-transcription.
 */
import { userMessage, encodeContentState } from "../iiif-tools/index.js"
import vault from "../../js/vault.js"
import "../line-image/index.js"
import "../line-text/index.js"

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

    connectedCallback() { }

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
        let page = await vault.getWithFallback(annotationPageID, 'annotationpage', TPEN.activeProject?.manifest)
        if (!page) {
            return userMessage('Failed to load page. Please try again.')
        }
        let lines = await Promise.all(page.items.flatMap(async l => {
            const lineElem = document.createElement('tpen-line-text')
            const lineImg = document.createElement('tpen-line-image')
            lineElem.line = await vault.get(l.id, 'annotation')
            if (!lineElem.line) {
                lineElem.line = await vault.get(l.id, 'annotation', true)
            }
            lineElem.line.body[0] = await vault.get(lineElem.line.body[0].id, 'contentresource')
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

/**
 * TpenPaginationElement - Page navigation component for transcription.
 * @element tpen-pagination
 */
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

// custom element named 'tpen-transcription' with a custom template built from the querystring 'projectID' parameter
import { userMessage, encodeContentState } from "../iiif-tools/index.mjs"
import "https://cdn.jsdelivr.net/npm/manifesto.js"
import "../line-image/index.js"
import "../line-text/index.js"
import TPEN from "../../api/TPEN.mjs"
import User from "../../api/User.mjs"
import Project from "../../api/Project.mjs"
import { eventDispatcher } from "../../api/events.mjs"

class TpenTranscriptionElement extends HTMLElement {
    #transcriptionContainer
    #activeLine
    #activeCanvas
    #manifest
    userToken

    static get observedAttributes() {
        return ['tpen-project','tpen-user-id']
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if(name === 'tpen-user-id') {
                TPEN.currentUser = new User(newValue).getProfile()
            }
            if (name === 'tpen-project' && newValue !== TPEN.activeProject._id) {
                this.#loadProject(newValue)
            }
        }
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.#transcriptionContainer = document.createElement('div')
        this.#transcriptionContainer.setAttribute('id', 'transcriptionContainer')
        this.shadowRoot.append(this.#transcriptionContainer)
        TPEN.attachAuthentication(this)
        eventDispatcher.on('tpen-project-loaded', () => this.#loadProject()) 
    }
    
    connectedCallback() {}

    set activeCanvas(canvas) {
        if (canvas === TPEN.activeCanvas) return
        TPEN.activeCanvas = canvas
        this.#activeCanvas = canvas
        // this.querySelectorAll('iiif-canvas').forEach(el=>el.setAttribute('iiif-canvas',canvas.id))
    }

    get activeCanvas() {
        return this.#activeCanvas ?? TPEN.activeCanvas ?? {}
    }

    set activeLine(line) {
        if (line === TPEN.activeLine) return
        TPEN.activeLine = line
        this.#activeLine = line
        this.contentState = JSON.stringify(TPEN.activeLine)
    }

    get activeLine() {
        return this.#activeLine ?? TPEN.activeLine ?? {}
    }

    set manifest(manifest) {
        if(manifest === TPEN.manifest) return
        TPEN.manifest = manifest
        this.#manifest = manifest
        // this.querySelectorAll('iiif-manifest').forEach(el=>el.setAttribute('iiif-manifest',manifest.id))
    }

    get manifest() {
        return this.#manifest ?? TPEN.manifest ?? {}
    }

    async #loadProject(projectID) {
        try {
            const project = TPEN.activeProject ?? await new Project(projectID).fetch()
            if(!project) return userMessage('Project not found')
                // load project.manifest
            let manifest = await manifesto.loadManifest(project.manifest)
            this.manifest = new manifesto.Manifest(manifest)
            // page from URL later
            this.activeCanvas = TPEN.manifest?.getSequenceByIndex(0)?.getCanvasByIndex(0)
            this.activeLine = this.getFirstLine()
            const imgTop = document.createElement('tpen-line-image')
            imgTop.setAttribute('id', 'imgTop')
            this.#transcriptionContainer.setAttribute('tpen-line-id', this.activeLine?.id)
            this.#transcriptionContainer.setAttribute('iiif-content', encodeContentState(this.activeLine))
            this.#transcriptionContainer.setAttribute('iiif-canvas', this.activeCanvas?.id)
            this.#transcriptionContainer.setAttribute('iiif-manifest', TPEN.manifest?.id)
            const text = document.createElement('tpen-line-text')
            text.setAttribute('id', 'text')
            this.#transcriptionContainer.append(imgTop, text)
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
        eventDispatcher.on('tpen-project-loaded', () => this.#loadPages())
    }
    
    connectedCallback() {
        if (!TPEN.activeProject?._id) {
            return
        }
        this.setAttribute('tpen-project', TPEN.activeProject._id)
    }

    async #loadPages(projectID = TPEN.activeProject._id) {
        try {
            const project = TPEN.activeProject ?? await new Project(projectID).fetch()
            if(!project) return userMessage('Project not found')
            if (!TPEN.manifest?.getSequenceByIndex) {
                let manifest = await manifesto.loadManifest(project.manifest)
                TPEN.manifest = new manifesto.Manifest(manifest)   
            }
            let pages = TPEN.manifest?.getSequenceByIndex(0)?.getCanvases()
            const select = document.createElement('select')
            select.setAttribute('id', 'pageSelect')
            pages.forEach(page => {
                const option = document.createElement('option')
                option.value = page.id
                option.textContent = page.getLabel().getValue(navigator.language)
                select.appendChild(option)
            })
            this.#paginationContainer.appendChild(select)
            select.addEventListener('change', () => {
                TPEN.activeCanvas = TPEN.manifest?.getSequenceByIndex(0)?.getCanvasById(select.value)
                eventDispatcher.dispatch('change-page')
            })
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

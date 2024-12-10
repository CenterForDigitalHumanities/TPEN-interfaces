// custom element named 'tpen-transcription' with a custom template built from the querystring 'projectID' parameter
import { fetchProject, userMessage, encodeContentState } from "../iiif-tools/index.mjs"
import "https://cdn.jsdelivr.net/npm/manifesto.js"
import "../line-image/index.js"
import "../line-text/index.js"
import TPEN from "../../api/TPEN.mjs"
import User from "../../api/User.mjs"

class TpenTranscriptionElement extends HTMLElement {
    TPEN = new TPEN()
    #transcriptionContainer
    #activeCanvas = {}
    #activeLine = {}
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
            if (name === 'tpen-project') {
                this.TPEN.activeProject = { _id: newValue }
                }
        if(this.userToken) this.#loadProject()
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
    }

    set activeLine(line) {
        if (line === TPEN.activeLine) return
        TPEN.activeLine = line
        this.contentState = JSON.stringify(TPEN.activeLine)
    }

    async #loadProject(projectID) {
        try {
            const project = await fetchProject(this.TPEN.activeProject._id, this.userToken ?? TPEN.getAuthorization())
            if(!project) return userMessage('Project not found')
            // load project.manifest
            let manifest = await manifesto.loadManifest(project.manifest)
            TPEN.manifest = new manifesto.Manifest(manifest)
            // page from URL later
            TPEN.activeCanvas = TPEN.manifest?.getSequenceByIndex(0)?.getCanvasByIndex(0)
            TPEN.activeLine = this.getFirstLine()
            const imgTop = document.createElement('tpen-line-image')
            imgTop.setAttribute('id', 'imgTop')
            imgTop.setAttribute('projectID', this.TPEN.activeProject._id)
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

// custom element named 'tpen-transcription' with a custom template built from the querystring 'projectID' parameter
import { fetchProject, userMessage, encodeContentState } from "../iiif-tools/index.mjs"
import "https://cdn.jsdelivr.net/npm/manifesto.js"
import "../line-image/index.js"
import "../line-text/index.js"
import TPEN from "../../TPEN/index.mjs"
import User from "../../User/index.mjs"

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
                this.TPEN = new TPEN()
                this.TPEN.currentUser = new User(newValue).getProfile()
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
    }
    
    connectedCallback() {
        if (!this.TPEN.activeProject._id) {
            userMessage('No project ID provided')
            return
        }
        this.setAttribute('tpen-project', this.TPEN.activeProject._id)
    }

    async #loadProject() {
        try {
            const project = await fetchProject(this.TPEN.activeProject._id, this.userToken ?? TPEN.getAuthorization())
            if(!project) return userMessage('Project not found')
            this.#transcriptionContainer.setAttribute('iiif-manifest', project.manifest)
            // load project.manifest
            let manifest = await manifesto.loadManifest(project.manifest)
            this.TPEN.activeProject.manifest = new manifesto.Manifest(manifest)
            // page from URL later
            this.#activeCanvas = this.TPEN.activeProject.manifest?.getSequenceByIndex(0)?.getCanvasByIndex(0)
            this.#activeLine = this.getFirstLine()
            this.#transcriptionContainer.setAttribute('iiif-canvas', this.#activeCanvas?.id)
            this.#transcriptionContainer.setAttribute('tpen-line-id', this.#activeLine?.id)
            this.#transcriptionContainer.setAttribute('iiif-content', encodeContentState(JSON.stringify(this.#activeLine)))
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

    getAllLines(canvas = this.#activeCanvas) {
        return canvas?.__jsonld.annotations?.[0]?.items ?? canvas?.__jsonld.annotations?.[0] ?? canvas?.getContent()
    }

    getLineByIndex(index, canvas = this.#activeCanvas) {
        return this.getAllLines(canvas)[index]
    }

    getLineByID(id, canvas = this.#activeCanvas) {
        return this.getAllLines(canvas).find(line => line.id === id ?? line['@id'] === id)
    }

    getFirstLine(canvas = this.#activeCanvas) {
        return this.getAllLines(canvas)[0]
    }

    getLastModifiedLine(canvas) {
        return this.getAllLines(canvas).sort((a, b) => new Date(b.modified) - new Date(a.modified))[0]
    }
}

customElements.define('tpen-transcription', TpenTranscriptionElement)

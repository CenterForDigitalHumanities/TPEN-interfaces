// custom element named 'tpen-transcription' with a custom template built from the querystring 'projectID' parameter
import { fetchProject, userMessage, encodeContentState } from "../iiif-tools/index.mjs"
import "https://cdn.jsdelivr.net/npm/manifesto.js"
import "../line-image/index.js"
import "../line-text/index.js"

class TpenTranscriptionElement extends HTMLElement {
    #projectID = new URLSearchParams(window.location.search).get('projectID')
    #transcriptionContainer
    #manifest
    #activeCanvas
    #activeLine

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.#transcriptionContainer = document.createElement('div')
        this.#transcriptionContainer.setAttribute('id', 'transcriptionContainer')
        this.shadowRoot.append(this.#transcriptionContainer)
    }

    connectedCallback() {
        if (!this.#projectID) {
            userMessage('No project ID provided')
            return
        }
        return fetchProject(this.#projectID)
        .then(async project => {
            console.log(this.#projectID, project)
            this.#transcriptionContainer.setAttribute('iiif-manifest', project.manifest)
            // load project.manifest
            let manifest = await manifesto.loadManifest(project.manifest)
            this.#manifest = new manifesto.Manifest(manifest)
            // page from URL later
            this.#activeCanvas = this.#manifest?.getSequenceByIndex(0)?.getCanvasByIndex(0)
            this.#activeLine = this.#activeCanvas?.__jsonld.annotations?.[0]?.items?.[0] ?? this.#activeCanvas?.__jsonld.annotations?.[0] ?? this.#activeCanvas?.getContent()[0]
            this.#transcriptionContainer.setAttribute('iiif-canvas', this.#activeCanvas?.id)
            this.#transcriptionContainer.setAttribute('tpen-line', this.#activeLine?.id)
            this.#transcriptionContainer.setAttribute('iiif-content', encodeContentState(JSON.stringify(this.#activeLine)))
            const imgTop = document.createElement('tpen-line-image')
            imgTop.setAttribute('id', 'imgTop')
            imgTop.setAttribute('projectID', this.#projectID)
            const text = document.createElement('tpen-line-text')
            text.setAttribute('id', 'text')
            this.#transcriptionContainer.append(imgTop, text)
        })
        .catch(err => userMessage(err))
    }
}

customElements.define('tpen-transcription', TpenTranscriptionElement)





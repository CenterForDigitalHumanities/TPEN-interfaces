import TPEN from "../../api/TPEN.mjs"
import { eventDispatcher } from "../../api/events.mjs"

class ProjectMetadata extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        TPEN.attachAuthentication(this)
    }

    static get observedAttributes() {
        return ["tpen-user-id"]
    }

    connectedCallback() {
        this.render()
        this.addEventListener()
    }

    render() {
        this.shadowRoot.innerHTML = `
            <div part="metadata" id="metadata" class="metadata"></div>
        `
    }

    addEventListener() {
        eventDispatcher.on("tpen-project-loaded", () => this.loadMetadata(TPEN.activeProject))
    }

    loadMetadata(project) {
        let projectMetada = this.shadowRoot.querySelector(".metadata")
        const metadata = project.metadata 
        projectMetada.innerHTML = ""
        metadata.forEach((data) => {
    
            const label = decodeURIComponent(this.getLabel(data))
            const value = decodeURIComponent(this.getValue(data))
    
            projectMetada.innerHTML += `
            <li part="metadata-item">
              <span part="metadata-title" class="title">${label}: </span>
              <span part="metadata-value" class="colon"> ${value}</span>
            </li>`
        })
    }

    getLabel(data) {
        if (typeof data.label === "string") {
            return data.label
        }
    
        if (typeof data.label === "object") {
            return Object.entries(data.label)
                .map(([lang, values]) => `${lang != "none" ? lang + ":" : ""} ${values.join(", ")}`)
                .join(" | ")
        }
    
        return "Unknown Label"
    }
    
    getValue(data) {
        if (typeof data.value === "string") {
            return data.value
        }
    
        if (typeof data.value === "object") {
            return Object.entries(data.value)
                .map(([lang, values]) => `${values.join(", ")}`)
                .join(" | ")
        }
    
        return "Unknown Value"
    }
}

customElements.define('tpen-project-metadata', ProjectMetadata)
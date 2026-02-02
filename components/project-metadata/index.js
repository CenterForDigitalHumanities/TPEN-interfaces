import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../../components/check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"

/**
 * ProjectMetadata - Displays project metadata in a formatted list.
 * Requires PROJECT METADATA view access.
 * @element tpen-project-metadata
 */
class ProjectMetadata extends HTMLElement {
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    static get observedAttributes() {
        return ["tpen-user-id"]
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this.render()
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before loading metadata.
     * Shows permission message if user lacks PROJECT METADATA view access.
     */
    authgate() {
        if (!CheckPermissions.checkViewAccess('PROJECT', 'METADATA')) {
            const projectMetadata = this.shadowRoot.querySelector(".metadata")
            if (projectMetadata) {
                projectMetadata.innerHTML = `<p>You don't have permission to view project metadata</p>`
            }
            return
        }
        this.loadMetadata(TPEN.activeProject)
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .metadata {
                    display: flex;
                    flex-direction: column;
                    list-style: none;
                    padding: 0 10px;
                }
                
                .metadata li {
                    padding: 8px 20px;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
                    border-radius: 4px;
                    margin-bottom: 10px;
                }

                .metadata li span {
                    display: inline-block;
                    overflow-wrap: break-word;
                    word-break: break-word;
                    line-height: 1.5;
                }

                .metadata li span.title {
                    font-weight: bold;
                    width: 30%;
                    font-size: 0.9em;
                    vertical-align: top;
                    color: var(--primary-color);
                }

                .metadata li span.colon {
                    margin-left: 10px;
                    width: 65%;
                    font-size: 0.9em;
                }

                @media (max-width: 1080px) {
                    .metadata {
                        height: 18em;   
                    }
                }   
            </style>
            <div part="metadata" id="metadata" class="metadata"></div>
        `
    }

    /**
     * Loads and displays metadata from the project.
     * @param {Object} project - The project object containing metadata
     */
    async loadMetadata(project) {
        let projectMetada = this.shadowRoot.querySelector(".metadata")
        const metadata = project.metadata 
        projectMetada.innerHTML = ""
        metadata.forEach((data) => {
    
            const label = decodeURIComponent(this.getLabel(data))
            const value = decodeURIComponent(this.getValue(data))
    
            projectMetada.innerHTML += `
            <li part="metadata-item">
              <span part="metadata-title" class="title">${label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()} </span>
              <span part="metadata-value" class="colon">${value}</span>
            </li>`
        })
    }

    getLabel(data) {
        if (typeof data.label === "string") {
            return data.label
        }
    
        if (typeof data.label === "object") {
            return Object.entries(data.label)
                .map(([lang, values]) => `${values.join(", ")}`)
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

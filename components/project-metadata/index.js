import TPEN from "../../api/TPEN.js"

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
            <style>
                .metadata {
                    display: flex;
                    flex-direction: column;
                    height: 10em;
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

    addEventListener() {
        TPEN.eventDispatcher.on("tpen-project-loaded", () => this.loadMetadata(TPEN.activeProject))
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

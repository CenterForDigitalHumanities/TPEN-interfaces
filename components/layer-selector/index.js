import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../check-permissions/checkPermissions.js"
const eventDispatcher = TPEN.eventDispatcher
import "../check-permissions/permission-match.js"
export default class LayerSelector extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.layers = []
    }

    connectedCallback() {
        // If project is already loaded, use its layers.
        if (TPEN.activeProject && TPEN.activeProject.layers) {
            this.layers = TPEN.activeProject.layers
            if (this.layers.length <= 1) {
                // No need to render if there's only one layer.
               return this.remove()
            }
            this.render()
        }
        // Listen for project loaded events to update layers.
        eventDispatcher.on("tpen-project-loaded", () => {
            if (!CheckPermissions.checkViewAccess("LAYER", "ANY")) {
                // No reason to get this far, but let's not risk it.
                this.remove()
                return
            }
            this.layers = TPEN.activeProject.layers
            this.render()
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

        return `Unlabeled layer: ${data["@id"]}`
    }

    render() {
        const optionsHtml = this.layers
            .map((layer) => {
                const label = this.getLabel(layer)
                return `<option value="${layer["@id"]}">${label}</option>`
            })
            .join("")

        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          container-type: inline-size;
        }
        select {
          font-size: clamp(0.8rem, 1vw, 1rem);
          padding: 5px;
          border: 1px dashed var(--border-color, #ccc);
          border-radius: 5px;
          background: var(--select-bg, #fff);
          outline:none;
          /* Allow text to wrap */
          white-space: normal;
          word-wrap: break-word;
          max-width:100px;
        }

        @container (max-width: 300px) {
          select {
            font-size: 0.8rem;
          }
        }
      </style>
      <select>
        ${optionsHtml}
      </select>
    `

        const selectEl = this.shadowRoot.querySelector("select")
        selectEl.addEventListener("change", (e) => {
            const selectedURI = e.target.value
            const selectedLayer = this.layers.find((layer) => layer.URI === selectedURI)
            if (selectedLayer) {
                // Update TPEN.activeLayer and dispatch the change event.
                TPEN.activeLayer = selectedLayer
                eventDispatcher.dispatch(new CustomEvent("tpen-active-layer", {
                    detail: selectedLayer,  
                    bubbles: true,  
                    composed: true, 
                }))
            }
        })
    }
}

customElements.define("tpen-layer-selector", LayerSelector)

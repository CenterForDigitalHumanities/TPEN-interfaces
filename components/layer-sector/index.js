import TPEN from "../../api/TPEN.js"
import { eventDispatcher } from "../../api/events.js"

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
                this.remove()
                return
            }
        }
        // Listen for project loaded events to update layers.
        eventDispatcher.on("tpen-project-loaded", (ev) => {
            if (ev.detail && ev.detail.layers) {
                this.layers = ev.detail.layers
                if (this.layers.length <= 1) {
                    this.remove()
                    return
                }
                this.render()
            }
        })
        this.render()
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

    render() {
        // Only render the selector if we have more than one layer.
        if (!this.layers || this.layers.length <= 1) {
            return
        }

        const optionsHtml = this.layers
            .map((layer) => {
                const label = this.getLabel(layer)
                return `<option value="${layer.URI}">${label}</option>`
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
                eventDispatcher.dispatchEvent(new CustomEvent("tpen-active-layer", {
                    detail: selectedLayer,
                    bubbles: true,
                    composed: true,
                }))
            }
        })
    }
}

customElements.define("tpen-layer-selector", LayerSelector)
